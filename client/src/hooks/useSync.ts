import { useCallback, useEffect, useRef, useState } from 'react';
import { KEY, ROOM_DEFAULT, adoptItems, mergeComments, mergeItems } from '../data';
import type {
  Activity,
  Comments,
  Food,
  PackItem,
  Presence,
  SyncStatus,
  Tab,
} from '../types';

export function devId(): string {
  let d: string | null = null;
  try {
    d = localStorage.getItem('paros-dev');
  } catch {
    /* ignore */
  }
  if (!d) {
    d = Math.random().toString(36).slice(2, 10);
    try {
      localStorage.setItem('paros-dev', d);
    } catch {
      /* ignore */
    }
  }
  return d;
}

interface SyncOpts {
  me: string | null;
  tab: Tab;
  activities: Activity[];
  packing: PackItem[];
  foods: Food[];
  comments: Comments;
  setActivities: (v: Activity[]) => void;
  setPacking: (v: PackItem[]) => void;
  setFoods: (v: Food[]) => void;
  setComments: (v: Comments) => void;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SyncApi {
  status: SyncStatus;
  /**
   * Lifecycle of the user's last *content* change: 'saving' once queued,
   * 'saved' only when that change actually reached the server, 'error' while it
   * remains unsaved after a failed push. Never driven by presence/heartbeat
   * pushes or by a status recovery via polling, so "저장됨" is always truthful.
   */
  saveState: SaveState;
  presence: Presence;
  presTick: number;
  roomId: string;
  /** Hybrid-logical-clock timestamp for a new edit: never below any ts already
   *  seen, so a device with a lagging wall clock can't have its edits silently
   *  lost to last-write-wins. Use for every synced `ts`/`checkTs` stamp. */
  nextTs: () => number;
  touch: (id: string) => void;
  /** Queue a debounced push. `silent` skips the save badge for presence/nav-only
   *  writes (tab change, profile switch, editing indicator) that aren't a
   *  user-visible content save. */
  pushSoon: (opts?: { silent?: boolean }) => void;
}

export function useSync(opts: SyncOpts): SyncApi {
  const [status, setStatus] = useState<SyncStatus>('connecting');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [presTick, setPresTick] = useState(0);
  const [presence, setPresenceState] = useState<Presence>({});

  // Mirror the current data + status into a ref so the debounced/interval
  // callbacks always read the latest values without needing to be re-created.
  const stateRef = useRef(opts);
  stateRef.current = opts;
  const statusRef = useRef<SyncStatus>('connecting');
  statusRef.current = status;

  const roomIdRef = useRef<string>('');
  const docTsRef = useRef<number>(0);
  const presenceRef = useRef<Presence>({});
  const myEdRef = useRef<{ id: string; ts: number } | null>(null);
  const pushingRef = useRef<boolean>(false);
  const pendingPushRef = useRef<boolean>(false);
  // adoptedRef: we've completed a first successful read of the room, so local
  // seed defaults have been reconciled against the server. roomMissingRef: the
  // last read was a genuine 404 (room absent) — only then may we push our seed
  // to create it, never over an existing room we simply failed to read.
  const adoptedRef = useRef<boolean>(false);
  const roomMissingRef = useRef<boolean>(false);
  // dirtyRef: a user content change is queued and not yet confirmed on the
  // server. Drives the truthful save badge and survives failed pushes.
  const dirtyRef = useRef<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Hybrid logical clock: monotonic, and bumped above every ts seen from the
  // server, so edits are causally ordered despite skewed device clocks.
  const hlcRef = useRef<number>(0);

  const applyPresence = useCallback((p: Presence) => {
    presenceRef.current = p;
    setPresenceState(p);
  }, []);

  const nextTs = useCallback(() => {
    const t = Math.max(Date.now(), hlcRef.current + 1);
    hlcRef.current = t;
    return t;
  }, []);

  const pull = useCallback(
    async (first?: boolean): Promise<boolean> => {
      const roomId = roomIdRef.current;
      if (!roomId || pushingRef.current) return false;
      try {
        const r = await fetch(`/api/rooms/${roomId}`);
        if (r.status === 404) {
          // Room doesn't exist yet — let init create it from our seed. Not an
          // error on the first probe; a mid-session 404 (room wiped) is.
          roomMissingRef.current = true;
          if (!first) setStatus('error');
          return false;
        }
        if (!r.ok) throw new Error('bad');
        roomMissingRef.current = false;
        const d = await r.json();
        if (!d || !Array.isArray(d.activities)) throw new Error('bad');
        applyPresence(d.presence || {});
        // Comments merge independently of the doc-level last-write-wins: union
        // remote comments into local every pull (even while a push is pending)
        // so concurrent messages are never dropped.
        {
          const st = stateRef.current;
          const merged = mergeComments(st.comments, d.comments || {});
          if (merged !== st.comments) st.setComments(merged);
        }
        // First contact adopts the server as source of truth (adoptItems drops
        // our pristine seed defaults the server doesn't have, so a pre-existing
        // delete isn't resurrected, while keeping items the user touched here).
        // Every later pull uses the per-item convergent merge, so a remote add
        // shows up even while our own push is pending and a stale server
        // snapshot can't wipe a local edit — pickItem keeps the newer version.
        {
          const st = stateRef.current;
          const combine = adoptedRef.current ? mergeItems : adoptItems;
          adoptedRef.current = true;
          const ma = combine(st.activities, d.activities);
          if (ma !== st.activities) st.setActivities(ma);
          if (Array.isArray(d.packing)) {
            const mp = combine(st.packing, d.packing);
            if (mp !== st.packing) st.setPacking(mp);
          }
          if (Array.isArray(d.foods)) {
            const mf = combine(st.foods, d.foods);
            if (mf !== st.foods) st.setFoods(mf);
          }
          if ((d.updatedAt || 0) > (docTsRef.current || 0)) docTsRef.current = d.updatedAt || 0;
        }
        // Advance the hybrid logical clock past every ts we just observed so our
        // next edit is ordered after anything already on the server.
        {
          let mx = hlcRef.current;
          const scan = (arr: unknown) => {
            if (!Array.isArray(arr)) return;
            for (const it of arr) {
              const o = it as { ts?: number; checkTs?: Record<string, number> };
              if (o && typeof o.ts === 'number' && o.ts > mx) mx = o.ts;
              if (o && o.checkTs) for (const k in o.checkTs) if (o.checkTs[k] > mx) mx = o.checkTs[k];
            }
          };
          scan(d.activities);
          scan(d.packing);
          scan(d.foods);
          const cm = (d.comments || {}) as Record<string, { ts?: number }[]>;
          for (const k in cm) {
            if (Array.isArray(cm[k])) for (const c of cm[k]) if (c && typeof c.ts === 'number' && c.ts > mx) mx = c.ts;
          }
          hlcRef.current = mx;
        }
        setStatus('live');
        setPresTick(Date.now());
        return true;
      } catch {
        if (!first) setStatus('error');
        return false;
      }
    },
    [applyPresence],
  );

  const pushNow = useCallback(async (opts?: { keepalive?: boolean }): Promise<void> => {
    const roomId = roomIdRef.current;
    if (!roomId || statusRef.current === 'local') return;
    // Never push our seed over an existing room we haven't reconciled with yet
    // (first pull) — that would resurrect items deleted before we joined. Only a
    // confirmed-missing room (404) may be created from seed.
    if (!adoptedRef.current && !roomMissingRef.current) return;
    pendingPushRef.current = false;
    pushingRef.current = true;
    const now = Date.now();
    const st = stateRef.current;
    const pres: Presence = { ...(presenceRef.current || {}) };
    const myEd = myEdRef.current;
    pres[devId()] = {
      mid: st.me,
      ts: now,
      tab: st.tab,
      ed: myEd && now - myEd.ts < 12000 ? myEd.id : null,
      edTs: myEd ? myEd.ts : 0,
    };
    for (const k of Object.keys(pres)) {
      if (now - (pres[k].ts || 0) > 120000) delete pres[k];
    }
    applyPresence(pres);
    try {
      const doc = {
        activities: st.activities,
        packing: st.packing,
        foods: st.foods,
        comments: st.comments,
        presence: pres,
        updatedAt: now,
      };
      const body = JSON.stringify(doc);
      const r = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        // keepalive lets the write survive the page being backgrounded/closed
        // (the flush on visibilitychange/pagehide), so a just-saved add isn't
        // lost when the user immediately switches away on mobile. The spec caps
        // keepalive bodies (~64KB); above that fall back to a normal request so
        // we never silently drop the write with a TypeError.
        keepalive: !!opts?.keepalive && body.length < 60000,
      });
      if (!r.ok) throw new Error('bad');
      docTsRef.current = now;
      setStatus('live');
      // Report "saved" only when a real user content change actually reached the
      // server — never on a presence/heartbeat push, never on a poll recovery.
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setSaveState('saved');
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(
          () => setSaveState((s) => (s === 'saved' ? 'idle' : s)),
          1500,
        );
      }
    } catch {
      setStatus('error');
      // Surface the error only while a user change is still unsaved; the pending
      // dirty change will be retried by the heartbeat / next flush.
      if (dirtyRef.current) setSaveState('error');
    }
    pushingRef.current = false;
  }, [applyPresence]);

  const pushSoon = useCallback(
    (opts?: { silent?: boolean }) => {
      if (statusRef.current === 'local') return;
      pendingPushRef.current = true;
      if (!opts?.silent) {
        dirtyRef.current = true;
        clearTimeout(savedTimerRef.current);
        setSaveState('saving');
      }
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void pushNow();
      }, 500);
    },
    [pushNow],
  );

  const touch = useCallback(
    (id: string) => {
      myEdRef.current = { id, ts: Date.now() };
      // Opening an editor only broadcasts an "editing" presence marker — not a
      // content save — so it shouldn't flash the save badge.
      pushSoon({ silent: true });
    },
    [pushSoon],
  );

  const heartbeat = useCallback(async () => {
    if (document.hidden || !roomIdRef.current || statusRef.current === 'local') return;
    await pull();
    void pushNow();
  }, [pull, pushNow]);

  // initSync — runs once on mount.
  useEffect(() => {
    docTsRef.current = 0;
    adoptedRef.current = false;
    roomMissingRef.current = false;
    applyPresence({});
    // Room id comes from the URL. Accept both ?room= (used when reopening the
    // page in Chrome from an in-app browser, whose localStorage doesn't carry
    // over) and the canonical #room= hash.
    const qRoom = new URLSearchParams(location.search).get('room');
    const hRoom = (location.hash || '').match(/room=([A-Za-z0-9-]+)/);
    const id = qRoom && /^[A-Za-z0-9-]+$/.test(qRoom) ? qRoom : hRoom ? hRoom[1] : ROOM_DEFAULT;
    roomIdRef.current = id;
    try {
      localStorage.setItem('paros-room', id);
    } catch {
      /* ignore */
    }
    try {
      // Normalise to a clean pathname + #room= hash (drops any ?room= query).
      if (location.search || !(location.hash || '').includes(id)) {
        history.replaceState(null, '', location.pathname + '#room=' + id);
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      const ok = await pull(true);
      // Create the room from our seed only when it genuinely doesn't exist (a
      // 404), never on a transient read failure over an existing room.
      if (!ok && !cancelled && roomMissingRef.current) await pushNow();
    })();

    const pollTimer = setInterval(() => {
      if (!document.hidden) void pull();
    }, 2000);
    const beatTimer = setInterval(() => void heartbeat(), 15000);

    // Flush pending (or previously failed) writes the moment the tab is hidden
    // or the page is being torn down, using a keepalive request so it completes
    // even if the app is killed right after. Without this, saving an item and
    // immediately backgrounding the app on mobile (within the 500ms push
    // debounce) lost the write — the user's "it failed, I added it again" case.
    const flush = () => {
      clearTimeout(debounceRef.current);
      void pushNow({ keepalive: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      clearInterval(beatTimer);
      clearTimeout(debounceRef.current);
      clearTimeout(savedTimerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever the synced data or member changes,
  // mirroring the prototype's save()/pull() localStorage writes.
  useEffect(() => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          me: opts.me,
          activities: opts.activities,
          packing: opts.packing,
          foods: opts.foods,
          comments: opts.comments,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [opts.me, opts.activities, opts.packing, opts.foods, opts.comments]);

  return {
    status,
    saveState,
    presence,
    presTick,
    roomId: roomIdRef.current,
    nextTs,
    touch,
    pushSoon,
  };
}
