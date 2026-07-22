import { useEffect, useRef } from 'react';
import { css } from '../css';
import { Icon, WeatherIcon } from '../icons';
import type { UIStrings } from '../i18n';
import type { Lang, Weather, WeatherHour } from '../types';

interface Props {
  L: UIStrings;
  lang: Lang;
  /** The localized daily card this sheet expands (date label, hi/lo, desc). */
  day: Weather;
  hours: WeatherHour[];
  onClose: () => void;
}

const hourLabel = (h: number, lang: Lang) => h + (lang === 'zh' ? '时' : '시');

/**
 * Bottom-sheet expansion of a live daily forecast card: an hour-by-hour list
 * with a per-row temperature bar. Mirrors {@link MediaViewer}'s overlay
 * conventions — a dim fixed backdrop that closes on tap/Escape, and touch
 * events stopped from bubbling so the app's tab-swipe never fires underneath.
 */
export default function WeatherDetail({ L, lang, day, hours, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Move focus into the sheet on open, restore it to the trigger on close.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prev?.focus?.();
  }, []);

  const temps = hours.map((h) => h.temp);
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const span = Math.max(1, hi - lo);
  // Header condition mirrors the daily card's desc (same daily weather_code),
  // not a single hour, so the icon never contradicts the text beside it.
  const headCode = day.code ?? hours[0].code;

  return (
    <div
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        ...css(
          'position:fixed;inset:0;z-index:200;background:rgba(9,28,44,.5);display:flex;flex-direction:column;justify-content:flex-end',
        ),
        animation: 'fadeIn .18s ease-out',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${day.date} · ${L.wHourly}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...css(
            'box-sizing:border-box;width:100%;max-width:430px;margin:0 auto;background:#FFFFFF;border-radius:22px 22px 0 0;padding:8px 14px 16px;display:flex;flex-direction:column;gap:12px;max-height:86vh;box-shadow:0 -8px 30px rgba(20,74,107,.18)',
          ),
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          animation: 'slideUp .24s ease-out',
        }}
      >
        {/* Grabber */}
        <div
          style={css(
            'align-self:center;width:38px;height:4px;border-radius:2px;background:#D3E4F0;margin:2px 0',
          )}
        />

        {/* Header: representative condition · date · hi/lo · close */}
        <div style={css('display:flex;align-items:center;gap:10px')}>
          <WeatherIcon code={headCode} size={34} />
          <div style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:1px')}>
            <div style={css("font-family:'Jua',sans-serif;font-size:17px;color:#164A6B")}>
              {day.date}
            </div>
            <div style={css('font-size:12.5px;color:#5E86A0')}>{L.wHourly}</div>
          </div>
          <div style={css('text-align:right;flex:none')}>
            <div style={css('font-size:16px;font-weight:700;color:#0B7CD8')}>
              {day.hi}°
              <span style={css('font-size:12.5px;color:#8FB4CC;font-weight:500')}>/{day.lo}°</span>
            </div>
            <div style={css('font-size:11.5px;color:#4A7593')}>{day.desc}</div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={L.close}
            style={css(
              'flex:none;width:32px;height:32px;border-radius:50%;border:none;background:#EEF5FB;color:#5E86A0;display:flex;align-items:center;justify-content:center;padding:0',
            )}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Hourly list */}
        <div
          style={css(
            'flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:2px',
          )}
        >
          {hours.map((h) => {
            const daytime = h.h >= 8 && h.h <= 19;
            const fill = Math.round(((h.temp - lo) / span) * 100);
            const rainy = h.pp != null && h.pp >= 40;
            return (
              <div
                key={h.h}
                style={css(
                  `display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:11px;background:${daytime ? '#F2F9FF' : 'transparent'}`,
                )}
              >
                <span
                  style={css(
                    'flex:none;width:36px;font-size:12.5px;font-weight:700;color:#3B6E92',
                  )}
                >
                  {hourLabel(h.h, lang)}
                </span>
                <span style={css('flex:none;width:22px;display:flex;justify-content:center')}>
                  <WeatherIcon code={h.code} size={20} />
                </span>
                {/* Temperature bar — relative position within the day's range */}
                <div
                  style={css(
                    'flex:1;min-width:0;height:6px;border-radius:3px;background:#EAF3FA;position:relative',
                  )}
                >
                  <div
                    style={css(
                      `position:absolute;left:0;top:0;bottom:0;width:${fill}%;min-width:6px;border-radius:3px;background:linear-gradient(90deg,#8FD0FF,#0B7CD8)`,
                    )}
                  />
                </div>
                {/* Right cluster: temp + precip, feels + wind underneath */}
                <div
                  style={css('flex:none;width:110px;display:flex;flex-direction:column;align-items:flex-end;gap:1px')}
                >
                  <div style={css('display:flex;align-items:baseline;gap:7px')}>
                    <span style={css('font-size:14px;font-weight:700;color:#17537C')}>{h.temp}°</span>
                    <span
                      style={css(
                        `font-size:11.5px;font-weight:${rainy ? '700' : '500'};color:${rainy ? '#2E86D6' : '#93B6CE'}`,
                      )}
                    >
                      <Icon
                        name="water_drop"
                        size={11}
                        style={css('display:inline-block;vertical-align:-1.5px;margin-right:1px')}
                      />
                      {h.pp == null ? '–' : h.pp + '%'}
                    </span>
                  </div>
                  <div style={css('font-size:10.5px;color:#9AB4C8;white-space:nowrap')}>
                    {L.wFeels} {h.feels}° ·{' '}
                    <Icon
                      name="air"
                      size={11}
                      style={css('display:inline-block;vertical-align:-1.5px')}
                    />
                    {h.wind}km/h
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Source */}
        <div style={css('font-size:11px;color:#9FBBD0;text-align:center')}>{L.wSource}</div>
      </div>
    </div>
  );
}
