import { css } from '../css';
import { Icon } from '../icons';

/** Small "chat n" chip shown on item cards that have comments. */
export default function CommentBadge({ n }: { n: number }) {
  return (
    <span
      style={css(
        'display:inline-flex;align-items:center;gap:3px;background:#EAF2F9;color:#5A7D96;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;line-height:1',
      )}
    >
      <Icon name="chat_bubble" size={14} color="#0B7CD8" />
      {n}
    </span>
  );
}
