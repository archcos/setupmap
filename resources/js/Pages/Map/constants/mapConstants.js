export const northernMindanaoBounds = [
  [7.5, 123.0],
  [9.5, 125.5],
];

export const terrainTypes = {
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

export const provinceMapping = {
  'MOR': 'Misamis Oriental',
  'LDN': 'Lanao Del Norte',
  'MOC': 'Misamis Occidental',
  'BUK': 'Bukidnon',
  'CAM': 'Camiguin'
};