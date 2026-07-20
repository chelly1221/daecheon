import { css } from '../css';
import { Icon } from '../icons';

/**
 * A single, background-less link glyph used identically everywhere a card/detail
 * exposes an external link. Inline SVG (rather than a 🔗 emoji, which renders
 * differently per platform) so it looks the same on every device.
 * stopPropagation keeps a tap on the icon from also triggering the surrounding
 * card's onClick.
 */
export default function LinkIcon({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="link"
      onClick={(e) => e.stopPropagation()}
      style={css(
        'display:inline-flex;align-items:center;justify-content:center;flex:none;color:#0B7CD8;text-decoration:none',
      )}
    >
      <Icon name="link" size={19} />
    </a>
  );
}
