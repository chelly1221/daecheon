import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { MeChip } from './StartScreen';

interface Props {
  L: UIStrings;
  meChips: MeChip[];
  onClose: () => void;
}

export default function ProfileModal({ L, meChips, onClose }: Props) {
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
              {c.isMe && (
                <span style={css('font-size:11.5px;font-weight:700')}>{L.current}</span>
              )}
            </button>
          ))}
        </div>
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
