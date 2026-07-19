import type {
  Activity,
  Comment,
  Comments,
  Food,
  Identified,
  Member,
  PackItem,
  TideDay,
  TripDoc,
} from './types';

export const KEY = 'paros-trip-2026-v1';
export const ROOM_DEFAULT = 'paros-daecheon-2026-x7k3q9';

/** A message and its delete tombstone both merged in: `del` wins, text stripped. */
function tombstone(c: Comment): Comment {
  return { ...c, text: '', del: true };
}

/**
 * Merge two comment maps as a convergent set union keyed by comment id, sorted
 * by timestamp. A message is immutable once created except for its `del`
 * tombstone, which is monotonic (false→true only), so `del:true` always wins
 * over the live copy of the same id. This converges regardless of the
 * doc-level last-write-wins sync: concurrent messages are never lost and a
 * deletion is never resurrected by a device that hasn't seen it yet. Returns
 * `local` unchanged (same reference) when `remote` changes nothing, so callers
 * can skip needless re-renders.
 */
export function mergeComments(local: Comments, remote: Comments): Comments {
  const loc = local || {};
  const rem = remote || {};
  let changed = false;
  const out: Comments = {};
  const keys = new Set([...Object.keys(loc), ...Object.keys(rem)]);
  for (const k of keys) {
    const l = loc[k] || [];
    const r = rem[k] || [];
    if (r.length === 0) {
      out[k] = l;
      continue;
    }
    const byId = new Map<string, Comment>();
    for (const c of l) byId.set(c.id, c);
    for (const c of r) {
      const cur = byId.get(c.id);
      if (!cur) {
        byId.set(c.id, c);
        changed = true;
      } else if (c.del && !cur.del) {
        // Remote learned of a deletion we hadn't yet — adopt the tombstone.
        byId.set(c.id, tombstone(cur));
        changed = true;
      }
      // else: keep `cur` (identical live copy, or our own tombstone winning).
    }
    out[k] = [...byId.values()].sort((a, b) => a.ts - b.ts);
  }
  if (!changed) {
    // Remote introduced no new comments; keep the local reference as-is unless
    // the key set itself grew (an item that only exists remotely so far).
    if (Object.keys(out).length !== Object.keys(loc).length) changed = true;
  }
  return changed ? out : loc;
}

/**
 * Resolve the surviving version of one item that exists on two devices. Content
 * uses last-write-wins by `ts` (ties keep `local`, so it never ping-pongs); the
 * `del` tombstone is monotonic — once either side deleted the item it stays
 * deleted, so a stale device can never resurrect it.
 */
/** Fields whose set membership is merged per-member rather than clobbered by the
 *  scalar last-write-wins (currently only a packing item's `checkedBy`). */
interface Checkable {
  checkedBy?: string[];
  checkTs?: Record<string, number>;
}

/**
 * Merge two versions' per-member check sets. Each member id is resolved by
 * last-write-wins on its own `checkTs` toggle time, so two people checking the
 * same personal item concurrently both stick, and an un-check is never
 * resurrected by a stale device. Equal/legacy (ts 0) ties fall back to union.
 */
function mergeChecks(l: Checkable, r: Checkable): { checkedBy: string[]; checkTs: Record<string, number> } {
  const lTs = l.checkTs || {};
  const rTs = r.checkTs || {};
  const lOn = new Set(l.checkedBy || []);
  const rOn = new Set(r.checkedBy || []);
  const ids = new Set<string>([...Object.keys(lTs), ...Object.keys(rTs), ...lOn, ...rOn]);
  const checkedBy: string[] = [];
  const checkTs: Record<string, number> = {};
  for (const mid of [...ids].sort()) {
    const lt = lTs[mid] || 0;
    const rt = rTs[mid] || 0;
    const on = rt > lt ? rOn.has(mid) : lt > rt ? lOn.has(mid) : lOn.has(mid) || rOn.has(mid);
    const ts = lt > rt ? lt : rt;
    if (ts) checkTs[mid] = ts;
    if (on) checkedBy.push(mid);
  }
  return { checkedBy, checkTs };
}

function sameChecks(a: Checkable, m: { checkedBy: string[]; checkTs: Record<string, number> }): boolean {
  const cb = a.checkedBy || [];
  if (cb.length !== m.checkedBy.length) return false;
  const s = new Set(cb);
  for (const id of m.checkedBy) if (!s.has(id)) return false;
  const ct = a.checkTs || {};
  const mk = Object.keys(m.checkTs);
  if (Object.keys(ct).length !== mk.length) return false;
  for (const k of mk) if ((ct[k] || 0) !== m.checkTs[k]) return false;
  return true;
}

