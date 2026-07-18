import { css } from '../css';
import type { UIStrings } from '../i18n';

interface Props {
  L: UIStrings;
  zh: boolean;
  ddayLabel: string;
  showProfile: boolean;
  myInitial: string;
  myColor: string;
  onProfile: () => void;
  onKo: () => void;
  onZh: () => void;
}

export default function Header({
  L,
  zh,
  ddayLabel,
  showProfile,
  myInitial,
  myColor,
  onProfile,
  onKo,
  onZh,
}: Props) {
  return (
    <div
      style={css(
        'position:relative;background:linear-gradient(180deg,#38A3F0 0%,#6FC3F7 55%,#A9DDFB 100%);padding:20px 20px 42px;overflow:hidden',
      )}
    >
      <div
        style={css(
          'position:absolute;top:56px;right:22px;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFF3C4,#FFCE54);box-shadow:0 0 36px rgba(255,222,130,.9);animation:bob 5s ease-in-out infinite',
        )}
      />
      <div
        style={css(
          'position:absolute;top:66px;right:88px;width:74px;height:24px;border-radius:20px;background:rgba(255,255,255,.85);animation:drift 9s ease-in-out infinite',
        )}
      />
      <div
        style={css(
          'position:absolute;top:28px;left:-14px;width:90px;height:28px;border-radius:20px;background:rgba(255,255,255,.55);animation:drift 12s ease-in-out infinite',
        )}
      />
      <div style={css('position:relative;display:flex;flex-direction:column;gap:6px')}>
        <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
          <span
            style={css(
              'background:#FFFFFF;color:#0B7CD8;font-weight:700;font-size:13px;padding:5px 12px;border-radius:999px;box-shadow:0 2px 8px rgba(20,90,150,.25)',
            )}
          >
            {ddayLabel}
          </span>
          <span style={css('color:#EAF7FF;font-size:12.5px;font-weight:500')}>{L.resort}</span>
          {showProfile && (
            <button
              onClick={onProfile}
              style={css(
                `margin-left:auto;width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,.9);background:${myColor};color:#FFFFFF;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(20,90,150,.25)`,
              )}
            >
              {myInitial}
            </button>
          )}
        </div>
        <h1
          style={css(
            "margin:2px 0 0;font-family:'Jua',sans-serif;font-weight:400;font-size:30px;line-height:1.15;color:#FFFFFF;text-shadow:0 2px 10px rgba(20,90,150,.3)",
          )}
        >
          {L.title}
        </h1>
        <div style={css('display:flex;align-items:center;gap:8px;margin-top:2px')}>
          <div style={css('flex:1;min-width:0;font-size:13px;color:#F2FAFF;font-weight:500')}>
            {L.dates}
          </div>
          <div
            style={css(
              'display:flex;flex:none;background:rgba(255,255,255,.28);border-radius:999px;padding:3px;gap:2px;box-shadow:0 2px 8px rgba(20,90,150,.18)',
            )}
          >
            <button
              onClick={onKo}
              style={css(
                `min-height:32px;padding:5px 13px;border-radius:999px;border:none;background:${zh ? 'transparent' : '#FFFFFF'};color:${zh ? '#EAF7FF' : '#0B7CD8'};font-size:13px;font-weight:700`,
              )}
            >
              한
            </button>
            <button
              onClick={onZh}
              style={css(
                `min-height:32px;padding:5px 13px;border-radius:999px;border:none;background:${zh ? '#FFFFFF' : 'transparent'};color:${zh ? '#0B7CD8' : '#EAF7FF'};font-size:13px;font-weight:700`,
              )}
            >
              中
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
