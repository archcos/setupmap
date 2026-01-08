import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Menu, X, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, ScaleControl, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const northernMindanaoBounds = [
  [7.5, 123.0],
  [9.5, 125.5],
];

const terrainTypes = {
  street: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
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
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  },
};

const provinceMapping = {
  'MOR': 'Misamis Oriental',
  'LDN': 'Lanao Del Norte',
  'MOC': 'Misamis Occidental',
  'BUK': 'Bukidnon',
  'CAM': 'Camiguin'
};

function MapController({ selectedLocation }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedLocation && Array.isArray(selectedLocation) && selectedLocation.length === 2) {
      map.flyTo(selectedLocation, 14, { duration: 1.5 });
    }
  }, [selectedLocation, map]);
  
  return null;
}

function MapControls({ terrain, onTerrainChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition flex items-center gap-2 pointer-events-auto"
      >
        <span className="text-xs font-semibold text-gray-700">Map Style</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg p-2 min-w-max pointer-events-auto">
          <div className="space-y-1">
            {Object.entries(terrainTypes).map(([key, { name }]) => (
              <button
                key={key}
                onClick={() => {
                  onTerrainChange(key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded transition ${
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
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-50 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium text-gray-700">Loading map...</p>
      </div>
    </div>
  );
}

function MindanaoMap({ selectedLocation, terrain, onTerrainChange, locations = [], equipments = [] }) {
  const [isLoading, setIsLoading] = useState(true);
  const currentTerrain = terrainTypes[terrain];
  const mapRef = useRef(null);

  const equipmentIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI4IDQwIj48cGF0aCBkPSJNMTQgMEMzLjMgMCAwIDEwIDAgMjBjMCAxMSAxMCAyMCAxNCAyMHMxNC05IDE0LTIwQzI4IDEwIDI0LjcgMCAxNCAweiIgZmlsbD0iI2VmNDQ0NCIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iMTQiIHI9IjYiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40]
  });

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

        {/* Equipment Location Markers - Only Latest Location */}
        {equipments.map((equipment) => {
          const latestLocation = equipment.locations && equipment.locations.length > 0 
            ? equipment.locations[equipment.locations.length - 1] 
            : null;
          
          if (!latestLocation) return null;
          
          return (
            <Marker
              key={`location-${equipment.equipment_id}`}
              position={[parseFloat(latestLocation.latitude), parseFloat(latestLocation.longitude)]}
              icon={equipmentIcon}
            >
              <Popup className="text-xs">
                <div className="font-semibold">{equipment.equipment_name}</div>
                <div className="text-xs text-gray-600">Owner: {equipment.owner}</div>
                <div className="text-xs text-gray-600">Location: {equipment.expected_location}</div>
                <div className="text-xs text-gray-600">Lat: {latestLocation.latitude}</div>
                <div className="text-xs text-gray-600">Lon: {latestLocation.longitude}</div>
                {latestLocation.created_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(latestLocation.created_at).toLocaleString()}
                  </div>
                )}
              </Popup>
            </Marker>
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

export default function MapPage({ equipments = [], locations = [], error: initialError = null }) {
  const [terrain, setTerrain] = useState('street');
  const [error, setError] = useState(initialError);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [expandedProvince, setExpandedProvince] = useState(null);

  // Group equipments by province
  const equipmentsByProvince = {
    'Misamis Oriental': [],
    'Lanao Del Norte': [],
    'Misamis Occidental': [],
    'Bukidnon': [],
    'Camiguin': []
  };

  equipments.forEach(eq => {
    const provinceCode = eq.expected_location;
    const provinceName = provinceMapping[provinceCode];
    if (provinceName && equipmentsByProvince[provinceName]) {
      equipmentsByProvince[provinceName].push(eq);
    }
  });

  const handleEquipmentClick = (equipment) => {
    if (equipment.locations && equipment.locations.length > 0) {
      const latestLocation = equipment.locations[equipment.locations.length - 1];
      setSelectedLocation([parseFloat(latestLocation.latitude), parseFloat(latestLocation.longitude)]);
    }
  };

  const toggleProvince = (province) => {
    setExpandedProvince(expandedProvince === province ? null : province);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md flex items-center justify-between z-50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">SETUP GPS Map</h1>
          <p className="text-blue-100 text-xs sm:text-sm">Equipment Tracking & Locations</p>
        </div>
        
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 text-white hover:bg-blue-500 rounded-lg transition"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden bg-white">
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/30 lg:hidden z-30"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          relative z-40 lg:z-auto
          bg-white border-r border-gray-200
          overflow-y-auto
          transition-all duration-300
          ${sidebarCollapsed 
            ? 'w-0' 
            : 'w-56 sm:w-72 lg:w-80'
          }
        `}>
          <div className="p-2 sm:p-4 h-full overflow-y-auto min-w-56 sm:min-w-72 lg:min-w-80">
            {error && (
              <div className="text-center py-4 text-red-500 bg-red-50 rounded-lg mb-4">
                <p className="text-xs">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center">
                <MapPin size={14} className="mr-2 text-blue-600" />
                Equipment by Province
              </h2>
              
              <div className="space-y-2">
                {Object.entries(equipmentsByProvince).map(([province, equipmentList]) => (
                  <div key={province}>
                    <button
                      onClick={() => toggleProvince(province)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-sm font-semibold text-gray-800"
                    >
                      <span>{province}</span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expandedProvince === province ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {expandedProvince === province && (
                      <div className="mt-1 space-y-1 ml-2 border-l-2 border-blue-300 pl-2">
                        {equipmentList.length > 0 ? (
                          equipmentList.map((equipment) => (
                            <div
                              key={equipment.equipment_id}
                              onClick={() => handleEquipmentClick(equipment)}
                              className="cursor-pointer bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-400 hover:bg-blue-50 transition"
                            >
                              <h3 className="font-semibold text-xs text-gray-800">{equipment.equipment_name}</h3>
                              <p className="text-xs text-gray-600 mt-1">Owner: {equipment.owner}</p>
                              {equipment.locations && equipment.locations.length > 0 ? (
                                <div>
                                  <p className="text-xs text-green-600 mt-1 font-semibold">✓ Has Location</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(equipment.locations[equipment.locations.length - 1].created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 mt-1">No location data</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 py-2">No equipment found</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative bg-blue-50">
          <MindanaoMap
            selectedLocation={selectedLocation}
            terrain={terrain}
            onTerrainChange={setTerrain}
            locations={locations}
            equipments={equipments}
          />
        </main>
      </div>
    </div>
  );
}