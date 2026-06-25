// Date utilities
export const getDateRange = (dateFilter, selectedDate, customDateRange) => {
  const now = new Date(selectedDate);
  let startDate, endDate;

  switch (dateFilter) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'week':
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customDateRange?.startDate && customDateRange?.endDate) {
        startDate = new Date(customDateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Default to current month if no custom range set
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  return { startDate, endDate };
};

export const getDateLabel = (dateFilter, selectedDate, customDateRange) => {
  const now = new Date(selectedDate);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  switch (dateFilter) {
    case 'day':
      return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'week':
      const ws = new Date(now);
      ws.setDate(now.getDate() - now.getDay());
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    case 'month':
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    case 'year':
      return now.getFullYear().toString();
    case 'custom':
      if (customDateRange?.startDate && customDateRange?.endDate) {
        const start = new Date(customDateRange.startDate);
        const end = new Date(customDateRange.endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return 'Custom Range';
    default:
      return '';
  }
};

// Helper function to calculate working days in a month
// Helper function to calculate working days in a month
function getWorkingDaysInMonth(year, month) {
  let workingDays = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
}

export const processGraphData = (data, startDate, endDate, dateFilter, includeInactive = false) => {
  console.log('processGraphData called with:', {
    dataLength: data?.length || 0,
    startDate,
    endDate,
    dateFilter,
    includeInactive
  });

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { 
      utilizationPeriods: [], 
      powerData: [], 
      equipmentList: [],
      dateFilter,
      summaryStats: { 
        avgUtilization: 0, 
        avgPower: 0,
        activeEquipmentCount: 0,
        inactiveEquipmentCount: 0,
        totalEquipmentCount: 0,
        totalActiveHours: 0,
        averageActiveHoursPerEquipment: 0
      }
    };
  }

  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const totalDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
  
  const isDayView = dateFilter === 'day' || (dateFilter === 'custom' && totalDays === 1);
  const isYearView = dateFilter === 'year' || (dateFilter === 'custom' && totalDays > 365);
  const isMonthOrWeekView = dateFilter === 'month' || dateFilter === 'week' || 
    (dateFilter === 'custom' && totalDays > 1 && totalDays <= 365);

  // Process each equipment individually
  let allUtilizationPeriods = [];
  let allPowerData = [];
  let equipmentDataMap = {}; // Store per-equipment data
  let activeEquipment = new Set();
  let inactiveEquipment = new Set();
  let totalActiveHoursAll = 0;
  let equipmentActiveHours = {};

  data.forEach(equipment => {
    const utils = equipment.utilizations || [];
    const powers = equipment.power_consumptions || [];
    
    let hasUtilizationData = false;
    let hasPowerData = false;
    let equipmentPeriods = [];
    let equipmentPowerData = [];
    let equipmentActiveHoursTotal = 0;
    
    // Process utilization periods for this equipment
    if (utils.length > 0) {
      const sortedUtils = [...utils].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      const filteredUtils = sortedUtils.filter(u => {
        if (!u.created_at) return false;
        const time = new Date(u.created_at).getTime();
        return time >= startTime && time <= endTime;
      });
      
      if (filteredUtils.length > 0) {
        hasUtilizationData = true;
        
        // Find active periods
        let activeStart = null;
        
        for (let i = 0; i < filteredUtils.length; i++) {
          const currentTime = new Date(filteredUtils[i].created_at).getTime();
          const isActive = filteredUtils[i].type === true || filteredUtils[i].type === 1 || filteredUtils[i].type === 'true';
          
          if (isActive && !activeStart) {
            activeStart = currentTime;
          } else if (!isActive && activeStart) {
            const duration = (currentTime - activeStart) / (1000 * 60 * 60);
            const period = {
              equipmentId: equipment.equipment_id,
              equipmentName: equipment.equipment_name,
              owner: equipment.owner,
              location: equipment.expected_location,
              start: new Date(activeStart),
              end: new Date(currentTime),
              duration: duration,
              startTime: activeStart,
              endTime: currentTime
            };
            equipmentPeriods.push(period);
            allUtilizationPeriods.push(period);
            equipmentActiveHoursTotal += duration;
            activeStart = null;
          }
        }
        
        // If still active at the end
        if (activeStart) {
          const duration = (endTime - activeStart) / (1000 * 60 * 60);
          const period = {
            equipmentId: equipment.equipment_id,
            equipmentName: equipment.equipment_name,
            owner: equipment.owner,
            location: equipment.expected_location,
            start: new Date(activeStart),
            end: new Date(endTime),
            duration: duration,
            startTime: activeStart,
            endTime: endTime
          };
          equipmentPeriods.push(period);
          allUtilizationPeriods.push(period);
          equipmentActiveHoursTotal += duration;
        }
      }
    }
    
    // Process power data for this equipment
    if (powers.length > 0) {
      const filteredPowers = powers.filter(p => {
        if (!p.created_at) return false;
        const time = new Date(p.created_at).getTime();
        return time >= startTime && time <= endTime;
      }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      if (filteredPowers.length > 0) {
        hasPowerData = true;
        equipmentPowerData = filteredPowers.map(p => ({
          equipmentId: equipment.equipment_id,
          equipmentName: equipment.equipment_name,
          time: new Date(p.created_at),
          timestamp: new Date(p.created_at).getTime(),
          power: p.consumption || 0
        }));
        allPowerData.push(...equipmentPowerData);
      }
    }
    
    const hasData = hasUtilizationData || hasPowerData;
    
    if (hasData) {
      activeEquipment.add(equipment.equipment_id);
      totalActiveHoursAll += equipmentActiveHoursTotal;
      equipmentActiveHours[equipment.equipment_id] = equipmentActiveHoursTotal;
      
      // Store equipment data
      equipmentDataMap[equipment.equipment_id] = {
        equipmentId: equipment.equipment_id,
        equipmentName: equipment.equipment_name,
        owner: equipment.owner,
        location: equipment.expected_location,
        hasUtilizationData,
        hasPowerData,
        utilizationPeriods: equipmentPeriods,
        powerData: equipmentPowerData,
        totalActiveHours: equipmentActiveHoursTotal,
        averagePower: equipmentPowerData.length > 0 
          ? equipmentPowerData.reduce((sum, p) => sum + p.power, 0) / equipmentPowerData.length 
          : 0
      };
    } else {
      inactiveEquipment.add(equipment.equipment_id);
    }
  });

  // Sort everything by time
  allUtilizationPeriods.sort((a, b) => a.startTime - b.startTime);
  allPowerData.sort((a, b) => a.timestamp - b.timestamp);

  // Create equipment list sorted by active hours (most active first)
  const equipmentList = Object.values(equipmentDataMap)
    .sort((a, b) => b.totalActiveHours - a.totalActiveHours);

  // Calculate summary stats
  const totalEquipment = data.length;
  const activeCount = activeEquipment.size;
  const inactiveCount = inactiveEquipment.size;
  const avgActiveHours = activeCount > 0 ? totalActiveHoursAll / activeCount : 0;

  // Calculate period duration for average utilization
  const periodDurationHours = (endTime - startTime) / (1000 * 60 * 60);
  const avgUtilization = periodDurationHours > 0 && activeCount > 0 
    ? (totalActiveHoursAll / (activeCount * Math.min(periodDurationHours, 24))) * 100 
    : 0;

  // Calculate average power
  const avgPower = allPowerData.length > 0 
    ? allPowerData.reduce((sum, p) => sum + p.power, 0) / allPowerData.length 
    : 0;

  const summaryStats = {
    avgUtilization,
    avgPower,
    activeEquipmentCount: activeCount,
    inactiveEquipmentCount: inactiveCount,
    totalEquipmentCount: totalEquipment,
    totalActiveHours: totalActiveHoursAll,
    averageActiveHoursPerEquipment: avgActiveHours
  };

  return {
    utilizationPeriods: allUtilizationPeriods,
    powerData: allPowerData,
    equipmentList,
    equipmentDataMap,
    dateFilter,
    isDayView,
    isMonthOrWeekView,
    isYearView,
    summaryStats,
    startTime,
    endTime
  };
};