import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { css } from '../css';
import { Icon, iconSvg } from '../icons';
import type { IconName } from '../icons';
import type { UIStrings } from '../i18n';
import type { Lang } from '../types';
import type { LiveLocView, PinView, PlaceMode } from '../viewmodels';
import AutoText from './AutoText';

interface Props {
  L: UIStrings;
  lang: Lang;
  pins: PinView[];
  liveLocs: LiveLocView[];
  /** Initial map centre / recenter fallback (the resort). */
  center: { lat: number; lng: number };
  /** One-shot centre used when arriving via a list/detail "지도에서 보기" jump; it
   *  overrides the fit-all default on mount. Null in normal navigation. */
  focus: { lat: number; lng: number } | null;
  sharing: boolean;
  shareError: 'denied' | 'unavailable' | null;
  /** Non-null while the map is armed to place/move a pin on the next tap. */
  placing: PlaceMode | null;
  sharingCount: number;
  onToggleShare: () => void;
  onArmNew: () => void;
  onCancelPlace: () => void;
  onPlaced: (lat: number, lng: number) => void;
}

// DivIcon markers only (no default Leaflet image assets, which break under
// bundlers). Content is a fixed inline-SVG icon + a category/member colour —
// never user text — so the inlined HTML can't carry an injection.
// `filled` markers (colour-filled, white glyph) mark 맛집/액티비티 locations so
// they read differently from manual pins (white, colour glyph).
function pinIcon(icon: IconName, color: string, filled: boolean): L.DivIcon {
  const bg = filled ? color : '#fff';
  const border = filled ? '#fff' : color;
  const glyph = filled ? '#fff' : color;
  const ring = filled
    ? `0 0 0 2px ${color}66,0 2px 6px rgba(20,60,90,.35)`
    : '0 2px 6px rgba(20,60,90,.35)';
  return L.divIcon({
    className: 'paros-pin',
    html:
      `<div style="width:34px;height:34px;border-radius:50%;background:${bg};` +
      `border:3px solid ${border};box-shadow:${ring};` +
      `display:flex;align-items:center;justify-content:center">` +
      `${iconSvg(icon, 19, glyph)}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function locIcon(initial: string, color: string, isMe: boolean): L.DivIcon {
  const ring = isMe
    ? `box-shadow:0 0 0 4px ${color}33,0 2px 6px rgba(20,60,90,.4)`
    : 'box-shadow:0 2px 6px rgba(20,60,90,.4)';
  return L.divIcon({
    className: 'paros-loc',
    html:
      `<div style="width:30px;height:30px;border-radius:50%;background:${color};` +
      `border:2.5px solid #fff;${ring};display:flex;align-items:center;justify-content:center;` +
      `color:#fff;font-size:13px;font-weight:700">${initial}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export default function MapTab({
  L: T,
  lang,
  pins,
  liveLocs,
  center,
  focus,
  sharing,
  shareError,
  placing,
  sharingCount,
  onToggleShare,
  onArmNew,
  onCancelPlace,
  onPlaced,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const locLayerRef = useRef<L.LayerGroup | null>(null);
  const pinMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const locMarkersRef = useRef<Map<string, { marker: L.Marker; circle: L.Circle | null }>>(
    new Map(),
  );
  // Last-rendered signature per marker. App rebuilds pins/liveLocs arrays every
  // render (2s poll, each location fix), so the reconcile effects re-run with a
  // fresh reference each time; these let us skip setLatLng/setIcon for markers
  // whose data didn't actually change.
  const pinSigRef = useRef<Map<string, string>>(new Map());
  const locSigRef = useRef<Map<string, string>>(new Map());

  // Latest props for the imperatively-bound Leaflet handlers (bound once).
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const locsRef = useRef(liveLocs);
  locsRef.current = liveLocs;
  const placingRef = useRef(placing);
  placingRef.current = placing;
  const onPlacedRef = useRef(onPlaced);
  onPlacedRef.current = onPlaced;
  const centerRef = useRef(center);
  centerRef.current = center;

  // Fullscreen is a pure view concern (not synced): a CSS overlay that fills the
  // viewport. We don't use the native Fullscreen API because iOS Safari doesn't
  // support it for non-<video> elements — the mobile target here.
  const [fullscreen, setFullscreen] = useState(false);

  const fitContent = () => {
    const map = mapRef.current;
    if (!map) return;
    const pts: [number, number][] = [];
    for (const p of pinsRef.current) pts.push([p.lat, p.lng]);
    for (const l of locsRef.current) pts.push([l.lat, l.lng]);
    if (pts.length === 0) {
      map.setView([centerRef.current.lat, centerRef.current.lng], 15);
    } else if (pts.length === 1) {
      map.setView(pts[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [46, 46], maxZoom: 16 });
    }
  };

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const me = locsRef.current.find((l) => l.isMe);
    if (me) map.setView([me.lat, me.lng], 16);
    else fitContent();
  };

  const focusPin = (p: PinView) => {
    const map = mapRef.current;
    if (map) map.panTo([p.lat, p.lng]);
    p.onTap();
  };

  // Init the Leaflet map once per mount. MapTab is remounted on every tab
  // switch (App keys the content by tab), so this also tears the map down.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      // No +/- control: it would collide with the placement banner, and touch
      // users pinch-zoom. Recenter/fit live in the React overlay instead.
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: T.mapSource,
    }).addTo(map);
    mapRef.current = map;
    pinLayerRef.current = L.layerGroup().addTo(map);
    locLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (placingRef.current) onPlacedRef.current(e.latlng.lat, e.latlng.lng);
    });

    // A "지도에서 보기" jump centres on that spot; otherwise fit all markers.
    if (focus) map.setView([focus.lat, focus.lng], 16);
    else fitContent();
    // The map mounts inside a slide-animated (transformed) container; nudge
    // Leaflet to re-measure once layout settles and again after the animation.
    const t0 = window.setTimeout(() => map.invalidateSize(), 60);
    const t1 = window.setTimeout(() => map.invalidateSize(), 320);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      map.remove();
      mapRef.current = null;
      pinLayerRef.current = null;
      locLayerRef.current = null;
      pinMarkersRef.current.clear();
      locMarkersRef.current.clear();
      pinSigRef.current.clear();
      locSigRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile pin markers with the current pins.
  useEffect(() => {
    const layer = pinLayerRef.current;
    if (!layer) return;
    const markers = pinMarkersRef.current;
    const sigs = pinSigRef.current;
    const ids = new Set(pins.map((p) => p.id));
    for (const [id, m] of markers) {
      if (!ids.has(id)) {
        layer.removeLayer(m);
        markers.delete(id);
        sigs.delete(id);
      }
    }
    for (const p of pins) {
      const sig = `${p.lat}|${p.lng}|${p.icon}|${p.color}|${p.fromList ? 1 : 0}`;
      let m = markers.get(p.id);
      if (!m) {
        m = L.marker([p.lat, p.lng], { icon: pinIcon(p.icon, p.color, !!p.fromList), keyboard: false });
        // Look the pin up fresh on click so the handler never goes stale.
        m.on('click', () => {
          const cur = pinsRef.current.find((x) => x.id === p.id);
          if (cur) focusPin(cur);
        });
        m.addTo(layer);
        markers.set(p.id, m);
        sigs.set(p.id, sig);
      } else if (sigs.get(p.id) !== sig) {
        m.setLatLng([p.lat, p.lng]);
        m.setIcon(pinIcon(p.icon, p.color, !!p.fromList));
        sigs.set(p.id, sig);
      }
    }
  }, [pins]);

  // Reconcile live-location markers + accuracy circles with presence.
  useEffect(() => {
    const layer = locLayerRef.current;
    if (!layer) return;
    const markers = locMarkersRef.current;
    const sigs = locSigRef.current;
    const keys = new Set(liveLocs.map((l) => l.key));
    for (const [key, entry] of markers) {
      if (!keys.has(key)) {
        layer.removeLayer(entry.marker);
        if (entry.circle) layer.removeLayer(entry.circle);
        markers.delete(key);
        sigs.delete(key);
      }
    }
    for (const l of liveLocs) {
      const sig = `${l.lat}|${l.lng}|${l.initial}|${l.color}|${l.isMe}|${l.age}|${l.acc || 0}`;
      // Cap the drawn accuracy radius so a coarse fix can't blanket the map.
      const radius = l.acc && l.acc > 0 ? Math.min(l.acc, 1500) : 0;
      let entry = markers.get(l.key);
      if (!entry) {
        const marker = L.marker([l.lat, l.lng], {
          icon: locIcon(l.initial, l.color, l.isMe),
          keyboard: false,
          zIndexOffset: 1000,
        });
        marker.bindTooltip(`${l.name} · ${l.age}`, { direction: 'top', offset: [0, -16] });
        marker.addTo(layer);
        const circle = radius
          ? L.circle([l.lat, l.lng], {
              radius,
              color: l.color,
              weight: 1,
              fillColor: l.color,
              fillOpacity: 0.12,
              interactive: false,
            }).addTo(layer)
          : null;
        markers.set(l.key, { marker, circle });
        sigs.set(l.key, sig);
      } else if (sigs.get(l.key) !== sig) {
        entry.marker.setLatLng([l.lat, l.lng]);
        entry.marker.setIcon(locIcon(l.initial, l.color, l.isMe));
        entry.marker.setTooltipContent(`${l.name} · ${l.age}`);
        if (entry.circle) {
          if (radius) entry.circle.setLatLng([l.lat, l.lng]).setRadius(radius);
          else {
            layer.removeLayer(entry.circle);
            entry.circle = null;
          }
        } else if (radius) {
          entry.circle = L.circle([l.lat, l.lng], {
            radius,
            color: l.color,
            weight: 1,
            fillColor: l.color,
            fillOpacity: 0.12,
            interactive: false,
          }).addTo(layer);
        }
        sigs.set(l.key, sig);
      }
    }
  }, [liveLocs]);

  // Placement mode → crosshair cursor on the map surface.
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.style.cursor = placing ? 'crosshair' : '';
  }, [placing]);

  // Entering/leaving fullscreen changes the container size dramatically — Leaflet
  // must re-measure or tiles render for the old size (grey gaps / wrong center).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(t);
  }, [fullscreen]);

  // While fullscreen: lock the page behind it from scrolling and let Escape exit.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const shareErrText =
    shareError === 'denied' ? T.locDenied : shareError === 'unavailable' ? T.locUnavailable : '';

  // The saved-places list shows manual pins only; 맛집/액티비티 locations
  // (`fromList`) appear as map markers but live in their own tabs, not here.
  const listPins = pins.filter((p) => !p.fromList);

  return (
    <div data-screen-label="지도" style={css('display:flex;flex-direction:column;gap:10px')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
        <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
          <div style={css("font-family:'Jua',sans-serif;font-size:19px;color:#164A6B")}>{T.map}</div>
          {sharingCount > 0 && (
            <span
              style={css(
                'display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:#E7F7EE;color:#1B8A55;font-size:11px;font-weight:700',
              )}
            >
              <span style={css('width:6px;height:6px;border-radius:50%;background:#1FAF6B')} />
              {sharingCount}
              {T.sharingSuffix}
            </span>
          )}
        </div>
        <button
          onClick={onArmNew}
          style={css(
            'min-height:36px;padding:6px 15px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:12.5px;font-weight:700',
          )}
        >
          {T.pinAdd}
        </button>
      </div>
      <div style={css('font-size:12px;color:#8FAEC4;margin-top:-4px')}>{T.mapHint}</div>

      {/* Map + overlays. Fullscreen = a fixed, viewport-filling overlay (escapes
          the 430px frame); z-index 60 sits above the bottom nav (50) but below
          the pin/edit sheets (95) so editing still works over it. */}
      <div
        style={
          fullscreen
            ? {
                ...css('position:fixed;overflow:hidden;background:#DCEBF5'),
                inset: 0,
                zIndex: 60,
                isolation: 'isolate',
              }
            : {
                ...css(
                  'position:relative;width:100%;height:54vh;min-height:300px;max-height:440px;border-radius:16px;overflow:hidden;box-shadow:0 3px 12px rgba(60,130,190,.12);background:#DCEBF5',
                ),
                // Contain every Leaflet + overlay z-index in one stacking context
                // so the controls never paint over the bottom nav or an open sheet.
                isolation: 'isolate',
              }
        }
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Fullscreen / recenter / fit controls (paint on top of the Leaflet pane).
            Top offset clears the notch/status bar when fullscreen. */}
        <div
          style={{
            ...css('position:absolute;right:10px;display:flex;flex-direction:column;gap:6px'),
            top: fullscreen ? 'calc(10px + env(safe-area-inset-top))' : '10px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <MapCtrlButton
            icon={fullscreen ? 'fullscreen_exit' : 'fullscreen'}
            label={fullscreen ? T.exitFull : T.full}
            onTap={() => setFullscreen((f) => !f)}
          />
          <MapCtrlButton icon="my_location" label={T.recenter} onTap={recenter} />
          <MapCtrlButton icon="fit_screen" label={T.fitAll} onTap={fitContent} />
        </div>

        {placing && (
          <div
            style={{
              ...css(
                'position:absolute;left:10px;right:56px;display:flex;align-items:center;gap:8px;background:rgba(11,124,216,.95);color:#FFFFFF;border-radius:12px;padding:9px 12px;box-shadow:0 3px 10px rgba(11,124,216,.35)',
              ),
              top: fullscreen ? 'calc(10px + env(safe-area-inset-top))' : '10px',
              zIndex: 1000,
            }}
          >
            <Icon name="pin_drop" size={19} />
            <span style={css('flex:1;font-size:12.5px;font-weight:600;line-height:1.4')}>
              {placing.kind === 'move'
                ? T.pinMoveHint
                : placing.kind === 'item'
                  ? T.itemPlaceHint
                  : T.pinPlaceHint}
            </span>
            <button
              onClick={onCancelPlace}
              style={css(
                'flex:none;min-height:30px;padding:4px 12px;border-radius:999px;border:none;background:rgba(255,255,255,.22);color:#FFFFFF;font-size:12px;font-weight:700',
              )}
            >
              {T.cancel}
            </button>
          </div>
        )}

        {/* Fullscreen-only action bar — keeps 핀 추가 + 위치 공유 reachable while
            the map fills the screen (their inline versions below are covered). */}
        {fullscreen && (
          <div
            style={{
              ...css('position:absolute;left:0;right:0;display:flex;justify-content:center;gap:10px;padding:0 14px'),
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <button
              onClick={onArmNew}
              style={{
                ...css(
                  'min-height:42px;padding:8px 16px;border-radius:999px;border:none;background:#0B7CD8;color:#FFFFFF;font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;box-shadow:0 3px 10px rgba(20,90,150,.25)',
                ),
                pointerEvents: 'auto',
              }}
            >
              <Icon name="add_location_alt" size={19} />
              {T.pinAdd}
            </button>
            <button
              onClick={onToggleShare}
              style={{
                ...css(
                  `min-height:42px;padding:8px 16px;border-radius:999px;border:1.5px solid ${sharing ? '#1FAF6B' : '#BBDCF2'};background:${sharing ? '#1FAF6B' : '#FFFFFF'};color:${sharing ? '#FFFFFF' : '#0B7CD8'};font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;box-shadow:0 3px 10px rgba(20,90,150,.25)`,
                ),
                pointerEvents: 'auto',
              }}
            >
              <Icon name={sharing ? 'location_on' : 'share_location'} size={19} />
              {sharing ? T.shareOn : T.shareLoc}
            </button>
          </div>
        )}
      </div>

      {/* Location sharing */}
      <button
        onClick={onToggleShare}
        style={css(
          `min-height:48px;border-radius:13px;border:1.5px solid ${sharing ? '#1FAF6B' : '#BBDCF2'};background:${sharing ? '#1FAF6B' : '#FFFFFF'};color:${sharing ? '#FFFFFF' : '#0B7CD8'};font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px`,
        )}
      >
        <Icon name={sharing ? 'location_on' : 'share_location'} size={20} />
        {sharing ? `${T.shareOn} · ${T.shareStop}` : T.shareLoc}
      </button>
      {shareErrText ? (
        <div
          style={css(
            'display:flex;align-items:flex-start;gap:6px;background:#FFF5F5;border-radius:11px;padding:8px 10px;font-size:11.5px;color:#C0524B;line-height:1.5',
          )}
        >
          <Icon name="warning" size={15} color="#C0524B" style={css('margin-top:1px')} />
          <span>{shareErrText}</span>
        </div>
      ) : (
        <div style={css('font-size:11px;color:#9FBBD0;line-height:1.5;padding:0 2px')}>
          {T.locHint}
        </div>
      )}

      {/* Saved pins list */}
      <div style={css('display:flex;align-items:center;gap:6px;margin-top:2px')}>
        <div style={css("font-family:'Jua',sans-serif;font-size:16px;color:#164A6B")}>
          {T.pinListTitle}
        </div>
        <span style={css('font-size:12px;color:#8FAEC4;font-weight:600')}>{listPins.length}</span>
      </div>

      {listPins.length === 0 ? (
        <div
          style={css(
            'background:#FFFFFF;border-radius:16px;padding:22px 14px;text-align:center;font-size:12.5px;color:#8FAEC4;box-shadow:0 3px 12px rgba(60,130,190,.07)',
          )}
        >
          {T.pinEmpty}
        </div>
      ) : (
        <div style={css('display:flex;flex-direction:column;gap:8px')}>
          {listPins.map((p) => (
            <div
              key={p.id}
              onClick={() => focusPin(p)}
              style={css(
                'background:#FFFFFF;border-radius:14px;padding:10px 12px;box-shadow:0 3px 12px rgba(60,130,190,.07);display:flex;align-items:center;gap:10px;cursor:pointer',
              )}
            >
              <span
                style={css(
                  `width:34px;height:34px;flex:none;border-radius:50%;background:#F2F9FE;border:2px solid ${p.color};display:flex;align-items:center;justify-content:center`,
                )}
              >
                <Icon name={p.icon} size={19} color={p.color} />
              </span>
              <div style={css('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}>
                <div style={css('display:flex;align-items:center;gap:6px;flex-wrap:wrap')}>
                  <span
                    style={css("font-family:'Jua',sans-serif;font-size:15px;color:#1C4E70;line-height:1.3")}
                  >
                    <AutoText text={p.label} to={lang} />
                  </span>
                  <span
                    style={css(
                      `flex:none;font-size:10.5px;font-weight:700;border-radius:6px;padding:1px 7px;color:${p.color};background:${p.color}1A`,
                    )}
                  >
                    {p.catLabel}
                  </span>
                </div>
                {p.memoShow && (
                  <div style={css('font-size:12px;color:#5A7D96;line-height:1.5')}>
                    <AutoText text={p.memo} to={lang} />
                  </div>
                )}
                {p.edChips.length > 0 && (
                  <div style={css('display:flex;flex-wrap:wrap;gap:5px;margin-top:1px')}>
                    {p.edChips.map((e, i) => (
                      <span
                        key={i}
                        style={css(
                          'display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;background:#FFF7E8;border:1px solid #F5DFAE;color:#8A6A1C;font-size:10.5px;font-weight:600',
                        )}
                      >
                        <span style={css(`width:6px;height:6px;border-radius:50%;background:${e.color}`)} />
                        {e.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Icon name="chevron_right" size={22} color="#B8D3E6" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MapCtrlButton({
  icon,
  label,
  onTap,
}: {
  icon: IconName;
  label: string;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      aria-label={label}
      style={{
        ...css(
          'width:40px;height:40px;border-radius:11px;border:none;background:rgba(255,255,255,.95);color:#0B7CD8;box-shadow:0 2px 8px rgba(20,90,150,.22);display:flex;align-items:center;justify-content:center;padding:0',
        ),
        pointerEvents: 'auto',
      }}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}
