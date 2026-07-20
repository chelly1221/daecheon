import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { css } from '../css';
import { Icon } from '../icons';
import type { IconName } from '../icons';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import type { PhotoView } from '../viewmodels';
import { saveMedia, type MediaErrorCode, type PhotoUpload } from '../media';
import MediaViewer, { type ViewerItem } from './MediaViewer';

interface Props {
  L: UIStrings;
  lang: Lang;
  photos: PhotoView[];
  uploads: PhotoUpload[];
  onPickFiles: (files: File[]) => void;
  onRetry: (up: PhotoUpload) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  /** Reports selection-mode on/off so the parent can suppress the tab swipe. */
  onSelectingChange?: (on: boolean) => void;
}

export default function PhotoTab({
  L,
  lang,
  photos,
  uploads,
  onPickFiles,
  onRetry,
  onDelete,
  onDeleteMany,
  onSelectingChange,
}: Props) {
  // Track the open lightbox by the photo's stable id, not a list position — the
  // 2s sync poll can add/remove/re-sort photos underneath an open viewer.
  const [viewId, setViewId] = useState<string | null>(null);
  // Selection mode: pick many tiles to bulk delete / download. Selected ids are
  // resolved against the live list every render so a concurrent sync deletion
  // can't leave a stale id inflating the count or a delete/download.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFail, setSaveFail] = useState(false);
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

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
    setConfirmDel(false);
    setSaving(false);
    setSaveFail(false);
  };
  const startSelect = () => {
    setViewId(null);
    setSelecting(true);
  };
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const all = photos.length > 0 && photos.every((p) => s.has(p.id));
      return all ? new Set() : new Set(photos.map((p) => p.id));
    });

  // Leaving the tab empty (everything deleted, by me or a peer) drops selection.
  useEffect(() => {
    if (selecting && photos.length === 0) exitSelect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecting, photos.length]);
  // Auto-clear a transient save failure so the bar doesn't stay red forever.
  useEffect(() => {
    if (!saveFail) return;
    const t = setTimeout(() => setSaveFail(false), 2800);
    return () => clearTimeout(t);
  }, [saveFail]);
  // Mirror selection mode to the parent (tab-swipe suppression). Reset on
  // unmount so a tab switch mid-select never leaves the swipe disabled.
  useEffect(() => {
    onSelectingChange?.(selecting);
    return () => onSelectingChange?.(false);
  }, [selecting, onSelectingChange]);

  const liveSelected = photos.filter((p) => selected.has(p.id));
  const selCount = liveSelected.length;
  const allSelected = photos.length > 0 && selCount === photos.length;

  const doDelete = () => {
    const ids = liveSelected.map((p) => p.id);
    if (ids.length) onDeleteMany(ids);
    exitSelect();
  };
  const doDownload = async () => {
    const items = liveSelected.map((p) => ({ url: p.fullUrl, kind: p.kind }));
    if (!items.length || saving) return;
    setSaveFail(false);
    setSaving(true);
    try {
      await saveMedia(items);
    } catch {
      setSaveFail(true);
    } finally {
      setSaving(false);
    }
  };

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
    <div data-screen-label="앨범" style={css('display:flex;flex-direction:column;gap:9px')}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={onFiles}
        style={{ display: 'none' }}
      />

      {selecting ? (
        <SelectionBar
          L={L}
          count={selCount}
          allSelected={allSelected}
          saving={saving}
          saveFail={saveFail}
          confirming={confirmDel}
          onExit={exitSelect}
          onToggleAll={toggleAll}
          onDownload={doDownload}
          onAskDelete={() => selCount > 0 && setConfirmDel(true)}
          onConfirmDelete={doDelete}
          onCancelDelete={() => setConfirmDel(false)}
        />
      ) : (
        <>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
            <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{L.photo}</div>
            <div style={css('display:flex;align-items:center;gap:7px')}>
              {photos.length > 0 && (
                <button
                  onClick={startSelect}
                  style={css(
                    'min-height:36px;padding:6px 13px;border-radius:999px;border:1px solid #BFDCF0;background:#FFFFFF;color:#2B6C97;font-size:12.5px;font-weight:700',
                  )}
                >
                  {L.photoSelect}
                </button>
              )}
              <button
                onClick={() => inputRef.current?.click()}
                style={css(
                  'min-height:36px;padding:6px 15px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
                )}
              >
                {L.photoAdd}
              </button>
            </div>
          </div>
          <div style={css('font-size:12px;color:#8FAEC4;margin-top:-4px')}>{L.photoHint}</div>
        </>
      )}

      {empty ? (
        <button
          onClick={() => inputRef.current?.click()}
          style={css(
            'margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:34px 16px;border-radius:16px;border:1.5px dashed #BFDCF0;background:#FFFFFF;color:#7FA6C1',
          )}
        >
          <Icon name="add_a_photo" size={40} color="#AFD0E8" />
          <span style={css('font-size:13px;color:#8FAEC4;text-align:center;line-height:1.5')}>
            {L.photoEmpty}
          </span>
        </button>
      ) : (
        <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:2px')}>
          {!selecting &&
            uploads.map((u) => (
              <UploadTile
                key={u.key}
                up={u}
                label={L.uploading}
                errMsg={errMsg}
                onRetry={() => onRetry(u)}
              />
            ))}
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              p={p}
              selecting={selecting}
              selected={selected.has(p.id)}
              onTap={() => (selecting ? toggle(p.id) : setViewId(p.id))}
            />
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

function SelectionBar({
  L,
  count,
  allSelected,
  saving,
  saveFail,
  confirming,
  onExit,
  onToggleAll,
  onDownload,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  L: UIStrings;
  count: number;
  allSelected: boolean;
  saving: boolean;
  saveFail: boolean;
  confirming: boolean;
  onExit: () => void;
  onToggleAll: () => void;
  onDownload: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const none = count === 0;
  const iconBtn = (
    icon: IconName,
    label: string,
    onClick: () => void,
    disabled: boolean,
    tint: string,
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={css(
        `flex:none;width:36px;height:36px;border-radius:50%;border:none;background:#FFFFFF;display:flex;align-items:center;justify-content:center;padding:0;opacity:${disabled ? 0.4 : 1}`,
      )}
    >
      <Icon name={icon} size={20} color={tint} />
    </button>
  );

  return (
    <div style={css('display:flex;flex-direction:column;gap:7px')}>
      <div
        style={css(
          'display:flex;align-items:center;gap:8px;background:#E7F2FB;border:1px solid #CFE4F4;border-radius:13px;padding:6px 8px',
        )}
      >
        <button
          onClick={onExit}
          aria-label={L.close}
          style={css(
            'flex:none;width:34px;height:34px;border-radius:50%;border:none;background:#FFFFFF;color:#4A7492;display:flex;align-items:center;justify-content:center;padding:0',
          )}
        >
          <Icon name="close" size={18} />
        </button>
        <div style={css('flex:1;min-width:0;display:flex;align-items:center;gap:6px')}>
          <Icon
            name={none ? 'radio_button_unchecked' : 'check_circle'}
            size={20}
            color={none ? '#9DBAD0' : '#0B7CD8'}
          />
          <span style={css(`font-size:15px;font-weight:800;color:${none ? '#7C9BB4' : '#164A6B'}`)}>
            {count}
          </span>
        </div>
        <button
          onClick={onToggleAll}
          style={css(
            'flex:none;min-height:34px;padding:6px 11px;border-radius:999px;border:1px solid #BFDCF0;background:#FFFFFF;color:#2B6C97;font-size:12px;font-weight:700',
          )}
        >
          {allSelected ? L.photoSelClear : L.photoSelAll}
        </button>
        {iconBtn('download', L.photoDownload, onDownload, none || saving, '#0B7CD8')}
        {iconBtn('delete', L.del, onAskDelete, none, '#E8503A')}
      </div>

      {saving && (
        <div style={css('font-size:12px;color:#5A88A8;padding:0 4px')}>{L.photoPreparing}</div>
      )}
      {saveFail && !saving && (
        <div style={css('font-size:12px;color:#C0503C;padding:0 4px')}>{L.photoSaveFail}</div>
      )}
      {confirming && (
        <div
          style={css(
            'display:flex;align-items:center;gap:8px;background:#FDF2EF;border:1px solid #F3D2C9;border-radius:12px;padding:7px 10px',
          )}
        >
          <span style={css('flex:1;min-width:0;font-size:12.5px;color:#C0503C;font-weight:600')}>
            {L.photoDeleteManyAsk}
          </span>
          <button
            onClick={onConfirmDelete}
            style={css(
              'flex:none;min-height:32px;padding:5px 14px;border-radius:999px;border:none;background:#E8503A;color:#FFFFFF;font-size:12.5px;font-weight:700',
            )}
          >
            {L.del}
          </button>
          <button
            onClick={onCancelDelete}
            style={css(
              'flex:none;min-height:32px;padding:5px 14px;border-radius:999px;border:1px solid #E3C4BB;background:#FFFFFF;color:#B06450;font-size:12.5px;font-weight:600',
            )}
          >
            {L.cancel}
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoTile({
  p,
  selecting,
  selected,
  onTap,
}: {
  p: PhotoView;
  selecting: boolean;
  selected: boolean;
  onTap: () => void;
}) {
  // A real still only (image thumb / video poster). Poster-less videos render
  // the clip's first frame via a metadata-only <video> (a media fragment) so a
  // failed/legacy poster still shows a thumbnail instead of a bare icon.
  const still = p.thumbUrl || p.posterUrl || '';
  const videoStill = !still && p.kind === 'video';
  return (
    <button
      onClick={onTap}
      style={css(
        `position:relative;aspect-ratio:1;border:none;padding:0;border-radius:10px;overflow:hidden;background:#DCEAF4;display:block;${
          selected ? 'box-shadow:inset 0 0 0 3px #0B7CD8' : ''
        }`,
      )}
    >
      {still ? (
        <img
          src={still}
          alt=""
          loading="lazy"
          decoding="async"
          style={css('width:100%;height:100%;object-fit:cover;display:block')}
        />
      ) : videoStill ? (
        <video
          src={`${p.fullUrl}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          style={css('width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;background:#0A1622')}
        />
      ) : (
        <span
          style={css(
            'position:absolute;inset:0;display:flex;align-items:center;justify-content:center',
          )}
        >
          <Icon name="movie" size={30} color="#9CC0DC" />
        </span>
      )}
      {p.kind === 'video' && (
        <>
          <span
            style={css(
              'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;background:rgba(6,20,32,.5);display:flex;align-items:center;justify-content:center',
            )}
          >
            <Icon name="play_arrow" size={24} color="#FFFFFF" />
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
      {selecting && (
        <>
          {/* Dim the whole tile a touch while selecting so the checkmark reads. */}
          <span
            style={css(
              `position:absolute;inset:0;background:${selected ? 'rgba(11,124,216,.22)' : 'rgba(6,20,32,.14)'}`,
            )}
          />
          <span
            style={css(
              `position:absolute;top:5px;left:5px;width:23px;height:23px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${
                selected ? '#FFFFFF' : 'rgba(6,20,32,.35)'
              }`,
            )}
          >
            <Icon
              name={selected ? 'check_circle' : 'radio_button_unchecked'}
              size={23}
              color={selected ? '#0B7CD8' : '#FFFFFF'}
            />
          </span>
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
        <Icon name="error" size={22} color="#E8503A" />
        <span style={css('font-size:9.5px;color:#C0503C;line-height:1.3')}>{errMsg(up.error)}</span>
        <Icon name="refresh" size={15} color="#0B7CD8" />
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
      <Icon
        name={up.isVideo ? 'movie' : 'image'}
        size={26}
        color="#7FB2DC"
        style={css('animation:pulse 1.2s ease-in-out infinite')}
      />
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
