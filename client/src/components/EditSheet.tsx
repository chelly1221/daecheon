import type { KeyboardEvent } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';

export interface SheetChip {
  key: string;
  label: string;
  bg: string;
  fg: string;
  bd: string;
  onTap: () => void;
}

interface Props {
  L: UIStrings;
  title: string;
  saveLabel: string;
  showMemo: boolean;
  showCat: boolean;
  showAsg: boolean;
  showDelete: boolean;
  fName: string;
  fMemo: string;
  fLink: string;
  fCat: 'shared' | 'personal';
  asgChips: SheetChip[];
  onName: (v: string) => void;
  onMemo: (v: string) => void;
  onLink: (v: string) => void;
  onCat: (c: 'shared' | 'personal') => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EditSheet({
  L,
  title,
  saveLabel,
  showMemo,
  showCat,
  showAsg,
  showDelete,
  fName,
  fMemo,
  fLink,
  fCat,
  asgChips,
  onName,
  onMemo,
  onLink,
  onCat,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onSave();
  };
  const inputStyle =
    'min-height:46px;border:1px solid #D5E7F3;border-radius:12px;padding:0 14px;font-size:14px;background:#F7FCFF;outline:none;color:#22597C';

  const sharedActive = fCat === 'shared';
  const personalActive = fCat === 'personal';

  return (
    <div
      onClick={onClose}
      style={css(
        'position:fixed;inset:0;background:rgba(10,50,80,.45);z-index:95;display:flex;align-items:flex-end;justify-content:center',
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={css(
          'width:100%;max-width:430px;background:#FFFFFF;border-radius:22px 22px 0 0;padding:20px 18px 28px;display:flex;flex-direction:column;gap:12px;box-shadow:0 -8px 30px rgba(10,50,80,.2)',
        )}
      >
        <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
          <div style={css("font-family:'Jua',sans-serif;font-size:18px;color:#164A6B")}>{title}</div>
          <button
            onClick={onClose}
            style={css(
              'width:32px;height:32px;border-radius:50%;border:none;background:#EFF6FB;color:#6B8BA3;font-size:14px;font-weight:700;padding:0',
            )}
          >
            ✕
          </button>
        </div>

        <input
          value={fName}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={onKey}
          placeholder={L.namePh}
          style={css(inputStyle)}
        />

        {showMemo && (
          <>
            <input
              value={fMemo}
              onChange={(e) => onMemo(e.target.value)}
              onKeyDown={onKey}
              placeholder={L.memoPh}
              style={css(inputStyle)}
            />
            <input
              value={fLink}
              onChange={(e) => onLink(e.target.value)}
              onKeyDown={onKey}
              placeholder={L.linkPh}
              style={css(inputStyle)}
            />
          </>
        )}

        {showCat && (
          <div style={css('display:flex;gap:8px')}>
            <button
              onClick={() => onCat('shared')}
              style={css(
                `flex:1;min-height:46px;border:1.5px solid ${sharedActive ? '#0B7CD8' : '#D5E7F3'};border-radius:12px;background:${sharedActive ? '#0B7CD8' : '#FFFFFF'};color:${sharedActive ? '#FFFFFF' : '#5A7D96'};font-size:13.5px;font-weight:600`,
              )}
            >
              {L.shared}
            </button>
            <button
              onClick={() => onCat('personal')}
              style={css(
                `flex:1;min-height:46px;border:1.5px solid ${personalActive ? '#0B7CD8' : '#D5E7F3'};border-radius:12px;background:${personalActive ? '#0B7CD8' : '#FFFFFF'};color:${personalActive ? '#FFFFFF' : '#5A7D96'};font-size:13.5px;font-weight:600`,
              )}
            >
              {L.personal}
            </button>
          </div>
        )}

        {showAsg && (
          <div style={css('display:flex;flex-direction:column;gap:8px')}>
            <div style={css('font-size:12.5px;color:#7FA3BC;font-weight:600')}>{L.asg}</div>
            <div style={css('display:flex;flex-wrap:wrap;gap:6px')}>
              {asgChips.map((c) => (
                <button
                  key={c.key}
                  onClick={c.onTap}
                  style={css(
                    `min-height:40px;padding:8px 13px;border-radius:999px;border:1.5px solid ${c.bd};background:${c.bg};color:${c.fg};font-size:13px;font-weight:600`,
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={css('display:flex;gap:8px')}>
          {showDelete && (
            <button
              onClick={onDelete}
              style={css(
                'min-height:48px;padding:0 20px;border:1.5px solid #F3C1C1;border-radius:12px;background:#FFF5F5;color:#D25656;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center',
              )}
            >
              {L.del}
            </button>
          )}
          <button
            onClick={onSave}
            style={css(
              'flex:1;min-height:48px;border:none;border-radius:12px;background:#0B7CD8;color:#FFFFFF;font-size:14.5px;font-weight:700',
            )}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
