import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, Activity, Zap, MapPin, Clock, User, AlertCircle, 
  Calendar, TrendingUp, RefreshCw, Loader, Cpu, Info
} from 'lucide-react';
import { Head, router } from '@inertiajs/react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ExportDropdown from './components/ExportDropdown';
import { processHistoryData } from './components/details/dataProcessor';
import { formatDateRangeLabel, getStartOfDay, getEndOfDay } from './components/details/dateUtils';

// Skeleton Components
const SkeletonStatCard = () => (
  <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-3 bg-gray-200 rounded w-24"></div>
      <div className="h-4 w-4 bg-gray-200 rounded"></div>
    </div>
    <div className="h-6 bg-gray-200 rounded w-16 mt-2"></div>
    <div className="h-3 bg-gray-200 rounded w-20 mt-1"></div>
  </div>
);

const SkeletonInfoCard = () => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
    <div className="h-4 w-4 bg-gray-200 rounded mt-0.5"></div>
    <div className="flex-1">
      <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
);

const SkeletonStatusCard = () => (
  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-gray-200 rounded w-28"></div>
      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
    </div>
  </div>
);

const SkeletonChart = () => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="flex items-end gap-2 h-[350px]">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
        ))}
      </div>
    </div>
  </div>
);

export default function EquipmentDetails({ equipment: initialEquipment }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [equipment, setEquipment] = useState(initialEquipment);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [utilizationData, setUtilizationData] = useState([]);
  const [powerData, setPowerData] = useState([]);
  const [stats, setStats] = useState({
    avgUtilization: 0,
    peakPower: 0,
    peakUtilization: 0,
    avgPowerPerDay: 0,
    totalDays: 0
  });
  const [dateRangeLabel, setDateRangeLabel] = useState('');
  const [isSingleDay, setIsSingleDay] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const abortControllerRef = useRef(null);

  // Calculate derived stats
  const avgHoursPerDay = (stats.avgUtilization / 100) * 8;
  const peakHours = (stats.peakUtilization / 100) * 8;

  // Handle back navigation using browser history
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.visit('/map');
    }
  };

  const fetchEquipmentData = useCallback(async (start, end) => {
    if (!equipment?.equipment_id) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/equipment/${equipment.equipment_id}?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`,
        { signal: controller.signal }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
        
        const processed = processHistoryData(data, start, end);
        setUtilizationData(processed.utilization);
        setPowerData(processed.power);
        setStats(processed.stats);
        setIsSingleDay(processed.isSingleDay);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [equipment?.equipment_id]);

  // Process initial data from page load
  const processInitialData = useCallback(() => {
    if (!equipment || !isInitialLoad) return;
    
    const now = new Date();
    const start = getStartOfDay(now);
    const end = getEndOfDay(now);
    setDateRangeLabel(formatDateRangeLabel(now, now, true));
    
    // Check if we already have the needed data from the page load
    if (equipment.power_consumptions && equipment.utilizations) {
      const processed = processHistoryData(equipment, start, end);
      setUtilizationData(processed.utilization);
      setPowerData(processed.power);
      setStats(processed.stats);
      setIsSingleDay(processed.isSingleDay);
      setIsInitialLoad(false);
      setLoading(false);
    } else {
      // Fallback to API fetch if data wasn't included in page load
      fetchEquipmentData(start, end).then(() => {
        setIsInitialLoad(false);
      });
    }
  }, [equipment, isInitialLoad, fetchEquipmentData]);

  const handleQuickRange = useCallback((days) => {
    const end = new Date();
    const endStr = getEndOfDay(end);
    
    const start = new Date();
    if (days === 0) {
      const startStr = getStartOfDay(start);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setDateRangeLabel(formatDateRangeLabel(start, end, true));
      fetchEquipmentData(startStr, endStr);
    } else {
      start.setDate(start.getDate() - days);
      const startStr = getStartOfDay(start);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setDateRangeLabel(formatDateRangeLabel(start, end, false));
      fetchEquipmentData(startStr, endStr);
    }
  }, [fetchEquipmentData]);

  const handleCustomDateRange = useCallback(() => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    const start = getStartOfDay(startDate);
    const end = getEndOfDay(endDate);
    
    const formattedStart = new Date(startDate);
    const formattedEnd = new Date(endDate);
    const daysDiff = Math.ceil((formattedEnd - formattedStart) / (1000 * 60 * 60 * 24));
    
    setDateRangeLabel(formatDateRangeLabel(formattedStart, formattedEnd, daysDiff === 1));
    setShowCustomDatePicker(false);
    fetchEquipmentData(start, end);
  }, [startDate, endDate, fetchEquipmentData]);

  // Process initial data on mount
  useEffect(() => {
    processInitialData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Only run once on mount

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-red-600 font-semibold text-lg">Equipment not found</p>
          <button
            onClick={handleGoBack}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Head title={`${equipment.equipment_name} - Equipment Details`} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
                title="Go back to previous page"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div>
                {loading && isInitialLoad ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{equipment.equipment_name}</h1>
                    <p className="text-sm text-gray-500">ID: {equipment.equipment_id}</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {loading && isInitialLoad ? (
                <div className="h-8 bg-gray-200 rounded-full w-24 animate-pulse"></div>
              ) : (
                <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                  equipment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                    equipment.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></span>
                  {equipment.is_active ? 'Active' : 'Inactive'}
                </div>
              )}
              
              <ExportDropdown 
                equipment={equipment}
                utilizationData={utilizationData}
                powerData={powerData}
                stats={stats}
                dateRangeLabel={dateRangeLabel}
                loading={loading}
                includeCharts={true}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {loading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 font-medium">Avg Utilization</p>
                  <Activity size={16} className="text-blue-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{stats.avgUtilization.toFixed(2)}%</p>
                <p className="text-xs text-gray-500">Across {stats.totalDays} days</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 font-medium">Peak Utilization</p>
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-green-600 mt-1">{stats.peakUtilization.toFixed(2)}%</p>
                <p className="text-xs text-gray-500">Highest recorded</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 font-medium">Peak Hours</p>
                  <Clock size={16} className="text-red-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-red-600 mt-1">{peakHours.toFixed(2)}h</p>
                <p className="text-xs text-gray-500">{stats.peakUtilization.toFixed(2)}% of 8h</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 font-medium">Avg Hours/Day</p>
                  <Clock size={16} className="text-purple-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-purple-600 mt-1">{avgHoursPerDay.toFixed(2)}h</p>
                <p className="text-xs text-gray-500">Of 8h expected per day</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 font-medium">Avg Power/Day</p>
                  <Zap size={16} className="text-orange-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-orange-600 mt-1">{stats.avgPowerPerDay.toFixed(2)}W</p>
                <p className="text-xs text-gray-500">Across {stats.totalDays} days</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 font-medium">Peak Power</p>
                  <Zap size={16} className="text-orange-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-orange-600 mt-1">{stats.peakPower.toFixed(2)}W</p>
                <p className="text-xs text-gray-500">Highest recorded</p>
              </div>
            </>
          )}
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Calendar size={20} className="text-blue-600" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Time Range</h2>
            {loading ? (
              <div className="h-4 bg-gray-200 rounded w-32 ml-auto animate-pulse"></div>
            ) : (
              <span className="text-sm text-gray-500 ml-auto">{dateRangeLabel}</span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleQuickRange(0)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors text-sm disabled:opacity-50">Today</button>
            <button onClick={() => handleQuickRange(7)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors text-sm disabled:opacity-50">Last 7 Days</button>
            <button onClick={() => handleQuickRange(30)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors text-sm disabled:opacity-50">Last 30 Days</button>
            <button onClick={() => handleQuickRange(90)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors text-sm disabled:opacity-50">Last 90 Days</button>
            <button onClick={() => setShowCustomDatePicker(!showCustomDatePicker)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm disabled:opacity-50">Custom</button>
            <button onClick={() => {
              const now = new Date();
              const start = getStartOfDay(now);
              const end = getEndOfDay(now);
              setDateRangeLabel(formatDateRangeLabel(now, now, true));
              fetchEquipmentData(start, end);
            }} disabled={loading} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm ml-auto disabled:opacity-50">
              {loading ? (
                <Loader size={14} className="inline mr-1 animate-spin" />
              ) : (
                <RefreshCw size={14} className="inline mr-1" />
              )}
              Refresh
            </button>
          </div>

          {showCustomDatePicker && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <button onClick={handleCustomDateRange} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2">
                  {loading && <Loader size={14} className="animate-spin" />}
                  {loading ? 'Loading...' : 'Apply'}
                </button>
                <button onClick={() => setShowCustomDatePicker(false)} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {['overview', 'utilization', 'power'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} disabled={loading} className={`px-4 sm:px-6 py-2.5 sm:py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm disabled:opacity-50 ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          /* Skeleton Loading for Tabs */
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <>
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <div className="h-5 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SkeletonInfoCard />
                    <SkeletonInfoCard />
                    <SkeletonInfoCard />
                    <SkeletonInfoCard />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SkeletonStatusCard />
                    <SkeletonStatusCard />
                    <SkeletonStatusCard />
                    <SkeletonStatusCard />
                  </div>
                </div>
              </>
            )}
            {activeTab === 'utilization' && (
              <>
                <SkeletonChart />
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {activeTab === 'power' && (
              <>
                <SkeletonChart />
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Equipment Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Cpu className="text-gray-400 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Equipment Name</p>
                        <p className="text-base font-semibold text-gray-900">{equipment.equipment_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Info className="text-gray-400 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Specifications</p>
                        <p className="text-base font-semibold text-gray-900">{equipment.equipment_specifications || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="text-gray-400 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Owner</p>
                        <p className="text-base font-semibold text-gray-900">{equipment.owner}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="text-gray-400 mt-0.5" size={18} />
                      <div>
                        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Expected Location</p>
                        <p className="text-base font-semibold text-gray-900">{equipment.expected_location}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Status</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">Current Status</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          equipment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {equipment.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="text-orange-600" size={20} />
                          <span className="text-gray-700 font-medium">Current Power</span>
                        </div>
                        <span className="text-2xl font-bold text-orange-600">
                          {equipment.is_active ? `${(equipment.power_consumption || 0).toFixed(2)}W` : '0W'}
                        </span>
                      </div>
                      {!equipment.is_active && <p className="text-xs text-gray-500 mt-2">Equipment is currently inactive</p>}
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="text-green-600" size={20} />
                          <span className="text-gray-700 font-medium">Today's Utilization</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">{stats.avgUtilization.toFixed(2)}%</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="text-purple-600" size={20} />
                          <span className="text-gray-700 font-medium">Last Updated</span>
                        </div>
                        <span className="text-sm font-semibold text-purple-600">
                          {new Date(equipment.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'utilization' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    {isSingleDay ? 'Hourly Utilization' : 'Daily Average Utilization'}
                  </h2>
                  {utilizationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={utilizationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time"
                          label={{ value: isSingleDay ? 'Hour of Day' : 'Date', position: 'insideBottom', offset: -5 }}
                          angle={!isSingleDay ? -45 : 0}
                          textAnchor={!isSingleDay ? "end" : "middle"}
                          height={60}
                        />
                        <YAxis domain={[0, 100]} label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} labelFormatter={(label) => {
                          const dataPoint = utilizationData.find(d => d.time === label);
                          return dataPoint?.fullDate || label;
                        }} />
                        <Legend />
                        <Bar dataKey="utilization" name="Utilization %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No utilization data available for selected period</div>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Utilization Summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 font-medium">Average Utilization</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{stats.avgUtilization.toFixed(2)}%</p>
                      <p className="text-xs text-gray-500">Over {stats.totalDays} days (8h = 100%)</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 font-medium">Peak Utilization</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{stats.peakUtilization.toFixed(2)}%</p>
                      <p className="text-xs text-gray-500">Highest {isSingleDay ? 'hourly' : 'daily'} rate</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 font-medium">Avg Hours/Day</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{avgHoursPerDay.toFixed(2)}h</p>
                      <p className="text-xs text-gray-500">Of 8h expected per day</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600 font-medium">Peak Hours</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{peakHours.toFixed(2)}h</p>
                      <p className="text-xs text-gray-500">{stats.peakUtilization.toFixed(2)}% of 8h</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'power' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    {isSingleDay ? 'Hourly Power Consumption' : 'Daily Average Power Consumption'}
                  </h2>
                  {powerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={powerData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time"
                          label={{ value: isSingleDay ? 'Hour of Day' : 'Date', position: 'insideBottom', offset: -5 }}
                          angle={!isSingleDay ? -45 : 0}
                          textAnchor={!isSingleDay ? "end" : "middle"}
                          height={60}
                        />
                        <YAxis label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value}W`, 'Power']} labelFormatter={(label) => {
                          const dataPoint = powerData.find(d => d.time === label);
                          return dataPoint?.fullDate || label;
                        }} />
                        <Legend />
                        <Line type="monotone" dataKey="power" name="Power (W)" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {equipment.is_active ? 'No power data available' : 'Equipment is currently inactive'}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Power Summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-gray-600 font-medium">Current Power</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">
                        {equipment.is_active ? `${(equipment.power_consumption || 0).toFixed(2)}W` : '0W'}
                      </p>
                      <p className="text-xs text-gray-500">{equipment.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600 font-medium">Peak Power</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{stats.peakPower.toFixed(2)}W</p>
                      <p className="text-xs text-gray-500">Highest recorded</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 font-medium">Avg Power/Day</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{stats.avgPowerPerDay.toFixed(2)}W</p>
                      <p className="text-xs text-gray-500">Over {stats.totalDays} days</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 font-medium">Avg Hours/Day</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{avgHoursPerDay.toFixed(2)}h</p>
                      <p className="text-xs text-gray-500">Of 8h expected per day</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}