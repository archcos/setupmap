import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { ArrowRight, Activity, Zap, AlertCircle, MapPin, Calendar, ChevronDown, ArrowLeft } from 'lucide-react';
import {Head} from '@inertiajs/react';

export default function EquipmentPage() {
  const [allEquipmentData, setAllEquipmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [locationStats, setLocationStats] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [dateFilter, setDateFilter] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);

  // Fetch data when date filter or selected date changes with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { startDate, endDate } = getDateRange();
        const params = new URLSearchParams({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });
        const response = await fetch(`/equipment-utilization?${params}`);
        if (!response.ok) throw new Error('Failed to fetch equipment data');
        const data = await response.json();
        setAllEquipmentData(data);
        processLocationData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [dateFilter, selectedDate]);

  const getDateRange = () => {
    const now = new Date(selectedDate);
    let startDate, endDate;

    switch (dateFilter) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        const currentDay = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - currentDay);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
    }

    return { startDate, endDate };
  };

  const getDateLabel = () => {
    const now = new Date(selectedDate);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    switch (dateFilter) {
      case 'day':
        return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
      case 'month':
        return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
      case 'year':
        return now.getFullYear().toString();
      default:
        return '';
    }
  };

  const handleDaySelect = (day) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
    setShowDayDropdown(false);
  };

  const handleMonthSelect = (month) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(month);
    setSelectedDate(newDate);
    setShowMonthDropdown(false);
  };

  const handleYearSelect = (year) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
    setShowYearDropdown(false);
  };

  const handleWeekSelect = (weekNum) => {
    const year = selectedDate.getFullYear();
    const simple = new Date(year, 0, 1 + (weekNum - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    ISOweekStart.setDate(simple.getDate() - dow + 1);
    setSelectedDate(ISOweekStart);
    setShowWeekDropdown(false);
  };

  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getWeeksInYear = () => {
    const year = selectedDate.getFullYear();
    const lastDay = new Date(year, 11, 31);
    const lastThursday = new Date(lastDay);
    lastThursday.setDate(lastDay.getDate() - lastDay.getDay() + 4);
    const week = Math.ceil((lastThursday.getTime() - new Date(year, 0, 1).getTime() + 1) / (7 * 24 * 60 * 60 * 1000));
    return week;
  };

  const getCurrentWeek = () => {
    const date = new Date(selectedDate);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const processLocationData = (data) => {
    const locationGroups = {};

    data.forEach(equipment => {
      const location = equipment.expected_location || 'Unknown Location';
      
      if (!locationGroups[location]) {
        locationGroups[location] = {
          location,
          equipment: [],
          totalUtilizationHours: 0,
          equipmentCount: 0,
        };
      }

      locationGroups[location].equipment.push(equipment);
      locationGroups[location].totalUtilizationHours += equipment.utilization_hours_24h;
      locationGroups[location].equipmentCount += 1;
    });

    const stats = Object.values(locationGroups).map(group => {
      const totalHours = parseFloat(group.totalUtilizationHours);
      const avgHours = group.equipmentCount > 0 
        ? totalHours / group.equipmentCount
        : 0;
      return {
        ...group,
        averageUtilizationHours: avgHours,
        totalUtilizationHours: totalHours,
      };
    }).sort((a, b) => b.totalUtilizationHours - a.totalUtilizationHours);

    setLocationStats(stats);
    
    if (stats.length > 0 && !selectedLocation) {
      setSelectedLocation(stats[0].location);
    }
  };

  const handleViewDetails = (equipmentId) => {
    window.location.href = `/equipment/${equipmentId}/details`;
  };

  const filteredData = allEquipmentData.filter(equipment => {
    if (filterStatus === 'active') return equipment.is_active;
    if (filterStatus === 'inactive') return !equipment.is_active;
    return true;
  });

  const currentLocationData = locationStats.find(loc => loc.location === selectedLocation);
  const locationChartData = currentLocationData?.equipment || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading equipment data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-red-600 font-semibold text-lg">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Head title="Equipment Management"/>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-colors font-medium"
              title="Go back to home"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-3">
              <Activity className="text-blue-600" size={32} />
              <h1 className="text-4xl font-bold text-gray-900">Equipment Management</h1>
            </div>
          </div>
          <p className="text-gray-600">Monitor and manage all equipment with real-time utilization data</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Date Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Time Period</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setDateFilter('day');
                  setSelectedDate(new Date());
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => {
                  setDateFilter('week');
                  setSelectedDate(new Date());
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => {
                  setDateFilter('month');
                  setSelectedDate(new Date());
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => {
                  setDateFilter('year');
                  setSelectedDate(new Date());
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'year'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Year
              </button>
            </div>

            {/* Date Selection Dropdowns */}
            <div className="flex items-center gap-2 justify-between md:justify-end flex-wrap">
              {dateFilter === 'day' && (
                <div className="relative">
                  <button
                    onClick={() => setShowDayDropdown(!showDayDropdown)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
                  >
                    Day: {selectedDate.getDate()}
                    <ChevronDown size={16} />
                  </button>
                  {showDayDropdown && (
                    <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                      {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(day => (
                        <button
                          key={day}
                          onClick={() => handleDaySelect(day)}
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                            selectedDate.getDate() === day ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {dateFilter === 'month' && (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
                    >
                      {monthNames[selectedDate.getMonth()]}
                      <ChevronDown size={16} />
                    </button>
                    {showMonthDropdown && (
                      <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        {monthNames.map((month, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleMonthSelect(idx)}
                            className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                              selectedDate.getMonth() === idx ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                            }`}
                          >
                            {month}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowYearDropdown(!showYearDropdown)}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
                    >
                      {selectedDate.getFullYear()}
                      <ChevronDown size={16} />
                    </button>
                    {showYearDropdown && (
                      <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <button
                            key={year}
                            onClick={() => handleYearSelect(year)}
                            className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                              selectedDate.getFullYear() === year ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                            }`}
                          >
                            {year}
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
                      onClick={() => setShowWeekDropdown(!showWeekDropdown)}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
                    >
                      Week {getCurrentWeek()}
                      <ChevronDown size={16} />
                    </button>
                    {showWeekDropdown && (
                      <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {Array.from({ length: getWeeksInYear() }, (_, i) => i + 1).map(week => (
                          <button
                            key={week}
                            onClick={() => handleWeekSelect(week)}
                            className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                              getCurrentWeek() === week ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                            }`}
                          >
                            Week {week}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowYearDropdown(!showYearDropdown)}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
                    >
                      {selectedDate.getFullYear()}
                      <ChevronDown size={16} />
                    </button>
                    {showYearDropdown && (
                      <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <button
                            key={year}
                            onClick={() => handleYearSelect(year)}
                            className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                              selectedDate.getFullYear() === year ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                            }`}
                          >
                            {year}
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
                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
                  >
                    {selectedDate.getFullYear()}
                    <ChevronDown size={16} />
                  </button>
                  {showYearDropdown && (
                    <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <button
                          key={year}
                          onClick={() => handleYearSelect(year)}
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                            selectedDate.getFullYear() === year ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <span className="text-gray-900 font-semibold text-center text-sm">
                {getDateLabel()}
              </span>
              <button
                onClick={handleToday}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Daily Utilization Overview</h2>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 0, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="equipment_name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Utilization (Hours)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 24]}
                />
                <Tooltip 
                  formatter={(value) => `${value.toFixed(2)} hrs`}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar 
                  dataKey="utilization_hours_24h" 
                  fill="#3b82f6" 
                  name="Active Hours"
                  radius={[8, 8, 0, 0]}
                  minPointSize={5}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">No data available</div>
          )}
        </div>

        {/* Location Utilization Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={28} className="text-blue-600" />
            Location Utilization Analysis
          </h2>

          {/* Location Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {locationStats.map((loc) => (
              <button
                key={loc.location}
                onClick={() => setSelectedLocation(loc.location)}
                className={`p-4 rounded-lg transition-all duration-200 text-left border-2 ${
                  selectedLocation === loc.location
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <MapPin size={20} className={selectedLocation === loc.location ? 'text-blue-600' : 'text-gray-500'} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-3 truncate text-sm">{loc.location}</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Total Hours</p>
                    <p className="text-base font-bold text-blue-600">{loc.totalUtilizationHours.toFixed(2)}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Avg/Equipment</p>
                    <p className="text-sm font-semibold text-gray-900">{loc.averageUtilizationHours.toFixed(2)}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Equipment</p>
                    <p className="text-sm font-semibold text-gray-900">{loc.equipmentCount}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Location Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Equipment Utilization by Location */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Equipment Utilization by Hours</h3>
              {locationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={locationChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="equipment_name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => typeof value === 'number' ? `${value.toFixed(2)} hrs` : value}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar 
                      dataKey="utilization_hours_24h" 
                      fill="#3b82f6" 
                      name="Hours"
                      radius={[8, 8, 0, 0]}
                      minPointSize={5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">No data available</div>
              )}
            </div>

            {/* Total & Average by Location */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Total & Average by Location</h3>
              {locationStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart
                    data={locationStats}
                    margin={{ top: 20, right: 30, left: 0, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="location" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => typeof value === 'number' ? `${value.toFixed(2)} hrs` : value}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar 
                      dataKey="totalUtilizationHours" 
                      fill="#10b981" 
                      name="Total Hours"
                      radius={[8, 8, 0, 0]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="averageUtilizationHours" 
                      stroke="#f59e0b" 
                      name="Average Hours"
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All ({allEquipmentData.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filterStatus === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-current"></div>
            Active ({allEquipmentData.filter(e => e.is_active).length})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filterStatus === 'inactive'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-current opacity-40"></div>
            Inactive ({allEquipmentData.filter(e => !e.is_active).length})
          </button>
        </div>

        {/* Equipment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((equipment) => (
            <div
              key={equipment.equipment_id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{equipment.equipment_name}</h3>
                    <p className="text-blue-100 text-sm">ID: {equipment.equipment_id}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    equipment.is_active ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {/* Owner and Location */}
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Owner:</span> {equipment.owner}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1">
                    <MapPin size={14} className="text-gray-500" />
                    <span className="font-semibold text-gray-900">Location:</span> {equipment.expected_location}
                  </p>
                </div>

                {/* Status Badge */}
                <div>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    equipment.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      equipment.is_active ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                    {equipment.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Utilization Stats */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Utilization</span>
                    <span className="text-xl font-bold text-blue-600">
                      {equipment.utilization_hours_24h.toFixed(1)}h / {equipment.utilization_percentage_24h.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(equipment.utilization_percentage_24h, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Out of 24 hours</p>
                </div>

                {/* Power Consumption Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-3 rounded-lg border border-orange-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} className="text-orange-600" />
                      <p className="text-xs text-gray-600 font-medium">Current Power</p>
                    </div>
                    <p className="text-lg font-bold text-orange-600">
                      {equipment.power_consumption.toFixed(2)}W
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} className="text-purple-600" />
                      <p className="text-xs text-gray-600 font-medium">Avg Power (24h)</p>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {equipment.avg_power_24h.toFixed(2)}W
                    </p>
                  </div>
                </div>

                {/* Last Updated */}
                <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                  Last updated: {new Date(equipment.updated_at).toLocaleString()}
                </p>

                {/* View Details Button */}
                <button
                  onClick={() => handleViewDetails(equipment.equipment_id)}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
                >
                  <span>View Details</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-100">
            <Activity className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg font-medium">No equipment found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}