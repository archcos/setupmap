export const processHistoryData = (data, start, end) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const totalDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
  const isSingleDay = totalDays === 1;

  const utilization = processUtilizationData(data, startTime, endTime, isSingleDay);
  const power = processPowerData(data, startTime, endTime, isSingleDay);
  const stats = calculateStats(data, utilization, power, startTime, endTime, totalDays);

  return { utilization, power, stats, isSingleDay };
};

const processUtilizationData = (data, startTime, endTime, isSingleDay) => {
  const dataMap = new Map();
  
  if (!data.utilizations?.length) return [];

  const filtered = data.utilizations.filter(item => {
    const time = new Date(item.created_at).getTime();
    return time >= startTime && time <= endTime;
  });

  if (isSingleDay) {
    filtered.forEach((item) => {
      const hour = new Date(item.created_at).getHours().toString().padStart(2, '0') + ':00';
      const isActive = item.type === true || item.type === 1;
      
      if (!dataMap.has(hour)) dataMap.set(hour, { time: hour, active: 0, total: 0, utilization: 0 });
      const entry = dataMap.get(hour);
      entry.total++;
      if (isActive) entry.active++;
      entry.utilization = parseFloat(((entry.active / entry.total) * 100).toFixed(1));
      entry.fullDate = new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit' });
    });
  } else {
    const dailyData = {};
    filtered.forEach((item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = { active: 0, total: 0 };
      dailyData[date].total++;
      if (item.type === true || item.type === 1) dailyData[date].active++;
    });
    
    const currentDate = new Date(startTime);
    while (currentDate <= new Date(endTime)) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayData = dailyData[dateKey] || { active: 0, total: 0 };
      dataMap.set(dateKey, {
        time: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        fullDate: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }),
        date: dateKey,
        active: dayData.active,
        total: dayData.total,
        utilization: parseFloat((dayData.total > 0 ? (dayData.active / dayData.total) * 100 : 0).toFixed(1))
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return Array.from(dataMap.values());
};

const processPowerData = (data, startTime, endTime, isSingleDay) => {
  const dataMap = new Map();
  
  if (!data.power_consumptions?.length) return [];

  const filtered = data.power_consumptions.filter(item => {
    const time = new Date(item.created_at).getTime();
    return time >= startTime && time <= endTime;
  });

  if (isSingleDay) {
    filtered.forEach((item) => {
      const hour = new Date(item.created_at).getHours().toString().padStart(2, '0') + ':00';
      if (!dataMap.has(hour)) dataMap.set(hour, { time: hour, power: 0, count: 0 });
      const entry = dataMap.get(hour);
      entry.power += (item.consumption || 0);
      entry.count++;
      entry.fullDate = new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit' });
    });
    dataMap.forEach(v => { v.power = parseFloat((v.power / v.count).toFixed(2)); delete v.count; });
  } else {
    const dailyData = {};
    filtered.forEach((item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = { total: 0, count: 0 };
      dailyData[date].total += (item.consumption || 0);
      dailyData[date].count++;
    });
    
    const currentDate = new Date(startTime);
    while (currentDate <= new Date(endTime)) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayData = dailyData[dateKey] || { total: 0, count: 0 };
      dataMap.set(dateKey, {
        time: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        fullDate: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }),
        power: parseFloat((dayData.count > 0 ? dayData.total / dayData.count : 0).toFixed(2))
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return Array.from(dataMap.values());
};

const calculateStats = (data, utilizationData, powerData, startTime, endTime, totalDays) => {
  const totalActiveHours = data.utilizations?.filter(item => {
    const time = new Date(item.created_at).getTime();
    return time >= startTime && time <= endTime && (item.type === true || item.type === 1);
  }).length * 0.5 || 0;
  
  const peakPower = powerData.reduce((max, item) => Math.max(max, item.power || 0), 0);
  const totalPower = powerData.reduce((sum, item) => sum + (item.power || 0), 0);
  const peakUtilization = utilizationData.reduce((max, item) => Math.max(max, item.utilization || 0), 0);
  
  return {
    avgUtilization: parseFloat(Math.min((totalActiveHours / (8 * totalDays)) * 100, 100).toFixed(1)),
    peakPower: parseFloat(peakPower.toFixed(2)),
    peakUtilization: parseFloat(peakUtilization.toFixed(1)),
    avgPowerPerDay: parseFloat((totalDays > 0 ? totalPower / totalDays : 0).toFixed(2)),
    totalDays
  };
};