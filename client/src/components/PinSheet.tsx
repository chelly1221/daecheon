import type { KeyboardEvent } from 'react';
import { css } from '../css';
import { Icon } from '../icons';
import { PIN_CATS } from '../data';
import type { UIStrings } from '../i18n';
import type { Lang, PinCat } from '../types';

interface Props {
  L: UIStrings;
  lang: Lang;
  title: string;
  saveLabel: string;
  /** Edit mode shows the delete + "위치 옮기기" affordances; add mode hides them. */
  isEdit: boolean;
  fName: string;
  fMemo: string;
  fCat: PinCat;
  onName: (v: string) => void;
  onMemo: (v: string) => void;
  onCat: (c: PinCat) => void;
  onSave: () => void;
  onDelete: () => void;
  onMove: () => void;
  onClose: () => void;
}

export default function PinSheet({
  L,
  lang,
  title,
  saveLabel,
  isEdit,
  fName,
  fMemo,
  fCat,
  onName,
  onMemo,
  onCat,
  onSave,
  onDelete,
  onMove,
  onClose,
}: Props) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onSave();
  };
  const inputStyle =
    'min-height:46px;border:1px solid #D5E7F3;border-radius:12px;padding:0 14px;font-size:14px;background:#F7FCFF;outline:none;color:#22597C';

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
          'box-sizing:border-box;width:100%;max-width:430px;background:#FFFFFF;border-radius:22px 22px 0 0;padding:20px 18px 28px;display:flex;flex-direction:column;gap:12px;box-shadow:0 -8px 30px rgba(10,50,80,.2)',
        )}
      >
        <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
          <div style={css("font-family:'Jua',sans-serif;font-size:18px;color:#164A6B")}>{title}</div>
          <button
            onClick={onClose}
            aria-label={L.close}
            style={css(
              'width:32px;height:32px;border-radius:50%;border:none;background:#EFF6FB;color:#6B8BA3;display:flex;align-items:center;justify-content:center;padding:0',
            )}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <input
          value={fName}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={onKey}
          placeholder={L.pinNamePh}
          autoFocus
          style={css(inputStyle)}
        />
        <input
          value={fMemo}
          onChange={(e) => onMemo(e.target.value)}
          onKeyDown={onKey}
          placeholder={L.memoPh}
          style={css(inputStyle)}
        />

        <div style={css('display:flex;flex-direction:column;gap:8px')}>
          <div style={css('font-size:12.5px;color:#7FA3BC;font-weight:600')}>{L.pinCat}</div>
          <div style={css('display:flex;flex-wrap:wrap;gap:6px')}>
            {PIN_CATS.map((c) => {
              const on = fCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onCat(c.id)}
                  style={css(
                    `min-height:40px;padding:7px 13px;border-radius:999px;border:1.5px solid ${on ? c.color : '#DCEAF4'};background:${on ? c.color : '#F7FCFF'};color:${on ? '#FFFFFF' : '#5A7D96'};font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px`,
                  )}
                >
                  <Icon name={c.icon} size={16} color={on ? '#FFFFFF' : c.color} />
                  {lang === 'zh' ? c.zh : c.ko}
                </button>
              );
            })}
          </div>
        </div>

        {isEdit && (
          <button
            onClick={onMove}
            style={css(
              'min-height:46px;border:1.5px solid #BBDCF2;border-radius:12px;background:#F2F9FE;color:#0B7CD8;font-size:13.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px',
            )}
          >
            <Icon name="open_with" size={18} />
            {L.pinMove}
          </button>
        )}

        <div style={css('display:flex;gap:8px')}>
          {isEdit && (
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
