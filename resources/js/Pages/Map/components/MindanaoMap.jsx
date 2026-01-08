import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ScaleControl, ZoomControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, History, ArrowRight, Zap } from 'lucide-react';
import { MapController } from './MapController';
import { MapControls } from './MapControls';
import { LoadingOverlay } from './LoadingOverlay';
import { northernMindanaoBounds, terrainTypes } from '../constants/mapConstants';

export function MindanaoMap({ selectedLocation, terrain, onTerrainChange, locations = [], equipments = [] }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState({});
  const currentTerrain = terrainTypes[terrain];
  const mapRef = useRef(null);

  // Create icon from lucide MapPin component
  const createMapPinIcon = () => {
    const svg = document.createElement('div');
    svg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="#ef4444"></circle></svg>';
    
    return L.icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(svg.innerHTML)}`,
      iconSize: [40, 56],
      iconAnchor: [20, 56],
      popupAnchor: [0, -56]
    });
  };

  const equipmentIcon = createMapPinIcon();
  
  // Format UTC timestamp without timezone conversion
  const formatUTCTime = (timestamp) => {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    const hoursFormatted = String(hours).padStart(2, '0');
    
    return `${month}/${day}/${year}, ${hoursFormatted}:${minutes}:${seconds} ${ampm}`;
  };

  const handleViewDetails = (equipmentId) => {
    window.location.href = `/equipment/${equipmentId}/details`;
  };
  
  return (
    <div className="w-full h-full relative">
      {isLoading && <LoadingOverlay />}
      <MapContainer
        bounds={northernMindanaoBounds}
        boundsOptions={{ padding: [50, 50] }}
        minZoom={8}
        maxZoom={18}
        scrollWheelZoom
        className="w-full h-full"
        zoomControl={false}
        whenReady={() => setIsLoading(false)}
        ref={mapRef}
      >
        <TileLayer
          attribution={currentTerrain.attribution}
          url={currentTerrain.url}
          key={terrain}
          eventHandlers={{
            loading: () => setIsLoading(true),
            load: () => setIsLoading(false),
          }}
          minZoom={8}
          maxZoom={18}
          tileSize={256}
        />

        {equipments.map((equipment) => {
          const latestLocation = equipment.locations && equipment.locations.length > 0 
            ? equipment.locations[equipment.locations.length - 1] 
            : null;
          
          if (!latestLocation) return null;
          
          const isShowingHistory = showHistory[equipment.equipment_id];
          const last10Locations = equipment.locations.slice(-10);
          const pathCoordinates = last10Locations.map(loc => [
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
          ]);
          
          return (
            <div key={`location-${equipment.equipment_id}`}>
              {isShowingHistory && pathCoordinates.length > 1 && (
                <Polyline 
                  positions={pathCoordinates} 
                  color="blue" 
                  weight={2} 
                  opacity={0.6} 
                  dashArray="5, 5"
                />
              )}
              
              {isShowingHistory && last10Locations.map((loc, idx) => (
                <Marker
                  key={`history-${equipment.equipment_id}-${idx}`}
                  position={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
                  icon={L.icon({
                    iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`)}`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    popupAnchor: [0, -15]
                  })}
                  title={`${formatUTCTime(loc.created_at)}`}
                >
                  <Popup className="text-xs">
                    <div className="font-semibold text-blue-600">Location #{last10Locations.length - idx}</div>
                    <div className="text-xs text-gray-600">Lat: {loc.latitude}</div>
                    <div className="text-xs text-gray-600">Lon: {loc.longitude}</div>
                    <div className="text-xs text-gray-500 mt-1 font-semibold">
                      📅 {formatUTCTime(loc.created_at)}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              <Marker
                position={[parseFloat(latestLocation.latitude), parseFloat(latestLocation.longitude)]}
                icon={equipmentIcon}
              >
                <Popup className="text-xs max-w-xs">
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-gray-900">{equipment.equipment_name}</div>
                      <div className="text-xs text-gray-600">Owner: {equipment.owner}</div>
                      <div className="text-xs text-gray-600">Location: {equipment.expected_location}</div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-xs text-gray-600">Lat: {latestLocation.latitude}</div>
                      <div className="text-xs text-gray-600">Lon: {latestLocation.longitude}</div>
                      {latestLocation.created_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatUTCTime(latestLocation.created_at)}
                        </div>
                      )}
                    </div>

                    {/* Power Consumption Section */}
                    {equipment.power_consumption !== undefined && (
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Zap size={12} className="text-orange-600" />
                          <span className="text-xs font-semibold text-gray-700">Current Power</span>
                        </div>
                        <div className="text-sm font-bold text-orange-600">
                          {equipment.power_consumption.toFixed(2)}W
                        </div>
                      </div>
                    )}

                    {/* Utilization Section */}
                    {equipment.utilization_hours_24h !== undefined && (
                      <div className="border-t border-gray-200 pt-2">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Utilization</div>
                        <div className="text-sm font-bold text-blue-600">
                          {equipment.utilization_hours_24h.toFixed(1)}h ({equipment.utilization_percentage_24h.toFixed(1)}%)
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-2 space-y-2">
                      <button
                        onClick={() => setShowHistory(prev => ({
                          ...prev,
                          [equipment.equipment_id]: !prev[equipment.equipment_id]
                        }))}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <History size={14} />
                        {isShowingHistory ? 'Hide' : 'Show'} Location History
                      </button>

                      <button
                        onClick={() => handleViewDetails(equipment.equipment_id)}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs py-2 px-2 rounded flex items-center justify-center gap-1 transition-colors font-medium"
                      >
                        <span>View Details</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        <MapController selectedLocation={selectedLocation} />
        <ScaleControl position="bottomleft" />
        <ZoomControl position="bottomright" />
        <MapControls terrain={terrain} onTerrainChange={onTerrainChange} />
      </MapContainer>
    </div>
  );
}