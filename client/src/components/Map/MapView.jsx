import React, { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useStore from '../../store/useStore';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Custom icons ──────────────────────────────────────────────────────────────
const ambulanceIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:50px;height:50px;">
      <div style="
        position:absolute;top:0;left:0;width:50px;height:50px;border-radius:50%;
        background:rgba(220,38,38,0.25);
        animation:pulse-ring 1.4s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        background:linear-gradient(135deg,#dc2626,#f97316);
        border-radius:14px;width:40px;height:40px;
        display:flex;align-items:center;justify-content:center;font-size:22px;
        box-shadow:0 0 24px rgba(220,38,38,0.6),0 4px 12px rgba(0,0,0,0.2);
        border:2px solid rgba(220,38,38,0.3);
      ">🚑</div>
    </div>
    <style>
      @keyframes pulse-ring{0%{transform:scale(.7);opacity:1}100%{transform:scale(2.4);opacity:0}}
    </style>`,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

const hospitalIcon = (availability) => L.divIcon({
  className: '',
  html: `<div style="
    background:${availability === 'available' ? '#10b981' : availability === 'limited' ? '#f59e0b' : '#dc2626'};
    border-radius:10px;width:34px;height:34px;
    display:flex;align-items:center;justify-content:center;font-size:17px;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    border:2px solid white;
  ">🏥</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -36],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:24px;height:24px;border-radius:50%;
      background:rgba(59,130,246,0.3);animation:pulse-loc 2s ease-in-out infinite;"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;
      border:2px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);z-index:1;"></div>
    <style>@keyframes pulse-loc{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.8);opacity:0}}</style>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:linear-gradient(135deg,#10b981,#3b82f6);
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    width:28px;height:28px;
    box-shadow:0 4px 12px rgba(16,185,129,0.5);
    border:2px solid white;
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

// ── Map controller — smoothly flies to location ───────────────────────────────
function MapController({ center, zoom }) {
  const map = useMap();
  const prevCenter = useRef(null);

  useEffect(() => {
    if (!center) return;
    const key = `${center.lat},${center.lng},${zoom}`;
    if (prevCenter.current === key) return;
    prevCenter.current = key;
    map.flyTo([center.lat, center.lng], zoom || 13, { animate: true, duration: 1.2 });
  }, [center, zoom, map]);

  return null;
}

// ── Fit map to route bounds ───────────────────────────────────────────────────
function RouteBoundsFitter({ routes, userLocation, selectedHospital }) {
  const map = useMap();
  const prevKey = useRef(null);

  useEffect(() => {
    if (!routes) return;
    const coords = routes.optimal === 'A'
      ? routes.routeA?.coordinates
      : routes.routeB?.coordinates;
    if (!coords || coords.length < 2) return;

    const key = `${coords[0]}-${coords[coords.length - 1]}`;
    if (prevKey.current === key) return;
    prevKey.current = key;

    const latlngs = coords.map(c => L.latLng(c[0], c[1]));
    const bounds = L.latLngBounds(latlngs);
    // Add some padding
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 1.5 });
  }, [routes, map]);

  return null;
}

// ── Ambulance animated along route ────────────────────────────────────────────
function AmbulanceAnimation({ coordinates, animating }) {
  const markerRef = useRef(null);
  const frameRef = useRef(null);
  const idxRef = useRef(0);

  useEffect(() => {
    if (!animating || !coordinates || coordinates.length < 2) return;
    idxRef.current = 0;

    const step = () => {
      if (!markerRef.current) return;
      const i = idxRef.current;
      if (i >= coordinates.length - 1) return; // finished

      markerRef.current.setLatLng([coordinates[i][0], coordinates[i][1]]);
      idxRef.current += 1;
      frameRef.current = setTimeout(step, 80);
    };

    step();
    return () => clearTimeout(frameRef.current);
  }, [animating, coordinates]);

  if (!coordinates || coordinates.length === 0) return null;

  return (
    <Marker
      ref={markerRef}
      position={[coordinates[0][0], coordinates[0][1]]}
      icon={ambulanceIcon}
      zIndexOffset={1000}
    />
  );
}

// ── Direction arrows along polyline ──────────────────────────────────────────
function ArrowPolyline({ positions, color, weight = 5, opacity = 0.9 }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!positions || positions.length < 2) return;

    // Draw main line
    const latlngs = positions.map(p => [p[0], p[1]]);
    const line = L.polyline(latlngs, {
      color,
      weight,
      opacity,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Draw direction arrows (every N points)
    const arrows = [];
    const step = Math.max(1, Math.floor(positions.length / 8));
    for (let i = step; i < positions.length - 1; i += step) {
      const p1 = positions[i - 1];
      const p2 = positions[i];
      const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI - 90;
      const arrowIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:0;height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-bottom:10px solid ${color};
          opacity:0.7;
          transform:rotate(${angle}deg);
          transform-origin:center;
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      arrows.push(L.marker([p2[0], p2[1]], { icon: arrowIcon, interactive: false }));
    }

    const group = L.layerGroup([line, ...arrows]);
    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) layerRef.current.remove();
    };
  }, [positions, color, weight, opacity, map]);

  return null;
}

