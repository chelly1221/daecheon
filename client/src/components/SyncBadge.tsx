import { css } from '../css';
import type { UIStrings } from '../i18n';

export type SaveHint = 'saving' | 'saved' | 'error';

interface Props {
  hint: SaveHint;
  L: UIStrings;
}

/**
 * Small transient pill (above the bottom nav) that tells the user whether their
 * last change is being saved, saved, or failed. Purely informational —
 * `pointer-events:none` so it never blocks taps. Added because the app gave no
 * save feedback at all, which is how a successful add could read as "failed"
 * and get re-added.
 */
export default function SyncBadge({ hint, L }: Props) {
  const map = {
    saving: { text: L.saving, fg: '#5B7C93', bg: '#FFFFFF', bd: '#DCEAF4', dot: '#0B7CD8', pulse: true },
    saved: { text: L.saved, fg: '#1B9C63', bg: '#EFFBF4', bd: '#BFE9D2', dot: '#1FAF6B', pulse: false },
    error: { text: L.saveErr, fg: '#CE3B24', bg: '#FFF3F0', bd: '#F3C6BC', dot: '#E8503A', pulse: false },
  } as const;
  const s = map[hint];
  return (
    <div
      style={css(
        'position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:60;pointer-events:none;display:flex;align-items:center;gap:7px;' +
          `background:${s.bg};border:1px solid ${s.bd};color:${s.fg};` +
          'padding:6px 13px;border-radius:999px;font-size:12.5px;font-weight:600;box-shadow:0 4px 14px rgba(30,90,150,.16)',
      )}
    >
      <span
        style={css(
          `width:7px;height:7px;border-radius:50%;background:${s.dot};` +
            (s.pulse ? 'animation:pulse 1.1s ease-in-out infinite' : ''),
        )}
      />
      {s.text}
    </div>
  );
}
