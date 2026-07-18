// KO↔ZH machine translation for text that has no manual translation
// (chat messages, user-added items). Detection is by script, so we only ever
// hit the network when a string really is in the other language; everything is
// cached (memory + localStorage) so each unique string costs one call.
import type { Lang } from './types';

// Korean Hangul syllables; CJK ideographs (used by Chinese).
const HANGUL = /[가-힣]/;
const HAN = /[一-鿿㐀-䶿]/;

/**
 * Best-effort language detection for the two languages this app supports.
 * Hangul ⇒ Korean (Korean text may mix in Han, but Chinese never uses Hangul,
 * so testing Hangul first is reliable). Han without Hangul ⇒ Chinese. Text with
 * neither (latin, numbers, emoji) returns null — nothing to translate.
 */
export function detectLang(text: string): Lang | null {
  if (HANGUL.test(text)) return 'ko';
  if (HAN.test(text)) return 'zh';
  return null;
}

/** Whether `text` needs machine translation to be readable in `to`. */
export function needsTranslation(text: string, to: Lang): boolean {
  const from = detectLang(text);
  return from !== null && from !== to;
}

const CACHE_PREFIX = 'tr:';
const mem = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(text: string, from: Lang, to: Lang): string {
  return `${from}>${to}>${text}`;
}

/**
 * Translate `text` into `to` via the server proxy. Returns the original text
 * unchanged when no translation is needed or on any failure, so callers can
 * render the result unconditionally. Successful results are cached in memory
 * and localStorage; concurrent requests for the same string are de-duplicated.
 */
export async function translate(text: string, to: Lang): Promise<string> {
  const from = detectLang(text);
  if (from === null || from === to) return text;

  const key = cacheKey(text, from, to);
  const cached = mem.get(key);
  if (cached !== undefined) return cached;
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (stored !== null) {
      mem.set(key, stored);
      return stored;
    }
  } catch {
    /* ignore */
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const r = await fetch(`/api/translate?from=${from}&to=${to}&q=${encodeURIComponent(text)}`);
        if (!r.ok) throw new Error('bad');
        const j = (await r.json()) as { text?: string };
        const out = typeof j.text === 'string' && j.text ? j.text : text;
        mem.set(key, out); // cache even a no-op result to avoid re-requesting
        try {
          localStorage.setItem(CACHE_PREFIX + key, out);
        } catch {
          /* ignore */
        }
        return out;
      } catch {
        return text; // network/quota failure: fall back to the original, uncached (retry later)
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
  }
  return pending;
}
