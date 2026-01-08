import { useState } from 'react';
import { ArrowLeft, Activity, Zap, MapPin, Clock, User, AlertCircle } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function EquipmentDetails({ equipment }) {
  const [activeTab, setActiveTab] = useState('overview');

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
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/equipment"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Equipment</span>
            </Link>
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
                      <span className="text-gray-700 font-medium">Average Power (24h)</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">{equipment.avg_power_24h.toFixed(2)}W</span>
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
              <h2 className="text-xl font-bold text-gray-900 mb-6">24-Hour Utilization</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-semibold text-gray-900">Active Hours</span>
                    <span className="text-3xl font-bold text-blue-600">{equipment.utilization_hours_24h.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(equipment.utilization_hours_24h / 24 * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Out of 24 hours available</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-semibold text-gray-900">Utilization Rate</span>
                    <span className="text-3xl font-bold text-green-600">{equipment.utilization_percentage_24h.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-green-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(equipment.utilization_percentage_24h, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Percentage of active time</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Utilization Details</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 font-medium">Total Active Hours</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{equipment.utilization_hours_24h.toFixed(2)} hours</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 font-medium">Utilization Percentage</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{equipment.utilization_percentage_24h.toFixed(2)}%</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">Idle Hours</p>
                  <p className="text-2xl font-bold text-gray-700 mt-2">{(24 - equipment.utilization_hours_24h).toFixed(2)} hours</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Power Consumption Tab */}
        {activeTab === 'power' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Power Consumption Stats</h2>
              
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
                    <span className="text-gray-700 font-medium">Average Power (24h)</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 ml-9">{equipment.avg_power_24h.toFixed(2)}W</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Power Analysis</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">Consumption Difference</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(equipment.power_consumption - equipment.avg_power_24h).toFixed(2)}W
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {equipment.power_consumption > equipment.avg_power_24h
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
      </div>
    </div>
  );
}