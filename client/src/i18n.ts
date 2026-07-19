import type { Lang } from './types';

export interface UIStrings {
  resort: string;
  title: string;
  dates: string;
  who: string;
  whoSub: string;
  whoNote: string;
  mudTitle: string;
  mudBody1: string;
  mudBody2: string;
  weather: string;
  rain: string;
  stay: string;
  ci: string;
  co: string;
  room: string;
  roomV: string;
  addr: string;
  addrV: string;
  fac: string;
  facV: string;
  beach: string;
  beachV: string;
  roomBtn: string;
  siteBtn: string;
  act: string;
  add: string;
  actHint: string;
  pack: string;
  packHint: string;
  shared: string;
  personal: string;
  food: string;
  foodHint: string;
  ppl: string;
  prof: string;
  current: string;
  close: string;
  link: string;
  linkPh: string;
  namePh: string;
  memoPh: string;
  asg: string;
  del: string;
  edit: string;
  comments: string;
  commentPh: string;
  noComments: string;
  reply: string;
  copy: string;
  copied: string;
  deletedMsg: string;
  saving: string;
  saved: string;
  saveErr: string;
  assigned: string;
  unassigned: string;
  filterAll: string;
  searchPh: string;
  noResult: string;
  photo: string;
  photoHint: string;
  photoEmpty: string;
  photoAdd: string;
  uploading: string;
  uploadFail: string;
  retry: string;
  videoTooLarge: string;
  unsupportedMedia: string;
  mediaReadFail: string;
  photoDeleteAsk: string;
  cancel: string;
  wHourly: string;
  wFeels: string;
  wSource: string;
}

export const UI: Record<Lang, UIStrings> = {
  ko: {
    resort: '한화리조트 대천 파로스',
    title: '대천 바다로 떠나요',
    dates: '2026. 8. 4 (화) – 8. 6 (목) · 2박 3일',
    who: '누구세요?',
    whoSub: '이름을 선택하면 시작할 수 있어요',
    whoNote: '선택은 이 기기에 저장돼요 · 나중에 홈에서 바꿀 수 있어요',
    mudTitle: '보령 머드축제 기간이에요!',
    mudBody1: '주중 체험존 13:00–18:00',
    mudBody2: '8/5(수)는 체험존 휴장 · 8/6(목)은 21:30까지 야간 운영',
    weather: '여행 날씨',
    rain: '비',
    stay: '숙소 정보',
    ci: '체크인',
    co: '체크아웃',
    room: '객실',
    roomV: '스위트 룸',
    addr: '주소',
    addrV: '충남 보령시 신흑동 해수욕장3길 11-10',
    fac: '시설',
    facV: '볼링장 · 게임존 · 노래방 · GS25',
    beach: '해변',
    beachV: '대천해수욕장 도보 약 5분',
    roomBtn: '룸 정보 보기',
    siteBtn: '리조트 홈페이지',
    act: '액티비티',
    add: '+ 추가',
    actHint: '카드를 누르면 수정할 수 있어요',
    pack: '준비물',
    packHint: '항목을 누르면 수정 · 담당자 지정',
    shared: '공용',
    personal: '개인',
    food: '맛집 · 카페',
    foodHint: '카드를 누르면 수정할 수 있어요',
    ppl: '명',
    prof: '프로필 전환',
    current: '현재',
    close: '닫기',
    link: '링크 열기',
    linkPh: '링크 (선택)',
    namePh: '이름',
    memoPh: '메모 (선택)',
    asg: '담당자',
    del: '삭제',
    edit: '수정',
    comments: '채팅',
    commentPh: '메시지 입력…',
    noComments: '아직 채팅이 없어요 · 먼저 말을 걸어보세요',
    reply: '답글',
    copy: '복사',
    copied: '복사됨',
    deletedMsg: '삭제된 메시지',
    saving: '저장 중…',
    saved: '저장됨',
    saveErr: '저장 실패 · 재시도 중',
    assigned: '담당 배정됨',
    unassigned: '미지정',
    filterAll: '전체보기',
    searchPh: '준비물 검색',
    noResult: '검색 결과가 없어요',
    photo: '사진',
    photoHint: '함께 찍은 사진·영상을 모아요',
    photoEmpty: '아직 사진이 없어요 · 첫 사진을 올려보세요',
    photoAdd: '+ 올리기',
    uploading: '올리는 중',
    uploadFail: '업로드 실패',
    retry: '다시',
    videoTooLarge: '동영상이 너무 커요 · 최대 60MB',
    unsupportedMedia: '지원하지 않는 형식이에요',
    mediaReadFail: '파일을 읽을 수 없어요',
    photoDeleteAsk: '이 사진을 삭제할까요?',
    cancel: '취소',
    wHourly: '시간별 예보',
    wFeels: '체감',
    wSource: '대천해수욕장 · Open-Meteo',
  },
  zh: {
    resort: '韩华度假村 大川帕罗斯',
    title: '一起去大川海边吧!',
    dates: '2026.8.4(周二) – 8.6(周四) · 2晚3天',
    who: '你是谁?',
    whoSub: '选择名字后即可开始',
    whoNote: '选择保存在本机 · 之后可在首页更改',
    mudTitle: '保宁泥浆节期间!',
    mudBody1: '工作日体验区 13:00–18:00',
    mudBody2: '8/5(周三)体验区闭馆 · 8/6(周四)夜间开放至21:30',
    weather: '旅行天气',
    rain: '雨',
    stay: '住宿信息',
    ci: '入住',
    co: '退房',
    room: '房型',
    roomV: '套房',
    addr: '地址',
    addrV: '忠南保宁市新黑洞海水浴场3街11-10',
    fac: '设施',
    facV: '保龄球馆 · 游戏区 · KTV · GS25',
    beach: '海滩',
    beachV: '步行约5分钟到大川海水浴场',
    roomBtn: '查看房型信息',
    siteBtn: '度假村官网',
    act: '活动',
    add: '+ 添加',
    actHint: '点击卡片即可编辑',
    pack: '行李清单',
    packHint: '点条目可编辑并指定负责人',
    shared: '共用',
    personal: '个人',
    food: '美食 · 咖啡',
    foodHint: '点击卡片即可编辑',
    ppl: '人',
    prof: '切换用户',
    current: '当前',
    close: '关闭',
    link: '打开链接',
    linkPh: '链接(选填)',
    namePh: '名称',
    memoPh: '备注(选填)',
    asg: '负责人',
    del: '删除',
    edit: '编辑',
    comments: '聊天',
    commentPh: '输入消息…',
    noComments: '还没有聊天 · 来打个招呼吧',
    reply: '回复',
    copy: '复制',
    copied: '已复制',
    deletedMsg: '该消息已删除',
    saving: '保存中…',
    saved: '已保存',
    saveErr: '保存失败 · 重试中',
    assigned: '已分配',
    unassigned: '未分配',
    filterAll: '全部',
    searchPh: '搜索行李',
    noResult: '没有搜索结果',
    photo: '照片',
    photoHint: '一起收藏拍下的照片·视频',
    photoEmpty: '还没有照片 · 上传第一张吧',
    photoAdd: '+ 上传',
    uploading: '上传中',
    uploadFail: '上传失败',
    retry: '重试',
    videoTooLarge: '视频太大 · 最多60MB',
    unsupportedMedia: '不支持的格式',
    mediaReadFail: '无法读取文件',
    photoDeleteAsk: '删除这张照片吗?',
    cancel: '取消',
    wHourly: '每小时预报',
    wFeels: '体感',
    wSource: '大川海水浴场 · Open-Meteo',
  },
};

