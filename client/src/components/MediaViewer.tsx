import { useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import AutoText from './AutoText';

/** One item shown in the full-screen viewer (a gallery photo or a chat attachment). */
export interface ViewerItem {
  id: string;
  kind: 'image' | 'video';
  fullUrl: string;
  posterUrl?: string;
  by?: string;
  color?: string;
  time?: string;
  caption?: string;
  canDelete?: boolean;
}

interface Props {
  items: ViewerItem[];
  index: number;
  lang: Lang;
  L: UIStrings;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

/**
 * Full-screen photo/video lightbox. Self-contained: it stops its own touch
 * events from bubbling so the app's tab-swipe never fires underneath it, and
 * navigates via edge buttons, image swipe, and arrow keys.
 */
export default function MediaViewer({ items, index, lang, L, onIndex, onClose, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const i = Math.max(0, Math.min(index, items.length - 1));
  const item = items[i];
  const many = items.length > 1;

  const go = (d: number) => {
    setConfirming(false);
    const ni = i + d;
    if (ni >= 0 && ni < items.length) onIndex(ni);
  };

  // Escape closes; arrows navigate (desktop convenience).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, items.length]);

  // Reset the delete confirmation whenever the shown item changes.
  useEffect(() => setConfirming(false), [item?.id]);

  if (!item) return null;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      swipeRef.current = null;
      return;
    }
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  };

  const navBtn = (dir: -1 | 1) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        go(dir);
      }}
      aria-label={dir < 0 ? 'previous' : 'next'}
      disabled={dir < 0 ? i === 0 : i === items.length - 1}
      style={css(
        `position:absolute;top:50%;${dir < 0 ? 'left:8px' : 'right:8px'};transform:translateY(-50%);width:42px;height:42px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#FFFFFF;font-size:22px;display:flex;align-items:center;justify-content:center;padding:0;z-index:2;opacity:${
          (dir < 0 ? i === 0 : i === items.length - 1) ? 0.25 : 1
        }`,
      )}
    >
      {dir < 0 ? '‹' : '›'}
    </button>
  );

  return (
    <div
      onClick={onClose}
      onTouchStart={(e) => {
        e.stopPropagation();
        onTouchStart(e);
      }}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => {
        e.stopPropagation();
        onTouchEnd(e);
      }}
      style={css(
        'position:fixed;inset:0;z-index:200;background:rgba(6,20,32,.95);display:flex;flex-direction:column',
      )}
    >
      {/* Top bar: uploader + time, counter, close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          'flex:none;display:flex;align-items:center;gap:10px;padding:14px 14px 10px;color:#EAF4FB',
        )}
      >
        <div style={css('flex:1;min-width:0;display:flex;align-items:center;gap:8px')}>
          {!!item.by && (
            <>
              <span
                style={css(
                  `width:10px;height:10px;border-radius:50%;background:${item.color || '#8AA5B8'};flex:none`,
                )}
              />
              <span style={css('font-size:13.5px;font-weight:700;color:#FFFFFF')}>{item.by}</span>
            </>
          )}
          {!!item.time && <span style={css('font-size:11.5px;color:#9FBBD0')}>{item.time}</span>}
        </div>
        {many && (
          <span style={css('font-size:12px;color:#9FBBD0;font-weight:600')}>
            {i + 1} / {items.length}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={L.close}
          style={css(
            'flex:none;width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#FFFFFF;font-size:15px;font-weight:700;padding:0',
          )}
        >
          ✕
        </button>
      </div>

      {/* Media stage — tapping the dark area around the media closes. */}
      <div
        style={css(
          'flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;padding:0 6px',
        )}
      >
        {item.kind === 'video' ? (
          <video
            key={item.id}
            src={item.fullUrl}
            poster={item.posterUrl}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            // Keep scrubber/control touches from bubbling to the stage's swipe
            // handler, which would otherwise read a horizontal seek as navigation.
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            style={css('max-width:100%;max-height:100%;border-radius:8px;background:#000')}
          />
        ) : (
          <img
            key={item.id}
            src={item.fullUrl}
            alt=""
            decoding="async"
            onClick={(e) => e.stopPropagation()}
            style={css('max-width:100%;max-height:100%;object-fit:contain;border-radius:8px')}
          />
        )}
        {many && navBtn(-1)}
        {many && navBtn(1)}
      </div>

      {/* Bottom bar: caption + delete/confirm */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={css('flex:none;padding:10px 16px 20px;display:flex;flex-direction:column;gap:10px')}
      >
        {!!item.caption && (
          <div style={css('font-size:13px;color:#DCEAF4;line-height:1.5;text-align:center')}>
            <AutoText text={item.caption} to={lang} />
          </div>
        )}
        {item.canDelete && onDelete && (
          <div style={css('display:flex;justify-content:center')}>
            {confirming ? (
              <div style={css('display:flex;align-items:center;gap:8px')}>
                <span style={css('font-size:12.5px;color:#F3C7BE')}>{L.photoDeleteAsk}</span>
                <button
                  onClick={() => onDelete(item.id)}
                  style={css(
                    'min-height:32px;padding:5px 14px;border-radius:999px;border:none;background:#E8503A;color:#FFFFFF;font-size:12.5px;font-weight:700',
                  )}
                >
                  {L.del}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  style={css(
                    'min-height:32px;padding:5px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#DCEAF4;font-size:12.5px;font-weight:600',
                  )}
                >
                  {L.cancel}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                style={css(
                  "display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:6px 15px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#F0C9C1;font-size:13px;font-weight:600",
                )}
              >
                <span style={css("font-family:'Material Symbols Rounded';font-size:17px;line-height:1")}>
                  delete
                </span>
                {L.del}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
