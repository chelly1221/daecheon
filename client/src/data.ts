import type { Activity, Food, Member, PackItem, TripDoc } from './types';

export const KEY = 'paros-trip-2026-v1';
export const ROOM_DEFAULT = 'paros-daecheon-2026-x7k3q9';

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
  };
}
