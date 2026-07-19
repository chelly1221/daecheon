import { useState } from 'react';
import { css } from '../css';
import type { UIStrings } from '../i18n';
import type { Lang, Weather, WeatherHours } from '../types';
import WeatherDetail from './WeatherDetail';

interface Props {
  L: UIStrings;
  lang: Lang;
  weatherDays: Weather[];
  weatherNote: string;
  /** Live hourly forecast keyed by {@link Weather.key}, or null before it lands. */
  hours: WeatherHours | null;
  /** True once the live forecast is in — gates the tap-through detail sheet. */
  live: boolean;
}

export default function HomeTab({ L, lang, weatherDays, weatherNote, hours, live }: Props) {
  // The date key of the day whose hourly sheet is open, if any.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openDay = openKey ? weatherDays.find((d) => d.key === openKey) : null;
  const openHours = openKey ? hours?.[openKey] : null;

  return (
    <div data-screen-label="홈" style={css('display:flex;flex-direction:column;gap:10px')}>
      {/* Mud festival banner — whole card links to the festival site */}
      <a
        href="https://mudfestival.or.kr/festival/view"
        target="_blank"
        rel="noopener"
        style={css(
          'background:linear-gradient(120deg,#8A6A4B,#A8865E);border-radius:16px;padding:11px 14px;color:#FFF7EC;display:flex;flex-direction:column;gap:3px;text-decoration:none',
        )}
      >
        <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
          <div style={css("font-family:'Jua',sans-serif;font-size:16.5px")}>{L.mudTitle}</div>
          <span
            style={css(
              "font-family:'Material Symbols Rounded';font-size:18px;line-height:1;opacity:.9;flex:none",
            )}
          >
            open_in_new
          </span>
        </div>
        <div style={css('font-size:12.5px;line-height:1.6;opacity:.95')}>
          {L.mudBody1}
          <br />
          {L.mudBody2}
        </div>
      </a>

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
            <DayCard
              key={w.date}
              w={w}
              L={L}
              tappable={live && !!w.key && !!hours?.[w.key]?.length}
              onOpen={() => w.key && setOpenKey(w.key)}
            />
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

      {openKey && openDay && openHours && openHours.length > 0 && (
        <WeatherDetail
          L={L}
          lang={lang}
          day={openDay}
          hours={openHours}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  );
}

function DayCard({
  w,
  L,
  tappable,
  onOpen,
}: {
  w: Weather;
  L: UIStrings;
  tappable: boolean;
  onOpen: () => void;
}) {
  const base =
    'border-radius:14px;padding:9px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;background:linear-gradient(180deg,#EAF6FF,#F7FCFF)';
  const inner = (
    <>
      <div style={css('font-weight:700;font-size:13.5px;color:#22597C')}>{w.date}</div>
      <div style={css('font-size:16px;font-weight:700;color:#0B7CD8;margin-top:2px')}>
        {w.hi}°<span style={css('font-size:12px;color:#8FB4CC;font-weight:500')}>/{w.lo}°</span>
      </div>
      <div style={css('font-size:11.5px;color:#4A7593')}>{w.desc}</div>
      <div style={css('font-size:11px;color:#66A3E0')}>
        {L.rain} {w.pp}
      </div>
      {tappable && (
        <span
          style={css(
            "font-family:'Material Symbols Rounded';font-size:15px;line-height:1;color:#66A3E0;margin-top:1px",
          )}
        >
          schedule
        </span>
      )}
    </>
  );

  if (!tappable) {
    return <div style={css(base + ';border:1px solid #DCEEFA')}>{inner}</div>;
  }
  return (
    <button
      onClick={onOpen}
      aria-label={`${w.date} · ${L.wHourly}`}
      style={css(
        base + ';border:1px solid #BFE2F7;cursor:pointer;font-family:inherit;margin:0;width:100%',
      )}
    >
      {inner}
    </button>
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
