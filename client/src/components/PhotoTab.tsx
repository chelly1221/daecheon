import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import type { PhotoView } from '../viewmodels';
import type { MediaErrorCode, PhotoUpload } from '../media';
import MediaViewer, { type ViewerItem } from './MediaViewer';

interface Props {
  L: UIStrings;
  lang: Lang;
  photos: PhotoView[];
  uploads: PhotoUpload[];
  onPickFiles: (files: File[]) => void;
  onRetry: (up: PhotoUpload) => void;
  onDelete: (id: string) => void;
}

export default function PhotoTab({ L, lang, photos, uploads, onPickFiles, onRetry, onDelete }: Props) {
  // Track the open lightbox by the photo's stable id, not a list position — the
  // 2s sync poll can add/remove/re-sort photos underneath an open viewer.
  const [viewId, setViewId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ''; // allow re-picking the same file later
    if (files.length) onPickFiles(files);
  };

  const errMsg = (code: MediaErrorCode): string =>
    code === 'too-large'
      ? L.videoTooLarge
      : code === 'type'
        ? L.unsupportedMedia
        : code === 'decode'
          ? L.mediaReadFail
          : L.uploadFail;

  const viewerItems: ViewerItem[] = photos.map((p) => ({
    id: p.id,
    kind: p.kind,
    fullUrl: p.fullUrl,
    posterUrl: p.posterUrl,
    by: p.by,
    color: p.color,
    time: p.time,
    canDelete: p.canDelete,
  }));
  // Resolve the tracked id to a live index every render, so a concurrent sync
  // update keeps the viewer on the SAME photo (or closes it if it was deleted).
  const viewIndex = viewId ? photos.findIndex((p) => p.id === viewId) : -1;

  const empty = photos.length === 0 && uploads.length === 0;

  return (
    <div data-screen-label="사진" style={css('display:flex;flex-direction:column;gap:9px')}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={onFiles}
        style={{ display: 'none' }}
      />
      <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
        <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{L.photo}</div>
        <button
          onClick={() => inputRef.current?.click()}
          style={css(
            'min-height:36px;padding:6px 15px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
          )}
        >
          {L.photoAdd}
        </button>
      </div>
      <div style={css('font-size:12px;color:#8FAEC4;margin-top:-4px')}>{L.photoHint}</div>

      {empty ? (
        <button
          onClick={() => inputRef.current?.click()}
          style={css(
            'margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:34px 16px;border-radius:16px;border:1.5px dashed #BFDCF0;background:#FFFFFF;color:#7FA6C1',
          )}
        >
          <span style={css("font-family:'Material Symbols Rounded';font-size:40px;color:#AFD0E8")}>
            add_a_photo
          </span>
          <span style={css('font-size:13px;color:#8FAEC4;text-align:center;line-height:1.5')}>
            {L.photoEmpty}
          </span>
        </button>
      ) : (
        <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:2px')}>
          {uploads.map((u) => (
            <UploadTile
              key={u.key}
              up={u}
              label={L.uploading}
              errMsg={errMsg}
              onRetry={() => onRetry(u)}
            />
          ))}
          {photos.map((p) => (
            <PhotoTile key={p.id} p={p} onTap={() => setViewId(p.id)} />
          ))}
        </div>
      )}

      {viewIndex >= 0 && (
        <MediaViewer
          items={viewerItems}
          index={viewIndex}
          lang={lang}
          L={L}
          onIndex={(i) => setViewId(photos[i]?.id ?? null)}
          onClose={() => setViewId(null)}
          onDelete={(id) => {
            onDelete(id);
            setViewId(null);
          }}
        />
      )}
    </div>
  );
}

function PhotoTile({ p, onTap }: { p: PhotoView; onTap: () => void }) {
  // A real still only (image thumb / video poster). Poster-less videos fall to
  // the movie placeholder rather than trying to render a clip inside <img>.
  const src = p.thumbUrl || p.posterUrl || '';
  return (
    <button
      onClick={onTap}
      style={css(
        'position:relative;aspect-ratio:1;border:none;padding:0;border-radius:10px;overflow:hidden;background:#DCEAF4;display:block',
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          style={css('width:100%;height:100%;object-fit:cover;display:block')}
        />
      ) : (
        <span
          style={css(
            "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Material Symbols Rounded';font-size:30px;color:#9CC0DC",
          )}
        >
          movie
        </span>
      )}
      {p.kind === 'video' && (
        <>
          <span
            style={css(
              'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;background:rgba(6,20,32,.5);display:flex;align-items:center;justify-content:center',
            )}
          >
            <span
              style={css("font-family:'Material Symbols Rounded';font-size:24px;color:#FFFFFF;line-height:1")}
            >
              play_arrow
            </span>
          </span>
          {!!p.dur && p.dur > 0 && (
            <span
              style={css(
                'position:absolute;right:5px;bottom:5px;background:rgba(6,20,32,.7);color:#FFFFFF;font-size:10px;font-weight:600;padding:1px 5px;border-radius:5px',
              )}
            >
              {fmtDur(p.dur)}
            </span>
          )}
        </>
      )}
    </button>
  );
}

function UploadTile({
  up,
  label,
  errMsg,
  onRetry,
}: {
  up: PhotoUpload;
  label: string;
  errMsg: (c: MediaErrorCode) => string;
  onRetry: () => void;
}) {
  if (up.error) {
    return (
      <button
        onClick={onRetry}
        style={css(
          'aspect-ratio:1;border:1px solid #F3D2C9;border-radius:10px;background:#FDF2EF;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;text-align:center',
        )}
      >
        <span style={css("font-family:'Material Symbols Rounded';font-size:22px;color:#E8503A")}>
          error
        </span>
        <span style={css('font-size:9.5px;color:#C0503C;line-height:1.3')}>{errMsg(up.error)}</span>
        <span style={css('font-size:10px;color:#0B7CD8;font-weight:700')}>↻</span>
      </button>
    );
  }
  const pct = Math.round(up.progress * 100);
  return (
    <div
      style={css(
        'position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:#E4F0FA;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px',
      )}
    >
      <span
        style={css(
          `font-family:'Material Symbols Rounded';font-size:26px;color:#7FB2DC;line-height:1;animation:pulse 1.2s ease-in-out infinite`,
        )}
      >
        {up.isVideo ? 'movie' : 'image'}
      </span>
      <span style={css('font-size:10.5px;color:#5A88A8;font-weight:600')}>
        {label} {pct}%
      </span>
      <div
        style={css('position:absolute;left:0;bottom:0;width:100%;height:3px;background:rgba(11,124,216,.15)')}
      >
        <div style={css(`width:${pct}%;height:100%;background:#0B7CD8;transition:width .2s`)} />
      </div>
    </div>
  );
}

function fmtDur(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
