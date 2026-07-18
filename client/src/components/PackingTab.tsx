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

// Shared-list filter: 전체보기 (all assigned) or a member id (their items). The
// unassigned group is always shown as well (top in 전체보기, below in a member
// view), never a filter of its own.
const ALL = 'all';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Guard a stale member selection (they lost all their items via sync) back to
  // 전체보기 instead of showing an empty list.
  const active = filter === ALL || asgTabs.some((t) => t.id === filter) ? filter : ALL;
  const q = query.trim().toLowerCase();
  const match = (p: PackView) => !q || p.name.toLowerCase().includes(q);

  const showFilter = sharedAssigned.length > 0; // nothing assigned → no filter row
  const assignedBase =
    active === ALL ? sharedAssigned : sharedAssigned.filter((p) => p.assigneeIds.includes(active));
  const assignedShown = assignedBase.filter(match);
  const unassignedShown = sharedUnassigned.filter(match);
  const personalShown = personalItems.filter(match);

  const rows = (list: PackView[]) => list.map((p) => <PackRow key={p.id} p={p} lang={lang} />);
  const label = (text: string, n?: number) => (
    <div style={css('display:flex;align-items:baseline;gap:6px;margin-top:2px')}>
      <span style={css('font-size:12px;font-weight:700;color:#5B87A6')}>{text}</span>
      {n !== undefined && (
        <span style={css('font-size:11.5px;color:#9BB6CC;font-weight:600')}>{n}</span>
      )}
    </div>
  );
  const unassignedBlock = unassignedShown.length > 0 && (
    <>
      {showFilter && label(L.unassigned, unassignedShown.length)}
      {rows(unassignedShown)}
    </>
  );

  return (
    <div data-screen-label="준비물" style={css('display:flex;flex-direction:column;gap:9px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
        <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{L.pack}</div>
        <div style={css('display:flex;align-items:center;gap:7px;flex:none')}>
          <button
            onClick={() => {
              setSearchOpen((o) => {
                if (o) setQuery('');
                return !o;
              });
            }}
            aria-label={L.searchPh}
            style={css(
              `width:36px;height:36px;border-radius:11px;border:1px solid ${searchOpen ? '#0B7CD8' : '#DCEAF4'};background:${searchOpen ? '#0B7CD8' : '#FFFFFF'};color:${searchOpen ? '#FFFFFF' : '#0B7CD8'};font-family:'Material Symbols Rounded';font-size:20px;display:flex;align-items:center;justify-content:center;padding:0`,
            )}
          >
            {searchOpen ? 'close' : 'search'}
          </button>
          <button
            onClick={onAdd}
            style={css(
              'min-height:36px;padding:6px 15px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
            )}
          >
            {L.add}
          </button>
        </div>
      </div>

      {searchOpen ? (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder={L.searchPh}
          style={css(
            'width:100%;box-sizing:border-box;min-height:40px;padding:9px 13px;border-radius:12px;border:1px solid #D5E7F3;background:#FFFFFF;font-size:14px;color:#22597C;outline:none',
          )}
        />
      ) : (
        <div style={css('font-size:12px;color:#8FAEC4;margin-top:-4px')}>{L.packHint}</div>
      )}

      <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:2px')}>
        <span style={css('font-weight:700;font-size:14.5px;color:#22597C')}>{L.shared}</span>
        <span style={css('font-size:12px;color:#66A3E0;font-weight:600')}>{sharedProg}</span>
      </div>

      {showFilter && (
        <div style={css('display:flex;flex-wrap:wrap;gap:6px')}>
          <FilterTab
            label={L.filterAll}
            count={sharedAssigned.length}
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
        </div>
      )}

      {active === ALL ? (
        <>
          {unassignedBlock}
          {assignedShown.length > 0 && unassignedShown.length > 0 && label(L.assigned)}
          {rows(assignedShown)}
        </>
      ) : (
        <>
          {rows(assignedShown)}
          {unassignedBlock}
        </>
      )}

      <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:6px')}>
        <span style={css('font-weight:700;font-size:14.5px;color:#22597C')}>{L.personal}</span>
        <span style={css('font-size:12px;color:#66A3E0;font-weight:600')}>{personalProg}</span>
      </div>
      {rows(personalShown)}

      {q && assignedShown.length + unassignedShown.length + personalShown.length === 0 && (
        <div style={css('font-size:12.5px;color:#9BB6CC;text-align:center;padding:14px 0')}>
          {L.noResult}
        </div>
      )}
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
      {/* Dot is always present (white when selected) so selecting a tab doesn't
          change its width and shuffle the row. */}
      <span style={css(`width:7px;height:7px;border-radius:50%;background:${on ? '#FFFFFF' : color}`)} />
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
