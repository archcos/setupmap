import { ChevronDown, MapPin, Home } from 'lucide-react';
import { Link } from '@inertiajs/react';

export function Sidebar({ 
  sidebarCollapsed, 
  error, 
  equipmentsByProvince, 
  expandedProvince, 
  onToggleProvince, 
  onEquipmentClick 
}) {
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
                      onClick={() => onToggleProvince(province)}
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
                              onClick={() => onEquipmentClick(equipment)}
                              className="cursor-pointer bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-400 hover:bg-blue-50 transition"
                            >
                              <h3 className="font-semibold text-xs text-gray-800">{equipment.equipment_name}</h3>
                              <p className="text-xs text-gray-600 mt-1">Owner: {equipment.owner}</p>
                              {equipment.locations && equipment.locations.length > 0 ? (
                                <div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Last Update: 
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