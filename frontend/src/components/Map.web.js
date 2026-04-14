import React, { useEffect, useRef, useContext, createContext, useState } from 'react';

export const PROVIDER_GOOGLE = null;

const PRIMARY = '#0D9488';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const MapContext = createContext(null);

// ── Load Leaflet from CDN once ───────────────────────────────────────────────
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

// ── MapView ──────────────────────────────────────────────────────────────────
export function MapView({ style, initialRegion, children, onMapReady, showsUserLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);

  // Flatten RN StyleSheet arrays to a plain object
  const flatStyle = Array.isArray(style)
    ? Object.assign({}, ...style)
    : (style || {});

  // If the caller passes absoluteFillObject we honour it; otherwise fill parent normally
  const isAbsolute = flatStyle.position === 'absolute';

  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!containerRef.current || mapRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: [initialRegion.latitude, initialRegion.longitude],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (showsUserLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(({ coords }) => {
          L.circleMarker([coords.latitude, coords.longitude], {
            radius: 9, fillColor: '#3B82F6', fillOpacity: 1, color: '#fff', weight: 2.5,
          }).bindTooltip('You', { permanent: false }).addTo(map);
        }, () => { });
      }

      mapRef.current = map;
      setMapInstance(map);
      onMapReady?.();
    }).catch(console.error);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const divStyle = isAbsolute
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }
    : { width: '100%', height: '100%', zIndex: 0 };

  return (
    <MapContext.Provider value={mapInstance}>
      <div ref={containerRef} style={divStyle} />
      {children}
    </MapContext.Provider>
  );
}

// ── Marker ───────────────────────────────────────────────────────────────────
export function Marker({ coordinate, title, description, onCalloutPress }) {
  const map = useContext(MapContext);

  useEffect(() => {
    if (!map || !window.L) return;
    const L = window.L;

    const icon = L.divIcon({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="
            background:${PRIMARY};width:34px;height:34px;border-radius:50%;
            border:3px solid #fff;display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 12px rgba(13,148,136,0.45);font-size:15px;">💊</div>
          <div style="
            width:0;height:0;
            border-left:5px solid transparent;border-right:5px solid transparent;
            border-top:7px solid ${PRIMARY};margin-top:-1px;"></div>
        </div>`,
      className: '',
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -46],
    });

    const marker = L.marker([coordinate.latitude, coordinate.longitude], { icon }).addTo(map);
    const btnId = `dir-btn-${Math.random().toString(36).slice(2)}`;

    marker.bindPopup(`
      <div style="font-family:system-ui,sans-serif;min-width:160px;padding:2px 0">
        <div style="font-weight:700;font-size:13px;color:#0F172A">${title || ''}</div>
        ${description ? `<div style="font-size:11px;color:#64748B;margin-top:3px">${description}</div>` : ''}
        ${onCalloutPress ? `
          <div id="${btnId}" style="
            margin-top:10px;background:${PRIMARY};color:#fff;border-radius:8px;
            padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;text-align:center;">
            Get Directions →
          </div>` : ''}
      </div>`, { maxWidth: 220 });

    if (onCalloutPress) {
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(btnId);
          if (btn) btn.onclick = onCalloutPress;
        }, 50);
      });
    }

    return () => { marker.remove(); };
  }, [map, coordinate.latitude, coordinate.longitude]);

  return null;
}
