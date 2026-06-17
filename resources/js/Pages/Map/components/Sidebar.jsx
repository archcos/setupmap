import { ChevronDown, MapPin, Home, Clock, Filter, Search, X } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useState, useRef } from 'react';

export function Sidebar({ 
  sidebarCollapsed, 
  error, 
  equipmentsByProvince, 
  expandedProvince, 
  onToggleProvince, 
  onEquipmentClick,
  currentDateTime,
  filter,
  onFilterChange,
  allEquipments = [],
  searchQuery,
  onSearchChange,
  filteredCount,
  totalCount
}) {
  const todayDateString = currentDateTime.toDateString();
  const searchInputRef = useRef(null);
  
  const formatTodayTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    });
  };

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    return new Date(timestamp).toDateString() === todayDateString;
  };

  // Calculate counts
  const counts = {
    all: allEquipments.length,
    active: allEquipments.filter(eq => {
      if (!eq.locations || eq.locations.length === 0) return false;
      const latestLocation = eq.locations[eq.locations.length - 1];
      return isToday(latestLocation?.created_at);
    }).length,
    inactive: allEquipments.filter(eq => {
      if (!eq.locations || eq.locations.length === 0) return true;
      const latestLocation = eq.locations[eq.locations.length - 1];
      return !isToday(latestLocation?.created_at);
    }).length
  };

  const handleClearSearch = () => {
    onSearchChange('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Auto-expand provinces when searching
  const shouldAutoExpand = searchQuery && searchQuery.trim().length > 0;

  return (
    <>
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/30 lg:hidden z-30"
          onClick={() => {} /* Handled by parent */}
        />
      )}

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
        <div className="p-2 sm:p-4 h-full flex flex-col">
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Search Bar */}
            <div className="mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search equipment or owner..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Found <span className="font-semibold text-blue-600">{filteredCount}</span> of {totalCount} equipment
                  </p>
                </div>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2 flex items-center">
                <Filter size={14} className="mr-2 text-blue-600" />
                Filter Status
              </h3>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => onFilterChange('all')}
                  className={`px-2 py-2 text-xs font-medium rounded transition ${
                    filter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                  <span className="block text-xs mt-0.5 opacity-80">{counts.all}</span>
                </button>
                <button
                  onClick={() => onFilterChange('active')}
                  className={`px-2 py-2 text-xs font-medium rounded transition ${
                    filter === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Active
                  <span className="block text-xs mt-0.5 opacity-80">{counts.active}</span>
                </button>
                <button
                  onClick={() => onFilterChange('inactive')}
                  className={`px-2 py-2 text-xs font-medium rounded transition ${
                    filter === 'inactive'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inactive
                  <span className="block text-xs mt-0.5 opacity-80">{counts.inactive}</span>
                </button>
              </div>
            </div>

            {/* Current Status Indicator */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-blue-600" />
                <h3 className="text-xs font-semibold text-blue-800">
                  {searchQuery 
                    ? 'Search Results' 
                    : filter === 'all' 
                      ? 'All Equipment' 
                      : filter === 'active' 
                        ? 'Active Today' 
                        : 'Inactive Equipment'
                  }
                </h3>
              </div>
              <p className="text-xs text-blue-700">
                {searchQuery 
                  ? `Showing results for "${searchQuery}"`
                  : filter === 'all' 
                    ? 'Showing all equipment in database'
                    : filter === 'active'
                    ? 'Equipment with today\'s location updates'
                    : 'Equipment without today\'s updates'
                }
              </p>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                {currentDateTime.toLocaleDateString('en-PH', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>

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
                {Object.entries(equipmentsByProvince).map(([province, equipmentList]) => {
                  // Show all provinces when searching, otherwise filter empty ones
                  if (equipmentList.length === 0 && !searchQuery && filter === 'all') {
                    return null;
                  }
                  
                  // Count active equipment in this province
                  const activeCount = equipmentList.filter(eq => {
                    if (!eq.locations || eq.locations.length === 0) return false;
                    const latestLocation = eq.locations[eq.locations.length - 1];
                    return isToday(latestLocation?.created_at);
                  }).length;
                  
                  // Auto-expand when searching
                  const isExpanded = shouldAutoExpand || expandedProvince === province;
                  
                  return (
                    <div key={province}>
                      <button
                        onClick={() => onToggleProvince(province)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-sm font-semibold text-gray-800"
                      >
                        <span className="truncate">{province}</span>
                        <div className="flex items-center gap-1.5 ml-2">
                          {activeCount > 0 && (
                            <span className="text-xs bg-green-500 text-white rounded-full px-1.5 py-0.5">
                              {activeCount}
                            </span>
                          )}
                          <span className="text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                            {equipmentList.length}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-1 space-y-1 ml-2 border-l-2 border-blue-300 pl-2">
                          {equipmentList.length > 0 ? (
                            equipmentList.map((equipment) => {
                              const latestLocation = equipment.locations && equipment.locations.length > 0 
                                ? equipment.locations[equipment.locations.length - 1] 
                                : null;
                              
                              const isLatestToday = latestLocation && isToday(latestLocation.created_at);
                              
                              return (
                                <div
                                  key={equipment.equipment_id}
                                  onClick={() => onEquipmentClick(equipment)}
                                  className={`cursor-pointer border rounded-lg p-2 transition ${
                                    isLatestToday 
                                      ? 'bg-green-50 border-green-300 hover:border-green-400 hover:bg-green-100' 
                                      : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                  }`}
                                >
                                  <h3 className="font-semibold text-xs text-gray-800 truncate">
                                    {equipment.equipment_name}
                                  </h3>
                                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                                    Owner: {equipment.owner}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    ID: {equipment.equipment_id}
                                  </p>
                                  {latestLocation ? (
                                    <div>
                                      <div className="flex items-center gap-1 mt-1">
                                        {isLatestToday ? (
                                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
                                        ) : (
                                          <span className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></span>
                                        )}
                                        <p className="text-xs text-gray-500 truncate">
                                          {isLatestToday ? 'Today' : 'Last'}: {formatTodayTime(latestLocation.created_at)}
                                        </p>
                                      </div>
                                      {isLatestToday && (
                                        <p className="text-xs text-green-600 font-medium mt-0.5">
                                          ✓ Active today
                                        </p>
                                      )}
                                      {!isLatestToday && (
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                          Inactive since {latestLocation.created_at ? new Date(latestLocation.created_at).toLocaleDateString('en-PH') : 'N/A'}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 mt-1">No location data</p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-gray-400 py-2">
                              {searchQuery 
                                ? 'No equipment matching your search' 
                                : filter === 'all' 
                                  ? 'No equipment in this province' 
                                  : 'No equipment matching filter'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {Object.values(equipmentsByProvince).every(list => list.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Search size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    {searchQuery 
                      ? `No equipment found for "${searchQuery}"` 
                      : filter === 'active' 
                        ? 'No active equipment today' 
                        : filter === 'inactive'
                        ? 'No inactive equipment'
                        : 'No equipment data available'}
                  </p>
                  <p className="text-xs mt-1">
                    {searchQuery 
                      ? 'Try a different search term' 
                      : filter === 'active' 
                        ? 'Check back later for updates' 
                        : 'Try changing the filter'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Home Button at Bottom */}
          <div className="border-t border-gray-200 pt-4">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors duration-200"
            >
              <Home size={18} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}