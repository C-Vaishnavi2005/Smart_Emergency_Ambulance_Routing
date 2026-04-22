import React, { useState, useCallback, useRef } from 'react';
import { MapPin, Navigation, Search, Loader2, Crosshair, ChevronDown } from 'lucide-react';
import useStore from '../../store/useStore';
import { INDIAN_STATES, CITY_COORDS } from '../../data/indianCities';
import { useGeolocation } from '../../hooks/useGeolocation';
import HospitalList from './HospitalList';
import AlgoPanel from '../AlgoPanel/AlgoPanel';
import Dashboard from '../Dashboard/Dashboard';

async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'EmergencyRoutingApp/1.0' } });
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

export default function Sidebar() {
  const {
    selectedState, selectedCity, setSelectedState, setSelectedCity,
    userLocation, setUserLocation, setMapCenter, setMapZoom,
    hospitals, setHospitals, setHospitalsLoading, hospitalsLoading,
    emergencyMode, setEmergencyMode, trafficMultiplier,
    isLoading, routes, setActivePanel, activePanel,
    voiceActive, setVoiceActive,
  } = useStore();

  const { detect } = useGeolocation();
  const [locationInput, setLocationInput] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const recognitionRef = useRef(null);

  const cities = INDIAN_STATES.find(s => s.state === selectedState)?.cities || [];

  const handleStateChange = async (state) => {
    setSelectedState(state);
  };

  const handleCityChange = async (city) => {
    setSelectedCity(city);
    const coords = CITY_COORDS[city];
    if (coords) {
      setMapCenter(coords);
      setMapZoom(13);
      // Fetch hospitals near city center
      await loadHospitals(coords.lat, coords.lng);
    } else {
      // Geocode the city
      const result = await geocodeLocation(city);
      if (result) {
        setMapCenter({ lat: result.lat, lng: result.lng });
        setMapZoom(13);
        await loadHospitals(result.lat, result.lng);
      }
    }
  };

  const loadHospitals = async (lat, lng) => {
    setHospitalsLoading(true);
    try {
      const res = await fetch(`/api/hospitals?lat=${lat}&lng=${lng}&radius=20000`);
      const data = await res.json();
      setHospitals(data.hospitals || []);
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    } finally {
      setHospitalsLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!locationInput.trim()) return;
    setSearchingLocation(true);
    setLocationError('');
    try {
      const result = await geocodeLocation(locationInput);
      if (result) {
        setUserLocation({ lat: result.lat, lng: result.lng, label: locationInput });
        setMapCenter({ lat: result.lat, lng: result.lng });
        setMapZoom(14);
        await loadHospitals(result.lat, result.lng);
      } else {
        setLocationError('Location not found. Try a more specific address.');
      }
    } catch {
      setLocationError('Search failed. Please try again.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleAutoDetect = () => {
    detect();
    // Also load hospitals after detection (slight delay)
    setTimeout(() => {
      const loc = useStore.getState().userLocation;
      if (loc) loadHospitals(loc.lat, loc.lng);
    }, 2000);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser. Use Chrome for voice features.');
      return;
    }
    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.toLowerCase();
      setLocationInput(transcript);
      setVoiceActive(false);
      if (transcript.includes('nearest hospital') || transcript.includes('find hospital')) {
        handleAutoDetect();
      } else {
        handleSearchLocation();
      }
    };
    recognition.onend = () => setVoiceActive(false);
    recognition.start();
    recognitionRef.current = recognition;
    setVoiceActive(true);
  };

  const trafficLevel = trafficMultiplier <= 0.5 ? 'emergency' : trafficMultiplier <= 1.2 ? 'low' : trafficMultiplier <= 2.0 ? 'medium' : 'high';
  const trafficColor = trafficLevel === 'emergency' ? 'traffic-low' : trafficLevel === 'low' ? 'traffic-low' : trafficLevel === 'medium' ? 'traffic-medium' : 'traffic-high';

  return (
    <div style={{
      width: 340,
      minWidth: 320,
      height: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '1px solid var(--border-glass)',
        background: 'linear-gradient(180deg, rgba(220,38,38,0.08) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            background: 'linear-gradient(135deg, #dc2626, #f97316)',
            borderRadius: 10,
            width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
          }}>🚑</div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-primary)' }}>
              MEDRoute
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, fontWeight: 500 }}>
              INTELLIGENT EMERGENCY ROUTING
            </div>
          </div>
        </div>

        {/* Emergency toggle */}
        <button
          onClick={() => setEmergencyMode(!emergencyMode)}
          className={`btn-emergency ${emergencyMode ? 'active' : ''}`}
          style={{ width: '100%', marginTop: 12, fontSize: 12, padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 14 }}>⚡</span>
          {emergencyMode ? 'EMERGENCY MODE ACTIVE — SIGNAL OVERRIDE' : 'ACTIVATE EMERGENCY MODE'}
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* Traffic indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
          <span className={`traffic-dot ${trafficColor}`}></span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Traffic:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {emergencyMode ? 'Signal Override Active' : trafficLevel}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>×{trafficMultiplier.toFixed(1)}</span>
        </div>

        {/* City selector */}
        <div style={{ marginBottom: 14 }}>
          <div className="section-title">📍 Location</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select
              className="select-dark"
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => (
                <option key={s.state} value={s.state}>{s.state}</option>
              ))}
            </select>

            <select
              className="select-dark"
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={!selectedState}
            >
              <option value="">Select City</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location search */}
        <div style={{ marginBottom: 14 }}>
          <div className="section-title">🎯 Your Location</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="input-dark"
              placeholder="Enter address or landmark..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleSearchLocation}
              disabled={searchingLocation}
              className="icon-btn"
              title="Search location"
            >
              {searchingLocation ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </button>
            <button onClick={handleAutoDetect} className="icon-btn" title="Auto-detect location">
              <Crosshair size={15} />
            </button>
            <button
              onClick={toggleVoice}
              className="icon-btn"
              title="Voice input"
              style={voiceActive ? { borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'rgba(255,45,85,0.1)' } : {}}
            >
              🎙️
            </button>
          </div>
          {locationError && <div style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 6 }}>{locationError}</div>}
          {userLocation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--accent-green)' }}>
              <MapPin size={11} /> <span>Location set: {userLocation.label?.slice(0, 40)}...</span>
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--bg-glass)', padding: 4, borderRadius: 12, border: '1px solid var(--border-glass)' }}>
          {[
            { id: 'hospitals', label: '🏥 Hospitals' },
            { id: 'algo', label: '🧠 Algorithm' },
            { id: 'dashboard', label: '📊 Stats' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 8,
                border: 'none',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s',
                background: activePanel === tab.id ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: activePanel === tab.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: activePanel === tab.id ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <HospitalList visible={activePanel === 'hospitals'} />
        <AlgoPanel visible={activePanel === 'algo'} />
        <Dashboard visible={activePanel === 'dashboard'} />
      </div>
    </div>
  );
}
