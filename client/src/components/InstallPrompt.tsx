import { useEffect, useState } from 'react';
import { css } from '../css';
import {
  androidInAppBrowser,
  canPromptInstall,
  iosInstallHintEligible,
  isStandalone,
  onInstallStateChange,
  openInChrome,
  promptInstall,
} from '../pwa';

// Suppress the banner for a while after the user dismisses it, and forever once
// the app is installed. Stored in localStorage under this key.
const DISMISS_KEY = 'paros-install';
const SUPPRESS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const T = {
  ko: {
    title: '앱으로 설치하기',
    body: '홈 화면에 추가하면 앱처럼 바로 열 수 있어요',
    iosBody: '공유 버튼을 누르고 "홈 화면에 추가"를 선택하세요',
    chromeTitle: 'Chrome에서 열어주세요',
    chromeBody: '지금 브라우저에선 설치가 안 돼요 · Chrome으로 열면 홈 화면에 추가할 수 있어요',
    chromeBtn: 'Chrome으로 열기',
    install: '설치',
    later: '나중에',
  },
  zh: {
    title: '安装为应用',
    body: '添加到主屏幕后可像应用一样打开',
    iosBody: '点击"分享"按钮，选择"添加到主屏幕"',
    chromeTitle: '请用Chrome打开',
    chromeBody: '当前浏览器无法安装 · 用Chrome打开即可添加到主屏幕',
    chromeBtn: '用Chrome打开',
    install: '安装',
    later: '以后',
  },
};

function suppressed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    if (v === 'installed') return true;
    const ts = Number(v);
    return Number.isFinite(ts) && Date.now() - ts < SUPPRESS_MS;
  } catch {
    return false;
  }
}

interface Props {
  zh: boolean;
  navOffset: boolean;
}

export default function InstallPrompt({ zh, navOffset }: Props) {
  const [mode, setMode] = useState<'hidden' | 'android' | 'ios' | 'chrome'>('hidden');
  const t = zh ? T.zh : T.ko;

  useEffect(() => {
    if (isStandalone() || suppressed()) return;

    const decide = () => {
      if (isStandalone() || suppressed()) {
        setMode('hidden');
      } else if (canPromptInstall()) {
        setMode('android');
      } else if (androidInAppBrowser()) {
        setMode('chrome');
      } else if (iosInstallHintEligible()) {
        setMode('ios');
      }
    };

    // Small delay so it doesn't flash on the very first paint.
    const timer = window.setTimeout(decide, 1200);
    const off = onInstallStateChange(decide);
    return () => {
      window.clearTimeout(timer);
      off();
    };
  }, []);

  if (mode === 'hidden') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setMode('hidden');
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      try {
        localStorage.setItem(DISMISS_KEY, 'installed');
      } catch {
        /* ignore */
      }
    }
    setMode('hidden');
  };

  const bottom = navOffset
    ? 'calc(60px + env(safe-area-inset-bottom, 0px) + 12px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 12px)';

  return (
    <div
      // Swallow touch-start so a swipe over this fixed banner doesn't bubble up
      // to the app container's swipe-to-change-tab handler.
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        ...css(
          'position:fixed;left:50%;transform:translateX(-50%);width:100%;max-width:430px;z-index:60;padding:0 12px;box-sizing:border-box',
        ),
        bottom,
      }}
    >
      <div
        style={css(
          'display:flex;align-items:center;gap:12px;background:#FFFFFF;border:1px solid #D5E7F3;border-radius:16px;padding:11px 12px 11px 13px;box-shadow:0 10px 30px rgba(11,90,160,.22)',
        )}
      >
        <img
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          style={css('width:44px;height:44px;border-radius:11px;flex:none')}
        />
        <div style={css('flex:1;min-width:0')}>
          <div
            style={css("font-family:'Jua',sans-serif;font-size:15px;color:#164A6B;line-height:1.2")}
          >
            {mode === 'chrome' ? t.chromeTitle : t.title}
          </div>
          <div style={css('font-size:12px;color:#5A7D96;margin-top:3px;line-height:1.35')}>
            {mode === 'ios' ? t.iosBody : mode === 'chrome' ? t.chromeBody : t.body}
          </div>
        </div>
        {mode === 'ios' ? (
          <span
            aria-hidden="true"
            style={css("font-family:'Material Symbols Rounded';font-size:24px;color:#0B7CD8;flex:none")}
          >
            ios_share
          </span>
        ) : (
          <button
            onClick={mode === 'chrome' ? () => openInChrome() : install}
            style={css(
              "border:none;background:#0B7CD8;color:#FFFFFF;font-family:'Jua',sans-serif;font-size:14px;padding:9px 16px;border-radius:12px;flex:none;white-space:nowrap",
            )}
          >
            {mode === 'chrome' ? t.chromeBtn : t.install}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label={t.later}
          style={css(
            "border:none;background:none;color:#8AA5B8;font-family:'Material Symbols Rounded';font-size:22px;line-height:1;flex:none;padding:4px;cursor:pointer",
          )}
        >
          close
        </button>
      </div>
    </div>
  );
}
