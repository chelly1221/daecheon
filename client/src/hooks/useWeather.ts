import { useEffect, useState } from 'react';
import type { Weather, WeatherHour, WeatherHours, WeatherStatus } from '../types';

// weather_code -> Korean description, matching the prototype's codeDesc thresholds.
export function codeDesc(c: number | null | undefined): string {
  if (c == null) return '—';
  if (c === 0) return '맑음';
  if (c <= 2) return '대체로 맑음';
  if (c === 3) return '흐림';
  if (c <= 48) return '안개';
  if (c <= 57) return '이슬비';
  if (c <= 67) return '비';
  if (c <= 77) return '눈';
  if (c <= 82) return '소나기';
  return '뇌우';
}

// weather_code -> look bucket now lives in icons.tsx as `weatherKind`, rendered
// by the colourful `WeatherIcon` SVG (retired the per-platform emoji).

// Daily cards + hourly breakdown in one request. Hourly only materialises once
// the trip falls inside Open-Meteo's ~16-day forecast horizon (before that the
// whole request 400s on an out-of-range date and we fall back to averages).
const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=36.32&longitude=126.51' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m' +
  '&timezone=Asia%2FSeoul&start_date=2026-08-04&end_date=2026-08-06';

export interface WeatherResult {
  days: Weather[] | null;
  /** Hourly forecast grouped by date key, or null when unavailable. */
  hours: WeatherHours | null;
  status: WeatherStatus;
}

// Split a flat hourly payload (parallel arrays) into per-date buckets keyed by
// the `YYYY-MM-DD` prefix of each timestamp — the same key the daily cards carry.
function parseHours(h: Record<string, unknown> | undefined): WeatherHours | null {
  const time = h && (h.time as string[] | undefined);
  if (!time || !time.length) return null;
  const num = (k: string) => (h[k] as (number | null)[] | undefined) || [];
  const temp = num('temperature_2m');
  const feels = num('apparent_temperature');
  const code = num('weather_code');
  const pp = num('precipitation_probability');
  const wind = num('wind_speed_10m');
  const out: WeatherHours = {};
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    if (temp[i] == null) continue; // skip padding hours the API returns as null
    const date = t.slice(0, 10);
    const hour: WeatherHour = {
      h: Number(t.slice(11, 13)),
      temp: Math.round(temp[i] as number),
      feels: feels[i] == null ? Math.round(temp[i] as number) : Math.round(feels[i] as number),
      code: code[i] == null ? 0 : (code[i] as number),
      pp: pp[i] == null ? null : (pp[i] as number),
      wind: wind[i] == null ? 0 : Math.round(wind[i] as number),
    };
    (out[date] ||= []).push(hour);
  }
  return Object.keys(out).length ? out : null;
}

export function useWeather(): WeatherResult {
  const [days, setDays] = useState<Weather[] | null>(null);
  const [hours, setHours] = useState<WeatherHours | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(URL);
        const d = await r.json();
        const dd = d && d.daily;
        if (
          dd &&
          dd.time &&
          dd.temperature_2m_max &&
          dd.temperature_2m_max[0] != null
        ) {
          const parsedHours = parseHours(d.hourly);
          const mapped: Weather[] = dd.time.map((t: string, i: number) => ({
            date: '8/' + (4 + i),
            // Join key to the hourly buckets; only set when that day actually
            // has hours, so a partial payload never yields a dead tap target.
            key: parsedHours && parsedHours[t] ? t : undefined,
            code: dd.weather_code ? dd.weather_code[i] : undefined,
            hi: Math.round(dd.temperature_2m_max[i]),
            lo: Math.round(dd.temperature_2m_min[i]),
            pp:
              (dd.precipitation_probability_max &&
              dd.precipitation_probability_max[i] != null
                ? dd.precipitation_probability_max[i]
                : '–') + '%',
            desc: codeDesc(dd.weather_code ? dd.weather_code[i] : null),
          }));
          if (!cancelled) {
            setDays(mapped);
            setHours(parsedHours);
            setStatus('live');
          }
          return;
        }
      } catch {
        /* fall through to average */
      }
      if (!cancelled) setStatus('avg');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { days, hours, status };
}
