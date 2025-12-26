// components/NorthernMindanaoMap.jsx
import { MapContainer, TileLayer, useMap, Marker, Popup, ScaleControl, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const bounds = [
  [7.5, 123.0],
  [9.5, 125.5],
];

const expandedBounds = [
  [7.0, 122.5],
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

function PanToProvince({ position }) {
  const map = useMap();
  if (position && Array.isArray(position) && position.length === 2) {
    map.flyTo(position, 12);
  }
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

export default function NorthernMindanaoMap({ selectedProvince, terrain, onTerrainChange, provinces }) {
  const currentTerrain = terrainTypes[terrain];

  const customIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjM2I4MmY2Ii8+PHBhdGggZD0iTTEyIDZjLTMuMyAwLTYgMi43LTYgNiAwaCAyYzAgNCAyLjQgNy4yIDUuMyA4LjUuNS4yIDEuNy4yIDIuNDAgMCAyLjktMS4zIDUuMy00LjUgNS4zLTguNSAwLTMuMy0yLjctNi02LTZ6bTAtMWMzLjkgMCA3IDMuMSA3IDcgMCA0LTIuNiA3LjItNiA4LjEtMy40LTEtNi00LjEtNi04LjEgMC0zLjkgMy4xLTcgNy03eiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -10]
  });

  return (
    <MapContainer
      bounds={bounds}
      maxBounds={expandedBounds}
      maxBoundsViscosity={0.8}
      minZoom={7}
      maxZoom={18}
      scrollWheelZoom
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution={currentTerrain.attribution}
        url={currentTerrain.url}
        key={terrain}
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
  );
}