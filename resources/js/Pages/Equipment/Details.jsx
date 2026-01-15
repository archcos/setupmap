import { useState } from 'react';
import { ArrowLeft, Activity, Zap, MapPin, Clock, User, AlertCircle, Calendar } from 'lucide-react';
import {Head} from '@inertiajs/react';

export default function EquipmentDetails({ equipment: initialEquipment }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [equipment, setEquipment] = useState(initialEquipment);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const getStartOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const getEndOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };

  const fetchEquipmentData = async (start, end) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/equipment/${equipment.equipment_id}?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`
      );
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      } else {
        console.error('Error fetching equipment data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching equipment data:', error);
    }
    setLoading(false);
  };

  const handleQuickRange = (days) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const startStr = start.toISOString();
    const endStr = end.toISOString();
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    fetchEquipmentData(startStr, endStr);
  };

  const handleCustomDateRange = () => {
    const start = getStartOfDay(startDate);
    const end = getEndOfDay(endDate);
    fetchEquipmentData(start, end);
    setShowCustomDatePicker(false);
  };

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-red-600 font-semibold text-lg">Equipment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <Head title="Equipment Details"/>
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <a
              href="/equipment"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Equipment</span>
            </a>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{equipment.equipment_name}</h1>
              <p className="text-gray-600 mt-2">Equipment ID: {equipment.equipment_id}</p>
            </div>
            <div className={`px-4 py-2 rounded-full font-semibold ${
              equipment.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {equipment.is_active ? '● Active' : '● Inactive'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Calendar size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Select Time Range</h2>
          </div>
          
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => handleQuickRange(0)}
              className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickRange(7)}
              className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleQuickRange(30)}
              className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleQuickRange(90)}
              className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors"
            >
              Last 90 Days
            </button>
            <button
              onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
            >
              Custom Range
            </button>
          </div>

          {showCustomDatePicker && (
            <div className="border-t border-gray-200 pt-4 flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCustomDateRange}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('utilization')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'utilization'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Utilization
          </button>
          <button
            onClick={() => setActiveTab('power')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'power'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Power Consumption
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-600 font-medium">Loading data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <User className="text-gray-400 mt-1" size={20} />
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Owner</p>
                        <p className="text-lg text-gray-900 font-semibold">{equipment.owner}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <MapPin className="text-gray-400 mt-1" size={20} />
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Expected Location</p>
                        <p className="text-lg text-gray-900 font-semibold">{equipment.expected_location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Clock className="text-gray-400 mt-1" size={20} />
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Last Updated</p>
                        <p className="text-lg text-gray-900 font-semibold">
                          {new Date(equipment.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Current Status</h2>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">Status</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          equipment.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
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
                        <span className="text-2xl font-bold text-orange-600">{equipment.power_consumption.toFixed(2)}W</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="text-purple-600" size={20} />
                          <span className="text-gray-700 font-medium">Average Power</span>
                        </div>
                        <span className="text-2xl font-bold text-purple-600">{equipment.avg_power_8h.toFixed(2)}W</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Utilization Tab */}
            {activeTab === 'utilization' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Utilization</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-semibold text-gray-900">Active Hours</span>
                        <span className="text-3xl font-bold text-blue-600">{equipment.utilization_hours_8h.toFixed(1)}h</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(equipment.utilization_hours_8h / 8 * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-semibold text-gray-900">Utilization Rate</span>
                        <span className="text-3xl font-bold text-green-600">{equipment.utilization_percentage_8h.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-green-600 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(equipment.utilization_percentage_8h, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Details</h2>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 font-medium">Total Active Hours</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">{equipment.utilization_hours_8h.toFixed(2)}</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 font-medium">Utilization Percentage</p>
                      <p className="text-2xl font-bold text-green-600 mt-2">{equipment.utilization_percentage_8h.toFixed(2)}%</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 font-medium">Idle Hours</p>
                      <p className="text-2xl font-bold text-gray-700 mt-2">{(8 - equipment.utilization_hours_8h).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Power Consumption Tab */}
            {activeTab === 'power' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Power Stats</h2>
                  
                  <div className="space-y-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="text-orange-600" size={24} />
                        <span className="text-gray-700 font-medium">Current Power</span>
                      </div>
                      <p className="text-3xl font-bold text-orange-600 ml-9">{equipment.power_consumption.toFixed(2)}W</p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="text-purple-600" size={24} />
                        <span className="text-gray-700 font-medium">Average Power</span>
                      </div>
                      <p className="text-3xl font-bold text-purple-600 ml-9">{equipment.avg_power_8h.toFixed(2)}W</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Analysis</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-2">Consumption Difference</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(equipment.power_consumption - equipment.avg_power_8h).toFixed(2)}W
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {equipment.power_consumption > equipment.avg_power_8h
                          ? 'Currently above average'
                          : 'Currently below average'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700 font-semibold">Energy Tip</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Monitor power consumption trends to identify optimization opportunities and reduce energy costs.
                      </p>
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