// ── Main Map component ────────────────────────────────────────────────────────
export default function MapView() {
  const {
    mapCenter, mapZoom,
    userLocation, selectedHospital,
    hospitals, routes, animatingRoute, emergencyMode,
  } = useStore();

  const optimalCoords = routes
    ? (routes.optimal === 'A' ? routes.routeA?.coordinates : routes.routeB?.coordinates)
    : null;

  const altCoords = routes
    ? (routes.optimal === 'A' ? routes.routeB?.coordinates : routes.routeA?.coordinates)
    : null;

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      attributionControl={true}
      minZoom={4}
      maxZoom={19}
    >
      {/* Light OpenStreetMap tiles */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
        subdomains="abcd"
      />

      {/* Controllers */}
      <MapController center={mapCenter} zoom={mapZoom} />
      <RouteBoundsFitter
        routes={routes}
        userLocation={userLocation}
        selectedHospital={selectedHospital}
      />

      {/* ── User location ── */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={900}>
          <Popup>
            <div style={{ fontWeight: 600, color: '#3b82f6', fontSize: 13 }}>📍 Your Location</div>
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
              {userLocation.label?.slice(0, 60)}
            </div>
          </Popup>
        </Marker>
      )}

      {/* ── Hospitals ── */}
      {hospitals.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lng]}
          icon={hospitalIcon(h.availability)}
          zIndexOffset={300}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937', marginBottom: 8 }}>{h.name}</div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  📍 <strong style={{ color: '#1f2937' }}>{(h.distance / 1000).toFixed(2)} km</strong> away
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  ⏱️ ETA: <strong style={{ color: '#1f2937' }}>~{Math.round((h.distance / 1000) / 40 * 60)} min</strong>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  🛏️ ICU Beds: <strong style={{
                    color: h.icuBeds > 15 ? '#10b981' : h.icuBeds > 5 ? '#f59e0b' : '#dc2626'
                  }}>{h.icuBeds} available</strong>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Status: <strong style={{
                    textTransform: 'capitalize',
                    color: h.availability === 'available' ? '#10b981' : h.availability === 'limited' ? '#f59e0b' : '#dc2626'
                  }}>{h.availability}</strong>
                </div>
                {h.phone && (
                  <div style={{ fontSize: 11, color: '#6b7280' }}>📞 {h.phone}</div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* ── Alternate route (yellow, behind) ── */}
      {altCoords && altCoords.length > 1 && (
        <>
          {/* Glow */}
          <Polyline
            positions={altCoords}
            pathOptions={{ color: '#f59e0b', weight: 10, opacity: 0.08 }}
          />
          {/* Main dashed */}
          <Polyline
            positions={altCoords}
            pathOptions={{
              color: '#f59e0b', weight: 4, opacity: 0.6,
              dashArray: '10 8', lineCap: 'round',
            }}
          />
        </>
      )}

      {/* ── Optimal route ── */}
      {optimalCoords && optimalCoords.length > 1 && (
        <>
          {/* Outer glow */}
          <Polyline
            positions={optimalCoords}
            pathOptions={{
              color: emergencyMode ? '#dc2626' : '#10b981',
              weight: 18, opacity: 0.08,
            }}
          />
          {/* Mid glow */}
          <Polyline
            positions={optimalCoords}
            pathOptions={{
              color: emergencyMode ? '#dc2626' : '#10b981',
              weight: 10, opacity: 0.18,
            }}
          />
          {/* Core line */}
          <Polyline
            positions={optimalCoords}
            pathOptions={{
              color: emergencyMode ? '#dc2626' : '#10b981',
              weight: 6, opacity: 0.95,
              lineCap: 'round', lineJoin: 'round',
            }}
          />
          {/* White center stripe */}
          <Polyline
            positions={optimalCoords}
            pathOptions={{
              color: 'white', weight: 2, opacity: 0.4,
              dashArray: '14 10', lineCap: 'round',
            }}
          />
          {/* Direction arrows */}
          <ArrowPolyline
            positions={optimalCoords}
            color={emergencyMode ? '#f97316' : '#10b981'}
            weight={0}
          />
        </>
      )}

      {/* ── Destination marker (selected hospital) ── */}
      {selectedHospital && routes && (
        <>
          <Marker
            position={[selectedHospital.lat, selectedHospital.lng]}
            icon={destIcon}
            zIndexOffset={800}
          >
            <Popup>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#10b981' }}>
                🎯 Destination: {selectedHospital.name}
              </div>
            </Popup>
          </Marker>
          {/* Pulsing ring around destination */}
          <CircleMarker
            center={[selectedHospital.lat, selectedHospital.lng]}
            radius={22}
            pathOptions={{
              color: '#10b981', fillColor: 'transparent',
              weight: 2, dashArray: '6 4', opacity: 0.7,
            }}
          />
        </>
      )}

      {/* ── Emergency pulsing area ── */}
      {emergencyMode && userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={28}
          pathOptions={{
            color: '#dc2626', fillColor: '#dc2626',
            fillOpacity: 0.06, weight: 2,
            dashArray: '5 5', opacity: 0.6,
          }}
        />
      )}

      {/* ── Ambulance animation ── */}
      {animatingRoute && optimalCoords && optimalCoords.length > 0 && (
        <AmbulanceAnimation
          coordinates={optimalCoords}
          animating={animatingRoute}
        />
      )}
    </MapContainer>
  );
}
