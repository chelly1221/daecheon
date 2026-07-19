import type { EditChip } from './types';

export interface ActView {
  id: string;
  name: string;
  desc: string;
  descShow: boolean;
  link: string;
  linkShow: boolean;
  commentCount: number;
  edChips: EditChip[];
  onTap: () => void;
}

export interface FoodView {
  id: string;
  name: string;
  type: string;
  memo: string;
  memoShow: boolean;
  link: string;
  linkShow: boolean;
  commentCount: number;
  edChips: EditChip[];
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
