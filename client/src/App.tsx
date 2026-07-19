import { useEffect, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { css } from './css';
import { KEY, MEMBERS, TIDES, defaultDoc, normLink } from './data';
import {
  ACT_DESC_ZH,
  FOOD_MEMO_ZH,
  FOOD_TYPE_ZH,
  LIST_TITLE,
  UI,
  WDESC_ZH,
} from './i18n';
import { devId, useSync } from './hooks/useSync';
import { useWeather } from './hooks/useWeather';
import { MediaError, isVideoFile, mediaUrl, uploadMedia } from './media';
import type { PhotoUpload } from './media';
import type {
  Activity,
  Comment,
  Comments,
  EditChip,
  Food,
  Lang,
  ListKey,
  MediaRef,
  PackItem,
  Photo,
  SheetState,
  Tab,
  Weather,
} from './types';
import type { ActView, AsgChip, AsgTab, FoodView, PackView, PhotoView } from './viewmodels';
import Header from './components/Header';
import StartScreen from './components/StartScreen';
import type { MeChip } from './components/StartScreen';
import HomeTab from './components/HomeTab';
import ActivitiesTab from './components/ActivitiesTab';
import PackingTab from './components/PackingTab';
import FoodTab from './components/FoodTab';
import PhotoTab from './components/PhotoTab';
import BottomNav from './components/BottomNav';
import type { NavItem } from './components/BottomNav';
import ProfileModal from './components/ProfileModal';
import EditSheet from './components/EditSheet';
import type { SheetChip } from './components/EditSheet';
import InstallPrompt from './components/InstallPrompt';
import ItemDetail from './components/ItemDetail';
import type { DetailComment } from './components/ItemDetail';
import SyncBadge from './components/SyncBadge';

interface Initial {
  me: string | null;
  lang: Lang;
  activities: Activity[];
  packing: PackItem[];
  foods: Food[];
  photos: Photo[];
  comments: Comments;
}

function loadInitial(): Initial {
  const d = defaultDoc();
  let lang: Lang = 'ko';
  try {
    if (localStorage.getItem('paros-lang') === 'zh') lang = 'zh';
  } catch {
    /* ignore */
  }
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const j = JSON.parse(s);
      return {
        me: j.me || null,
        lang,
        activities: j.activities || d.activities,
        packing: j.packing || d.packing,
        foods: j.foods || d.foods,
        photos: Array.isArray(j.photos) ? j.photos : d.photos,
        comments: j.comments && typeof j.comments === 'object' ? j.comments : {},
      };
    }
  } catch {
    /* ignore */
  }
  return { me: null, lang, ...d };
}

const KO_DAYS = ['화', '수', '목'];
const ZH_DAYS = ['周二', '周三', '周四'];
const FALLBACK_WEATHER: Weather[] = [
  { date: '8/4', hi: 30, lo: 24, pp: '40%', desc: '무덥고 습함' },
  { date: '8/5', hi: 30, lo: 24, pp: '40%', desc: '소나기 가능' },
  { date: '8/6', hi: 31, lo: 25, pp: '30%', desc: '대체로 맑음' },
];
const NAV_DEFS: [Tab, string][] = [
  ['home', 'home'],
  ['act', 'surfing'],
  ['pack', 'checklist'],
  ['food', 'restaurant'],
  ['photo', 'photo_library'],
];
// Left→right tab order for swipe navigation (single source of truth = the nav).
const TAB_ORDER: Tab[] = NAV_DEFS.map(([t]) => t);

// Monotonic key source for in-flight gallery uploads (module scope so it never
// resets on re-render).
let uploadSeq = 0;

