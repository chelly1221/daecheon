export type Lang = 'ko' | 'zh';
export type Tab = 'home' | 'act' | 'pack' | 'food' | 'map' | 'photo';
export type ListKey = 'activities' | 'packing' | 'foods';
export type SyncStatus = 'connecting' | 'live' | 'error' | 'local';

export interface Member {
  id: string;
  name: string;
  color: string;
}

/**
 * Fields every synced list item carries so it can be merged per-item across
 * devices (see `mergeItems` in data.ts / server). `ts` is the last-modified
 * time driving last-write-wins; `del` is a monotonic soft-delete tombstone
 * (false→true only) so a deletion is never resurrected by a stale device.
 */
export interface Identified {
  id: string;
  ts?: number;
  del?: boolean;
}

export interface Activity extends Identified {
  id: string;
  name: string;
  zh: string;
  desc: string;
  link?: string;
  votes: string[];
}

export interface PackItem extends Identified {
  id: string;
  name: string;
  zh: string;
  cat: 'shared' | 'personal';
  assignees: string[];
  checked: boolean;
  /** Personal items: the members who've checked this off (each toggles only their
   *  own id). Merged as a per-member LWW set via {@link checkTs}. */
  checkedBy?: string[];
  /** Per-member last-toggle time for `checkedBy`, so two people checking the same
   *  item concurrently converge instead of clobbering each other. */
  checkTs?: Record<string, number>;
}

export interface Food extends Identified {
  id: string;
  name: string;
  zh: string;
  type: string;
  memo: string;
  link?: string;
  likes: string[];
}

/**
 * A shared photo/video stored as a separate file in the room's media volume
 * (never inline in the room JSON — the whole doc is re-PUT on every change).
 * `file`/`thumb`/`poster` are opaque filenames under `data/media/<room>/`,
 * resolved to URLs via {@link mediaUrl}. Carried both by {@link Photo} (the
 * gallery) and by {@link Comment.media} (a chat attachment).
 */
export interface MediaRef {
  /** Full-size display file (images: ~1920px JPEG; videos: the original clip). */
  file: string;
  mime: string;
  kind: 'image' | 'video';
  /** Small grid/preview thumbnail (images only). */
  thumb?: string;
  /** First-frame poster (videos only), doubles as the grid thumbnail. */
  poster?: string;
  /** Intrinsic pixel size, for aspect-ratio-correct layout without a reflow. */
  w?: number;
  h?: number;
  /** Video duration in seconds, for the play badge. */
  dur?: number;
}

/** Pin category id → marker emoji/color + bilingual label (see `PIN_CATS` in
 *  data.ts). Kept as a small closed set so pins stay colour-coded on the map. */
export type PinCat = 'place' | 'food' | 'play' | 'meet' | 'stay' | 'park';

/**
 * A shared map pin, synced per-item exactly like the other lists (see
 * {@link Identified}): a concurrent add on another device is never dropped, and
 * a deletion travels as a monotonic `del` tombstone. Coordinates are WGS84
 * degrees. Labels/memos are free user text (machine-translated for display, like
 * user-added activities), so there is no separate `zh` field.
 */
export interface Pin extends Identified {
  id: string;
  lat: number;
  lng: number;
  label: string;
  memo?: string;
  cat: PinCat;
  /** Member id who created the pin; null if unknown (e.g. seed pins). */
  by: string | null;
  // `ts` is inherited (optional) from Identified: seed pins ship pristine
  // (no ts, like the other seed lists); every user edit stamps one via nextTs().
}

/**
 * A member's live shared location. Ephemeral — carried inside their
 * {@link PresenceEntry} (never in the room lists), so it appears and expires
 * with the device's presence and needs no separate merge/tombstone logic.
 */
export interface SharedLoc {
  lat: number;
  lng: number;
  /** Accuracy radius in metres from the Geolocation API, when the browser gives it. */
  acc?: number;
  /** Fix time (device clock, ms) — drives the "N분 전" freshness label. */
  ts: number;
}

export interface Photo extends Identified, MediaRef {
  id: string;
  /** Uploader member id (mirrors {@link Comment.mid}); null if unknown. */
  by: string | null;
  caption?: string;
  ts: number;
}

export interface Comment {
  id: string;
  mid: string | null;
  text: string;
  ts: number;
  /** An attached photo/video, when this message carries media. */
  media?: MediaRef;
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
  photos: Photo[];
  pins: Pin[];
}

export interface PresenceEntry {
  mid: string | null;
  ts: number;
  tab: string;
  ed: string | null;
  edTs: number;
  /** Live shared location, present only while this device is sharing (and until
   *  its presence expires). Absent/null otherwise. */
  loc?: SharedLoc | null;
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
  /** ISO `YYYY-MM-DD` key joining a daily card to its hourly breakdown
   *  ({@link WeatherHour}). Present only on live forecast data — absent on the
   *  average/fallback days, which therefore aren't tap-through. */
  key?: string;
  /** Daily WMO weather_code — the day's most-significant condition, the same
   *  source as {@link desc}. Live data only; drives the detail-sheet header
   *  emoji so it agrees with the desc text. */
  code?: number;
}

export type WeatherStatus = 'loading' | 'live' | 'avg';

/** One tide extreme (a single high or low water) from the KHOA prediction. */
export interface TideExtreme {
  /** Local clock time, Asia/Seoul, `HH:MM` 24-hour. */
  t: string;
  /** Predicted water height in cm above chart datum (약최저저조면). */
  cm: number;
}

/**
 * A day's astronomical tide prediction for the trip location (KHOA 보령 station,
 * off 대천해수욕장). Static reference data — tides are fixed years ahead, so this
 * ships baked in (see `TIDES` in data.ts) rather than fetched.
 */
export interface TideDay {
  /** `M/D` date label, matching {@link Weather.date}. */
  date: string;
  /** Low tides (간조/썰물) — the flat is exposed; ordered by time. */
  lows: TideExtreme[];
  /** High tides (만조/밀물) — water is in; ordered by time. */
  highs: TideExtreme[];
}

/** One hour of the live forecast, shown in the tap-through detail sheet. */
export interface WeatherHour {
  /** Hour of day 0–23 in Asia/Seoul. */
  h: number;
  temp: number;
  /** Apparent ("feels-like") temperature. */
  feels: number;
  /** WMO weather code → description/emoji via the helpers in useWeather. */
  code: number;
  /** Precipitation probability %, or null when the API omits it. */
  pp: number | null;
  /** Wind speed, km/h. */
  wind: number;
}

/** Live forecast hours grouped by their {@link Weather.key} date. */
export type WeatherHours = Record<string, WeatherHour[]>;

export interface EditChip {
  label: string;
  short: string;
  color: string;
}
