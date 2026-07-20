import type { EditChip, PinCat } from './types';
import type { IconName } from './icons';

export interface ActView {
  id: string;
  name: string;
  desc: string;
  descShow: boolean;
  link: string;
  linkShow: boolean;
  commentCount: number;
  edChips: EditChip[];
  /** True when the item carries a map location. */
  locShow: boolean;
  /** Jump to the map focused on this item's location (only meaningful when locShow). */
  onMap: () => void;
  onTap: () => void;
}

export interface FoodView {
  id: string;
  name: string;
  memo: string;
  memoShow: boolean;
  link: string;
  linkShow: boolean;
  commentCount: number;
  edChips: EditChip[];
  /** True when the item carries a map location. */
  locShow: boolean;
  /** Jump to the map focused on this item's location (only meaningful when locShow). */
  onMap: () => void;
  onTap: () => void;
}

export interface AsgChip {
  label: string;
  bg: string;
}

/** A per-assignee filter tab shown above the assigned shared-packing items. */
export interface AsgTab {
  id: string;
  label: string;
  color: string;
  count: number;
}

export interface PackView {
  id: string;
  name: string;
  checked: boolean;
  asgChips: AsgChip[];
  /** Member ids this (shared) item is assigned to; empty for personal/unassigned. */
  assigneeIds: string[];
  commentCount: number;
  edChips: EditChip[];
  onCheck: () => void;
  onTap: () => void;
}

/** One shared map pin, with its category glyph/colour + creator already resolved. */
export interface PinView {
  id: string;
  label: string;
  memo: string;
  memoShow: boolean;
  cat: PinCat;
  icon: IconName;
  color: string;
  /** Localized category name (e.g. 맛집 / 美食). */
  catLabel: string;
  /** Creator display name, '' when unknown (seed pins). */
  by: string;
  lat: number;
  lng: number;
  /** Presence "수정 중" chips for anyone else editing this pin. */
  edChips: EditChip[];
  /** Focus the pin on the map + open its editor. */
  onTap: () => void;
  /** True for markers synthesized from a 맛집/액티비티 location (not a real pin):
   *  rendered filled to read differently, and kept out of the saved-pins list. */
  fromList?: boolean;
}

/** Map pin-placement mode: dropping a brand-new pin, moving an existing one to a
 *  freshly tapped location, or picking a 맛집/액티비티 item's location from its
 *  editor. Null when the map is in normal (view) mode. */
export type PlaceMode = { kind: 'new' } | { kind: 'move'; id: string } | { kind: 'item' };

/** One member's live shared location, resolved from presence for the map. */
export interface LiveLocView {
  /** Device key (presence map key) — stable marker identity. */
  key: string;
  name: string;
  /** Single-glyph avatar label (first char of the member name). */
  initial: string;
  color: string;
  lat: number;
  lng: number;
  /** Accuracy radius in metres, when known. */
  acc?: number;
  isMe: boolean;
  /** Localized freshness label (e.g. 방금 / 3분 전). */
  age: string;
}

/** One shared gallery photo/video, with URLs and uploader display already resolved. */
export interface PhotoView {
  id: string;
  kind: 'image' | 'video';
  /** Small tile source (image thumb or video poster); falls back to full. */
  thumbUrl: string;
  /** Full-size source shown in the viewer. */
  fullUrl: string;
  /** Video poster URL, used as the <video> poster and the tile. */
  posterUrl?: string;
  by: string;
  color: string;
  time: string;
  canDelete: boolean;
  w?: number;
  h?: number;
  dur?: number;
}
