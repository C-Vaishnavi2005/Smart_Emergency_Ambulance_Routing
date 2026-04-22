import React, { useEffect, useRef } from 'react';
import useStore from './store/useStore';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';

function TopBar() {
  const { emergencyMode, isLoading, routes, animatingRoute, setAnimatingRoute } = useStore();

  return (
    <div style={{
      position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex', gap: 10, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {emergencyMode && (
        <div style={{
          background: '#dc2626', backdropFilter: 'blur(12px)',
          border: '1px solid #ef4444',
          borderRadius: 24, padding: '8px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 700, color: 'white',
          animation: 'blik-emergency 1s ease-in-out infinite',
          pointerEvents: 'all',
          boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
        }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          EMERGENCY MODE — TRAFFIC OVERRIDE ACTIVE
        </div>
      )}

      {isLoading && (
        <div style={{
          background: '#3b82f6', backdropFilter: 'blur(12px)',
          border: '1px solid #60a5fa',
          borderRadius: 24, padding: '8px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 600, color: 'white',
          pointerEvents: 'all',
          boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
        }}>
          <div style={{
            width: 12, height: 12, border: '2px solid white', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          Computing optimal route...
        </div>
      )}

      {routes && !isLoading && (
        <div style={{
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: 24, padding: '8px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 600, color: '#10b981',
          pointerEvents: 'all', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
          onClick={() => setAnimatingRoute(!animatingRoute)}
        >
          <span>{animatingRoute ? '⏸' : '▶'}</span>
          {animatingRoute ? 'Ambulance En-Route' : 'Start Simulation'}
        </div>
      )}
    </div>
  );
}

function ErrorToast() {
  const { error, setError } = useStore();
  if (!error) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 2000,
      background: '#dc2626', backdropFilter: 'blur(12px)',
      border: '1px solid #ef4444',
      borderRadius: 12, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, color: 'white', fontWeight: 500,
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      animation: 'fadeInUp 0.3s ease',
      maxWidth: 500,
    }}>
      <span>⚠️</span>
      <span style={{ flex: 1 }}>{error}</span>
      <button onClick={() => setError(null)} style={{
        background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
        color: 'white', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
      }}>Dismiss</button>
    </div>
  );
}

// Route legend overlay on map
function MapOverlayLegend() {
  const { routes } = useStore();
  if (!routes) return null;
  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, zIndex: 800,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12, padding: '12px 16px',
      fontSize: 11, color: 'var(--text-secondary)',
      minWidth: 160,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: 1.5, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>Route Legend</div>
      {[
        { color: '#10b981', label: 'Optimal Route', dash: false },
        { color: '#f59e0b', label: 'Alternate Route', dash: true },
        { color: '#dc2626', label: 'Emergency Active', dash: false },
      ].map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 24, height: 3,
            background: item.dash ? 'transparent' : item.color,
            borderTop: item.dash ? `3px dashed ${item.color}` : 'none',
            borderRadius: 2,
          }} />
          <span style={{ fontSize: 11 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  // Inject global keyframe animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes blik-emergency { 0%,100%{opacity:1} 50%{opacity:0.6} }
      @keyframes fadeInUp { from{opacity:0;transform:translateY(20px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', zIndex: 100, position: 'relative' }}>
        <Sidebar />
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapView />
        <TopBar />
        <MapOverlayLegend />
        <ErrorToast />
      </div>
    </div>
  );
}