function pickItem<T extends Identified>(local: T, remote: T | undefined): T {
  if (!remote) return local;
  const del = !!local.del || !!remote.del;
  const lt = local.ts || 0;
  const rt = remote.ts || 0;
  // Last-write-wins by ts. An exact tie is broken deterministically AND
  // symmetrically (max JSON is independent of which side is "local"), so the
  // client and the server always settle on the same version — otherwise two
  // devices could diverge permanently on a same-ts, different-content item.
  let winner: T;
  if (rt > lt) winner = remote;
  else if (lt > rt) winner = local;
  else winner = JSON.stringify(remote) > JSON.stringify(local) ? remote : local;
  let result: T = !!winner.del === del ? winner : { ...winner, del };
  // Per-member check sets merge independently of the scalar winner, so a
  // concurrent check by another member isn't lost when someone else's edit wins.
  const lc = local as Checkable;
  const rc = remote as Checkable;
  if (lc.checkedBy || rc.checkedBy || lc.checkTs || rc.checkTs) {
    const merged = mergeChecks(lc, rc);
    if (!sameChecks(result as Checkable, merged)) {
      result = { ...result, checkedBy: merged.checkedBy, checkTs: merged.checkTs };
    }
  }
  return result;
}

/**
 * Merge two arrays of id'd items as a convergent union: every id from either
 * side survives (so a concurrent add is never dropped), and a shared id is
 * resolved by {@link pickItem}. Local order is preserved with remote-only items
 * appended. Returns `local` unchanged (same reference) when nothing changed so
 * callers can skip re-renders.
 *
 * This replaces the old doc-level last-write-wins for lists, under which one
 * device PUTting its slightly stale array silently deleted another device's
 * just-added item. Deletions now travel as `del` tombstones (never as a missing
 * element), so "absent from an incoming array" means "this device never saw it",
 * not "delete it".
 */
export function mergeItems<T extends Identified>(local: T[], remote: T[]): T[] {
  const loc = Array.isArray(local) ? local : [];
  const rem = Array.isArray(remote) ? remote : [];
  const remById = new Map<string, T>();
  for (const r of rem) if (r && r.id != null) remById.set(r.id, r);
  const seen = new Set<string>();
  let changed = false;
  const out: T[] = [];
  for (const l of loc) {
    if (!l || l.id == null) {
      out.push(l);
      continue;
    }
    seen.add(l.id);
    const w = pickItem(l, remById.get(l.id));
    if (w !== l) changed = true;
    out.push(w);
  }
  for (const r of rem) {
    if (!r || r.id == null || seen.has(r.id)) continue;
    out.push(r);
    changed = true;
  }
  return changed ? out : loc;
}

/**
 * First-contact reconciliation with an existing room. Takes the server's list
 * as the source of truth, then re-appends only the local items the *user*
 * actually touched here (ts>0) that the server doesn't have yet. Pristine seed
 * defaults (no ts) that the server lacks are dropped — otherwise our baked-in
 * defaults would resurrect an item that was deleted before this device joined
 * (including old delete-by-removal that left no tombstone). Used once, on the
 * first successful pull; every later pull uses {@link mergeItems}.
 */
export function adoptItems<T extends Identified>(local: T[], remote: T[]): T[] {
  const rem = Array.isArray(remote) ? remote : [];
  const remIds = new Set<string>();
  for (const r of rem) if (r && r.id != null) remIds.add(r.id);
  // Server items are taken verbatim (source of truth) — so a server-side edit of
  // a seed item is never reverted to our baked-in default, and a seed item the
  // server dropped is never resurrected. We only carry forward local items the
  // *user* touched here (ts>0) that the server lacks — an add that hasn't synced
  // yet. Pristine, untouched seed defaults (no ts) are discarded.
  const out: T[] = rem.slice();
  for (const l of Array.isArray(local) ? local : []) {
    if (l && l.id != null && !remIds.has(l.id) && l.ts) out.push(l);
  }
  return out;
}

/**
 * KHOA (국립해양조사원) astronomical tide prediction for the 보령 station, off
 * 대천해수욕장, on the three trip days. Times are Asia/Seoul (HH:MM); heights are
 * cm above chart datum (약최저저조면). Fixed data (predicted years ahead), so it
 * ships baked in — no runtime fetch. Verified against KHOA / badatime tables.
 * Low tide (간조) exposes the wide tidal flat — the window for 갯벌/머드 play.
 */
export const TIDES: TideDay[] = [
  {
    date: '8/4',
    lows: [{ t: '01:05', cm: 124 }, { t: '13:31', cm: 128 }],
    highs: [{ t: '06:33', cm: 711 }, { t: '18:57', cm: 676 }],
  },
  {
    date: '8/5',
    lows: [{ t: '01:41', cm: 161 }, { t: '14:04', cm: 142 }],
    highs: [{ t: '07:09', cm: 681 }, { t: '19:44', cm: 661 }],
  },
  {
    date: '8/6',
    lows: [{ t: '02:22', cm: 211 }, { t: '14:43', cm: 164 }],
    highs: [{ t: '07:53', cm: 639 }, { t: '20:43', cm: 638 }],
  },
];

export const MEMBERS: Member[] = [
  { id: 'm1', name: '石甜筒', color: '#E8503A' },
  { id: 'm2', name: '3ちゃん', color: '#F5A800' },
  { id: 'm3', name: '7ちゃん', color: '#1FAF6B' },
  { id: 'm4', name: '그르', color: '#2D8CFF' },
  { id: 'm5', name: '치반', color: '#A24BE8' },
];

