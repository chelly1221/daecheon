import { css } from '../css';
import { Icon } from '../icons';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import type { FoodView } from '../viewmodels';
import AutoText from './AutoText';
import CommentBadge from './CommentBadge';
import LinkIcon from './LinkIcon';

interface Props {
  L: UIStrings;
  lang: Lang;
  foods: FoodView[];
  onAdd: () => void;
}

export default function FoodTab({ L, lang, foods, onAdd }: Props) {
  return (
    <div data-screen-label="맛집" style={css('display:flex;flex-direction:column;gap:9px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
        <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{L.food}</div>
        <button
          onClick={onAdd}
          style={css(
            'min-height:36px;padding:6px 15px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
          )}
        >
          {L.add}
        </button>
      </div>
      <div style={css('font-size:12px;color:#8FAEC4;margin-top:-4px')}>{L.foodHint}</div>
      {foods.map((f) => (
        <div
          key={f.id}
          style={css(
            'background:#FFFFFF;border-radius:16px;padding:11px 13px;box-shadow:0 3px 12px rgba(60,130,190,.07);display:flex;flex-direction:column;gap:7px',
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
                  <AutoText text={f.name} to={lang} />
                </span>
                {f.linkShow && <LinkIcon href={f.link} />}
                {f.locShow && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      f.onMap();
                    }}
                    aria-label={L.viewOnMap}
                    style={css(
                      'display:inline-flex;align-items:center;justify-content:center;flex:none;width:24px;height:24px;border:none;background:transparent;color:#0B7CD8;padding:0',
                    )}
                  >
                    <Icon name="place" size={18} />
                  </button>
                )}
              </div>
              {f.memoShow && (
                <div style={css('font-size:12.5px;color:#5A7D96;line-height:1.5')}>
                  <AutoText text={f.memo} to={lang} />
                </div>
              )}
            </div>
            <div style={css('display:flex;align-items:center;gap:7px;flex:none')}>
              {f.commentCount > 0 && <CommentBadge n={f.commentCount} />}
              <Icon name="chevron_right" size={22} color="#B8D3E6" />
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
