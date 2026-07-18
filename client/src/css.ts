import type { CSSProperties } from 'react';

/**
 * Convert a plain CSS declaration string (as authored in the design prototype's
 * inline `style="..."` attributes) into a React style object. Lets us port the
 * prototype's styling verbatim, avoiding transcription errors.
 *
 * NB: only safe because none of the prototype's inline values contain a `:`
 * (no url()/data: values, no pseudo-selectors) — the first `:` per declaration
 * is always the property/value separator.
 */
export function css(decls: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const part of decls.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!key) continue;
    const camel = key.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    out[camel] = val;
  }
  return out as CSSProperties;
}
