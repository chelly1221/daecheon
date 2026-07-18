// PWA install helpers.
//
// The browser fires `beforeinstallprompt` once, often right after load — before
// a React effect could attach a listener. So we capture it at module-load time
// (this module is imported from the app entry) and expose it to components.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const subscribers = new Set<() => void>();

function notify() {
  for (const cb of subscribers) cb();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // stop Chrome's default mini-infobar; we show our own UI
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

/** Subscribe to install-state changes. Returns an unsubscribe function. */
export function onInstallStateChange(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** True once the app has been installed this session. */
export function wasInstalled(): boolean {
  return installed;
}

/** The captured install event, if the browser offered one (Chromium only). */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Show the native install prompt. Resolves with the user's choice. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; // the event can only be used once
  notify();
  return outcome;
}

/** Already running as an installed app (standalone/home-screen). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS Safari home-screen apps
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// In-app browsers / Android WebViews (KakaoTalk, Naver, Line, Instagram…) that
// offer no PWA install. Detected by user-agent.
const IN_APP_BROWSER = /KAKAOTALK|NAVER|Line\/|FBAN|FBAV|Instagram|DaumApps|Snapchat/i;

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

/**
 * iOS has no programmatic install — the only path is Safari's
 * Share → "Add to Home Screen". Return true when it's worth showing that hint:
 * on iOS, not already installed, and not inside an in-app browser (KakaoTalk,
 * Line, Naver, Facebook, Instagram…) where the option is unavailable.
 */
export function iosInstallHintEligible(): boolean {
  if (typeof navigator === 'undefined' || isStandalone()) return false;
  const ua = navigator.userAgent;
  const nav = navigator as unknown as { platform?: string; maxTouchPoints?: number };
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as MacIntel with touch
    (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1);
  if (!isIOS) return false;
  if (IN_APP_BROWSER.test(ua)) return false;
  return true;
}

/**
 * On Android, are we stuck inside an in-app browser / WebView (KakaoTalk,
 * Naver, Line, Instagram…) where the app can't be installed? There
 * `beforeinstallprompt` never fires, so the only path to an installable app is
 * to reopen the page in Chrome — callers should surface that hint.
 */
export function androidInAppBrowser(): boolean {
  if (typeof navigator === 'undefined' || isStandalone() || !isAndroid()) return false;
  const ua = navigator.userAgent;
  return IN_APP_BROWSER.test(ua) || /; wv\)/.test(ua);
}

/**
 * Reopen the current page in Chrome via an Android `intent:` URL. The room id
 * is carried across as ?room= (Chrome has its own localStorage, so the #room=
 * hash the in-app browser stored wouldn't survive otherwise). No-op off Android.
 */
export function openInChrome(): void {
  if (typeof window === 'undefined' || !isAndroid()) return;
  const { host, pathname, hash } = window.location;
  const m = hash.match(/room=([A-Za-z0-9-]+)/);
  const query = m ? `?room=${m[1]}` : '';
  window.location.href = `intent://${host}${pathname}${query}#Intent;scheme=https;package=com.android.chrome;end`;
}
