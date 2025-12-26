import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Menu, X, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, ScaleControl, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const mindanaoBounds = [
  [5.0, 120.0],
  [10.0, 126.0],
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

const fallbackProvinceData = {
  'Bukidnon': {
    code: '101300000',
    capital: 'Malaybalay City',
    area: '13,292.62',
    coords: [8.0, 125.0]
  },
  'Camiguin': {
    code: '101800000',
    capital: 'Mambajao',
    area: '238.19',
    coords: [9.2, 124.7]
  },
  'Lanao Del Norte': {
    code: '103500000',
    capital: 'Iligan City',
    area: '3,099',
    coords: [8.0, 124.0]
  },
  'Misamis Occidental': {
    code: '104200000',
    capital: 'Oroquieta City',
    area: '1,974.54',
    coords: [8.5, 123.7]
  },
  'Misamis Oriental': {
    code: '104300000',
    capital: 'Cagayan de Oro City',
    area: '4,498.04',
    coords: [8.5, 125.0]
  }
};

function PanToProvince({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && Array.isArray(position) && position.length === 2) {
      map.flyTo(position, 12);
    }
  }, [position, map]);
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

function MindanaoMap({ selectedProvince, terrain, onTerrainChange, provinces }) {
  const [isLoading, setIsLoading] = useState(true);
  const currentTerrain = terrainTypes[terrain];
  const mapRef = useRef(null);

  const customIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjM2I4MmY2Ii8+PHBhdGggZD0iTTEyIDZjLTMuMyAwLTYgMi43LTYgNiAwaCAyYzAgNCAyLjQgNy4yIDUuMyA4LjUuNS4yIDEuNy4yIDIuNDAgMCAyLjktMS4zIDUuMy00LjUgNS4zLTguNSAwLTMuMy0yLjctNi02LTZ6bTAtMWMzLjkgMCA3IDMuMSA3IDcgMCA0LTIuNiA3LjItNiA4LjEtMy40LTEtNi00LjEtNi04LjEgMC0zLjkgMy4xLTcgNy03eiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -10]
  });

  return (
    <div className="w-full h-full relative">
      {isLoading && <LoadingOverlay />}
      <MapContainer
        bounds={mindanaoBounds}
        minZoom={6}
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
          minZoom={6}
          maxZoom={18}
          tileSize={256}
        />

        {Object.entries(provinces).map(([name, coords]) => (
          <Marker
            key={name}
            position={coords}
            icon={customIcon}
          >
            <Popup className="text-sm font-semibold">{name}</Popup>
          </Marker>
        ))}

        {selectedProvince && <PanToProvince position={selectedProvince} />}
        <ScaleControl position="bottomleft" />
        <ZoomControl position="bottomright" />
        <MapControls terrain={terrain} onTerrainChange={onTerrainChange} />
      </MapContainer>
    </div>
  );
}

