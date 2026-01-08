import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function MapController({ selectedLocation }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedLocation && Array.isArray(selectedLocation) && selectedLocation.length === 2) {
      map.flyTo(selectedLocation, 14, { duration: 1.5 });
    }
  }, [selectedLocation, map]);
  
  return null;
}
