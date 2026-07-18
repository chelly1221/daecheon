import { useCallback, useEffect, useRef, useState } from 'react';
import { KEY, ROOM_DEFAULT } from '../data';
import type {
  Activity,
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
  setActivities: (v: Activity[]) => void;
  setPacking: (v: PackItem[]) => void;
  setFoods: (v: Food[]) => void;
}

export interface SyncApi {
  status: SyncStatus;
  presence: Presence;
  presTick: number;
  roomId: string;
  touch: (id: string) => void;
  pushSoon: () => void;
}

export function useSync(opts: SyncOpts): SyncApi {
  const [status, setStatus] = useState<SyncStatus>('connecting');
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const applyPresence = useCallback((p: Presence) => {
    presenceRef.current = p;
    setPresenceState(p);
  }, []);

  const pull = useCallback(
    async (first?: boolean): Promise<boolean> => {
      const roomId = roomIdRef.current;
      if (!roomId || pushingRef.current) return false;
      try {
        const r = await fetch(`/api/rooms/${roomId}`);
        if (!r.ok) throw new Error('bad');
        const d = await r.json();
        if (!d || !Array.isArray(d.activities)) throw new Error('bad');
        applyPresence(d.presence || {});
        if ((d.updatedAt || 0) > (docTsRef.current || 0) && !pendingPushRef.current) {
          docTsRef.current = d.updatedAt || 0;
          const st = stateRef.current;
          st.setActivities(d.activities);
          if (Array.isArray(d.packing)) st.setPacking(d.packing);
          if (Array.isArray(d.foods)) st.setFoods(d.foods);
          setStatus('live');
          setPresTick(Date.now());
        } else {
          setStatus('live');
          setPresTick(Date.now());
        }
        return true;
      } catch {
        if (!first) setStatus('error');
        return false;
      }
    },
    [applyPresence],
  );

  const pushNow = useCallback(async (): Promise<void> => {
    pendingPushRef.current = false;
    const roomId = roomIdRef.current;
    if (!roomId || statusRef.current === 'local') return;
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
        presence: pres,
        updatedAt: now,
      };
      const r = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (!r.ok) throw new Error('bad');
      docTsRef.current = now;
      setStatus('live');
    } catch {
      setStatus('error');
    }
    pushingRef.current = false;
  }, [applyPresence]);

  const pushSoon = useCallback(() => {
    if (statusRef.current === 'local') return;
    pendingPushRef.current = true;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void pushNow();
    }, 500);
  }, [pushNow]);

  const touch = useCallback(
    (id: string) => {
      myEdRef.current = { id, ts: Date.now() };
      pushSoon();
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
    applyPresence({});
    const m = (location.hash || '').match(/room=([A-Za-z0-9-]+)/);
    const id = m ? m[1] : ROOM_DEFAULT;
    roomIdRef.current = id;
    try {
      localStorage.setItem('paros-room', id);
    } catch {
      /* ignore */
    }
    try {
      if (!(location.hash || '').includes(id)) {
        history.replaceState(null, '', '#room=' + id);
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      const ok = await pull(true);
      if (!ok && !cancelled) await pushNow();
    })();

    const pollTimer = setInterval(() => {
      if (!document.hidden) void pull();
    }, 2000);
    const beatTimer = setInterval(() => void heartbeat(), 15000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      clearInterval(beatTimer);
      clearTimeout(debounceRef.current);
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
        }),
      );
    } catch {
      /* ignore */
    }
  }, [opts.me, opts.activities, opts.packing, opts.foods]);

  return {
    status,
    presence,
    presTick,
    roomId: roomIdRef.current,
    touch,
    pushSoon,
  };
}
