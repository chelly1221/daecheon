import { useEffect, useState } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';
import {
  canPromptInstall,
  iosInstallHintEligible,
  isStandalone,
  onInstallStateChange,
  promptInstall,
} from '../pwa';
import type { MeChip } from './StartScreen';

interface Props {
  L: UIStrings;
  zh: boolean;
  meChips: MeChip[];
  onClose: () => void;
}

const INST = {
  ko: {
    install: '앱으로 설치',
    installed: '이미 앱으로 설치됨',
    iosHint: 'Safari에서 공유 버튼 → "홈 화면에 추가"를 눌러주세요',
  },
  zh: {
    install: '安装为应用',
    installed: '已安装为应用',
    iosHint: '在 Safari 点击分享按钮 → "添加到主屏幕"',
  },
};

export default function ProfileModal({ L, zh, meChips, onClose }: Props) {
  const [mode, setMode] = useState<'android' | 'ios' | 'installed' | 'none'>('none');
  const [iosHint, setIosHint] = useState(false);
  const t = zh ? INST.zh : INST.ko;

  useEffect(() => {
    const decide = () => {
      if (isStandalone()) setMode('installed');
      else if (canPromptInstall()) setMode('android');
      else if (iosInstallHintEligible()) setMode('ios');
      else setMode('none');
    };
    decide();
    return onInstallStateChange(decide);
  }, []);

  const onInstall = async () => {
    if (mode === 'ios') {
      setIosHint((v) => !v);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      try {
        localStorage.setItem('paros-install', 'installed');
      } catch {
        /* ignore */
      }
      setMode('installed');
    }
  };

  return (
    <div
      onClick={onClose}
      style={css(
        'position:fixed;inset:0;background:rgba(10,50,80,.45);z-index:90;display:flex;align-items:center;justify-content:center;padding:24px',
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          'width:100%;max-width:340px;background:#FFFFFF;border-radius:20px;padding:20px 18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 12px 40px rgba(10,50,80,.3)',
        )}
      >
        <div style={css("font-family:'Jua',sans-serif;font-size:18px;color:#164A6B;text-align:center")}>
          {L.prof}
        </div>
        <div style={css('display:flex;flex-direction:column;gap:8px')}>
          {meChips.map((c) => (
            <button
              key={c.id}
              onClick={c.onTap}
              style={css(
                `min-height:50px;padding:10px 14px;border-radius:14px;border:1.5px solid ${c.bd};background:${c.bg};color:${c.fg};font-size:14.5px;font-weight:600;display:flex;align-items:center;gap:10px;text-align:left`,
              )}
            >
              <span
                style={css(`width:12px;height:12px;border-radius:50%;background:${c.dot};flex:none`)}
              />
              <span style={css('flex:1')}>{c.label}</span>
              {c.isMe && <span style={css('font-size:11.5px;font-weight:700')}>{L.current}</span>}
            </button>
          ))}
        </div>

        {mode !== 'none' && (
          <>
            <div style={css('height:1px;background:#EAF2F8;margin:2px 0')} />
            {mode === 'installed' ? (
              <div
                style={css(
                  'display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;color:#1D9E7A;font-size:13.5px;font-weight:600',
                )}
              >
                <span style={css("font-family:'Material Symbols Rounded';font-size:18px")}>
                  check_circle
                </span>
                {t.installed}
              </div>
            ) : (
              <button
                onClick={onInstall}
                style={css(
                  "min-height:48px;border:none;border-radius:12px;background:#0B7CD8;color:#FFFFFF;font-family:'Jua',sans-serif;font-size:14.5px;display:flex;align-items:center;justify-content:center;gap:7px",
                )}
              >
                <span style={css("font-family:'Material Symbols Rounded';font-size:19px;line-height:1")}>
                  install_mobile
                </span>
                {t.install}
              </button>
            )}
            {mode === 'ios' && iosHint && (
              <div
                style={css(
                  'font-size:12px;color:#5A7D96;line-height:1.5;text-align:center;background:#F2F9FE;border:1px solid #DCEAF4;border-radius:12px;padding:10px 12px',
                )}
              >
                {t.iosHint}
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          style={css(
            'min-height:44px;border:1.5px solid #D5E7F3;border-radius:12px;background:#F7FCFF;color:#5A7D96;font-size:13.5px;font-weight:600',
          )}
        >
          {L.close}
        </button>
      </div>
    </div>
  );
}
