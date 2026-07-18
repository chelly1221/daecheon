import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { FoodView } from '../viewmodels';

interface Props {
  L: UIStrings;
  foods: FoodView[];
  onAdd: () => void;
}

export default function FoodTab({ L, foods, onAdd }: Props) {
  return (
    <div data-screen-label="맛집" style={css('display:flex;flex-direction:column;gap:12px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
        <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{L.food}</div>
        <button
          onClick={onAdd}
          style={css(
            'min-height:38px;padding:7px 16px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
          )}
        >
          {L.add}
        </button>
      </div>
      <div style={css('font-size:12px;color:#8FAEC4;margin-top:-6px')}>{L.foodHint}</div>
      {foods.map((f) => (
        <div
          key={f.id}
          style={css(
            'background:#FFFFFF;border-radius:16px;padding:14px 15px;box-shadow:0 3px 12px rgba(60,130,190,.07);display:flex;flex-direction:column;gap:9px',
          )}
        >
          <div
            onClick={f.onTap}
            style={css('display:flex;align-items:flex-start;gap:8px;cursor:pointer')}
          >
            <div style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:3px')}>
              <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                <span
                  style={css(
                    "font-family:'Jua',sans-serif;font-size:16.5px;color:#1C4E70;line-height:1.3",
                  )}
                >
                  {f.name}
                </span>
                <span
                  style={css(
                    'background:#E7F7F1;color:#1D9E7A;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px',
                  )}
                >
                  {f.type}
                </span>
                {f.linkShow && (
                  <a
                    href={f.link}
                    target="_blank"
                    rel="noopener"
                    onClick={(e) => e.stopPropagation()}
                    style={css(
                      'display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#EAF4FC;border:1px solid #C9E2F4;font-size:12px;text-decoration:none',
                    )}
                  >
                    🔗
                  </a>
                )}
              </div>
              {f.memoShow && (
                <div style={css('font-size:12.5px;color:#5A7D96;line-height:1.5')}>{f.memo}</div>
              )}
            </div>
            <div style={css('display:flex;align-items:center;gap:6px;flex:none')}>
              <span
                style={css('color:#B8D3E6;font-size:20px;line-height:1.2;font-weight:600')}
              >
                ›
              </span>
            </div>
          </div>
          {f.edChips.length > 0 && (
            <div style={css('display:flex;flex-wrap:wrap;gap:5px')}>
              {f.edChips.map((e, i) => (
                <span
                  key={i}
                  style={css(
                    'display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:#FFF7E8;border:1px solid #F5DFAE;color:#8A6A1C;font-size:11px;font-weight:600',
                  )}
                >
                  <span
                    style={css(`width:7px;height:7px;border-radius:50%;background:${e.color}`)}
                  />
                  {e.label}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
