import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { Weather } from '../types';

interface Props {
  L: UIStrings;
  weatherDays: Weather[];
  weatherNote: string;
}

export default function HomeTab({ L, weatherDays, weatherNote }: Props) {
  return (
    <div data-screen-label="홈" style={css('display:flex;flex-direction:column;gap:10px')}>
      {/* Mud festival banner */}
      <div
        style={css(
          'background:linear-gradient(120deg,#8A6A4B,#A8865E);border-radius:16px;padding:11px 14px;color:#FFF7EC;display:flex;flex-direction:column;gap:3px',
        )}
      >
        <div style={css("font-family:'Jua',sans-serif;font-size:16.5px")}>{L.mudTitle}</div>
        <div style={css('font-size:12.5px;line-height:1.6;opacity:.95')}>
          {L.mudBody1}
          <br />
          {L.mudBody2}
        </div>
      </div>

      {/* Weather */}
      <div
        style={css(
          'background:#FFFFFF;border-radius:18px;padding:13px;box-shadow:0 3px 14px rgba(60,130,190,.08);display:flex;flex-direction:column;gap:9px',
        )}
      >
        <div style={css("font-family:'Jua',sans-serif;font-size:17px;color:#164A6B")}>
          {L.weather}
        </div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px')}>
          {weatherDays.map((w) => (
            <div
              key={w.date}
              style={css(
                'background:linear-gradient(180deg,#EAF6FF,#F7FCFF);border:1px solid #DCEEFA;border-radius:14px;padding:9px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center',
              )}
            >
              <div style={css('font-weight:700;font-size:13.5px;color:#22597C')}>{w.date}</div>
              <div
                style={css('font-size:16px;font-weight:700;color:#0B7CD8;margin-top:2px')}
              >
                {w.hi}°
                <span style={css('font-size:12px;color:#8FB4CC;font-weight:500')}>/{w.lo}°</span>
              </div>
              <div style={css('font-size:11.5px;color:#4A7593')}>{w.desc}</div>
              <div style={css('font-size:11px;color:#66A3E0')}>
                {L.rain} {w.pp}
              </div>
            </div>
          ))}
        </div>
        <div style={css('font-size:11.5px;color:#8FAEC4;line-height:1.5')}>{weatherNote}</div>
      </div>

      {/* Stay info */}
      <div
        style={css(
          'background:#FFFFFF;border-radius:18px;padding:13px;box-shadow:0 3px 14px rgba(60,130,190,.08);display:flex;flex-direction:column;gap:8px',
        )}
      >
        <div style={css("font-family:'Jua',sans-serif;font-size:17px;color:#164A6B")}>{L.stay}</div>
        <div style={css('display:flex;flex-direction:column;gap:6px;font-size:13.5px;line-height:1.5')}>
          <StayRow label={L.ci} value="15:00" />
          <StayRow label={L.co} value="11:00" />
          <StayRow label={L.room} value={L.roomV} />
          <StayRow label={L.addr} value={L.addrV} />
          <StayRow label={L.fac} value={L.facV} />
          <StayRow label={L.beach} value={L.beachV} />
        </div>
        <div style={css('display:flex;gap:8px')}>
          <a
            href="https://www.hanwharesort.co.kr/irsweb/resort3/resort/rs_room.do?bp_cd=0901&rm_cd=SUI&sel_month=20260701"
            target="_blank"
            rel="noopener"
            style={css(
              'flex:1;min-height:44px;border-radius:12px;background:#0B7CD8;color:#FFFFFF;font-size:13.5px;font-weight:700;display:flex;align-items:center;justify-content:center;text-decoration:none',
            )}
          >
            {L.roomBtn}
          </a>
          <a
            href="https://www.hanwharesort.co.kr/irsweb/resort3/resort/rs_intro.do?bp_cd=0901"
            target="_blank"
            rel="noopener"
            style={css(
              'flex:1;min-height:44px;border:1.5px solid #BBDCF2;border-radius:12px;background:#FFFFFF;color:#0B7CD8;font-size:13.5px;font-weight:700;display:flex;align-items:center;justify-content:center;text-decoration:none',
            )}
          >
            {L.siteBtn}
          </a>
        </div>
      </div>
    </div>
  );
}

function StayRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={css('display:flex;gap:10px')}>
      <span style={css('flex:none;width:60px;color:#7FA3BC;font-weight:600')}>{label}</span>
      <span style={css('color:#33546B')}>{value}</span>
    </div>
  );
}
