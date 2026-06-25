import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, AlertCircle, Calendar, ChevronDown, Clock, Filter, TrendingUp, Zap, Search, LayoutGrid, List, BarChart3 } from 'lucide-react';
import { Head, router } from '@inertiajs/react';
import EquipmentHeader from './components/index/EquipmentHeader';
import EquipmentCharts from './components/index/EquipmentCharts';
import EquipmentList from './components/index/EquipmentList';
import { processGraphData, getDateRange, getDateLabel } from './components/index/equipmentUtils';

const ITEMS_PER_PAGE = 10;

// Skeleton Components
const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-3 bg-gray-200 rounded w-24"></div>
      <div className="h-4 w-4 bg-gray-200 rounded"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-16 mt-2"></div>
    <div className="h-3 bg-gray-200 rounded w-20 mt-1"></div>
  </div>
);

const SkeletonChart = () => (
  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="flex items-end gap-2 h-[250px]">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${Math.random() * 60 + 40}%` }}></div>
        ))}
      </div>
    </div>
  </div>
);

const SkeletonGridCard = () => (
  <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden animate-pulse">
    <div className="p-3 sm:p-4 bg-gray-200">
      <div className="space-y-2">
        <div className="h-5 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/3"></div>
      </div>
    </div>
    <div className="p-3 sm:p-4 space-y-3">
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full"></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-100 p-2 rounded-lg">
          <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="bg-gray-100 p-2 rounded-lg">
          <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      <div className="h-10 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

const SkeletonListRow = () => (
  <tr className="animate-pulse">
    <td className="px-3 py-2.5">
      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-3 py-2.5 hidden sm:table-cell">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-3 py-2.5 hidden md:table-cell">
      <div className="h-4 bg-gray-200 rounded w-28"></div>
    </td>
    <td className="px-3 py-2.5">
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </td>
    <td className="px-3 py-2.5">
      <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-3 py-2.5 hidden lg:table-cell">
      <div className="h-4 bg-gray-200 rounded w-12"></div>
    </td>
    <td className="px-3 py-2.5">
      <div className="h-4 bg-gray-200 rounded w-12"></div>
    </td>
  </tr>
);

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
  const [graphData, setGraphData] = useState({ 
    utilizationPeriods: [], 
    powerData: [], 
    dateFilter: 'month',
    isDayView: false,
    isMonthOrWeekView: true,
    isYearView: false,
    summaryStats: { 
      avgUtilization: 0, 
      avgPower: 0, 
      activeEquipmentCount: 0, 
      inactiveEquipmentCount: 0, 
      totalEquipmentCount: 0,
      totalActiveHours: 0,
      averageActiveHoursPerEquipment: 0
    },
    startTime: new Date().getTime(),
    endTime: new Date().getTime()
  });
  const [showDropdowns, setShowDropdowns] = useState({ day: false, month: false, year: false, week: false });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const fetchTimeout = useRef(null);

  const { startDate, endDate } = useMemo(() => 
    getDateRange(dateFilter, selectedDate, customDateRange), 
    [dateFilter, selectedDate, customDateRange]
  );

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

  // Calculate graph data based on filtered data
  useEffect(() => {
    if (filteredData.length > 0) {
      setGraphData(processGraphData(filteredData, startDate, endDate, dateFilter, includeInactive));
    } else if (allEquipmentData.length > 0) {
      setGraphData({ 
        utilization: [], 
        power: [], 
        isSingleDay: dateFilter === 'day',
        dateFilter,
        summaryStats: { avgUtilization: 0, avgPower: 0, activeEquipmentCount: 0, inactiveEquipmentCount: 0, totalEquipmentCount: 0 }
      });
    }
  }, [filteredData, startDate, endDate, dateFilter, includeInactive]);

  useEffect(() => { fetchData(true); }, []);
  useEffect(() => {
    if (isInitialLoad) return;
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    fetchTimeout.current = setTimeout(() => fetchData(true), 400);
    return () => { if (fetchTimeout.current) clearTimeout(fetchTimeout.current); };
  }, [dateFilter, selectedDate, customDateRange]);
  useEffect(() => {
    if (!isInitialLoad && allEquipmentData.length > 0) applyFilters(allEquipmentData);
  }, [filterStatus, searchTerm, selectedLocation]);

  // Calculate peak utilization from filtered data
  const peakUtilization = useMemo(() => {
    if (filteredData.length === 0) return { value: 0, equipment: null };
    
    let maxUtil = 0;
    let maxEquipment = null;
    
    filteredData.forEach(e => {
      const util = e.utilization_percentage_8h || 0;
      if (util > maxUtil) {
        maxUtil = util;
        maxEquipment = e;
      }
    });
    
    return { value: maxUtil, equipment: maxEquipment };
  }, [filteredData]);

  // Calculate total days for custom range
  const totalDays = useMemo(() => {
    return Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate]);

  // Enhanced stats with period description
  const stats = useMemo(() => {
    const total = filteredData.length;
    const avgUtil = graphData.summaryStats?.avgUtilization || 0;
    const avgPower = graphData.summaryStats?.avgPower || 0;
    const activeCount = graphData.summaryStats?.activeEquipmentCount || 0;
    const inactiveCount = graphData.summaryStats?.inactiveEquipmentCount || 0;
    const totalHours = graphData.summaryStats?.totalActiveHours || 0;
    
    // Generate dynamic period description
    let periodDescription = '';
    let periodSubtext = '';
    let utilizationLabel = '';
    let powerLabel = '';
    
    switch(dateFilter) {
      case 'day':
        periodDescription = selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
        periodSubtext = 'Hourly averages';
        utilizationLabel = 'Hourly Avg Utilization';
        powerLabel = 'Hourly Avg Power';
        break;
      case 'week':
        const weekStart = new Date(startDate);
        const weekEnd = new Date(endDate);
        periodDescription = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        periodSubtext = 'Daily averages';
        utilizationLabel = 'Daily Avg Utilization';
        powerLabel = 'Daily Avg Power';
        break;
      case 'month':
        periodDescription = selectedDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        periodSubtext = 'Daily averages';
        utilizationLabel = 'Daily Avg Utilization';
        powerLabel = 'Daily Avg Power';
        break;
      case 'year':
        periodDescription = selectedDate.getFullYear().toString();
        periodSubtext = 'Monthly averages';
        utilizationLabel = 'Monthly Avg Utilization';
        powerLabel = 'Monthly Avg Power';
        break;
      case 'custom':
        if (totalDays === 1) {
          periodDescription = getDateLabel('custom', selectedDate, customDateRange);
          periodSubtext = 'Hourly averages';
          utilizationLabel = 'Hourly Avg Utilization';
          powerLabel = 'Hourly Avg Power';
        } else if (totalDays > 365) {
          periodDescription = getDateLabel('custom', selectedDate, customDateRange);
          periodSubtext = 'Monthly averages';
          utilizationLabel = 'Monthly Avg Utilization';
          powerLabel = 'Monthly Avg Power';
        } else {
          periodDescription = getDateLabel('custom', selectedDate, customDateRange);
          periodSubtext = 'Daily averages';
          utilizationLabel = 'Daily Avg Utilization';
          powerLabel = 'Daily Avg Power';
        }
        break;
    }
    
    return { 
      total, 
      active: activeCount, 
      inactive: inactiveCount, 
      avgUtil, 
      avgPower, 
      totalHours, 
      periodDescription,
      periodSubtext,
      utilizationLabel,
      powerLabel
    };
  }, [filteredData, graphData, dateFilter, selectedDate, startDate, endDate, customDateRange, totalDays]);

  const locations = useMemo(() => {
    const locs = new Set(allEquipmentData.map(e => e.expected_location).filter(Boolean));
    return ['all', ...Array.from(locs)];
  }, [allEquipmentData]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleViewDetails = useCallback((id) => router.visit(`/equipment/details/${id}`), []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-red-600 font-semibold text-lg">Error: {error}</p>
          <button onClick={() => { setError(null); fetchData(true); }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Head title="Equipment Management"/>
      
      <EquipmentHeader 
        dateRangeLabel={getDateLabel(dateFilter, selectedDate, customDateRange)}
        allEquipmentData={allEquipmentData}
        filteredData={filteredData}
        filterStatus={filterStatus}
        selectedLocation={selectedLocation}
        dateFilter={dateFilter}
        selectedDate={selectedDate}
        loading={loading}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Summary Cards */}
        <div className="mb-4">
          {/* Period indicator */}
          {!loading && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <Calendar size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Showing data for: <span className="text-blue-600 font-semibold">{stats.periodDescription}</span>
                <span className="text-gray-500 font-normal ml-2">({stats.periodSubtext})</span>
              </span>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {loading && allEquipmentData.length === 0 ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                {/* Total Equipment Card */}
                <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-medium">Total Equipment</p>
                    <Activity size={16} className="text-gray-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1 text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500">{stats.active} with data · {stats.inactive} no data</p>
                </div>

                {/* Average Utilization Card */}
                <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-medium">{stats.utilizationLabel}</p>
                    <TrendingUp size={16} className="text-gray-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1 text-blue-600">{stats.avgUtil.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{stats.periodSubtext}</p>
                </div>

                {/* Peak Utilization Card */}
                <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-medium">Peak Utilization</p>
                    <BarChart3 size={16} className="text-gray-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1 text-purple-600">{peakUtilization.value.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 truncate" title={peakUtilization.equipment?.equipment_name}>
                    {peakUtilization.equipment ? peakUtilization.equipment.equipment_name : 'N/A'}
                  </p>
                </div>

                {/* Total Active Hours Card */}
                <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-medium">Total Active Hours</p>
                    <Clock size={16} className="text-gray-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1 text-green-600">{stats.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-gray-500">Combined all equipment</p>
                </div>

                {/* Average Power Card */}
                <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 font-medium">{stats.powerLabel}</p>
                    <Zap size={16} className="text-gray-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-1 text-orange-600">{stats.avgPower.toFixed(1)}W</p>
                  <p className="text-xs text-gray-500">Active equipment only</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filter by Location</h3>
            {selectedLocation !== 'all' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Filtered: {selectedLocation}
              </span>
            )}
          </div>
          {loading && allEquipmentData.length === 0 ? (
            <div className="flex gap-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse" style={{ width: `${Math.random() * 40 + 80}px` }}></div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {locations.map(loc => (
                <button 
                  key={loc} 
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedLocation === loc 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {loc === 'all' ? 'All Locations' : loc}
                  {loc !== 'all' && (
                    <span className="ml-1 text-xs opacity-75">
                      ({allEquipmentData.filter(e => e.expected_location === loc).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 border border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {['day', 'week', 'month', 'year', 'custom'].map(f => (
                <button 
                  key={f} 
                  onClick={() => { 
                    setDateFilter(f); 
                    if (f !== 'custom') {
                      setSelectedDate(new Date());
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                    dateFilter === f 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'custom' ? 'Custom' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Non-custom date pickers */}
              {dateFilter !== 'custom' && (
                <>
                  {dateFilter === 'day' && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowDropdowns(prev => ({ ...prev, day: !prev.day }))}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1"
                      >
                        Day {selectedDate.getDate()}
                        <ChevronDown size={12} />
                      </button>
                      {showDropdowns.day && (
                        <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-36">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <button 
                              key={d} 
                              onClick={() => { 
                                const nd = new Date(selectedDate); 
                                nd.setDate(d); 
                                setSelectedDate(nd); 
                                setShowDropdowns(prev => ({ ...prev, day: false })); 
                              }}
                              className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${
                                selectedDate.getDate() === d ? 'bg-blue-100 font-semibold' : ''
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(dateFilter === 'month') && (
                    <>
                      <div className="relative">
                        <button 
                          onClick={() => setShowDropdowns(prev => ({ ...prev, month: !prev.month }))}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1"
                        >
                          {new Date(selectedDate).toLocaleString('default', { month: 'short' })}
                          <ChevronDown size={12} />
                        </button>
                        {showDropdowns.month && (
                          <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20">
                            {Array.from({ length: 12 }, (_, i) => 
                              new Date(2024, i).toLocaleString('default', { month: 'short' })
                            ).map((m, i) => (
                              <button 
                                key={i} 
                                onClick={() => { 
                                  const nd = new Date(selectedDate); 
                                  nd.setMonth(i); 
                                  setSelectedDate(nd); 
                                  setShowDropdowns(prev => ({ ...prev, month: false })); 
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${
                                  selectedDate.getMonth() === i ? 'bg-blue-100 font-semibold' : ''
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setShowDropdowns(prev => ({ ...prev, year: !prev.year }))}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1"
                        >
                          {selectedDate.getFullYear()}
                          <ChevronDown size={12} />
                        </button>
                        {showDropdowns.year && (
                          <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-32">
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                              <button 
                                key={y} 
                                onClick={() => { 
                                  const nd = new Date(selectedDate); 
                                  nd.setFullYear(y); 
                                  setSelectedDate(nd); 
                                  setShowDropdowns(prev => ({ ...prev, year: false })); 
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${
                                  selectedDate.getFullYear() === y ? 'bg-blue-100 font-semibold' : ''
                                }`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {dateFilter === 'week' && (
                    <>
                      <div className="relative">
                        <button 
                          onClick={() => setShowDropdowns(prev => ({ ...prev, week: !prev.week }))}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1"
                        >
                          Week {Math.ceil((selectedDate.getTime() - new Date(selectedDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}
                          <ChevronDown size={12} />
                        </button>
                        {showDropdowns.week && (
                          <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-36">
                            {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                              <button 
                                key={w} 
                                onClick={() => { 
                                  const nd = new Date(selectedDate.getFullYear(), 0, 1 + (w-1) * 7); 
                                  nd.setDate(nd.getDate() - nd.getDay() + 1); 
                                  setSelectedDate(nd); 
                                  setShowDropdowns(prev => ({ ...prev, week: false })); 
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                              >
                                Week {w}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setShowDropdowns(prev => ({ ...prev, year: !prev.year }))}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1"
                        >
                          {selectedDate.getFullYear()}
                          <ChevronDown size={12} />
                        </button>
                        {showDropdowns.year && (
                          <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-32">
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                              <button 
                                key={y} 
                                onClick={() => { 
                                  const nd = new Date(selectedDate); 
                                  nd.setFullYear(y); 
                                  setSelectedDate(nd); 
                                  setShowDropdowns(prev => ({ ...prev, year: false })); 
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${
                                  selectedDate.getFullYear() === y ? 'bg-blue-100 font-semibold' : ''
                                }`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {dateFilter === 'year' && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowDropdowns(prev => ({ ...prev, year: !prev.year }))}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1"
                      >
                        {selectedDate.getFullYear()}
                        <ChevronDown size={12} />
                      </button>
                      {showDropdowns.year && (
                        <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-32">
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                            <button 
                              key={y} 
                              onClick={() => { 
                                const nd = new Date(selectedDate); 
                                nd.setFullYear(y); 
                                setSelectedDate(nd); 
                                setShowDropdowns(prev => ({ ...prev, year: false })); 
                              }}
                              className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${
                                selectedDate.getFullYear() === y ? 'bg-blue-100 font-semibold' : ''
                              }`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Custom date range picker */}
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium">From:</label>
                    <input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange(prev => ({ 
                        ...prev, 
                        startDate: e.target.value 
                      }))}
                      max={customDateRange.endDate}
                      className="px-2 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium">To:</label>
                    <input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange(prev => ({ 
                        ...prev, 
                        endDate: e.target.value 
                      }))}
                      min={customDateRange.startDate}
                      className="px-2 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  
                  {/* Quick select buttons for custom range */}
                  <div className="flex gap-1 ml-2">
                    {[
                      { label: '7D', days: 7 },
                      { label: '30D', days: 30 },
                      { label: '90D', days: 90 },
                    ].map(quick => (
                      <button
                        key={quick.label}
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(start.getDate() - quick.days);
                          setCustomDateRange({
                            startDate: start.toISOString().split('T')[0],
                            endDate: end.toISOString().split('T')[0]
                          });
                        }}
                        className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {quick.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  setSelectedDate(new Date());
                  setCustomDateRange({
                    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  });
                }} 
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                Today
              </button>
            </div>
          </div>
          
          {/* Show custom range info */}
          {dateFilter === 'custom' && (
            <div className="mt-3 text-sm text-gray-600 bg-blue-50 rounded-lg p-2">
              <span className="font-medium">Selected Range:</span>{' '}
              {getDateLabel('custom', selectedDate, customDateRange)}
              <span className="ml-2 text-gray-500">
                ({totalDays} {totalDays === 1 ? 'day' : 'days'})
              </span>
            </div>
          )}
        </div>

        {/* Include inactive checkbox */}
        <div className="flex items-center gap-2 mb-4 ml-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 font-medium">Include inactive equipment in averages</span>
          </label>
          <div className="relative group">
            <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-64 pointer-events-none z-50">
              When checked, equipment without data in the selected period will be counted as 0% utilization, lowering the average. When unchecked, only equipment with data is included in the average.
            </div>
          </div>
        </div>

        {/* Charts */}
        {loading && allEquipmentData.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        ) : (
          <EquipmentCharts graphData={graphData} />
        )}

        {/* Equipment List */}
        {loading && allEquipmentData.length === 0 ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse" style={{ width: `${Math.random() * 30 + 80}px` }}></div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-9 bg-gray-200 rounded-lg animate-pulse w-32 sm:w-48"></div>
                <div className="h-9 bg-gray-200 rounded-lg animate-pulse w-16"></div>
              </div>
            </div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => <SkeletonGridCard key={i} />)}
              </div>
            ) : (
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
                      {[...Array(8)].map((_, i) => <SkeletonListRow key={i} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}