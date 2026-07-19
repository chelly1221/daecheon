// Client-side media pipeline for shared photos/videos.
//
// Binaries never travel through the room document (the whole doc is re-PUT on
// every change and re-fetched every 2s). Instead each file is uploaded to the
// room's media volume and only a lightweight {@link MediaRef} — opaque
// filenames + dimensions — is synced. Images are downscaled to a display copy
// plus a tiny grid thumbnail; videos upload as-is with a canvas-captured poster.
import type { MediaRef } from './types';

/** Resolve a stored media filename to its served URL. */
export function mediaUrl(roomId: string, file: string): string {
  return `/api/media/${encodeURIComponent(roomId)}/${encodeURIComponent(file)}`;
}

// Video content types the server accepts (must mirror MIME_EXT in server/index.js).
// Images are always recompressed to JPEG client-side, so only videos are checked.
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

// Client caps. Images are recompressed so their post-processing size is tiny;
// videos upload as-is, so guard the source size (server enforces its own cap).
export const VIDEO_MAX_BYTES = 60 * 1024 * 1024; // 60MB
const DISPLAY_MAX_EDGE = 1920; // longest edge of the full-size display image
const THUMB_MAX_EDGE = 480; // longest edge of the grid thumbnail
const DISPLAY_QUALITY = 0.82;
const THUMB_QUALITY = 0.7;
const POSTER_MAX_EDGE = 1280;

/** A user-facing reason an attachment can't be shared, for a friendly message. */
export type MediaErrorCode = 'type' | 'too-large' | 'decode' | 'upload';

/** One in-flight/failed gallery upload. Held in App state (not the tab) so it
 *  survives the Photos tab being unmounted on a tab switch mid-upload. */
export interface PhotoUpload {
  key: string;
  file: File;
  isVideo: boolean;
  progress: number;
  error: MediaErrorCode | null;
}
export class MediaError extends Error {
  code: MediaErrorCode;
  constructor(code: MediaErrorCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}

export function isImageFile(f: File): boolean {
  return f.type.startsWith('image/');
}
export function isVideoFile(f: File): boolean {
  return f.type.startsWith('video/');
}

function scaled(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= maxEdge) return { w, h };
  const k = maxEdge / long;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new MediaError('decode', 'canvas encode failed'))),
      type,
      quality,
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new MediaError('decode', 'image decode failed'));
    };
    img.src = url;
  });
}

function drawToBlob(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number,
): Promise<{ blob: Blob; w: number; h: number }> {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const { w, h } = scaled(sw, sh, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new MediaError('decode', 'no 2d context'));
  // JPEG has no alpha: flatten any transparency onto white so a transparent PNG
  // (sticker/logo/screenshot) doesn't come out solid black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvasToBlob(canvas, 'image/jpeg', quality).then((blob) => ({ blob, w, h }));
}

/** Capture a poster frame + intrinsic size/duration from a video file. */
function videoPoster(
  file: File,
): Promise<{ blob: Blob; w: number; h: number; dur: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;
    let done = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };
    const finish = (val: { blob: Blob; w: number; h: number; dur: number } | null) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(val);
    };
    // Give up gracefully — a codec the browser can't decode (some .mov) still
    // uploads fine, just without a poster.
    const timer = setTimeout(() => finish(null), 8000);
    const capture = () => {
      const sw = video.videoWidth;
      const sh = video.videoHeight;
      if (!sw || !sh) {
        clearTimeout(timer);
        return finish(null);
      }
      const { w, h } = scaled(sw, sh, POSTER_MAX_EDGE);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        clearTimeout(timer);
        return finish(null);
      }
      try {
        ctx.drawImage(video, 0, 0, w, h);
      } catch {
        clearTimeout(timer);
        return finish(null);
      }
      canvas.toBlob(
        (b) => {
          clearTimeout(timer);
          finish(b ? { blob: b, w: sw, h: sh, dur: video.duration || 0 } : null);
        },
        'image/jpeg',
        0.78,
      );
    };
    video.onloadeddata = () => {
      // Seek a hair past the start so we don't grab a black leading frame.
      const t = Math.min(0.1, (video.duration || 1) / 2);
      const onSeeked = () => capture();
      video.onseeked = onSeeked;
      try {
        video.currentTime = t;
      } catch {
        capture();
      }
    };
    video.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    video.src = url;
  });
}

