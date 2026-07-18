export type Lang = 'ko' | 'zh';
export type Tab = 'home' | 'act' | 'pack' | 'food';
export type ListKey = 'activities' | 'packing' | 'foods';
export type SyncStatus = 'connecting' | 'live' | 'error' | 'local';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Activity {
  id: string;
  name: string;
  zh: string;
  desc: string;
  link?: string;
  votes: string[];
}

export interface PackItem {
  id: string;
  name: string;
  zh: string;
  cat: 'shared' | 'personal';
  assignees: string[];
  checked: boolean;
  checkedBy?: string[];
}

export interface Food {
  id: string;
  name: string;
  zh: string;
  type: string;
  memo: string;
  link?: string;
  likes: string[];
}

export interface Comment {
  id: string;
  mid: string | null;
  text: string;
  ts: number;
  /** Parent comment id when this message is a reply. */
  replyTo?: string;
  /**
   * Soft-delete tombstone. Monotonic (only ever flips false→true) so it wins
   * over the live copy in the append-only comment merge and can never be
   * resurrected by a stale device. Deleted messages carry empty `text`.
   */
  del?: boolean;
}

/** Comments keyed by the item id they belong to. */
export type Comments = Record<string, Comment[]>;

export interface TripDoc {
  activities: Activity[];
  packing: PackItem[];
  foods: Food[];
  comments: Comments;
}

export interface PresenceEntry {
  mid: string | null;
  ts: number;
  tab: string;
  ed: string | null;
  edTs: number;
}

export type Presence = Record<string, PresenceEntry>;

export interface RoomDoc extends TripDoc {
  presence: Presence;
  updatedAt: number;
}

export interface SheetState {
  mode: 'add' | 'edit';
  list: ListKey;
  id?: string;
}

export interface Weather {
  date: string;
  hi: number;
  lo: number;
  pp: string;
  desc: string;
}

export type WeatherStatus = 'loading' | 'live' | 'avg';

export interface EditChip {
  label: string;
  short: string;
  color: string;
}
