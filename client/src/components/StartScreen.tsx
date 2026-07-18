import { css } from '../css';
import type { UIStrings } from '../i18n';

export interface MeChip {
  id: string;
  label: string;
  dot: string;
  bg: string;
  fg: string;
  bd: string;
  isMe: boolean;
  onTap: () => void;
}

interface Props {
  L: UIStrings;
  meChips: MeChip[];
}

export default function StartScreen({ L, meChips }: Props) {
  return (
    <div
      data-screen-label="시작"
      style={css('display:flex;flex-direction:column;gap:14px;padding-top:10px')}
    >
      <div
        style={css(
          'background:#FFFFFF;border-radius:18px;padding:24px 18px;box-shadow:0 3px 14px rgba(60,130,190,.08);display:flex;flex-direction:column;gap:14px',
        )}
      >
        <div style={css('text-align:center;display:flex;flex-direction:column;gap:4px')}>
          <div style={css("font-family:'Jua',sans-serif;font-size:22px;color:#164A6B")}>
            {L.who}
          </div>
          <div style={css('font-size:13px;color:#5A7D96;margin-top:4px')}>{L.whoSub}</div>
        </div>
        <div style={css('display:flex;flex-direction:column;gap:9px')}>
          {meChips.map((c) => (
            <button
              key={c.id}
              onClick={c.onTap}
              style={css(
                'min-height:54px;padding:12px 16px;border-radius:15px;border:1.5px solid #D5E7F3;background:#F7FCFF;color:#22597C;font-size:15.5px;font-weight:600;display:flex;align-items:center;gap:12px;text-align:left',
              )}
            >
              <span
                style={css(
                  `width:14px;height:14px;border-radius:50%;background:${c.dot};flex:none`,
                )}
              />
              <span style={css('flex:1')}>{c.label}</span>
              <span style={css('color:#9DBDD2;font-size:14px')}>→</span>
            </button>
          ))}
        </div>
        <div
          style={css('font-size:11.5px;color:#9DBDD2;text-align:center;line-height:1.6')}
        >
          {L.whoNote}
        </div>
      </div>
    </div>
  );
}
