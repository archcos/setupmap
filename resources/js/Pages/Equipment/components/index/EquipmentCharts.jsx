import { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown, Square, CheckSquare, Activity, Zap } from 'lucide-react';

// Color palette for different equipment
const EQUIPMENT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#eab308'
];

export default function EquipmentCharts({ graphData }) {
  const [showAverage, setShowAverage] = useState(true);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [dataType, setDataType] = useState('utilization'); // 'utilization' or 'power'
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEquipmentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize selected equipment - select all by default
  useEffect(() => {
    if (graphData.equipmentList && graphData.equipmentList.length > 0) {
      const allIds = new Set(graphData.equipmentList.map(eq => eq.equipmentId));
      setSelectedEquipment(allIds);
      setSelectAll(true);
    }
  }, [graphData.equipmentList]);

  const toggleEquipment = (equipmentId) => {
    const newSelected = new Set(selectedEquipment);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
      setSelectAll(false);
    } else {
      newSelected.add(equipmentId);
      if (graphData.equipmentList && newSelected.size === graphData.equipmentList.length) {
        setSelectAll(true);
      }
    }
    setSelectedEquipment(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEquipment(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(graphData.equipmentList.map(eq => eq.equipmentId));
      setSelectedEquipment(allIds);
      setSelectAll(true);
    }
  };

  // Generate timeline data for each selected equipment
  const timelineData = useMemo(() => {
    if (!graphData.equipmentList || graphData.equipmentList.length === 0) return [];
    
    const data = [];
    
    if (graphData.isDayView) {
      const startHour = new Date(graphData.startTime);
      startHour.setMinutes(0, 0, 0);
      const endHour = new Date(graphData.endTime);
      
      while (startHour <= endHour) {
        const slotStart = startHour.getTime();
        const slotEnd = slotStart + 3600000;
        
        const dataPoint = {
          time: startHour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
          timestamp: slotStart,
          averageValue: 0,
          totalValue: 0,
          activeEquipmentCount: 0
        };
        
        let totalValue = 0;
        let activeCount = 0;
        
        graphData.equipmentList.forEach(eq => {
          if (selectedEquipment.has(eq.equipmentId)) {
            if (dataType === 'utilization') {
              // Calculate utilization
              const activeInSlot = eq.utilizationPeriods.filter(p => 
                p.startTime < slotEnd && p.endTime > slotStart
              );
              
              const totalActiveHours = activeInSlot.reduce((sum, p) => {
                const overlapStart = Math.max(p.startTime, slotStart);
                const overlapEnd = Math.min(p.endTime, slotEnd);
                return sum + (overlapEnd - overlapStart) / 3600000;
              }, 0);
              
              const utilizationPercent = parseFloat((totalActiveHours * 100).toFixed(1));
              dataPoint[`${eq.equipmentId}_value`] = utilizationPercent;
              
              if (utilizationPercent > 0) {
                totalValue += utilizationPercent;
                activeCount++;
              }
            } else {
              // Calculate power
              if (eq.powerData && eq.powerData.length > 0) {
                const powerInSlot = eq.powerData.filter(p => 
                  p.timestamp >= slotStart && p.timestamp < slotEnd
                );
                
                if (powerInSlot.length > 0) {
                  const avgPower = powerInSlot.reduce((sum, p) => sum + p.power, 0) / powerInSlot.length;
                  dataPoint[`${eq.equipmentId}_value`] = parseFloat(avgPower.toFixed(1));
                  totalValue += avgPower;
                  activeCount++;
                }
              }
            }
          }
        });
        
        dataPoint.averageValue = activeCount > 0 ? parseFloat((totalValue / activeCount).toFixed(1)) : 0;
        dataPoint.totalValue = parseFloat(totalValue.toFixed(1));
        dataPoint.activeEquipmentCount = activeCount;
        
        data.push(dataPoint);
        startHour.setHours(startHour.getHours() + 1);
      }
    } else if (graphData.isMonthOrWeekView) {
      const startDay = new Date(graphData.startTime);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(graphData.endTime);
      
      while (startDay <= endDay) {
        const slotStart = startDay.getTime();
        const slotEnd = slotStart + 86400000;
        
        const dataPoint = {
          time: startDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timestamp: slotStart,
          averageValue: 0,
          totalValue: 0,
          activeEquipmentCount: 0
        };
        
        let totalValue = 0;
        let activeCount = 0;
        
        graphData.equipmentList.forEach(eq => {
          if (selectedEquipment.has(eq.equipmentId)) {
            if (dataType === 'utilization') {
              const activeInSlot = eq.utilizationPeriods.filter(p => 
                p.startTime < slotEnd && p.endTime > slotStart
              );
              
              const totalActiveHours = activeInSlot.reduce((sum, p) => {
                const overlapStart = Math.max(p.startTime, slotStart);
                const overlapEnd = Math.min(p.endTime, slotEnd);
                return sum + (overlapEnd - overlapStart) / 3600000;
              }, 0);
              
              dataPoint[`${eq.equipmentId}_value`] = parseFloat(totalActiveHours.toFixed(1));
              
              if (totalActiveHours > 0) {
                totalValue += totalActiveHours;
                activeCount++;
              }
            } else {
              if (eq.powerData && eq.powerData.length > 0) {
                const powerInSlot = eq.powerData.filter(p => 
                  p.timestamp >= slotStart && p.timestamp < slotEnd
                );
                
                if (powerInSlot.length > 0) {
                  const avgPower = powerInSlot.reduce((sum, p) => sum + p.power, 0) / powerInSlot.length;
                  dataPoint[`${eq.equipmentId}_value`] = parseFloat(avgPower.toFixed(1));
                  totalValue += avgPower;
                  activeCount++;
                }
              }
            }
          }
        });
        
        dataPoint.averageValue = activeCount > 0 ? parseFloat((totalValue / activeCount).toFixed(1)) : 0;
        dataPoint.totalValue = parseFloat(totalValue.toFixed(1));
        dataPoint.activeEquipmentCount = activeCount;
        
        data.push(dataPoint);
        startDay.setDate(startDay.getDate() + 1);
      }
    } else {
      const year = new Date(graphData.startTime).getFullYear();
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const monthEnd = new Date(year, m + 1, 0, 23, 59, 59);
        
        const slotStart = monthStart.getTime();
        const slotEnd = monthEnd.getTime();
        
        const dataPoint = {
          time: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          timestamp: slotStart,
          averageValue: 0,
          totalValue: 0,
          activeEquipmentCount: 0
        };
        
        let totalValue = 0;
        let activeCount = 0;
        
        graphData.equipmentList.forEach(eq => {
          if (selectedEquipment.has(eq.equipmentId)) {
            if (dataType === 'utilization') {
              const activeInSlot = eq.utilizationPeriods.filter(p => 
                p.startTime < slotEnd && p.endTime > slotStart
              );
              
              const totalActiveHours = activeInSlot.reduce((sum, p) => {
                const overlapStart = Math.max(p.startTime, slotStart);
                const overlapEnd = Math.min(p.endTime, slotEnd);
                return sum + (overlapEnd - overlapStart) / 3600000;
              }, 0);
              
              dataPoint[`${eq.equipmentId}_value`] = parseFloat(totalActiveHours.toFixed(1));
              
              if (totalActiveHours > 0) {
                totalValue += totalActiveHours;
                activeCount++;
              }
            } else {
              if (eq.powerData && eq.powerData.length > 0) {
                const powerInSlot = eq.powerData.filter(p => 
                  p.timestamp >= slotStart && p.timestamp < slotEnd
                );
                
                if (powerInSlot.length > 0) {
                  const avgPower = powerInSlot.reduce((sum, p) => sum + p.power, 0) / powerInSlot.length;
                  dataPoint[`${eq.equipmentId}_value`] = parseFloat(avgPower.toFixed(1));
                  totalValue += avgPower;
                  activeCount++;
                }
              }
            }
          }
        });
        
        dataPoint.averageValue = activeCount > 0 ? parseFloat((totalValue / activeCount).toFixed(1)) : 0;
        dataPoint.totalValue = parseFloat(totalValue.toFixed(1));
        dataPoint.activeEquipmentCount = activeCount;
        
        data.push(dataPoint);
      }
    }
    
    return data;
  }, [graphData, selectedEquipment, dataType]);

  const getTimeLabel = () => {
    if (graphData.isDayView) return 'Hour';
    if (graphData.isMonthOrWeekView) return 'Day';
    if (graphData.isYearView) return 'Month';
    return 'Time';
  };

  const getYAxisLabel = () => {
    if (dataType === 'utilization') {
      return graphData.isDayView ? 'Utilization %' : 'Active Hours';
    }
    return 'Power (W)';
  };

  const getChartTitle = () => {
    if (dataType === 'utilization') {
      return 'Equipment Utilization';
    }
    return 'Equipment Power Consumption';
  };

  const getValueFormatter = (value) => {
    if (dataType === 'utilization') {
      return graphData.isDayView ? `${value}%` : `${value}h`;
    }
    return `${value}W`;
  };

  if (!graphData.equipmentList || graphData.equipmentList.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200 mb-4">
        <div className="text-center py-8 text-gray-500">No equipment data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {/* Summary Stats */}
      {graphData.summaryStats && (
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-blue-50 p-2 rounded">
              <span className="text-gray-600">Total Active Hours:</span>
              <strong className="text-blue-600 ml-1">{graphData.summaryStats.totalActiveHours.toFixed(1)}h</strong>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <span className="text-gray-600">Active Equipment:</span>
              <strong className="text-green-600 ml-1">{graphData.summaryStats.activeEquipmentCount}</strong>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <span className="text-gray-600">Avg Hours/Eq:</span>
              <strong className="text-purple-600 ml-1">{graphData.summaryStats.averageActiveHoursPerEquipment.toFixed(1)}h</strong>
            </div>
            <div className="bg-orange-50 p-2 rounded">
              <span className="text-gray-600">Avg Power:</span>
              <strong className="text-orange-600 ml-1">{graphData.summaryStats.avgPower.toFixed(1)}W</strong>
            </div>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          {/* Data Type Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDataType('utilization')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dataType === 'utilization'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity size={14} />
              Utilization
            </button>
            <button
              onClick={() => setDataType('power')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dataType === 'power'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap size={14} />
              Power
            </button>
          </div>

          {/* Equipment Selection Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm transition-colors"
            >
              <span>Equipment ({selectedEquipment.size}/{graphData.equipmentList.length})</span>
              <ChevronDown size={14} className={`transition-transform ${showEquipmentDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showEquipmentDropdown && (
              <div className="absolute left-0 mt-2 bg-white border rounded-lg shadow-lg z-50 w-80 max-h-96 overflow-hidden">
                <div className="p-2 border-b bg-gray-50">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    {selectAll ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                    <span>{selectAll ? 'Deselect All' : 'Select All'}</span>
                  </button>
                </div>
                
                <div className="overflow-y-auto max-h-80 p-2">
                  {graphData.equipmentList.map((eq, index) => {
                    const hasData = dataType === 'utilization' 
                      ? eq.hasUtilizationData 
                      : eq.hasPowerData;
                    
                    return (
                      <button
                        key={eq.equipmentId}
                        onClick={() => toggleEquipment(eq.equipmentId)}
                        disabled={!hasData}
                        className={`flex items-center gap-3 w-full px-2 py-2 text-sm rounded transition-colors ${
                          hasData ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {selectedEquipment.has(eq.equipmentId) ? (
                          <CheckSquare size={16} className="text-blue-600 flex-shrink-0" />
                        ) : (
                          <Square size={16} className="text-gray-400 flex-shrink-0" />
                        )}
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: EQUIPMENT_COLORS[index % EQUIPMENT_COLORS.length] }}
                        />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 truncate" title={eq.equipmentName}>
                            {eq.equipmentName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dataType === 'utilization' 
                              ? `${eq.totalActiveHours.toFixed(1)}h active`
                              : eq.averagePower > 0 
                                ? `${eq.averagePower.toFixed(0)}W avg`
                                : 'No power data'
                            }
                          </div>
                        </div>
                        {!hasData && (
                          <span className="text-xs text-gray-400">No data</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Show Average Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAverage}
              onChange={(e) => setShowAverage(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600">Show Average</span>
          </label>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
          {getChartTitle()}
        </h2>
        
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timelineData} margin={{ top: 10, right: 15, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                angle={!graphData.isDayView ? -45 : 0} 
                textAnchor={!graphData.isDayView ? "end" : "middle"} 
                height={60} 
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} 
              />
<Tooltip 
  formatter={(value, name, props) => {
    if (name === 'averageValue') {
      return [getValueFormatter(value), 'Average'];
    }
    if (name === 'totalValue') {
      return [getValueFormatter(value), 'Total'];
    }
    
    // Extract equipment ID
    const eqId = name.replace('_value', '');
    
    
    // Try all possible property names
    let eq = graphData.equipmentList.find(e => 
      e.equipmentId === eqId || 
      e.equipment_id === eqId || 
      String(e.equipmentId) === eqId || 
      String(e.equipment_id) === eqId ||
      e.id === eqId ||
      String(e.id) === eqId
    );
    
    if (eq) {
      return [getValueFormatter(value), eq.equipmentName || eq.equipment_name || eq.name || 'Unknown'];
    }
    
    return [getValueFormatter(value), `ID: ${eqId}`];
  }}
  labelFormatter={(label) => `${getTimeLabel()}: ${label}`}
/>
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => {
                  if (value === 'averageValue') return 'Average';
                  // Don't show individual equipment in legend
                  if (value.includes('_value')) return null;
                  return value;
                }}
              />
              
              {/* Average Line */}
              {showAverage && (
                <Line
                  type="monotone"
                  dataKey="averageValue"
                  name="averageValue"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={false}
                />
              )}
              
              {/* Individual Equipment Lines */}
              {graphData.equipmentList
                .filter(eq => selectedEquipment.has(eq.equipmentId))
                .map((eq, index) => (
                  <Line
                    key={`${eq.equipmentId}_value`}
                    type="monotone"
                    dataKey={`${eq.equipmentId}_value`}
                    name={`${eq.equipmentId}_value`}
                    stroke={EQUIPMENT_COLORS[index % EQUIPMENT_COLORS.length]}
                    strokeWidth={1}
                    strokeOpacity={0.5}
                    dot={false}
                    connectNulls
                    legendType="none"
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {dataType === 'power' && graphData.equipmentList.every(eq => !eq.hasPowerData)
              ? 'No power data available for selected equipment'
              : 'Select equipment to view data'
            }
          </div>
        )}
        
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-purple-500"></div>
            <span>Average</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-gray-400 opacity-50"></div>
            <span>Individual Equipment</span>
          </div>
        </div>
      </div>
    </div>
  );
}