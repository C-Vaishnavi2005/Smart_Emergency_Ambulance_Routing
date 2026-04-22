import { useEffect } from 'react';
import useStore from '../store/useStore';

export function useGeolocation() {
  const setUserLocation = useStore((s) => s.setUserLocation);
  const setMapCenter = useStore((s) => s.setMapCenter);
  const setMapZoom = useStore((s) => s.setMapZoom);

  const detect = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My Location' };
        setUserLocation(loc);
        setMapCenter({ lat: loc.lat, lng: loc.lng });
        setMapZoom(14);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return { detect };
}
