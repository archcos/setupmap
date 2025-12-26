import { ChevronDown } from 'lucide-react';

export default function Sidebar({
  isOpen,
  loading,
  error,
  provinces,
  selectedProvince,
  selectedProvinceData,
  selectedCities,
  citiesLoading,
  expandedCity,
  onProvinceClick,
  onCityExpand,
}) {
  return (
    <aside className={`fixed lg:static top-16 left-0 w-full sm:w-96 lg:w-80 h-[calc(100vh-4rem)] lg:h-full shrink-0 bg-white border-b lg:border-b-0 lg:border-r overflow-y-auto transition-all duration-300 z-40 ${
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`}>
      <div className="p-3 sm:p-5">
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
            {/* Provinces List */}
            <div className="mb-6">
              <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                Provinces
              </h2>
              <div className="space-y-2">
                {Object.entries(provinces).map(([name]) => (
                  <button
                    key={name}
                    onClick={() => onProvinceClick(name)}
                    className={`w-full py-2 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium rounded-lg transition-all ${
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

            {/* Province Details Section */}
            {selectedProvinceData && (
              <div className="pt-4 border-t space-y-4">
                {/* Province Info */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Province Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">Capital</p>
                      <p className="font-semibold text-gray-800">{selectedProvinceData.capital}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">Area (km²)</p>
                      <p className="font-semibold text-gray-800 text-xs">{selectedProvinceData.area}</p>
                    </div>
                  </div>
                </div>

                {/* Cities Section */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                    {citiesLoading ? 'Loading Cities...' : 'Cities & Municipalities'}
                  </h3>
                  
                  {Object.keys(selectedCities).length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(selectedCities).map(([cityName, cityData]) => (
                        <div key={cityName} className="bg-gray-50 rounded-lg">
                          <button
                            onClick={() => onCityExpand(selectedProvince, cityName)}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition"
                          >
                            <span className="text-xs font-semibold text-gray-800">{cityName}</span>
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${
                                expandedCity === `${selectedProvince}-${cityName}` ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {expandedCity === `${selectedProvince}-${cityName}` && (
                            <div className="border-t bg-white p-3">
                              {cityData.barangays.length > 0 ? (
                                <ul className="space-y-1">
                                  {cityData.barangays.map((barangay) => (
                                    <li key={barangay} className="text-xs text-gray-600 ml-2 before:content-['•'] before:mr-2">
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

            {!selectedProvinceData && (
              <div className="pt-4 border-t text-center text-gray-500 text-sm">
                <p>Select a province to view details</p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}