export default function App() {
  const initial = useMemo(loadInitial, []);
  const [me, setMe] = useState<string | null>(initial.me);
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [tab, setTab] = useState<Tab>('home');
  const [activities, setActivities] = useState<Activity[]>(initial.activities);
  const [packing, setPacking] = useState<PackItem[]>(initial.packing);
  const [foods, setFoods] = useState<Food[]>(initial.foods);
  const [photos, setPhotos] = useState<Photo[]>(initial.photos);
  const [comments, setComments] = useState<Comments>(initial.comments);
  // In-flight/failed gallery uploads live here (not in PhotoTab) so switching
  // tabs mid-upload can't discard a failure's error/retry affordance.
  const [uploads, setUploads] = useState<PhotoUpload[]>([]);
  // True while the album tab is in multi-select mode — gates the tab swipe so a
  // grid drag can't remount PhotoTab and drop the selection (see swipeArmed).
  const [photoSelecting, setPhotoSelecting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [detail, setDetail] = useState<{ list: ListKey; id: string } | null>(null);
  const [fName, setFName] = useState('');
  const [fMemo, setFMemo] = useState('');
  const [fLink, setFLink] = useState('');
  const [fCat, setFCat] = useState<'shared' | 'personal'>('shared');
  const [fAsg, setFAsg] = useState<string[]>([]);
  const [slideDir, setSlideDir] = useState(0); // tab-change direction for the slide anim

  const { days, hours: weatherHours, status: weatherStatus } = useWeather();
  const sync = useSync({
    me,
    tab,
    activities,
    packing,
    foods,
    photos,
    comments,
    setActivities,
    setPacking,
    setFoods,
    setPhotos,
    setComments,
  });

  useEffect(() => {
    document.documentElement.lang = lang; // drives the zh-only cute-font CSS
    try {
      localStorage.setItem('paros-lang', lang);
    } catch {
      /* ignore */
    }
  }, [lang]);


  const zh = lang === 'zh';
  const L = UI[zh ? 'zh' : 'ko'];
  const myDev = useMemo(() => devId(), []);

  // D-day label
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(2026, 7, 4);
  const end = new Date(2026, 7, 6);
  const diff = Math.round((start.getTime() - t0.getTime()) / 86400000);
  const ddayLabel =
    diff > 0
      ? 'D-' + diff
      : t0 <= end
        ? zh
          ? '旅行中!'
          : '여행 중!'
        : zh
          ? '旅行结束'
          : '여행 완료';

  // Presence -> "editing" chips
  const presence = sync.presence;
  const edFor = (id: string): EditChip[] => {
    const out: EditChip[] = [];
    const nowP = Date.now();
    for (const k of Object.keys(presence)) {
      if (k === myDev) continue;
      const p = presence[k];
      if (p.ed === id && nowP - (p.edTs || 0) < 15000) {
        const m = MEMBERS.find((x) => x.id === p.mid);
        const nm = m ? m.name : zh ? '有人' : '누군가';
        out.push({
          label: nm + (zh ? ' 修改中' : ' 수정 중'),
          short: nm,
          color: m ? m.color : '#8AA5B8',
        });
      }
    }
    return out;
  };

  // Mutations
  const selectMe = (id: string) => {
    setMe(id);
    setProfileOpen(false);
    sync.pushSoon({ silent: true });
  };
  const changeTab = (t: Tab) => {
    const oi = TAB_ORDER.indexOf(tab);
    const ni = TAB_ORDER.indexOf(t);
    setSlideDir(ni < oi ? -1 : 1);
    setTab(t);
    sync.pushSoon({ silent: true });
  };
  const openAdd = (list: ListKey) => {
    setSheet({ mode: 'add', list });
    setFName('');
    setFMemo('');
    setFLink('');
    setFCat('shared');
    setFAsg([]);
  };
  const openEditAct = (a: Activity) => {
    sync.touch(a.id);
    setSheet({ mode: 'edit', list: 'activities', id: a.id });
    setFName(a.name);
    setFMemo(a.desc || '');
    setFLink(a.link || '');
    setFCat('shared');
    setFAsg([]);
  };
  const openEditFood = (f: Food) => {
    sync.touch(f.id);
    setSheet({ mode: 'edit', list: 'foods', id: f.id });
    setFName(f.name);
    setFMemo(f.memo || '');
    setFLink(f.link || '');
    setFCat('shared');
    setFAsg([]);
  };
  const openEditPack = (p: PackItem) => {
    sync.touch(p.id);
    setSheet({ mode: 'edit', list: 'packing', id: p.id });
    setFName(p.name);
    setFMemo('');
    setFLink('');
    setFCat(p.cat || 'shared');
    setFAsg(p.assignees ? [...p.assignees] : []);
  };
  const openDetail = (list: ListKey, id: string) => setDetail({ list, id });
  const editFromDetail = () => {
    if (!detail) return;
    const { list, id } = detail;
    setDetail(null);
    if (list === 'activities') {
      const a = activities.find((x) => x.id === id && !x.del);
      if (a) openEditAct(a);
    } else if (list === 'foods') {
      const f = foods.find((x) => x.id === id && !x.del);
      if (f) openEditFood(f);
    } else {
      const p = packing.find((x) => x.id === id && !x.del);
      if (p) openEditPack(p);
    }
  };
  const addComment = (itemId: string, text: string, replyTo?: string, media?: MediaRef) => {
    const t = text.trim();
    if (!t && !media) return;
    const c: Comment = {
      id: myDev + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      mid: me,
      text: t,
      ts: sync.nextTs(),
      ...(replyTo ? { replyTo } : {}),
      ...(media ? { media } : {}),
    };
    setComments((prev) => ({ ...prev, [itemId]: [...(prev[itemId] || []), c] }));
    sync.pushSoon();
  };
  // A successfully-uploaded photo/video → a synced gallery entry. The binary
  // already lives in the room's media volume; only this metadata travels.
  const addPhoto = (ref: MediaRef) => {
    const now = sync.nextTs();
    const p: Photo = {
      id: myDev + '-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      ...ref,
      by: me,
      ts: now,
    };
    setPhotos((prev) => [...prev, p]);
    sync.pushSoon();
  };
  // Soft-delete a gallery photo (monotonic tombstone, like list items). The
  // underlying file is left in the volume — harmless, and keeps the merge simple.
  const deletePhoto = (id: string) => {
    const now = sync.nextTs();
    setPhotos((prev) => prev.map((p) => (p.id !== id ? p : { ...p, del: true, ts: now })));
    sync.pushSoon();
  };
  // Bulk soft-delete (selection mode): one monotonic tombstone sweep + one push.
  const deletePhotos = (ids: string[]) => {
    if (!ids.length) return;
    const gone = new Set(ids);
    const now = sync.nextTs();
    setPhotos((prev) => prev.map((p) => (gone.has(p.id) && !p.del ? { ...p, del: true, ts: now } : p)));
    sync.pushSoon();
  };
  const patchUpload = (key: string, p: Partial<PhotoUpload>) =>
    setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const runUpload = async (up: PhotoUpload) => {
    patchUpload(up.key, { progress: 0, error: null });
    // Progress lifts to App state, so gate on whole-percent changes to avoid
    // re-rendering the whole tree on every sub-percent XHR progress tick.
    let lastPct = 0;
    try {
      const ref = await uploadMedia(sync.roomId, up.file, (f) => {
        const pct = Math.round(f * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          patchUpload(up.key, { progress: f });
        }
      });
      addPhoto(ref);
      setUploads((u) => u.filter((x) => x.key !== up.key));
    } catch (err) {
      patchUpload(up.key, { error: err instanceof MediaError ? err.code : 'upload' });
    }
  };
  const pickPhotoFiles = (files: File[]) => {
    // Show every picked file as a queued tile immediately, then upload them one
    // at a time (decoding several large photos at once spikes mobile memory).
    const ups: PhotoUpload[] = files.map((file) => ({
      key: 'u' + ++uploadSeq,
      file,
      isVideo: isVideoFile(file),
      progress: 0,
      error: null,
    }));
    setUploads((u) => [...u, ...ups]);
    void ups.reduce(async (prev, up) => {
      await prev;
      await runUpload(up);
    }, Promise.resolve());
  };
  // Soft-delete: replace the message with a monotonic tombstone (text stripped)
  // rather than removing it, so the append-only sync merge can't resurrect it.
  const deleteComment = (itemId: string, id: string) => {
    setComments((prev) => {
      const list = prev[itemId];
      if (!list) return prev;
      let hit = false;
      const next = list.map((c) => {
        if (c.id !== id || c.del) return c;
        hit = true;
        return { ...c, text: '', del: true };
      });
      return hit ? { ...prev, [itemId]: next } : prev;
    });
    sync.pushSoon();
  };
  const onCheck = (p: PackItem) => {
    sync.touch(p.id);
    const personal = p.cat === 'personal';
    const now = sync.nextTs();
    setPacking((prev) =>
      prev.map((it) => {
        if (it.id !== p.id) return it;
        if (personal) {
          const cb = it.checkedBy || [];
          return {
            ...it,
            checkedBy: cb.includes(me as string)
              ? cb.filter((x) => x !== me)
              : [...cb, me as string],
            // Per-member toggle time so concurrent checks merge instead of clobber.
            checkTs: { ...(it.checkTs || {}), [me as string]: now },
            ts: now,
          };
        }
        return { ...it, checked: !it.checked, ts: now };
      }),
    );
    // touch() above only queued a silent presence push; a check IS a content
    // change, so flag the save badge explicitly.
    sync.pushSoon();
  };
  const toggleAsg = (mid: string) => {
    setFAsg((cur) => (cur.includes(mid) ? cur.filter((x) => x !== mid) : [...cur, mid]));
  };
  const sheetSave = () => {
    if (!sheet) return;
    const n = fName.trim();
    if (!n) return;
    const memo = fMemo.trim();
    const cat = fCat;
    const link = (fLink || '').trim();
    const now = sync.nextTs();
    if (sheet.mode === 'add') {
      if (sheet.list === 'activities') {
        setActivities((prev) => [
          ...prev,
          { id: 'x' + now, name: n, zh: '', desc: memo, link, votes: [], ts: now },
        ]);
      } else if (sheet.list === 'packing') {
        setPacking((prev) => [
          ...prev,
          { id: 'x' + now, name: n, zh: '', cat, assignees: [...fAsg], checked: false, ts: now },
        ]);
      } else {
        setFoods((prev) => [
          ...prev,
          { id: 'x' + now, name: n, zh: '', type: '추가', memo, link, likes: [], ts: now },
        ]);
      }
    } else {
      const id = sheet.id;
      if (sheet.list === 'activities') {
        setActivities((prev) =>
          prev.map((it) =>
            it.id !== id
              ? it
              : { ...it, name: n, zh: it.name === n ? it.zh : '', desc: memo, link, ts: now },
          ),
        );
      } else if (sheet.list === 'foods') {
        setFoods((prev) =>
          prev.map((it) =>
            it.id !== id ? it : { ...it, name: n, zh: it.name === n ? it.zh : '', memo, link, ts: now },
          ),
        );
      } else {
        setPacking((prev) =>
          prev.map((it) =>
            it.id !== id
              ? it
              : { ...it, name: n, zh: it.name === n ? it.zh : '', cat, assignees: [...fAsg], ts: now },
          ),
        );
      }
    }
    setSheet(null);
    sync.pushSoon();
  };
  const doDelete = () => {
    if (!sheet || sheet.mode !== 'edit' || !sheet.id) return;
    const id = sheet.id;
    const now = sync.nextTs();
    // Soft-delete: mark a monotonic tombstone (del:true) instead of removing the
    // element, so the per-item sync merge propagates the deletion to every
    // device and a stale copy can never resurrect it. View models hide `del`.
    const tomb = <T extends { id: string }>(prev: T[]) =>
      prev.map((it) => (it.id !== id ? it : { ...it, del: true, ts: now }));
    if (sheet.list === 'activities') setActivities(tomb);
    else if (sheet.list === 'packing') setPacking(tomb);
    else setFoods(tomb);
    setSheet(null);
    sync.pushSoon();
  };

  // Horizontal swipe to move between tabs. Only a decisive, mostly-horizontal,
  // reasonably quick gesture counts, so it never fights vertical scrolling. It's
  // disabled on the start screen and while any overlay is open (their own
  // touches shouldn't bubble into a tab change).
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Suppressed while the album is in multi-select mode too — otherwise a
  // horizontal drag over the grid would change tabs and remount PhotoTab,
  // silently discarding the in-progress selection.
  const swipeArmed = () => !!me && !sheet && !detail && !profileOpen && !photoSelecting;
  const onTouchStart = (e: TouchEvent) => {
    if (!swipeArmed() || e.touches.length !== 1) {
      swipeRef.current = null;
      return;
    }
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || !swipeArmed()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.t > 700) return;
    const i = TAB_ORDER.indexOf(tab);
    if (i < 0) return;
    const ni = dx < 0 ? Math.min(TAB_ORDER.length - 1, i + 1) : Math.max(0, i - 1);
    if (ni !== i) changeTab(TAB_ORDER[ni]);
  };

  // Derived view models
  const meMember = MEMBERS.find((m) => m.id === me);
  const myInitial = (meMember ? meMember.name : '?').slice(0, 1);
  const myColor = meMember ? meMember.color : '#8AA5B8';

  // Live (non-deleted) comment count for an item's card badge.
  const liveCount = (id: string) => (comments[id] || []).reduce((n, c) => (c.del ? n : n + 1), 0);

  const meChips: MeChip[] = MEMBERS.map((m) => {
    const on = me === m.id;
    return {
      id: m.id,
      label: m.name,
      dot: on ? '#FFFFFF' : m.color,
      bg: on ? m.color : '#FFFFFF',
      fg: on ? '#FFFFFF' : '#33546B',
      bd: on ? m.color : '#D5E7F3',
      isMe: on,
      onTap: () => selectMe(m.id),
    };
  });

  const navs: NavItem[] = NAV_DEFS.map(([t, icon]) => ({
    key: t,
    icon,
    fg: tab === t ? '#0B7CD8' : '#8AA5B8',
    dotOp: tab === t ? 1 : 0,
    onTap: () => changeTab(t),
  }));

  const acts: ActView[] = activities.filter((a) => !a.del).map((a) => {
    const desc = zh ? ACT_DESC_ZH[a.id] || a.desc || '' : a.desc || '';
    return {
      id: a.id,
      name: zh && a.zh ? a.zh : a.name,
      desc,
      descShow: !!desc,
      link: normLink(a.link),
      linkShow: !!a.link,
      commentCount: liveCount(a.id),
      edChips: edFor(a.id),
      onTap: () => openDetail('activities', a.id),
    };
  });

  const foodList: FoodView[] = foods.filter((f) => !f.del).map((f) => {
    const memo = zh ? FOOD_MEMO_ZH[f.id] || f.memo || '' : f.memo || '';
    return {
      id: f.id,
      name: zh && f.zh ? f.zh : f.name,
      type: zh ? FOOD_TYPE_ZH[f.type] || f.type || '其他' : f.type || '기타',
      memo,
      memoShow: !!memo,
      link: normLink(f.link),
      linkShow: !!f.link,
      commentCount: liveCount(f.id),
      edChips: edFor(f.id),
      onTap: () => openDetail('foods', f.id),
    };
  });

  const packRow = (p: PackItem): PackView => {
    const personal = p.cat === 'personal';
    const ck = personal ? (p.checkedBy || []).includes(me as string) : !!p.checked;
    return {
      id: p.id,
      name: zh && p.zh ? p.zh : p.name,
      checked: ck,
      asgChips: personal
        ? []
        : (p.assignees || [])
            .map((id) => {
              const m = MEMBERS.find((x) => x.id === id);
              return m ? { label: m.name, bg: m.color } : null;
            })
            .filter((x): x is AsgChip => x !== null),
      assigneeIds: personal ? [] : (p.assignees || []).filter((id) => MEMBERS.some((m) => m.id === id)),
      commentCount: liveCount(p.id),
      edChips: edFor(p.id),
      onCheck: () => onCheck(p),
      onTap: () => openDetail('packing', p.id),
    };
  };
  const sharedRaw = packing.filter((p) => !p.del && p.cat === 'shared');
  const personalRaw = packing.filter((p) => !p.del && p.cat === 'personal');
  const sharedItems = sharedRaw.map(packRow);
  const personalItems = personalRaw.map(packRow);
  // Split shared items into assigned (shown up top, filterable by assignee) and
  // still-unassigned (shown separately below), per the "담당자별 뱃지 탭" request.
  const sharedAssigned = sharedItems.filter((p) => p.assigneeIds.length > 0);
  const sharedUnassigned = sharedItems.filter((p) => p.assigneeIds.length === 0);
  const asgTabs: AsgTab[] = MEMBERS.map((m) => ({
    id: m.id,
    label: m.name,
    color: m.color,
    count: sharedAssigned.filter((p) => p.assigneeIds.includes(m.id)).length,
  })).filter((t) => t.count > 0);
  const sharedProg =
    sharedRaw.filter((p) => p.checked).length + '/' + sharedRaw.length + (zh ? ' 完成' : ' 완료');
  const personalProg =
    personalRaw.filter((p) => (p.checkedBy || []).includes(me as string)).length +
    '/' +
    personalRaw.length +
    (zh ? ' 完成 · 按我的勾选' : ' 완료 · 내 기준');

  const weatherDays: Weather[] = (days || FALLBACK_WEATHER).map((w, i) => ({
    ...w,
    date: w.date + ' (' + (zh ? ZH_DAYS[i] || '' : KO_DAYS[i] || '') + ')',
    desc: zh ? WDESC_ZH[w.desc] || w.desc : w.desc,
  }));
  // Static KHOA tide table + the same localized weekday labels the weather cards use.
  const tideDays = TIDES.map((t, i) => ({
    ...t,
    dow: zh ? ZH_DAYS[i] || '' : KO_DAYS[i] || '',
  }));
  const weatherNote =
    weatherStatus === 'live'
      ? zh
        ? '大川海水浴场实时预报 (Open-Meteo)'
        : '대천해수욕장 기준 실시간 예보 (Open-Meteo)'
      : weatherStatus === 'loading'
        ? zh
          ? '正在加载预报…'
          : '예보 불러오는 중…'
        : zh
          ? '尚未有实际预报，先按8月初往年水平显示 · 出发前两周左右会自动切换为实际预报'
          : '아직 실제 예보 전이라 8월 초 평년 수준으로 표시 중 · 출발 2주 전쯤부터 자동으로 실제 예보로 바뀌어요';

  // Bottom-sheet derived
  const sheetTitle = sheet
    ? LIST_TITLE[zh ? 'zh' : 'ko'][sheet.list] +
      (sheet.mode === 'add' ? (zh ? ' 添加' : ' 추가') : zh ? ' 编辑' : ' 수정')
    : '';
  const sheetSaveLabel = sheet
    ? sheet.mode === 'add'
      ? zh
        ? '添加'
        : '추가'
      : zh
        ? '保存'
        : '저장'
    : '';
  const asgChips: SheetChip[] = MEMBERS.map((m) => {
    const on = fAsg.includes(m.id);
    return {
      key: m.id,
      label: m.name,
      bg: on ? m.color : '#EFF6FB',
      fg: on ? '#FFFFFF' : '#6B8BA3',
      bd: on ? m.color : '#DCEAF4',
      onTap: () => toggleAsg(m.id),
    };
  });

  // Item detail + comment thread view model
  const fmtTime = (ts: number) => {
    const dt = new Date(ts);
    const p2 = (n: number) => String(n).padStart(2, '0');
    return p2(dt.getHours()) + ':' + p2(dt.getMinutes());
  };
  // Gallery spans several days, so photos show month/day alongside the time.
  const fmtDateTime = (ts: number) => {
    const dt = new Date(ts);
    const p2 = (n: number) => String(n).padStart(2, '0');
    return dt.getMonth() + 1 + '/' + dt.getDate() + ' ' + p2(dt.getHours()) + ':' + p2(dt.getMinutes());
  };
  const whoOf = (mid: string | null) => {
    const m = MEMBERS.find((x) => x.id === mid);
    return { name: m ? m.name : zh ? '有人' : '누군가', color: m ? m.color : '#8AA5B8' };
  };
  const detailComments: DetailComment[] = ((): DetailComment[] => {
    if (!detail) return [];
    const raw = comments[detail.id] || [];
    const byId = new Map(raw.map((c) => [c.id, c] as const));
    return raw
      .filter((c) => !c.del)
      .sort((a, b) => a.ts - b.ts)
      .map((c) => {
        const who = whoOf(c.mid);
        let parent: DetailComment['parent'] = null;
        if (c.replyTo) {
          const p = byId.get(c.replyTo);
          if (!p || p.del) {
            parent = { name: p ? whoOf(p.mid).name : '', text: '', color: '#B7CBDB', deleted: true };
          } else {
            const pw = whoOf(p.mid);
            parent = { name: pw.name, text: p.text, color: pw.color, deleted: false };
          }
        }
        return {
          id: c.id,
          name: who.name,
          color: who.color,
          text: c.text,
          time: fmtTime(c.ts),
          isMe: !!me && c.mid === me,
          replyTo: c.replyTo,
          parent,
          media: c.media
            ? {
                kind: c.media.kind,
                fullUrl: mediaUrl(sync.roomId, c.media.file),
                thumbUrl: c.media.thumb ? mediaUrl(sync.roomId, c.media.thumb) : undefined,
                posterUrl: c.media.poster ? mediaUrl(sync.roomId, c.media.poster) : undefined,
              }
            : null,
        };
      });
  })();
  let detailVM: {
    title: string;
    typeLabel: string;
    meta: string;
    link: string;
    linkShow: boolean;
  } | null = null;
  if (detail) {
    if (detail.list === 'activities') {
      const a = activities.find((x) => x.id === detail.id && !x.del);
      if (a)
        detailVM = {
          title: zh && a.zh ? a.zh : a.name,
          typeLabel: '',
          meta: zh ? ACT_DESC_ZH[a.id] || a.desc || '' : a.desc || '',
          link: normLink(a.link),
          linkShow: !!a.link,
        };
    } else if (detail.list === 'foods') {
      const f = foods.find((x) => x.id === detail.id && !x.del);
      if (f)
        detailVM = {
          title: zh && f.zh ? f.zh : f.name,
          typeLabel: zh ? FOOD_TYPE_ZH[f.type] || f.type || '' : f.type || '',
          meta: zh ? FOOD_MEMO_ZH[f.id] || f.memo || '' : f.memo || '',
          link: normLink(f.link),
          linkShow: !!f.link,
        };
    } else {
      const p = packing.find((x) => x.id === detail.id && !x.del);
      if (p)
        detailVM = {
          title: zh && p.zh ? p.zh : p.name,
          typeLabel: p.cat === 'personal' ? L.personal : L.shared,
          meta: '',
          link: '',
          linkShow: false,
        };
    }
  }

  // Shared gallery: newest first, uploader + URLs resolved for the tab/viewer.
  const photoViews: PhotoView[] = photos
    .filter((p) => !p.del)
    .slice()
    .sort((a, b) => b.ts - a.ts)
    .map((p) => {
      const who = whoOf(p.by);
      // Grid thumbnail = a real image (image thumb, or a video's captured
      // poster) only — never the video clip itself, which an <img> can't render.
      const thumbFile = p.thumb || p.poster;
      return {
        id: p.id,
        kind: p.kind,
        thumbUrl: thumbFile ? mediaUrl(sync.roomId, thumbFile) : '',
        fullUrl: mediaUrl(sync.roomId, p.file),
        posterUrl: p.poster ? mediaUrl(sync.roomId, p.poster) : undefined,
        by: who.name,
        color: who.color,
        time: fmtDateTime(p.ts),
        // Shared trip album (5 trusted members): anyone can remove any item, so
        // "select all → delete" and bulk cleanup work regardless of uploader.
        canDelete: !!me,
        w: p.w,
        h: p.h,
        dur: p.dur,
      };
    });

  const isHome = !!me && tab === 'home';
  const isAct = !!me && tab === 'act';
  const isPack = !!me && tab === 'pack';
  const isFood = !!me && tab === 'food';
  const isPhoto = !!me && tab === 'photo';

  return (
    <div
      style={css(
        'min-height:100vh;background:linear-gradient(180deg,#A8D8F5,#CDEBFA);display:flex;justify-content:center',
      )}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={css(
          'width:100%;max-width:430px;min-height:100vh;background:#F2F9FE;position:relative;box-shadow:0 0 40px rgba(30,100,160,.18)',
        )}
      >
        <Header
          L={L}
          zh={zh}
          ddayLabel={ddayLabel}
          showProfile={!!me}
          myInitial={myInitial}
          myColor={myColor}
          onProfile={() => setProfileOpen(true)}
          onKo={() => setLang('ko')}
          onZh={() => setLang('zh')}
        />
        <div
          style={css(
            'position:relative;margin-top:-22px;border-radius:22px 22px 0 0;background:#F2F9FE;padding:14px 16px 88px;display:flex;flex-direction:column;gap:10px;overflow-x:clip',
          )}
        >
          {!me && <StartScreen L={L} meChips={meChips} />}
          {!!me && (
            <div
              // Remount per tab (key) so the slide-in animation replays; the
              // direction follows the swipe/tap (next tab → in from the right).
              key={tab}
              style={{
                ...css('display:flex;flex-direction:column;gap:10px'),
                animation: `${slideDir < 0 ? 'slideFromLeft' : 'slideFromRight'} .24s ease-out`,
              }}
            >
              {isHome && (
                <HomeTab
                  L={L}
                  lang={lang}
                  weatherDays={weatherDays}
                  weatherNote={weatherNote}
                  tides={tideDays}
                  hours={weatherHours}
                  live={weatherStatus === 'live'}
                />
              )}
              {isAct && (
                <ActivitiesTab L={L} lang={lang} acts={acts} onAdd={() => openAdd('activities')} />
              )}
              {isPack && (
                <PackingTab
                  L={L}
                  lang={lang}
                  sharedAssigned={sharedAssigned}
                  sharedUnassigned={sharedUnassigned}
                  asgTabs={asgTabs}
                  personalItems={personalItems}
                  sharedProg={sharedProg}
                  personalProg={personalProg}
                  onAdd={() => openAdd('packing')}
                />
              )}
              {isFood && <FoodTab L={L} lang={lang} foods={foodList} onAdd={() => openAdd('foods')} />}
              {isPhoto && (
                <PhotoTab
                  L={L}
                  lang={lang}
                  photos={photoViews}
                  uploads={uploads}
                  onPickFiles={pickPhotoFiles}
                  onRetry={runUpload}
                  onDelete={deletePhoto}
                  onDeleteMany={deletePhotos}
                  onSelectingChange={setPhotoSelecting}
                />
              )}
            </div>
          )}
        </div>

        {!!me && <BottomNav navs={navs} />}
        {!!me && sync.saveState !== 'idle' && <SyncBadge hint={sync.saveState} L={L} />}
        <InstallPrompt zh={zh} navOffset={!!me} />
        {detail && detailVM && (
          <ItemDetail
            L={L}
            lang={lang}
            roomId={sync.roomId}
            title={detailVM.title}
            typeLabel={detailVM.typeLabel}
            meta={detailVM.meta}
            link={detailVM.link}
            linkShow={detailVM.linkShow}
            comments={detailComments}
            onSend={(text, replyTo, media) => addComment(detail.id, text, replyTo, media)}
            onDelete={(id) => deleteComment(detail.id, id)}
            onEdit={editFromDetail}
            onClose={() => setDetail(null)}
          />
        )}
        {profileOpen && (
          <ProfileModal
            L={L}
            zh={zh}
            meChips={meChips}
            onClose={() => setProfileOpen(false)}
          />
        )}
        {sheet && (
          <EditSheet
            L={L}
            title={sheetTitle}
            saveLabel={sheetSaveLabel}
            showMemo={sheet.list !== 'packing'}
            showCat={sheet.list === 'packing'}
            showAsg={sheet.list === 'packing' && fCat === 'shared'}
            showDelete={sheet.mode === 'edit'}
            fName={fName}
            fMemo={fMemo}
            fLink={fLink}
            fCat={fCat}
            asgChips={asgChips}
            onName={setFName}
            onMemo={setFMemo}
            onLink={setFLink}
            onCat={setFCat}
            onSave={sheetSave}
            onDelete={doDelete}
            onClose={() => setSheet(null)}
          />
        )}
      </div>
    </div>
  );
}
