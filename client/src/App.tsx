import { useEffect, useMemo, useState } from 'react';
import { css } from './css';
import { KEY, MEMBERS, defaultDoc, normLink } from './data';
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
import type {
  Activity,
  Comment,
  Comments,
  EditChip,
  Food,
  Lang,
  ListKey,
  PackItem,
  SheetState,
  Tab,
  Weather,
} from './types';
import type { ActView, AsgChip, FoodView, PackView } from './viewmodels';
import Header from './components/Header';
import StartScreen from './components/StartScreen';
import type { MeChip } from './components/StartScreen';
import HomeTab from './components/HomeTab';
import ActivitiesTab from './components/ActivitiesTab';
import PackingTab from './components/PackingTab';
import FoodTab from './components/FoodTab';
import BottomNav from './components/BottomNav';
import type { NavItem } from './components/BottomNav';
import ProfileModal from './components/ProfileModal';
import EditSheet from './components/EditSheet';
import type { SheetChip } from './components/EditSheet';
import InstallPrompt from './components/InstallPrompt';
import ItemDetail from './components/ItemDetail';
import type { DetailComment } from './components/ItemDetail';

interface Initial {
  me: string | null;
  lang: Lang;
  activities: Activity[];
  packing: PackItem[];
  foods: Food[];
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
];

