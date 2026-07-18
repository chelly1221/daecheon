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

export interface PackView {
  id: string;
  name: string;
  checked: boolean;
  asgChips: AsgChip[];
  commentCount: number;
  edChips: EditChip[];
  onCheck: () => void;
  onTap: () => void;
}
