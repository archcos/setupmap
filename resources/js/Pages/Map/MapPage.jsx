import { useState } from 'react';
import { PageHeader } from './components/PageHeader';
import { Sidebar } from './components/Sidebar';
import { MindanaoMap } from './components/MindanaoMap';
import { provinceMapping } from './constants/mapConstants';

export default function MapPage({ equipments = [], locations = [], error: initialError = null }) {
  const [terrain, setTerrain] = useState('street');
  const [error, setError] = useState(initialError);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [expandedProvince, setExpandedProvince] = useState(null);

  const equipmentsByProvince = {
    'Camiguin': [],
    'Bukidnon': [],
    'Lanao Del Norte': [],
    'Misamis Occidental': [],
    'Misamis Oriental': [],
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
    setSidebarCollapsed(true);
  };

  const toggleProvince = (province) => {
    setExpandedProvince(expandedProvince === province ? null : province);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <PageHeader 
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex overflow-hidden bg-white">
        <Sidebar 
          sidebarCollapsed={sidebarCollapsed}
          error={error}
          equipmentsByProvince={equipmentsByProvince}
          expandedProvince={expandedProvince}
          onToggleProvince={toggleProvince}
          onEquipmentClick={handleEquipmentClick}
        />

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