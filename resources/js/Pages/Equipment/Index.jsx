import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, AlertCircle, Calendar, ChevronDown, Clock, Filter, TrendingUp, Zap } from 'lucide-react';
import { Head, router } from '@inertiajs/react';
import EquipmentHeader from './components/index/EquipmentHeader';
import EquipmentCharts from './components/index/EquipmentCharts';
import EquipmentList from './components/index/EquipmentList';
import { processGraphData } from './components/index/equipmentUtils';
import { getDateRange, getDateLabel } from './components/index/equipmentUtils';

const ITEMS_PER_PAGE = 10;

export default function Index() {
  const [allEquipmentData, setAllEquipmentData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [graphData, setGraphData] = useState({ utilization: [], power: [], isSingleDay: true });
  const [showDropdowns, setShowDropdowns] = useState({ day: false, month: false, year: false, week: false });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const fetchTimeout = useRef(null);

  const { startDate, endDate } = useMemo(() => getDateRange(dateFilter, selectedDate), [dateFilter, selectedDate]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      const response = await fetch(`/equipment-utilization?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      
      setGraphData(processGraphData(data, startDate, endDate));
      setAllEquipmentData(data);
      applyFilters(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [startDate, endDate]);

  const applyFilters = useCallback((data) => {
    let filtered = data;
    if (filterStatus === 'active') filtered = filtered.filter(e => e.is_active);
    else if (filterStatus === 'inactive') filtered = filtered.filter(e => !e.is_active);
    if (selectedLocation !== 'all') filtered = filtered.filter(e => e.expected_location === selectedLocation);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(e => 
        e.equipment_name?.toLowerCase().includes(term) ||
        e.equipment_id?.toString().toLowerCase().includes(term) ||
        e.owner?.toLowerCase().includes(term) ||
        e.expected_location?.toLowerCase().includes(term)
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [filterStatus, searchTerm, selectedLocation]);

  useEffect(() => { fetchData(true); }, []);
  useEffect(() => {
    if (isInitialLoad) return;
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    fetchTimeout.current = setTimeout(() => fetchData(true), 400);
    return () => { if (fetchTimeout.current) clearTimeout(fetchTimeout.current); };
  }, [dateFilter, selectedDate]);
  useEffect(() => {
    if (!isInitialLoad && allEquipmentData.length > 0) applyFilters(allEquipmentData);
  }, [filterStatus, searchTerm, selectedLocation]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const active = filteredData.filter(e => e.is_active).length;
    const avgUtil = total > 0 ? filteredData.reduce((s, e) => s + (e.utilization_percentage_8h || 0), 0) / total : 0;
    const totalHours = total > 0 ? filteredData.reduce((s, e) => s + (e.utilization_hours_8h || 0), 0) : 0;
    const activeEq = filteredData.filter(e => e.is_active);
    const avgPower = activeEq.length > 0 ? activeEq.reduce((s, e) => s + (e.power_consumption || 0), 0) / activeEq.length : 0;
    return { total, active, inactive: total - active, avgUtil, avgPower, totalHours };
  }, [filteredData]);

  const locations = useMemo(() => {
    const locs = new Set(allEquipmentData.map(e => e.expected_location).filter(Boolean));
    return ['all', ...Array.from(locs)];
  }, [allEquipmentData]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleViewDetails = useCallback((id) => router.visit(`/equipment/${id}/details`), []);

  if (loading && isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-red-600 font-semibold text-lg">Error: {error}</p>
          <button onClick={() => { setError(null); fetchData(true); }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Head title="Equipment Management"/>
      
      <EquipmentHeader 
        dateRangeLabel={getDateLabel(dateFilter, selectedDate)}
        allEquipmentData={allEquipmentData}
        filteredData={filteredData}
        filterStatus={filterStatus}
        selectedLocation={selectedLocation}
        dateFilter={dateFilter}
        selectedDate={selectedDate}
        loading={loading} // Pass loading state
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {loading && !isInitialLoad && (
          <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto"></div>
              <p className="text-sm text-gray-600 mt-3">Updating...</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {[
            { label: 'Total Equipment', value: stats.total, sub: `${stats.active} active · ${stats.inactive} inactive`, icon: Activity, color: 'text-gray-900' },
            { label: 'Avg Utilization', value: `${stats.avgUtil.toFixed(1)}%`, sub: '8h = 100%', icon: TrendingUp, color: 'text-blue-600' },
            { label: 'Total Active Hours', value: `${stats.totalHours.toFixed(1)}h`, sub: 'Combined', icon: Clock, color: 'text-green-600' },
            { label: 'Avg Power (Active)', value: `${stats.avgPower.toFixed(1)}W`, sub: 'Active only', icon: Zap, color: 'text-orange-600' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600 font-medium">{card.label}</p>
                <card.icon size={16} className="text-gray-400" />
              </div>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-500">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filter by Location</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {locations.map(loc => (
              <button key={loc} onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedLocation === loc ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {loc === 'all' ? 'All Locations' : loc}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 border border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {['day', 'week', 'month', 'year'].map(f => (
                <button key={f} onClick={() => { setDateFilter(f); setSelectedDate(new Date()); }}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm ${dateFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {dateFilter === 'day' && (
                <div className="relative">
                  <button onClick={() => setShowDropdowns(prev => ({ ...prev, day: !prev.day }))}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                    Day {selectedDate.getDate()}<ChevronDown size={12} />
                  </button>
                  {showDropdowns.day && (
                    <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-36">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <button key={d} onClick={() => { const nd = new Date(selectedDate); nd.setDate(d); setSelectedDate(nd); setShowDropdowns(prev => ({ ...prev, day: false })); }}
                          className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getDate() === d ? 'bg-blue-100 font-semibold' : ''}`}>{d}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(dateFilter === 'month') && (
                <>
                  <div className="relative">
                    <button onClick={() => setShowDropdowns(prev => ({ ...prev, month: !prev.month }))}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                      {new Date(selectedDate).toLocaleString('default', { month: 'short' })}<ChevronDown size={12} />
                    </button>
                    {showDropdowns.month && (
                      <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20">
                        {Array.from({ length: 12 }, (_, i) => new Date(2024, i).toLocaleString('default', { month: 'short' })).map((m, i) => (
                          <button key={i} onClick={() => { const nd = new Date(selectedDate); nd.setMonth(i); setSelectedDate(nd); setShowDropdowns(prev => ({ ...prev, month: false })); }}
                            className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getMonth() === i ? 'bg-blue-100 font-semibold' : ''}`}>{m}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={() => setShowDropdowns(prev => ({ ...prev, year: !prev.year }))}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                      {selectedDate.getFullYear()}<ChevronDown size={12} />
                    </button>
                    {showDropdowns.year && (
                      <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-32">
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                          <button key={y} onClick={() => { const nd = new Date(selectedDate); nd.setFullYear(y); setSelectedDate(nd); setShowDropdowns(prev => ({ ...prev, year: false })); }}
                            className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getFullYear() === y ? 'bg-blue-100 font-semibold' : ''}`}>{y}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {dateFilter === 'week' && (
                <>
                  <div className="relative">
                    <button onClick={() => setShowDropdowns(prev => ({ ...prev, week: !prev.week }))}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                      Week {Math.ceil((selectedDate.getTime() - new Date(selectedDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}<ChevronDown size={12} />
                    </button>
                    {showDropdowns.week && (
                      <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-36">
                        {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                          <button key={w} onClick={() => { const nd = new Date(selectedDate.getFullYear(), 0, 1 + (w-1) * 7); nd.setDate(nd.getDate() - nd.getDay() + 1); setSelectedDate(nd); setShowDropdowns(prev => ({ ...prev, week: false })); }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">Week {w}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={() => setShowDropdowns(prev => ({ ...prev, year: !prev.year }))}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                      {selectedDate.getFullYear()}<ChevronDown size={12} />
                    </button>
                    {showDropdowns.year && (
                      <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-32">
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                          <button key={y} onClick={() => { const nd = new Date(selectedDate); nd.setFullYear(y); setSelectedDate(nd); setShowDropdowns(prev => ({ ...prev, year: false })); }}
                            className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getFullYear() === y ? 'bg-blue-100 font-semibold' : ''}`}>{y}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {dateFilter === 'year' && (
                <div className="relative">
                  <button onClick={() => setShowDropdowns(prev => ({ ...prev, year: !prev.year }))}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                    {selectedDate.getFullYear()}<ChevronDown size={12} />
                  </button>
                  {showDropdowns.year && (
                    <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-32">
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                        <button key={y} onClick={() => { const nd = new Date(selectedDate); nd.setFullYear(y); setSelectedDate(nd); setShowDropdowns(prev => ({ ...prev, year: false })); }}
                          className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getFullYear() === y ? 'bg-blue-100 font-semibold' : ''}`}>{y}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm">Today</button>
            </div>
          </div>
        </div>

        {/* Charts */}
        <EquipmentCharts graphData={graphData} />

        {/* Equipment List */}
        <EquipmentList
          filteredData={filteredData}
          paginatedData={paginatedData}
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          allEquipmentData={allEquipmentData}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
          onViewDetails={handleViewDetails}
        />
      </div>
    </div>
  );
}