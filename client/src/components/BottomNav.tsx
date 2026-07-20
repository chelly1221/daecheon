import { css } from '../css';
import type { Tab } from '../types';
import { Icon } from '../icons';
import type { IconName } from '../icons';

export interface NavItem {
  key: Tab;
  icon: IconName;
  fg: string;
  dotOp: number;
  onTap: () => void;
}

interface Props {
  navs: NavItem[];
}

export default function BottomNav({ navs }: Props) {
  return (
    <div
      style={css(
        'position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(255,255,255,.97);backdrop-filter:blur(8px);border-top:1px solid #E1EFF8;display:flex;z-index:50',
      )}
    >
      {navs.map((n) => (
        <button
          key={n.key}
          onClick={n.onTap}
          style={css(
            'flex:1;min-height:60px;border:none;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:9px 0 8px',
          )}
        >
          <Icon name={n.icon} size={26} color={n.fg} />
          <span
            style={css(
              `width:5px;height:5px;border-radius:50%;background:#0B7CD8;opacity:${n.dotOp}`,
            )}
          />
        </button>
      ))}
    </div>
  );
}
