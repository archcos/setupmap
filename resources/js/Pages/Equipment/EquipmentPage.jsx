import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight, Activity, Zap, AlertCircle, MapPin } from 'lucide-react';

export default function EquipmentPage() {
  const [equipmentData, setEquipmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive

  useEffect(() => {
    const fetchEquipmentData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/equipment-utilization');
        if (!response.ok) throw new Error('Failed to fetch equipment data');
        const data = await response.json();
        setEquipmentData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentData();
  }, []);

  const handleViewDetails = (equipmentId) => {
    window.location.href = `/equipment/${equipmentId}`;
  };

  const filteredData = equipmentData.filter(equipment => {
    if (filterStatus === 'active') return equipment.is_active;
    if (filterStatus === 'inactive') return !equipment.is_active;
    return true;
  });

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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-blue-600" size={32} />
            <h1 className="text-4xl font-bold text-gray-900">Equipment Management</h1>
          </div>
          <p className="text-gray-600">Monitor and manage all equipment with real-time utilization data</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
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
            All ({equipmentData.length})
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
            Active ({equipmentData.filter(e => e.is_active).length})
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
            Inactive ({equipmentData.filter(e => !e.is_active).length})
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