// Date utilities
export const getDateRange = (dateFilter, selectedDate) => {
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
      // January 1 to December 31 of selected year
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  return { startDate, endDate };
};

export const getDateLabel = (dateFilter, selectedDate) => {
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
    default:
      return '';
  }
};

// Graph data processing - fixed to use API data correctly
export const processGraphData = (data, startDate, endDate) => {
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const totalDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
  const isSingleDay = totalDays === 1;
  const utilization = [];
  const power = [];

  if (isSingleDay) {
    // Single day: aggregate all equipment data by hour
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(startTime);
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(startTime);
      hourEnd.setHours(h, 59, 59, 999);

      let totalUtil = 0;
      let totalPower = 0;
      let utilCount = 0;
      let powerCount = 0;

      data.forEach(equipment => {
        // Get utilizations for this equipment in this hour
        const hourUtils = equipment.utilizations?.filter(u => {
          const time = new Date(u.created_at).getTime();
          return time >= hourStart.getTime() && time <= hourEnd.getTime();
        }) || [];

        if (hourUtils.length > 0) {
          const activeCount = hourUtils.filter(u => u.type === true || u.type === 1).length;
          totalUtil += (activeCount / hourUtils.length) * 100;
          utilCount++;
        }

        // Get power consumptions for this equipment in this hour
        const hourPower = equipment.power_consumptions?.filter(p => {
          const time = new Date(p.created_at).getTime();
          return time >= hourStart.getTime() && time <= hourEnd.getTime();
        }) || [];

        if (hourPower.length > 0) {
          totalPower += hourPower.reduce((sum, p) => sum + (p.consumption || 0), 0) / hourPower.length;
          powerCount++;
        }
      });

      utilization.push({
        time: h.toString().padStart(2, '0') + ':00',
        utilization: utilCount > 0 ? parseFloat((totalUtil / utilCount).toFixed(1)) : 0
      });

      power.push({
        time: h.toString().padStart(2, '0') + ':00',
        power: powerCount > 0 ? parseFloat((totalPower / powerCount).toFixed(1)) : 0
      });
    }
  } else {
    // Multiple days: aggregate all equipment data by day
    const currentDate = new Date(startTime);
    
    // For year view, show monthly averages instead of daily
    if (totalDays > 31) {
      // Show by month
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(currentDate.getFullYear(), m, 1);
        const monthEnd = new Date(currentDate.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        
        let totalUtil = 0;
        let totalPower = 0;
        let utilCount = 0;
        let powerCount = 0;

        data.forEach(equipment => {
          const monthUtils = equipment.utilizations?.filter(u => {
            const time = new Date(u.created_at).getTime();
            return time >= monthStart.getTime() && time <= monthEnd.getTime();
          }) || [];

          if (monthUtils.length > 0) {
            const activeCount = monthUtils.filter(u => u.type === true || u.type === 1).length;
            totalUtil += (activeCount / monthUtils.length) * 100;
            utilCount++;
          }

          const monthPower = equipment.power_consumptions?.filter(p => {
            const time = new Date(p.created_at).getTime();
            return time >= monthStart.getTime() && time <= monthEnd.getTime();
          }) || [];

          if (monthPower.length > 0) {
            totalPower += monthPower.reduce((sum, p) => sum + (p.consumption || 0), 0) / monthPower.length;
            powerCount++;
          }
        });

        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        utilization.push({
          time: months[m],
          utilization: utilCount > 0 ? parseFloat((totalUtil / utilCount).toFixed(1)) : 0
        });

        power.push({
          time: months[m],
          power: powerCount > 0 ? parseFloat((totalPower / powerCount).toFixed(1)) : 0
        });
      }
    } else {
      // Show by day (for week/month view)
      while (currentDate <= new Date(endTime)) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        let totalUtil = 0;
        let totalPower = 0;
        let utilCount = 0;
        let powerCount = 0;

        data.forEach(equipment => {
          const dayUtils = equipment.utilizations?.filter(u => {
            const time = new Date(u.created_at).getTime();
            return time >= dayStart.getTime() && time <= dayEnd.getTime();
          }) || [];

          if (dayUtils.length > 0) {
            const activeCount = dayUtils.filter(u => u.type === true || u.type === 1).length;
            totalUtil += (activeCount / dayUtils.length) * 100;
            utilCount++;
          }

          const dayPower = equipment.power_consumptions?.filter(p => {
            const time = new Date(p.created_at).getTime();
            return time >= dayStart.getTime() && time <= dayEnd.getTime();
          }) || [];

          if (dayPower.length > 0) {
            totalPower += dayPower.reduce((sum, p) => sum + (p.consumption || 0), 0) / dayPower.length;
            powerCount++;
          }
        });

        utilization.push({
          time: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          utilization: utilCount > 0 ? parseFloat((totalUtil / utilCount).toFixed(1)) : 0
        });

        power.push({
          time: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          power: powerCount > 0 ? parseFloat((totalPower / powerCount).toFixed(1)) : 0
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  return { utilization, power, isSingleDay };
};