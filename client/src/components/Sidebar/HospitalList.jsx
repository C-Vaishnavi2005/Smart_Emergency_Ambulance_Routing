import React, { useState } from 'react';
import { Loader2, Navigation, AlertTriangle, CheckCircle, Clock, Bed, Phone } from 'lucide-react';
import useStore from '../../store/useStore';
import axios from 'axios';

function formatDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatTime(secs) {
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function AvailabilityBadge({ status }) {
  const map = {
    available: { cls: 'badge-green', label: '✓ Available', icon: <CheckCircle size={9} /> },
    limited: { cls: 'badge-yellow', label: '⚠ Limited', icon: <AlertTriangle size={9} /> },
    critical: { cls: 'badge-red', label: '✗ Critical', icon: <AlertTriangle size={9} /> },
  };
  const { cls, label } = map[status] || map.critical;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function HospitalList({ visible }) {
  const {
    hospitals, selectedHospital, setSelectedHospital,
    hospitalsLoading, userLocation, setRoutes, setAlgoSteps,
    setMetrics, setAnimatingRoute, setMapCenter, setMapZoom,
    emergencyMode, isLoading, setIsLoading, setError,
    selectedCity, setActivePanel,
  } = useStore();

  const [routingHospital, setRoutingHospital] = useState(null);

  const handleSelectHospital = (h) => {
    setSelectedHospital(h);
    setMapCenter({ lat: h.lat, lng: h.lng });
    setMapZoom(14);
  };

  const handleRoute = async (h) => {
    if (!userLocation) {
      alert('Please set your location first (use the location search or auto-detect button).');
      return;
    }
    setRoutingHospital(h.id);
    setIsLoading(true);
    setError(null);
    setSelectedHospital(h);
    setAnimatingRoute(false);

    try {
      const res = await axios.post('/api/routing/compute', {
        fromLat: userLocation.lat,
        fromLng: userLocation.lng,
        toLat: h.lat,
        toLng: h.lng,
        emergencyMode,
      });

      const data = res.data;
      setRoutes({
        routeA: data.routeA,
        routeB: data.routeB,
        optimal: data.optimal,
        algorithms: data.algorithms,
      });
      setAlgoSteps(data.algoSteps || []);
      setMetrics(data.metrics);

      // RouteBoundsFitter in MapView auto-fits bounds. Start animation after map flies.
      setTimeout(() => setAnimatingRoute(true), 2000);
      setActivePanel('dashboard');
    } catch (err) {
      console.error('Routing failed:', err);
      setError('Failed to compute route. Check your connection and try again.');
    } finally {
      setIsLoading(false);
      setRoutingHospital(null);
    }
  };

  if (!visible) return null;

  if (hospitalsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Loader2 size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Finding nearby hospitals...</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Querying OpenStreetMap data</div>
      </div>
    );
  }

  if (hospitals.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏥</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          No hospitals loaded
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          Select a state and city, or search for your location above to find nearby hospitals.
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>🏥 Nearby Hospitals</div>
        <span className="badge badge-blue">{hospitals.length} found</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hospitals.map((h, i) => {
          const isSelected = selectedHospital?.id === h.id;
          const isRouting = routingHospital === h.id;
          const eta = Math.round((h.distance / 1000) / 40 * 60); // rough ETA at 40km/h

          return (
            <div
              key={h.id}
              className={`hospital-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectHospital(h)}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.3 }}>
                    {h.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {h.type === 'clinic' ? '🏪 Clinic' : '🏥 Hospital'}
                  </div>
                </div>
                <AvailabilityBadge status={h.availability} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <Navigation size={10} style={{ color: 'var(--accent-blue)' }} />
                  {formatDist(h.distance)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <Clock size={10} style={{ color: 'var(--accent-yellow)' }} />
                  ~{eta} min ETA
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <Bed size={10} style={{ color: h.icuBeds > 15 ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                  {h.icuBeds} ICU
                </div>
              </div>

              {/* ICU capacity bar */}
              <div className="progress-bar" style={{ marginBottom: 8 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (h.icuBeds / 40) * 100)}%`,
                    background: h.icuBeds > 20 ? 'var(--accent-green)' : h.icuBeds > 10 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                  }}
                />
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleRoute(h); }}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  background: isRouting
                    ? 'rgba(59,130,246,0.2)'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(124,58,237,0.15))',
                  color: 'var(--accent-blue)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                {isRouting
                  ? <><Loader2 size={12} className="animate-spin" /> Computing Route...</>
                  : <><Navigation size={12} /> Get Emergency Route</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