export function normLink(u?: string): string {
  if (!u) return '#';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

const activities: Activity[] = [
  { id: 'a1', name: '보령 머드축제', zh: '保宁泥浆节', desc: '주중 13–18시 · 8/5(수) 체험존 휴장 · 8/6(목) 21:30까지 야간 운영', votes: [] },
  { id: 'a2', name: '대천해수욕장 물놀이', zh: '大川海水浴场玩水', desc: '리조트에서 도보 5분', votes: [] },
  { id: 'a3', name: '갯벌 체험', zh: '赶海·滩涂体验', desc: '물때 시간 확인 필수', votes: [] },
  { id: 'a4', name: '무창포 신비의 바닷길', zh: '武昌浦神秘海路', desc: '차로 약 20분 · 바닷길 열리는 시간 미리 확인', votes: [] },
  { id: 'a5', name: '대천 짚트랙', zh: '高空滑索', desc: '해수욕장 바로 옆 · 스릴 담당', votes: [] },
  { id: 'a6', name: '대천스카이바이크', zh: '海上天空脚踏车', desc: '바다 위 레일을 달리는 4인승 바이크', votes: [] },
  { id: 'a7', name: '바베큐 + 불멍', zh: '烧烤+篝火', desc: '리조트 송림 셀프 바비큐장 사전 예약 추천', votes: [] },
  { id: 'a8', name: '죽도 상화원', zh: '竹岛尚和园', desc: '바다 옆 한국식 전통 정원 · 추천 코스', votes: [] },
  { id: 'a9', name: '리조트 볼링·게임존', zh: '度假村保龄球·游戏区', desc: '비 오는 날 플랜 B · 노래방도 있음', votes: [] },
  { id: 'a10', name: '노을 해변 산책', zh: '日落海边散步', desc: '서해 노을 명당 · 저녁 7시대', votes: [] },
];

const packing: PackItem[] = [
  { id: 'p1', name: '숯 · 그릴 용품', zh: '木炭·烧烤用具', cat: 'shared', assignees: [], checked: false },
  { id: 'p2', name: '아이스박스 · 음료', zh: '保温箱·饮料', cat: 'shared', assignees: [], checked: false },
  { id: 'p3', name: '블루투스 스피커', zh: '蓝牙音箱', cat: 'shared', assignees: [], checked: false },
  { id: 'p4', name: '보드게임 · 카드', zh: '桌游·扑克牌', cat: 'shared', assignees: [], checked: false },
  { id: 'p5', name: '상비약', zh: '常备药', cat: 'shared', assignees: [], checked: false },
  { id: 'p6', name: '튜브 · 방수팩', zh: '游泳圈·防水袋', cat: 'shared', assignees: [], checked: false },
  { id: 'p7', name: '멀티탭', zh: '插线板', cat: 'shared', assignees: [], checked: false },
  { id: 'p8', name: '수영복', zh: '泳衣', cat: 'personal', assignees: [], checked: false },
  { id: 'p9', name: '여벌 옷 (머드용 넉넉히)', zh: '换洗衣物(泥浆节多带)', cat: 'personal', assignees: [], checked: false },
  { id: 'p10', name: '선크림', zh: '防晒霜', cat: 'personal', assignees: [], checked: false },
  { id: 'p11', name: '모자 · 선글라스', zh: '帽子·墨镜', cat: 'personal', assignees: [], checked: false },
  { id: 'p12', name: '슬리퍼', zh: '拖鞋', cat: 'personal', assignees: [], checked: false },
  { id: 'p13', name: '세면도구', zh: '洗漱用品', cat: 'personal', assignees: [], checked: false },
  { id: 'p14', name: '충전기 · 보조배터리', zh: '充电器·充电宝', cat: 'personal', assignees: [], checked: false },
];

const foods: Food[] = [
  { id: 'f1', name: '대천항 수산시장', zh: '大川港水产市场', type: '회 · 조개구이', memo: '싱싱한 회 떠서 바로 먹기', likes: [] },
  { id: 'f2', name: '키조개 삼합', zh: '牛角蛤三合烤肉', type: '구이', memo: '보령 명물 키조개+삼겹살+버섯', likes: [] },
  { id: 'f3', name: '스카이 횟집 (리조트 16층)', zh: '度假村16楼海景餐厅', type: '회 · 오션뷰', memo: '바다 보며 저녁 한 끼', likes: [] },
  { id: 'f4', name: '해변 오션뷰 카페', zh: '海景咖啡厅', type: '카페', memo: '노을 시간에 가면 최고', likes: [] },
];

export function defaultDoc(): TripDoc {
  return {
    activities: activities.map((a) => ({ ...a, votes: [...a.votes] })),
    packing: packing.map((p) => ({ ...p, assignees: [...p.assignees] })),
    foods: foods.map((f) => ({ ...f, likes: [...f.likes] })),
    comments: {},
    photos: [],
  };
}
