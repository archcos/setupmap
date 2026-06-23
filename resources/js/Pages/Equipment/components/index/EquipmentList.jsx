import { useState } from 'react';
import { Search, LayoutGrid, List, ChevronLeft, ChevronRight, ArrowRight, Zap, Clock, MapPin, Loader2 } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function EquipmentList({
  filteredData, paginatedData, viewMode, setViewMode,
  filterStatus, setFilterStatus, searchTerm, setSearchTerm,
  allEquipmentData, currentPage, totalPages, onPageChange, onViewDetails
}) {
  const [loadingId, setLoadingId] = useState(null);

  const handleViewDetails = (equipmentId) => {
    if (loadingId) return; // Prevent multiple clicks
    setLoadingId(equipmentId);
    onViewDetails(equipmentId);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: 'All', count: allEquipmentData.length, color: 'bg-blue-600 text-white' },
            { key: 'active', label: 'Active', count: allEquipmentData.filter(e => e.is_active).length, color: 'bg-green-600 text-white' },
            { key: 'inactive', label: 'Inactive', count: allEquipmentData.filter(e => !e.is_active).length, color: 'bg-gray-600 text-white' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm ${filterStatus === f.key ? f.color : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-32 sm:w-48" />
          </div>
          <div className="flex gap-0.5 border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {paginatedData.map(eq => (
            <div key={eq.equipment_id} className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden ${
              loadingId === eq.equipment_id ? 'ring-2 ring-blue-300 shadow-xl' : ''
            } ${loadingId && loadingId !== eq.equipment_id ? 'opacity-50' : ''}`}>
              <div className={`p-3 sm:p-4 text-white transition-all duration-300 ${
                eq.is_active 
                  ? loadingId === eq.equipment_id 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : loadingId === eq.equipment_id
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700'
                    : 'bg-gradient-to-r from-gray-500 to-gray-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">{eq.equipment_name}</h3>
                    <p className="text-white/80 text-xs">ID: {eq.equipment_id}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    loadingId === eq.equipment_id 
                      ? 'bg-yellow-400 animate-pulse' 
                      : eq.is_active 
                        ? 'bg-green-400 animate-pulse' 
                        : 'bg-gray-400'
                  }`}></div>
                </div>
              </div>
              <div className="p-3 sm:p-4 space-y-2.5">
                <div className="space-y-1 text-xs">
                  <p className="text-gray-600"><span className="font-semibold">Owner:</span> {eq.owner}</p>
                  <p className="text-gray-600 flex items-center gap-1"><MapPin size={12} /><span className="font-semibold">Location:</span> {eq.expected_location}</p>
                </div>
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-gray-700">Utilization</span>
                    <span className="text-xs font-bold text-blue-600">{(eq.utilization_percentage_8h || 0).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(eq.utilization_percentage_8h || 0, 100)}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`bg-orange-50 p-2 rounded-lg border border-orange-100 transition-all duration-300 ${
                    loadingId === eq.equipment_id ? 'bg-orange-100 border-orange-200' : ''
                  }`}>
                    <div className="flex items-center gap-1"><Zap size={11} className="text-orange-600" /><p className="text-xs text-gray-600">Power</p></div>
                    <p className="text-sm font-bold text-orange-600">{eq.is_active ? (eq.power_consumption || 0).toFixed(1) : '0'}W</p>
                  </div>
                  <div className={`bg-purple-50 p-2 rounded-lg border border-purple-100 transition-all duration-300 ${
                    loadingId === eq.equipment_id ? 'bg-purple-100 border-purple-200' : ''
                  }`}>
                    <div className="flex items-center gap-1"><Clock size={11} className="text-purple-600" /><p className="text-xs text-gray-600">Avg Power</p></div>
                    <p className="text-sm font-bold text-purple-600">{(eq.avg_power_8h || 0).toFixed(1)}W</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleViewDetails(eq.equipment_id)} 
                  disabled={loadingId !== null}
                  className={`w-full font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all duration-300 ${
                    loadingId === eq.equipment_id
                      ? 'bg-blue-700 text-white cursor-wait shadow-lg transform scale-[0.98]'
                      : loadingId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  {loadingId === eq.equipment_id ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      View Details <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Owner</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Location</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Power</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map(eq => (
                  <tr key={eq.equipment_id} className={`transition-all duration-300 ${
                    loadingId === eq.equipment_id 
                      ? 'bg-blue-50 ring-1 ring-blue-200' 
                      : 'hover:bg-gray-50'
                  } ${loadingId && loadingId !== eq.equipment_id ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-sm">{eq.equipment_name}</p>
                      <p className="text-xs text-gray-500">ID: {eq.equipment_id}</p>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 hidden sm:table-cell">{eq.owner}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 hidden md:table-cell">{eq.expected_location}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300 ${
                        loadingId === eq.equipment_id
                          ? 'bg-yellow-100 text-yellow-800'
                          : eq.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {loadingId === eq.equipment_id ? (
                          <>
                            <Loader2 size={10} className="animate-spin" />
                            Loading
                          </>
                        ) : (
                          eq.is_active ? 'Active' : 'Inactive'
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-blue-600">{(eq.utilization_percentage_8h || 0).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">{(eq.utilization_hours_8h || 0).toFixed(1)}h / 8h</p>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <p className="text-sm font-semibold text-orange-600">{eq.is_active ? (eq.power_consumption || 0).toFixed(1) : '0'}W</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <button 
                        onClick={() => handleViewDetails(eq.equipment_id)} 
                        disabled={loadingId !== null}
                        className={`font-medium text-sm transition-all duration-300 flex items-center gap-1 ${
                          loadingId === eq.equipment_id
                            ? 'text-blue-700 cursor-wait'
                            : loadingId
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        {loadingId === eq.equipment_id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Details'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-600">Showing {(currentPage-1)*ITEMS_PER_PAGE+1}-{Math.min(currentPage*ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(currentPage-1)} disabled={currentPage===1} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50"><ChevronLeft size={18} /></button>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
              <button key={p} onClick={() => onPageChange(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage===p?'bg-blue-600 text-white':'hover:bg-gray-200'}`}>{p}</button>
            ))}
            <button onClick={() => onPageChange(currentPage+1)} disabled={currentPage===totalPages} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {filteredData.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 text-lg font-medium">No equipment found</p>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}