export default function MapPage() {
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [terrain, setTerrain] = useState('street');
  const [provinces, setProvinces] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCity, setExpandedCity] = useState(null);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [cities, setCities] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('https://psgc.gitlab.io/api/provinces/');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const northernMindanaoProvinces = data.filter(p => p.regionCode === '100000000');

        const nameMapping = {
          'Bukidnon': 'Bukidnon',
          'Camiguin': 'Camiguin',
          'Lanao Del Norte': 'Lanao Del Norte',
          'Misamis Occidental': 'Misamis Occidental',
          'Misamis Oriental': 'Misamis Oriental'
        };

        const provincesData = {};
        northernMindanaoProvinces.forEach((province) => {
          const internalName = nameMapping[province.name];
          if (internalName && fallbackProvinceData[internalName]) {
            const fallbackData = fallbackProvinceData[internalName];
            provincesData[internalName] = {
              code: province.code,
              capital: fallbackData.capital,
              area: fallbackData.area,
              coords: fallbackData.coords
            };
          }
        });

        setProvinces(provincesData);
      } catch (err) {
        console.error('Error loading provinces:', err);
        setError('Failed to load provinces');
        
        const fallbackData = {};
        Object.entries(fallbackProvinceData).forEach(([name, data]) => {
          fallbackData[name] = {
            code: data.code,
            capital: data.capital,
            area: data.area,
            coords: data.coords
          };
        });
        setProvinces(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchProvinces();
  }, []);

  const handleProvinceClick = async (provinceName) => {
    setSelectedProvince(provinceName);
    
    if (cities[provinceName]) {
      return;
    }

    setCitiesLoading(true);
    const provinceCode = provinces[provinceName]?.code;

    try {
      const response = await fetch(
        `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (response.ok) {
        const citiesData = await response.json();
        const citiesMap = {};
        
        citiesData.forEach(city => {
          citiesMap[city.name] = {
            code: city.code,
            barangays: []
          };
        });

        setCities(prev => ({
          ...prev,
          [provinceName]: citiesMap
        }));
      }
    } catch (err) {
      console.error(`Failed to load cities for ${provinceName}:`, err);
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleCityExpand = async (provinceName, cityName) => {
    setExpandedCity(expandedCity === `${provinceName}-${cityName}` ? null : `${provinceName}-${cityName}`);

    const cityData = cities[provinceName]?.[cityName];
    
    if (cityData?.barangays.length > 0) {
      return;
    }

    if (!cityData?.code) return;

    try {
      const response = await fetch(
        `https://psgc.gitlab.io/api/cities-municipalities/${cityData.code}/barangays/`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (response.ok) {
        const barangaysData = await response.json();
        const barangayNames = barangaysData.map(b => b.name);

        setCities(prev => ({
          ...prev,
          [provinceName]: {
            ...prev[provinceName],
            [cityName]: {
              ...prev[provinceName][cityName],
              barangays: barangayNames
            }
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to load barangays for ${cityName}:`, err);
    }
  };

  const selectedProvinceData = selectedProvince && provinces[selectedProvince] ? provinces[selectedProvince] : null;
  const selectedProvinceCoords = selectedProvinceData ? selectedProvinceData.coords : null;
  const selectedCities = selectedProvince && cities[selectedProvince] ? cities[selectedProvince] : {};

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md flex items-center justify-between z-50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">SETUP GPS Map</h1>
          <p className="text-blue-100 text-xs sm:text-sm">Interactive Province Map</p>
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
        {/* Backdrop for mobile */}
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
            {loading && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Loading province data...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-4 text-red-500 bg-red-50 rounded-lg">
                <p className="text-xs">{error}</p>
                <p className="text-xs mt-1">Using fallback data</p>
              </div>
            )}

            {!loading && (
              <>
                <div className="mb-6">
                  <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center">
                    <MapPin size={14} className="mr-2 text-blue-600" />
                    Provinces
                  </h2>
                  <div className="space-y-1">
                    {Object.entries(provinces).map(([name]) => (
                      <button
                        key={name}
                        onClick={() => handleProvinceClick(name)}
                        className={`w-full py-1.5 sm:py-2 px-2 sm:px-3 text-left text-xs font-medium rounded-lg transition-all ${
                          selectedProvince === name
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Province Details */}
                {selectedProvinceData && (
                  <div className="pt-4 border-t space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Province Info</h3>
                      <div className="space-y-1">
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <p className="text-xs text-gray-600">Capital</p>
                          <p className="font-semibold text-gray-800 text-xs">{selectedProvinceData.capital}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <p className="text-xs text-gray-600">Area (km²)</p>
                          <p className="font-semibold text-gray-800 text-xs">{selectedProvinceData.area}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cities/Municipalities */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                        {citiesLoading ? 'Loading Cities...' : 'Cities & Municipalities'}
                      </h3>
                      
                      {Object.keys(selectedCities).length > 0 ? (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {Object.entries(selectedCities).map(([cityName, cityData]) => (
                            <div key={cityName} className="bg-gray-50 rounded-lg">
                              <button
                                onClick={() => handleCityExpand(selectedProvince, cityName)}
                                className="w-full flex items-center justify-between p-2 hover:bg-gray-100 transition"
                              >
                                <span className="text-xs font-semibold text-gray-800">{cityName}</span>
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform ${
                                    expandedCity === `${selectedProvince}-${cityName}` ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>

                              {expandedCity === `${selectedProvince}-${cityName}` && (
                                <div className="border-t bg-white p-2">
                                  {cityData.barangays.length > 0 ? (
                                    <ul className="space-y-0.5">
                                      {cityData.barangays.map((barangay) => (
                                        <li key={barangay} className="text-xs text-gray-600 ml-1 before:content-['•'] before:mr-1">
                                          {barangay}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-gray-500">Loading barangays...</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : citiesLoading ? (
                        <p className="text-xs text-gray-500">Loading cities...</p>
                      ) : (
                        <p className="text-xs text-gray-500">Click on a province to load cities</p>
                      )}
                    </div>
                  </div>
                )}

                {/* No Selection Message */}
                {!selectedProvinceData && (
                  <div className="pt-4 border-t text-center text-gray-500 text-sm">
                    <p>Select a province to view details</p>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative bg-blue-50">
          <MindanaoMap
            selectedProvince={selectedProvinceCoords}
            terrain={terrain}
            onTerrainChange={setTerrain}
            provinces={Object.fromEntries(
              Object.entries(provinces).map(([name, data]) => [name, data.coords])
            )}
          />
        </main>
      </div>
    </div>
  );
}