import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { PackView } from '../viewmodels';

interface Props {
  L: UIStrings;
  sharedItems: PackView[];
  personalItems: PackView[];
  sharedProg: string;
  personalProg: string;
  onAdd: () => void;
}

export default function PackingTab({
  L,
  sharedItems,
  personalItems,
  sharedProg,
  personalProg,
  onAdd,
}: Props) {
  return (
    <div data-screen-label="준비물" style={css('display:flex;flex-direction:column;gap:12px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
        <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{L.pack}</div>
        <button
          onClick={onAdd}
          style={css(
            'min-height:38px;padding:7px 16px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
          )}
        >
          {L.add}
        </button>
      </div>
      <div style={css('font-size:12px;color:#8FAEC4;margin-top:-6px')}>{L.packHint}</div>

      <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:2px')}>
        <span style={css('font-weight:700;font-size:14.5px;color:#22597C')}>{L.shared}</span>
        <span style={css('font-size:12px;color:#66A3E0;font-weight:600')}>{sharedProg}</span>
      </div>
      {sharedItems.map((p) => (
        <PackRow key={p.id} p={p} />
      ))}

      <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:6px')}>
        <span style={css('font-weight:700;font-size:14.5px;color:#22597C')}>{L.personal}</span>
        <span style={css('font-size:12px;color:#66A3E0;font-weight:600')}>{personalProg}</span>
      </div>
      {personalItems.map((p) => (
        <PackRow key={p.id} p={p} />
      ))}
    </div>
  );
}

function PackRow({ p }: { p: PackView }) {
  const ckBd = p.checked ? '#23BD94' : '#C3DCEC';
  const ckBg = p.checked ? '#23BD94' : '#FFFFFF';
  return (
    <div
      style={css(
        'background:#FFFFFF;border-radius:15px;padding:11px 13px;box-shadow:0 2px 10px rgba(60,130,190,.06);display:flex;align-items:center;gap:10px',
      )}
    >
      <button
        onClick={p.onCheck}
        style={css(
          `width:30px;height:30px;flex:none;border-radius:50%;border:2px solid ${ckBd};background:${ckBg};color:#FFFFFF;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0`,
        )}
      >
        {p.checked ? '✓' : ''}
      </button>
      <div
        onClick={p.onTap}
        style={css(
          'flex:1;min-width:0;font-size:14.5px;font-weight:600;color:#22597C;text-decoration:none;opacity:1;cursor:pointer',
        )}
      >
        {p.name}
      </div>
      <div
        style={css(
          'display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:45%;flex:none',
        )}
      >
        {p.asgChips.map((c, i) => (
          <span
            key={i}
            style={css(
              `padding:4px 9px;border-radius:999px;background:${c.bg};color:#FFFFFF;font-size:11px;font-weight:700`,
            )}
          >
            {c.label}
          </span>
        ))}
      </div>
      {p.edChips.length > 0 && (
        <div style={css('display:flex;gap:4px;flex:none;align-items:center')}>
          {p.edChips.map((e, i) => (
            <span
              key={i}
              style={css(
                'display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:#FFF7E8;border:1px solid #F5DFAE;color:#8A6A1C;font-size:10.5px;font-weight:600',
              )}
            >
              <span
                style={css(`width:6px;height:6px;border-radius:50%;background:${e.color}`)}
              />
              {e.short}
            </span>
          ))}
        </div>
      )}
      <span style={css('flex:none;color:#C6DCEC;font-size:17px;line-height:1;font-weight:600')}>›</span>
    </div>
  );
}
