import { useEffect, useState } from 'react';
import type { Lang } from '../types';
import { needsTranslation, translate } from '../translate';

/**
 * Returns `text` translated into `to`, or the original while the translation is
 * in flight or when none is needed. Safe to call for every rendered string: it
 * short-circuits with no network when the text is already in `to` (e.g. seed
 * content that already has a manual translation).
 */
export function useTranslated(text: string, to: Lang): string {
  const [out, setOut] = useState(() => text);
  useEffect(() => {
    if (!needsTranslation(text, to)) {
      setOut(text);
      return;
    }
    let alive = true;
    setOut(text); // show the original until the translation resolves
    void translate(text, to).then((t) => {
      if (alive) setOut(t);
    });
    return () => {
      alive = false;
    };
  }, [text, to]);
  return out;
}

/** Inline text that transparently machine-translates itself into `to`. */
export default function AutoText({ text, to }: { text: string; to: Lang }) {
  return <>{useTranslated(text, to)}</>;
}