/** POST a binary blob to the room media endpoint, reporting upload progress. */
function putBinary(
  roomId: string,
  blob: Blob,
  onProgress?: (frac: number) => void,
): Promise<{ file: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/rooms/${encodeURIComponent(roomId)}/media`);
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const j = JSON.parse(xhr.responseText) as { file?: string };
          if (j && typeof j.file === 'string') return resolve({ file: j.file });
        } catch {
          /* fall through */
        }
        reject(new MediaError('upload', 'bad response'));
      } else if (xhr.status === 413) {
        reject(new MediaError('too-large', 'server rejected size'));
      } else if (xhr.status === 415) {
        reject(new MediaError('type', 'server rejected type'));
      } else {
        reject(new MediaError('upload', `status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new MediaError('upload', 'network error'));
    xhr.send(blob);
  });
}

/**
 * Process and upload one picked file, returning the {@link MediaRef} to sync.
 * Images are compressed to a display copy + thumbnail; videos upload as-is with
 * a poster. `onProgress` reports 0→1 over the whole (multi-part) upload.
 */
export async function uploadMedia(
  roomId: string,
  file: File,
  onProgress?: (frac: number) => void,
): Promise<MediaRef> {
  if (isVideoFile(file)) return uploadVideo(roomId, file, onProgress);
  if (isImageFile(file)) return uploadImage(roomId, file, onProgress);
  throw new MediaError('type', 'unsupported file');
}

async function uploadImage(
  roomId: string,
  file: File,
  onProgress?: (frac: number) => void,
): Promise<MediaRef> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    // HEIC or other undecodable formats: some browsers can't rasterize them.
    throw new MediaError('decode', 'could not read image');
  }
  try {
    const display = await drawToBlob(img, DISPLAY_MAX_EDGE, DISPLAY_QUALITY);
    const thumb = await drawToBlob(img, THUMB_MAX_EDGE, THUMB_QUALITY);
    // Weight the display copy as the bulk of the progress bar.
    const full = await putBinary(roomId, display.blob, (f) => onProgress?.(f * 0.85));
    const th = await putBinary(roomId, thumb.blob, (f) => onProgress?.(0.85 + f * 0.15));
    return {
      kind: 'image',
      mime: 'image/jpeg',
      file: full.file,
      thumb: th.file,
      w: display.w,
      h: display.h,
    };
  } finally {
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  }
}

async function uploadVideo(
  roomId: string,
  file: File,
  onProgress?: (frac: number) => void,
): Promise<MediaRef> {
  if (!VIDEO_MIME.has(file.type)) throw new MediaError('type', 'unsupported video type');
  if (file.size > VIDEO_MAX_BYTES) throw new MediaError('too-large', 'video too large');
  // Poster is best-effort and small; the clip itself dominates the progress bar.
  const poster = await videoPoster(file);
  const clip = await putBinary(roomId, file, (f) => onProgress?.(f * (poster ? 0.9 : 1)));
  let posterFile: string | undefined;
  if (poster) {
    try {
      const p = await putBinary(roomId, poster.blob, (f) => onProgress?.(0.9 + f * 0.1));
      posterFile = p.file;
    } catch {
      /* poster is optional — the clip already uploaded */
    }
  }
  return {
    kind: 'video',
    mime: file.type,
    file: clip.file,
    poster: posterFile,
    w: poster?.w,
    h: poster?.h,
    dur: poster?.dur,
  };
}
