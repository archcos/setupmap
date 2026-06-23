import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { PageHeader } from './components/PageHeader';
import { Sidebar } from './components/Sidebar';
import { MindanaoMap } from './components/MindanaoMap';
import { provinceMapping } from './constants/mapConstants';

export default function Index({ 
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
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [sidebarFilter, setSidebarFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Determine if equipment is active today
    const isActiveToday = (equipment) => {
        if (!equipment.locations || equipment.locations.length === 0) return false;
        const latestLocation = equipment.locations[equipment.locations.length - 1];
        const todayDateString = currentDateTime.toDateString();
        return latestLocation?.created_at && 
            new Date(latestLocation.created_at).toDateString() === todayDateString;
    };

    // Filter equipments based on sidebar filter AND search query
    const filteredEquipments = equipments.filter(eq => {
        // First apply the status filter
        const active = isActiveToday(eq);
        let passesStatusFilter = false;
        switch (sidebarFilter) {
            case 'active':
                passesStatusFilter = active;
                break;
            case 'inactive':
                passesStatusFilter = !active;
                break;
            case 'all':
            default:
                passesStatusFilter = true;
        }
        
        if (!passesStatusFilter) return false;
        
        // Then apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const nameMatch = (eq.equipment_name || '').toLowerCase().includes(query);
            const ownerMatch = (eq.owner || '').toLowerCase().includes(query);
            const locationMatch = (eq.expected_location || '').toLowerCase().includes(query);
            const idMatch = String(eq.equipment_id || '').includes(query);
            
            return nameMatch || ownerMatch || locationMatch || idMatch;
        }
        
        return true;
    });

    // Group equipments by province using expected_location
    const equipmentsByProvince = {};
    
    // Initialize provinces from mapping
    Object.values(provinceMapping).forEach(province => {
        equipmentsByProvince[province] = [];
    });

    filteredEquipments.forEach(eq => {
        const provinceName = provinceMapping[eq.expected_location];
        if (provinceName && equipmentsByProvince[provinceName]) {
            equipmentsByProvince[provinceName].push(eq);
        }
    });

    const handleEquipmentClick = (equipment) => {
        // Get the LATEST location (last in the array)
        if (equipment.locations && equipment.locations.length > 0) {
            const latestLocation = equipment.locations[equipment.locations.length - 1];
            setSelectedLocation([
                parseFloat(latestLocation.latitude),
                parseFloat(latestLocation.longitude)
            ]);
        } else if (equipment.latest_location) {
            // Fallback to latest_location if locations array is empty
            setSelectedLocation([
                parseFloat(equipment.latest_location.latitude),
                parseFloat(equipment.latest_location.longitude)
            ]);
        }
        // Don't close sidebar
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
            <Head title="SETUP Map - Equipment Tracking" />
            
            <PageHeader 
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onRefresh={refreshData}
                isRefreshing={isRefreshing}
                currentDateTime={currentDateTime}
            />

            <div className="flex-1 flex overflow-hidden bg-white">
                <Sidebar 
                    sidebarCollapsed={sidebarCollapsed}
                    equipmentsByProvince={equipmentsByProvince}
                    expandedProvince={expandedProvince}
                    onToggleProvince={toggleProvince}
                    onEquipmentClick={handleEquipmentClick}
                    currentDateTime={currentDateTime}
                    filter={sidebarFilter}
                    onFilterChange={setSidebarFilter}
                    allEquipments={equipments}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filteredCount={filteredEquipments.length}
                    totalCount={equipments.length}
                />

                <main className="flex-1 relative bg-blue-50">
                    <MindanaoMap
                        selectedLocation={selectedLocation}
                        terrain={terrain}
                        onTerrainChange={setTerrain}
                        locations={locations}
                        equipments={equipments}
                        currentDateTime={currentDateTime}
                    />
                </main>
            </div>
        </div>
    );
}