export default function App() {
  const initial = useMemo(loadInitial, []);
  const [me, setMe] = useState<string | null>(initial.me);
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [tab, setTab] = useState<Tab>('home');
  const [activities, setActivities] = useState<Activity[]>(initial.activities);
  const [packing, setPacking] = useState<PackItem[]>(initial.packing);
  const [foods, setFoods] = useState<Food[]>(initial.foods);
  const [comments, setComments] = useState<Comments>(initial.comments);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [detail, setDetail] = useState<{ list: ListKey; id: string } | null>(null);
  const [fName, setFName] = useState('');
  const [fMemo, setFMemo] = useState('');
  const [fLink, setFLink] = useState('');
  const [fCat, setFCat] = useState<'shared' | 'personal'>('shared');
  const [fAsg, setFAsg] = useState<string[]>([]);

  const { days, status: weatherStatus } = useWeather();
  const sync = useSync({
    me,
    tab,
    activities,
    packing,
    foods,
    comments,
    setActivities,
    setPacking,
    setFoods,
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
    sync.pushSoon();
  };
  const changeTab = (t: Tab) => {
    setTab(t);
    sync.pushSoon();
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
      const a = activities.find((x) => x.id === id);
      if (a) openEditAct(a);
    } else if (list === 'foods') {
      const f = foods.find((x) => x.id === id);
      if (f) openEditFood(f);
    } else {
      const p = packing.find((x) => x.id === id);
      if (p) openEditPack(p);
    }
  };
  const addComment = (itemId: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    const c: Comment = {
      id: myDev + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      mid: me,
      text: t,
      ts: Date.now(),
    };
    setComments((prev) => ({ ...prev, [itemId]: [...(prev[itemId] || []), c] }));
    sync.pushSoon();
  };
  const onCheck = (p: PackItem) => {
    sync.touch(p.id);
    const personal = p.cat === 'personal';
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
          };
        }
        return { ...it, checked: !it.checked };
      }),
    );
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
    if (sheet.mode === 'add') {
      if (sheet.list === 'activities') {
        setActivities((prev) => [
          ...prev,
          { id: 'x' + Date.now(), name: n, zh: '', desc: memo, link, votes: [] },
        ]);
      } else if (sheet.list === 'packing') {
        setPacking((prev) => [
          ...prev,
          { id: 'x' + Date.now(), name: n, zh: '', cat, assignees: [...fAsg], checked: false },
        ]);
      } else {
        setFoods((prev) => [
          ...prev,
          { id: 'x' + Date.now(), name: n, zh: '', type: '추가', memo, link, likes: [] },
        ]);
      }
    } else {
      const id = sheet.id;
      if (sheet.list === 'activities') {
        setActivities((prev) =>
          prev.map((it) =>
            it.id !== id ? it : { ...it, name: n, zh: it.name === n ? it.zh : '', desc: memo, link },
          ),
        );
      } else if (sheet.list === 'foods') {
        setFoods((prev) =>
          prev.map((it) =>
            it.id !== id ? it : { ...it, name: n, zh: it.name === n ? it.zh : '', memo, link },
          ),
        );
      } else {
        setPacking((prev) =>
          prev.map((it) =>
            it.id !== id
              ? it
              : { ...it, name: n, zh: it.name === n ? it.zh : '', cat, assignees: [...fAsg] },
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
    if (sheet.list === 'activities') setActivities((prev) => prev.filter((it) => it.id !== id));
    else if (sheet.list === 'packing') setPacking((prev) => prev.filter((it) => it.id !== id));
    else setFoods((prev) => prev.filter((it) => it.id !== id));
    setSheet(null);
    sync.pushSoon();
  };

  // Derived view models
  const meMember = MEMBERS.find((m) => m.id === me);
  const myInitial = (meMember ? meMember.name : '?').slice(0, 1);
  const myColor = meMember ? meMember.color : '#8AA5B8';

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

  const acts: ActView[] = activities.map((a) => {
    const desc = zh ? ACT_DESC_ZH[a.id] || a.desc || '' : a.desc || '';
    return {
      id: a.id,
      name: zh && a.zh ? a.zh : a.name,
      desc,
      descShow: !!desc,
      link: normLink(a.link),
      linkShow: !!a.link,
      commentCount: (comments[a.id] || []).length,
      edChips: edFor(a.id),
      onTap: () => openDetail('activities', a.id),
    };
  });

  const foodList: FoodView[] = foods.map((f) => {
    const memo = zh ? FOOD_MEMO_ZH[f.id] || f.memo || '' : f.memo || '';
    return {
      id: f.id,
      name: zh && f.zh ? f.zh : f.name,
      type: zh ? FOOD_TYPE_ZH[f.type] || f.type || '其他' : f.type || '기타',
      memo,
      memoShow: !!memo,
      link: normLink(f.link),
      linkShow: !!f.link,
      commentCount: (comments[f.id] || []).length,
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
      commentCount: (comments[p.id] || []).length,
      edChips: edFor(p.id),
      onCheck: () => onCheck(p),
      onTap: () => openDetail('packing', p.id),
    };
  };
  const sharedRaw = packing.filter((p) => p.cat === 'shared');
  const personalRaw = packing.filter((p) => p.cat === 'personal');
  const sharedItems = sharedRaw.map(packRow);
  const personalItems = personalRaw.map(packRow);
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
  const detailComments: DetailComment[] = detail
    ? (comments[detail.id] || [])
        .slice()
        .sort((a, b) => a.ts - b.ts)
        .map((c) => {
          const m = MEMBERS.find((x) => x.id === c.mid);
          return {
            id: c.id,
            name: m ? m.name : zh ? '有人' : '누군가',
            color: m ? m.color : '#8AA5B8',
            text: c.text,
            time: fmtTime(c.ts),
            isMe: !!me && c.mid === me,
          };
        })
    : [];
  let detailVM: {
    title: string;
    typeLabel: string;
    meta: string;
    link: string;
    linkShow: boolean;
  } | null = null;
  if (detail) {
    if (detail.list === 'activities') {
      const a = activities.find((x) => x.id === detail.id);
      if (a)
        detailVM = {
          title: zh && a.zh ? a.zh : a.name,
          typeLabel: '',
          meta: zh ? ACT_DESC_ZH[a.id] || a.desc || '' : a.desc || '',
          link: normLink(a.link),
          linkShow: !!a.link,
        };
    } else if (detail.list === 'foods') {
      const f = foods.find((x) => x.id === detail.id);
      if (f)
        detailVM = {
          title: zh && f.zh ? f.zh : f.name,
          typeLabel: zh ? FOOD_TYPE_ZH[f.type] || f.type || '' : f.type || '',
          meta: zh ? FOOD_MEMO_ZH[f.id] || f.memo || '' : f.memo || '',
          link: normLink(f.link),
          linkShow: !!f.link,
        };
    } else {
      const p = packing.find((x) => x.id === detail.id);
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

  const isHome = !!me && tab === 'home';
  const isAct = !!me && tab === 'act';
  const isPack = !!me && tab === 'pack';
  const isFood = !!me && tab === 'food';

  return (
    <div
      style={css(
        'min-height:100vh;background:linear-gradient(180deg,#A8D8F5,#CDEBFA);display:flex;justify-content:center',
      )}
    >
      <div
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
            'position:relative;margin-top:-22px;border-radius:22px 22px 0 0;background:#F2F9FE;padding:18px 16px 96px;display:flex;flex-direction:column;gap:14px',
          )}
        >
          {!me && <StartScreen L={L} meChips={meChips} />}
          {isHome && <HomeTab L={L} weatherDays={weatherDays} weatherNote={weatherNote} />}
          {isAct && <ActivitiesTab L={L} lang={lang} acts={acts} onAdd={() => openAdd('activities')} />}
          {isPack && (
            <PackingTab
              L={L}
              lang={lang}
              sharedItems={sharedItems}
              personalItems={personalItems}
              sharedProg={sharedProg}
              personalProg={personalProg}
              onAdd={() => openAdd('packing')}
            />
          )}
          {isFood && <FoodTab L={L} lang={lang} foods={foodList} onAdd={() => openAdd('foods')} />}
        </div>

        {!!me && <BottomNav navs={navs} />}
        <InstallPrompt zh={zh} navOffset={!!me} />
        {detail && detailVM && (
          <ItemDetail
            L={L}
            lang={lang}
            title={detailVM.title}
            typeLabel={detailVM.typeLabel}
            meta={detailVM.meta}
            link={detailVM.link}
            linkShow={detailVM.linkShow}
            comments={detailComments}
            onSend={(text) => addComment(detail.id, text)}
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
