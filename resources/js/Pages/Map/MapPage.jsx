import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { PageHeader } from './components/PageHeader';
import { Sidebar } from './components/Sidebar';
import { MindanaoMap } from './components/MindanaoMap';
import { provinceMapping } from './constants/mapConstants';

export default function MapPage({ 
    equipments: initialEquipments = [], 
    locations: initialLocations = [], 
    error: initialError = null 
}) {
    const [terrain, setTerrain] = useState('street');
    const [error, setError] = useState(initialError);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [expandedProvince, setExpandedProvince] = useState(null);
    const [equipments, setEquipments] = useState(initialEquipments);
    const [locations, setLocations] = useState(initialLocations);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Group equipments by province using expected_location
    const equipmentsByProvince = {};
    
    // Initialize provinces from mapping
    Object.values(provinceMapping).forEach(province => {
        equipmentsByProvince[province] = [];
    });

    equipments.forEach(eq => {
        const provinceName = provinceMapping[eq.expected_location];
        if (provinceName && equipmentsByProvince[provinceName]) {
            equipmentsByProvince[provinceName].push(eq);
        }
    });

    const handleEquipmentClick = (equipment) => {
        if (equipment.latest_location) {
            setSelectedLocation([
                equipment.latest_location.latitude,
                equipment.latest_location.longitude
            ]);
        }
        setSidebarCollapsed(true);
    };

    const toggleProvince = (province) => {
        setExpandedProvince(expandedProvince === province ? null : province);
    };

    // Refresh data on demand
    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch('/map-data');
            const data = await response.json();
            
            if (data.error) {
                setError(data.error);
            } else {
                setEquipments(data.equipments || []);
                setLocations(data.locations || []);
                setError(null);
            }
        } catch (error) {
            console.error('Failed to refresh map data:', error);
            setError('Failed to refresh map data');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(refreshData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-600 font-semibold">Error: {error}</p>
                    <button 
                        onClick={refreshData}
                        disabled={isRefreshing}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isRefreshing ? 'Refreshing...' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-white">
            <Head title="SETUP Map" />
            
            <PageHeader 
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onRefresh={refreshData}
                isRefreshing={isRefreshing}
            />

            <div className="flex-1 flex overflow-hidden bg-white">
                <Sidebar 
                    sidebarCollapsed={sidebarCollapsed}
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