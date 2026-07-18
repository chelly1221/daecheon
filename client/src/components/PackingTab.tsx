import { useState } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import type { AsgTab, PackView } from '../viewmodels';
import AutoText from './AutoText';
import CommentBadge from './CommentBadge';

interface Props {
  L: UIStrings;
  lang: Lang;
  sharedAssigned: PackView[];
  sharedUnassigned: PackView[];
  asgTabs: AsgTab[];
  personalItems: PackView[];
  sharedProg: string;
  personalProg: string;
  onAdd: () => void;
}

// Filter selection for the shared list: 'all' (전체보기), 'unassigned' (미지정),
// or a member id (that assignee's items).
const ALL = 'all';
const UNASSIGNED = 'unassigned';

export default function PackingTab({
  L,
  lang,
  sharedAssigned,
  sharedUnassigned,
  asgTabs,
  personalItems,
  sharedProg,
  personalProg,
  onAdd,
}: Props) {
  const [filter, setFilter] = useState<string>(ALL);
  // Guard a stale selection (e.g. the member lost all their items via sync, or
  // no unassigned items remain) back to 전체보기 instead of an empty list.
  const valid =
    filter === ALL ||
    (filter === UNASSIGNED && sharedUnassigned.length > 0) ||
    asgTabs.some((t) => t.id === filter);
  const active = valid ? filter : ALL;

  const memberItems = (id: string) => sharedAssigned.filter((p) => p.assigneeIds.includes(id));
  const showFilter = sharedAssigned.length > 0; // nothing assigned → no filter row

  return (
    <div data-screen-label="준비물" style={css('display:flex;flex-direction:column;gap:9px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
        <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{L.pack}</div>
        <button
          onClick={onAdd}
          style={css(
            'min-height:36px;padding:6px 15px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
          )}
        >
          {L.add}
        </button>
      </div>
      <div style={css('font-size:12px;color:#8FAEC4;margin-top:-4px')}>{L.packHint}</div>

      <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:2px')}>
        <span style={css('font-weight:700;font-size:14.5px;color:#22597C')}>{L.shared}</span>
        <span style={css('font-size:12px;color:#66A3E0;font-weight:600')}>{sharedProg}</span>
      </div>

      {showFilter && (
        <div style={css('display:flex;flex-wrap:wrap;gap:6px')}>
          <FilterTab
            label={L.filterAll}
            count={sharedAssigned.length + sharedUnassigned.length}
            color="#0B7CD8"
            on={active === ALL}
            onTap={() => setFilter(ALL)}
          />
          {asgTabs.map((t) => (
            <FilterTab
              key={t.id}
              label={t.label}
              count={t.count}
              color={t.color}
              on={active === t.id}
              onTap={() => setFilter((cur) => (cur === t.id ? ALL : t.id))}
            />
          ))}
          {sharedUnassigned.length > 0 && (
            <FilterTab
              label={L.unassigned}
              count={sharedUnassigned.length}
              color="#8AA5B8"
              on={active === UNASSIGNED}
              onTap={() => setFilter((cur) => (cur === UNASSIGNED ? ALL : UNASSIGNED))}
            />
          )}
        </div>
      )}

      {/* Shared rows for the active filter. In 전체보기, assigned come first and
          the still-unassigned are grouped under a divider. */}
      {active === ALL &&
        (showFilter ? (
          <>
            {sharedAssigned.map((p) => (
              <PackRow key={p.id} p={p} lang={lang} />
            ))}
            {sharedUnassigned.length > 0 && (
              <div style={css('font-size:12px;font-weight:700;color:#5B87A6;margin-top:2px')}>
                {L.unassigned}
              </div>
            )}
            {sharedUnassigned.map((p) => (
              <PackRow key={p.id} p={p} lang={lang} />
            ))}
          </>
        ) : (
          sharedUnassigned.map((p) => <PackRow key={p.id} p={p} lang={lang} />)
        ))}
      {active === UNASSIGNED &&
        sharedUnassigned.map((p) => <PackRow key={p.id} p={p} lang={lang} />)}
      {active !== ALL &&
        active !== UNASSIGNED &&
        memberItems(active).map((p) => <PackRow key={p.id} p={p} lang={lang} />)}

      <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:6px')}>
        <span style={css('font-weight:700;font-size:14.5px;color:#22597C')}>{L.personal}</span>
        <span style={css('font-size:12px;color:#66A3E0;font-weight:600')}>{personalProg}</span>
      </div>
      {personalItems.map((p) => (
        <PackRow key={p.id} p={p} lang={lang} />
      ))}
    </div>
  );
}

function FilterTab({
  label,
  count,
  color,
  on,
  onTap,
}: {
  label: string;
  count: number;
  color: string;
  on: boolean;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      style={css(
        'display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;' +
          (on
            ? `background:${color};color:#FFFFFF;border:1px solid ${color}`
            : 'background:#EFF6FB;color:#5B87A6;border:1px solid #DCEAF4'),
      )}
    >
      {!on && <span style={css(`width:7px;height:7px;border-radius:50%;background:${color}`)} />}
      {label}
      <span
        style={css(
          `font-size:11px;font-weight:700;padding:1px 6px;border-radius:999px;${
            on ? 'background:rgba(255,255,255,.28);color:#FFFFFF' : 'background:#FFFFFF;color:#7FA3BC'
          }`,
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PackRow({ p, lang }: { p: PackView; lang: Lang }) {
  const ckBd = p.checked ? '#23BD94' : '#C3DCEC';
  const ckBg = p.checked ? '#23BD94' : '#FFFFFF';
  return (
    <div
      style={css(
        'background:#FFFFFF;border-radius:14px;padding:9px 12px;box-shadow:0 2px 10px rgba(60,130,190,.06);display:flex;align-items:center;gap:10px',
      )}
    >
      <button
        onClick={p.onCheck}
        style={css(
          `width:28px;height:28px;flex:none;border-radius:50%;border:2px solid ${ckBd};background:${ckBg};color:#FFFFFF;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0`,
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
        <AutoText text={p.name} to={lang} />
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
      {p.commentCount > 0 && <CommentBadge n={p.commentCount} />}
      <span style={css('flex:none;color:#C6DCEC;font-size:17px;line-height:1;font-weight:600')}>›</span>
    </div>
  );
}
