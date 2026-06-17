import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ScaleControl, ZoomControl, Polyline, Tooltip, useMap } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { Link } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom tooltip styles
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

// Map bounds for Northern Mindanao
const northernMindanaoBounds = [
  [5.5, 121.5],
  [9.5, 126.5],
];

// Terrain types configuration
const terrainTypes = {
  street: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors'
  }
};

// Map Controller Component
function MapController({ selectedLocation }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedLocation && Array.isArray(selectedLocation) && selectedLocation.length === 2) {
      map.flyTo(selectedLocation, 14, { duration: 1.5 });
    }
  }, [selectedLocation, map]);
  
  return null;
}

// Combined Controls Component (Map Style + Equipment Filter)
function MapControls({ terrain, onTerrainChange, filter, onFilterChange, counts }) {
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filters = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'inactive', label: 'Inactive', count: counts.inactive },
  ];

  const currentFilter = filters.find(f => f.key === filter);

  return (
    <div className="absolute top-4 right-4 z-[1000] flex gap-2 pointer-events-auto">
      {/* Equipment Filter Button */}
      <div className="relative">
        <button
          onClick={() => {
            setIsFilterOpen(!isFilterOpen);
            setIsStyleOpen(false);
          }}
          className="bg-white rounded-lg shadow-lg px-2.5 py-2 hover:shadow-xl transition flex items-center gap-1.5 pointer-events-auto"
          title="Filter equipment"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="text-xs font-semibold text-gray-700">{currentFilter.label}</span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-blue-500 text-white">
            {currentFilter.count}
          </span>
        </button>

        {isFilterOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg p-1.5 min-w-max pointer-events-auto">
            <div className="space-y-0.5">
              {filters.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => {
                    onFilterChange(key);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded transition flex items-center justify-between gap-3 ${
                    filter === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <span className="font-medium">{label}</span>
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold ${
                    filter === key 
                      ? 'bg-white text-blue-600' 
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map Style Button */}
      <div className="relative">
        <button
          onClick={() => {
            setIsStyleOpen(!isStyleOpen);
            setIsFilterOpen(false);
          }}
          className="bg-white rounded-lg shadow-lg px-2.5 py-2 hover:shadow-xl transition flex items-center gap-1.5 pointer-events-auto"
          title="Change map style"
        >
          <span className="text-xs font-semibold text-gray-700">Map Style</span>
          <svg
            className={`transition-transform ${isStyleOpen ? 'rotate-180' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isStyleOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg p-1.5 min-w-max pointer-events-auto">
            <div className="space-y-0.5">
              {Object.entries(terrainTypes).map(([key, { name }]) => (
                <button
                  key={key}
                  onClick={() => {
                    onTerrainChange(key);
                    setIsStyleOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded transition ${
                    terrain === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main MindanaoMap Component
export function MindanaoMap({ 
  selectedLocation = null, 
  terrain = 'street', 
  onTerrainChange = () => {}, 
  locations = [],
  equipments = [],
  currentDateTime = new Date()
}) {
  const [showHistory, setShowHistory] = useState({});
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const currentTerrain = terrainTypes[terrain];
  const mapRef = useRef(null);

  const todayDateString = currentDateTime.toDateString();
  
  const filteredEquipments = equipments.filter(eq => {
    const hasLocations = eq.locations && eq.locations.length > 0;
    if (!hasLocations) {
      return equipmentFilter === 'all' || equipmentFilter === 'inactive';
    }
    
    const latestLocation = eq.locations[eq.locations.length - 1];
    const isActiveToday = latestLocation?.created_at && 
      new Date(latestLocation.created_at).toDateString() === todayDateString;
    
    switch (equipmentFilter) {
      case 'active':
        return isActiveToday;
      case 'inactive':
        return !isActiveToday;
      case 'all':
      default:
        return true;
    }
  });

  const counts = {
    all: equipments.length,
    active: equipments.filter(eq => {
      if (!eq.locations || eq.locations.length === 0) return false;
      const latestLocation = eq.locations[eq.locations.length - 1];
      return latestLocation?.created_at && 
        new Date(latestLocation.created_at).toDateString() === todayDateString;
    }).length,
    inactive: equipments.filter(eq => {
      if (!eq.locations || eq.locations.length === 0) return true;
      const latestLocation = eq.locations[eq.locations.length - 1];
      return !latestLocation?.created_at || 
        new Date(latestLocation.created_at).toDateString() !== todayDateString;
    }).length
  };

  // Get today's power consumption for equipment
  const getTodayPowerConsumption = (equipment) => {
    if (!equipment.power_consumptions || !Array.isArray(equipment.power_consumptions)) {
      return 0;
    }
    
    // Filter power consumptions for today only
    const todayPowerConsumptions = equipment.power_consumptions.filter(record => {
      if (!record.created_at) return false;
      return new Date(record.created_at).toDateString() === todayDateString;
    });
    
    // Return the latest power consumption for today
    if (todayPowerConsumptions.length > 0) {
      // Sort by created_at descending to get latest
      todayPowerConsumptions.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      return todayPowerConsumptions[0].consumption || 0;
    }
    
    return 0;
  };

  const createMapPinIcon = (avgUtilization, isActiveToday) => {
    const utilizationPercent = Math.min(Math.round(avgUtilization), 100);
    
    let color;
    if (!isActiveToday) {
      color = '#9ca3af';
    } else {
      color = utilizationPercent >= 80 ? '#10b981' : utilizationPercent >= 50 ? '#f59e0b' : '#ef4444';
    }
    
    const borderColor = isActiveToday ? 'white' : '#d1d5db';
    const opacity = isActiveToday ? '1' : '0.6';
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42" opacity="${opacity}">
      <path d="M16 1C7 1 0 8 0 17c0 7 16 24 16 24s16-17 16-24c0-9-7-16-16-16z" fill="${color}" stroke="${borderColor}" stroke-width="1.5"/>
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
    if (!timestamp) return 'N/A';
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
    if (!timestamp) return 'N/A';
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

  const isActiveToday = (equipment) => {
    if (!equipment.locations || equipment.locations.length === 0) return false;
    const latestLocation = equipment.locations[equipment.locations.length - 1];
    return latestLocation?.created_at && 
      new Date(latestLocation.created_at).toDateString() === todayDateString;
  };

  // Show loading state if no data
  if (!equipments || equipments.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-600 font-semibold text-lg">Loading Map Data</p>
          <p className="text-gray-600 text-sm mt-2">Fetching equipment locations...</p>
        </div>
      </div>
    );
  }

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

        {/* Combined Controls */}
        <MapControls 
          terrain={terrain}
          onTerrainChange={onTerrainChange}
          filter={equipmentFilter} 
          onFilterChange={setEquipmentFilter}
          counts={counts}
        />

        {/* Legend */}
        <div className="absolute bottom-11 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2.5 pointer-events-none">
          <p className="text-xs font-semibold text-gray-700 mb-1.5">Equipment Status</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Active (High Util.)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Active (Med Util.)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Active (Low Util.)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-600">Inactive</span>
            </div>
          </div>
        </div>

        {/* Render equipment markers */}
        {filteredEquipments.map((equipment) => {
          const latestLocation = equipment.locations && equipment.locations.length > 0 
            ? equipment.locations[equipment.locations.length - 1] 
            : null;
          
          if (!latestLocation) return null;
          
          const isShowingHistory = showHistory[equipment.equipment_id];
          const last10Locations = equipment.locations ? equipment.locations.slice(-10) : [];
          const pathCoordinates = last10Locations.map(loc => [
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
          ]);

          const weeklyAverage = calculateWeeklyAverage(equipment);
          const weekData = generateWeekData(equipment);
          const active = isActiveToday(equipment);
          const mapIcon = createMapPinIcon(weeklyAverage, active);
          const todayPower = getTodayPowerConsumption(equipment);
          
          return (
            <div key={`location-${equipment.equipment_id || Math.random()}`}>
              {/* Show history path */}
              {isShowingHistory && pathCoordinates.length > 1 && (
                <Polyline 
                  positions={pathCoordinates} 
                  color="blue" 
                  weight={2} 
                  opacity={0.6} 
                  dashArray="5, 5"
                />
              )}
              
              {/* Show history markers */}
              {isShowingHistory && last10Locations.map((loc, idx) => (
                <Marker
                  key={`history-${equipment.equipment_id}-${idx}`}
                  position={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
                  icon={L.icon({
                    iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>')}`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    popupAnchor: [0, -15]
                  })}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-semibold text-blue-600">Location #{last10Locations.length - idx}</div>
                      <div className="text-gray-600">Lat: {loc.latitude}</div>
                      <div className="text-gray-600">Lon: {loc.longitude}</div>
                      <div className="text-gray-500 mt-1">
                        {formatUTCTime(loc.created_at)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Main equipment marker */}
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
                      {equipment.equipment_name || 'Unknown'}
                    </div>
                    <div className="font-bold text-sm">
                      {weeklyAverage}%
                    </div>
                    {!active && (
                      <div className="text-xs text-gray-400">
                        Inactive
                      </div>
                    )}
                  </div>
                </Tooltip>

                <Popup>
                  <div className="text-xs space-y-2 w-64">
                    <div>
                      <div className="font-semibold text-gray-900">{equipment.equipment_name || 'Unknown'}</div>
                      <div className="text-gray-600">Owner: {equipment.owner || 'N/A'}</div>
                      <div className="text-gray-600">Location: {equipment.expected_location || 'N/A'}</div>
                      <div className="mt-1">
                        {active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Active Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-gray-600">Lat: {latestLocation.latitude}</div>
                      <div className="text-gray-600">Lon: {latestLocation.longitude}</div>
                      {latestLocation.created_at && (
                        <div className="text-gray-500 mt-1">
                          Last Update: {formatUTCTime(latestLocation.created_at)}
                        </div>
                      )}
                    </div>

                    {/* Today's Power Consumption */}
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-orange-600">⚡</span>
                        <span className="font-semibold text-gray-700">Today's Power</span>
                      </div>
                      {todayPower > 0 ? (
                        <div>
                          <div className="text-sm font-bold text-orange-600">
                            {todayPower.toFixed(2)}W
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Latest reading for today
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          No power data for today
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-2">
                      <div className="font-semibold text-gray-700 mb-2">Weekly Avg Utilization</div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-blue-600">{weeklyAverage}%</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(weeklyAverage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {weekData.length > 0 && (
                      <div className="border-t border-gray-200 pt-2">
                        <div className="font-semibold text-gray-700 mb-2">7-Day Trend</div>
                        <ResponsiveContainer width="100%" height={100}>
                          <LineChart data={weekData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="dateShort" tick={{ fontSize: 9 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
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
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>🕐</span>
                        {isShowingHistory ? 'Hide' : 'Show'} Location History
                      </button>

                      <Link
                        href={`/equipment/${equipment.equipment_id}/details`}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 px-2 rounded flex items-center justify-center gap-1 transition-colors font-medium no-underline"
                      >
                        <span className="text-white">View Details</span>
                        <span>→</span>
                      </Link>
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
      </MapContainer>
    </div>
  );
}