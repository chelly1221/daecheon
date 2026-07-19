import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { css } from '../css';
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
// bundlers). Content is a fixed emoji + a category/member colour — never user
// text — so the inlined HTML can't carry an injection.
function pinIcon(emoji: string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'paros-pin',
    html:
      `<div style="width:34px;height:34px;border-radius:50%;background:#fff;` +
      `border:3px solid ${color};box-shadow:0 2px 6px rgba(20,60,90,.35);` +
      `display:flex;align-items:center;justify-content:center">` +
      `<span style="font-size:17px;line-height:1">${emoji}</span></div>`,
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

    fitContent();
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
      const sig = `${p.lat}|${p.lng}|${p.emoji}|${p.color}`;
      let m = markers.get(p.id);
      if (!m) {
        m = L.marker([p.lat, p.lng], { icon: pinIcon(p.emoji, p.color), keyboard: false });
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
        m.setIcon(pinIcon(p.emoji, p.color));
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

  const shareErrText =
    shareError === 'denied' ? T.locDenied : shareError === 'unavailable' ? T.locUnavailable : '';

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

      {/* Map + overlays */}
      <div
        style={{
          ...css(
            'position:relative;width:100%;height:54vh;min-height:300px;max-height:440px;border-radius:16px;overflow:hidden;box-shadow:0 3px 12px rgba(60,130,190,.12);background:#DCEBF5',
          ),
          // Contain every Leaflet + overlay z-index in one stacking context so
          // the controls can never paint over the bottom nav or an open sheet.
          isolation: 'isolate',
        }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Recenter / fit controls (siblings of the Leaflet pane → paint on top) */}
        <div
          style={{
            ...css('position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:6px'),
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <MapCtrlButton icon="my_location" label={T.recenter} onTap={recenter} />
          <MapCtrlButton icon="fit_screen" label={T.fitAll} onTap={fitContent} />
        </div>

        {placing && (
          <div
            style={{
              ...css(
                'position:absolute;top:10px;left:10px;right:56px;display:flex;align-items:center;gap:8px;background:rgba(11,124,216,.95);color:#FFFFFF;border-radius:12px;padding:9px 12px;box-shadow:0 3px 10px rgba(11,124,216,.35)',
              ),
              zIndex: 1000,
            }}
          >
            <span
              style={css("font-family:'Material Symbols Rounded';font-size:19px;line-height:1;flex:none")}
            >
              pin_drop
            </span>
            <span style={css('flex:1;font-size:12.5px;font-weight:600;line-height:1.4')}>
              {placing.kind === 'move' ? T.pinMoveHint : T.pinPlaceHint}
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
      </div>

      {/* Location sharing */}
      <button
        onClick={onToggleShare}
        style={css(
          `min-height:48px;border-radius:13px;border:1.5px solid ${sharing ? '#1FAF6B' : '#BBDCF2'};background:${sharing ? '#1FAF6B' : '#FFFFFF'};color:${sharing ? '#FFFFFF' : '#0B7CD8'};font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px`,
        )}
      >
        <span style={css("font-family:'Material Symbols Rounded';font-size:20px;line-height:1")}>
          {sharing ? 'location_on' : 'share_location'}
        </span>
        {sharing ? `${T.shareOn} · ${T.shareStop}` : T.shareLoc}
      </button>
      {shareErrText ? (
        <div
          style={css(
            'display:flex;align-items:flex-start;gap:6px;background:#FFF5F5;border-radius:11px;padding:8px 10px;font-size:11.5px;color:#C0524B;line-height:1.5',
          )}
        >
          <span style={css('flex:none')}>⚠️</span>
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
        <span style={css('font-size:12px;color:#8FAEC4;font-weight:600')}>{pins.length}</span>
      </div>

      {pins.length === 0 ? (
        <div
          style={css(
            'background:#FFFFFF;border-radius:16px;padding:22px 14px;text-align:center;font-size:12.5px;color:#8FAEC4;box-shadow:0 3px 12px rgba(60,130,190,.07)',
          )}
        >
          {T.pinEmpty}
        </div>
      ) : (
        <div style={css('display:flex;flex-direction:column;gap:8px')}>
          {pins.map((p) => (
            <div
              key={p.id}
              onClick={() => focusPin(p)}
              style={css(
                'background:#FFFFFF;border-radius:14px;padding:10px 12px;box-shadow:0 3px 12px rgba(60,130,190,.07);display:flex;align-items:center;gap:10px;cursor:pointer',
              )}
            >
              <span
                style={css(
                  `width:34px;height:34px;flex:none;border-radius:50%;background:#F2F9FE;border:2px solid ${p.color};display:flex;align-items:center;justify-content:center;font-size:17px`,
                )}
              >
                {p.emoji}
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
              <span style={css('flex:none;color:#B8D3E6;font-size:20px;font-weight:600')}>›</span>
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
  icon: string;
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
      <span style={css("font-family:'Material Symbols Rounded';font-size:22px;line-height:1")}>
        {icon}
      </span>
    </button>
  );
}
