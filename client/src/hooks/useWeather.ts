import { useEffect, useState } from 'react';
import type { Weather, WeatherStatus } from '../types';

// weather_code -> Korean description, matching the prototype's codeDesc thresholds.
function codeDesc(c: number | null | undefined): string {
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

const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=36.32&longitude=126.51&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&start_date=2026-08-04&end_date=2026-08-06';

export interface WeatherResult {
  days: Weather[] | null;
  status: WeatherStatus;
}

export function useWeather(): WeatherResult {
  const [days, setDays] = useState<Weather[] | null>(null);
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
          const mapped: Weather[] = dd.time.map((_t: string, i: number) => ({
            date: '8/' + (4 + i),
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

  return { days, status };
}