export const ACT_DESC_ZH: Record<string, string> = {
  a1: '工作日13–18点 · 8/5(周三)体验区闭馆 · 8/6(周四)夜间开放至21:30',
  a2: '从度假村步行5分钟',
  a3: '务必确认潮汐时间',
  a4: '车程约20分钟 · 提前确认海路开启时间',
  a5: '紧邻海水浴场 · 刺激担当',
  a6: '在海上轨道骑行的4人脚踏车',
  a7: '推荐提前预约度假村松林自助烧烤场',
  a8: '海边的韩式传统庭院 · 推荐路线',
  a9: '雨天B计划 · 还有KTV',
  a10: '西海日落名所 · 晚上7点左右',
};

export const FOOD_MEMO_ZH: Record<string, string> = {
  f1: '现点现吃新鲜生鱼片',
  f2: '保宁名物牛角蛤+五花肉+蘑菇',
  f3: '看着大海吃晚餐',
  f4: '日落时分去最棒',
};

export const FOOD_TYPE_ZH: Record<string, string> = {
  '회 · 조개구이': '生鱼片·烤贝',
  구이: '烤肉',
  '회 · 오션뷰': '生鱼片·海景',
  카페: '咖啡厅',
  추가: '添加',
  기타: '其他',
};

export const WDESC_ZH: Record<string, string> = {
  맑음: '晴',
  '대체로 맑음': '大体晴朗',
  흐림: '阴',
  안개: '雾',
  이슬비: '毛毛雨',
  비: '雨',
  눈: '雪',
  소나기: '阵雨',
  뇌우: '雷雨',
  '무덥고 습함': '闷热潮湿',
  '소나기 가능': '可能有阵雨',
};

// Bottom-sheet list titles (differ from the tab labels).
export const LIST_TITLE: Record<Lang, Record<'activities' | 'packing' | 'foods', string>> = {
  ko: { activities: '액티비티', packing: '준비물', foods: '맛집·카페' },
  zh: { activities: '活动', packing: '行李', foods: '美食·咖啡' },
};
