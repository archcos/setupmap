import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ScaleControl, ZoomControl, Polyline, Tooltip } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, History, ArrowRight, Zap, AlertCircle, Loader } from 'lucide-react';

const tooltipStyles = `
  .equipment-utilization-tooltip.leaflet-tooltip {
    background-color: rgba(0, 0, 0, 0.85) !important;
    border: none !important;
    border-radius: 6px !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
    padding: 4px 8px !important;
    color: white !important;
    font-size: 12px !important;
  }
  
  .equipment-utilization-tooltip.leaflet-tooltip::before {
    display: none !important;
  }
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = tooltipStyles;
  document.head.appendChild(styleEl);
}

import { MapController } from './MapController';
import { MapControls } from './MapControls';
import { LoadingOverlay } from '../../../Components/LoadingOverlay';
import { northernMindanaoBounds, terrainTypes } from '../constants/mapConstants';


const ErrorOverlay = ({ error }) => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 absolute z-50">
    <div className="bg-white p-8 rounded-lg shadow-xl text-center">
      <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
      <p className="text-red-600 font-semibold text-lg">Error Loading Data</p>
      <p className="text-gray-600 text-sm mt-2">{error}</p>
    </div>
  </div>
);

export function MindanaoMap({ selectedLocation = null, terrain = 'street', onTerrainChange = () => {}, mapDataUrl = '/equipment-map-data' }) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState({});
  const currentTerrain = terrainTypes[terrain];
  const mapRef = useRef(null);

  // Fetch equipment data from API
  useEffect(() => {
    const fetchEquipmentData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(mapDataUrl);
        if (!response.ok) throw new Error('Failed to fetch equipment data');
        const data = await response.json();
        setEquipments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentData();
  }, [mapDataUrl]);

  const createMapPinIcon = (avgUtilization) => {
    const utilizationPercent = Math.min(Math.round(avgUtilization), 100);
    const color = utilizationPercent >= 80 ? '#10b981' : utilizationPercent >= 50 ? '#f59e0b' : '#ef4444';
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 1C7 1 0 8 0 17c0 7 16 24 16 24s16-17 16-24c0-9-7-16-16-16z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>`;
    
    return L.icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42]
    });
  };

  const formatUTCTime = (timestamp) => {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hoursFormatted = String(hours).padStart(2, '0');
    
    return `${month}/${day}/${year}, ${hoursFormatted}:${minutes}:${seconds} ${ampm}`;
  };

  const formatDateShort = (timestamp) => {
    const date = new Date(timestamp);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  const generateWeekData = (equipment) => {
    const weekData = {};
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      weekData[dateKey] = { date: dateKey, utilization: 0, count: 0 };
    }

    if (equipment.utilization_history && Array.isArray(equipment.utilization_history)) {
      equipment.utilization_history.forEach(record => {
        const dateKey = record.date?.split('T')[0];
        if (dateKey && weekData[dateKey]) {
          weekData[dateKey].utilization += parseFloat(record.utilization_percentage_8h || 0);
          weekData[dateKey].count += 1;
        }
      });
    }

    return Object.values(weekData).map(day => ({
      date: day.date,
      dateShort: formatDateShort(day.date),
      utilization: day.count > 0 ? Math.round(day.utilization / day.count) : 0
    }));
  };

  const calculateWeeklyAverage = (equipment) => {
    const weekData = generateWeekData(equipment);
    if (weekData.length === 0) return 0;
    const sum = weekData.reduce((acc, day) => acc + day.utilization, 0);
    return Math.round(sum / weekData.length);
  };

  const handleViewDetails = (equipmentId) => {
    console.log(`View details for equipment: ${equipmentId}`);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-full relative">
        <LoadingOverlay />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full relative">
        <ErrorOverlay error={error} />
      </div>
    );
  }

  // Render map only after data is loaded
  return (
    <div className="w-full h-full relative">
      <MapContainer
        bounds={northernMindanaoBounds}
        boundsOptions={{ padding: [50, 50] }}
        minZoom={8}
        maxZoom={18}
        scrollWheelZoom
        className="w-full h-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution={currentTerrain.attribution}
          url={currentTerrain.url}
          key={terrain}
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

          const weeklyAverage = calculateWeeklyAverage(equipment);
          const weekData = generateWeekData(equipment);
          const mapIcon = createMapPinIcon(weeklyAverage);
          
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
                icon={mapIcon}
              >
                <Tooltip 
                  direction="top" 
                  offset={[0, -30]}
                  permanent
                  className="equipment-utilization-tooltip"
                >
                  <div className="text-center">
                    <div className="font-semibold text-xs leading-tight">
                      {equipment.equipment_name}
                    </div>
                    <div className="font-bold text-sm">
                      {weeklyAverage}%
                    </div>
                  </div>
                </Tooltip>

                <Popup className="text-xs max-w-sm">
                  <div className="space-y-2 w-80">
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

                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Weekly Avg Utilization</div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-blue-600">{weeklyAverage}%</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(weeklyAverage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {weekData.length > 0 && (
                      <div className="border-t border-gray-200 pt-2">
                        <div className="text-xs font-semibold text-gray-700 mb-2">7-Day Trend</div>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={weekData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="dateShort" 
                              tick={{ fontSize: 9 }}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              tick={{ fontSize: 9 }}
                            />
                            <ChartTooltip 
                              formatter={(value) => `${value}%`}
                              contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="utilization" 
                              stroke="#3b82f6" 
                              dot={{ fill: '#3b82f6', r: 2 }}
                              strokeWidth={1.5}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
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