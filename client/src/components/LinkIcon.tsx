import { css } from '../css';

/**
 * A single, background-less link glyph used identically everywhere a card/detail
 * exposes an external link. Uses the app's Material Symbols webfont (rather than
 * a 🔗 emoji, which renders differently per platform) so it looks the same on
 * every device. stopPropagation keeps a tap on the icon from also triggering the
 * surrounding card's onClick.
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
        "display:inline-flex;align-items:center;justify-content:center;flex:none;color:#0B7CD8;font-family:'Material Symbols Rounded';font-size:19px;line-height:1;text-decoration:none",
      )}
    >
      link
    </a>
  );
}
