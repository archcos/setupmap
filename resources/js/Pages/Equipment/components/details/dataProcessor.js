export const processHistoryData = (data, start, end) => {
  console.log('processHistoryData called with:', {
    equipmentId: data?.equipment_id,
    start,
    end,
    hasUtilizations: !!data?.utilizations,
    hasPowerConsumptions: !!data?.power_consumptions,
    utilizationCount: data?.utilizations?.length || 0,
    powerCount: data?.power_consumptions?.length || 0
  });

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const totalDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)));
  const isSingleDay = totalDays === 1;

  console.log('Date range:', {
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    totalDays,
    isSingleDay
  });

  const utilization = processUtilizationData(data, startTime, endTime, isSingleDay);
  const power = processPowerData(data, startTime, endTime, isSingleDay);
  const stats = calculateStats(data, utilization, power, startTime, endTime, totalDays, isSingleDay);

  console.log('Processed data:', {
    utilizationLength: utilization.length,
    powerLength: power.length,
    stats,
    sampleUtilization: utilization[0],
    samplePower: power[0]
  });

  return { utilization, power, stats, isSingleDay };
};

const processUtilizationData = (data, startTime, endTime, isSingleDay) => {
  if (!data.utilizations?.length) {
    console.log('No utilization data found');
    return [];
  }
  
  const filtered = data.utilizations.filter(item => {
    const time = new Date(item.created_at).getTime();
    return time >= startTime && time <= endTime;
  }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  console.log('Utilization filtering:', {
    totalRecords: data.utilizations.length,
    filteredRecords: filtered.length,
    firstRecordTime: filtered[0]?.created_at,
    lastRecordTime: filtered[filtered.length - 1]?.created_at
  });

  if (filtered.length === 0) {
    console.log('No utilization data in range');
    return [];
  }

  if (isSingleDay) {
    // Hourly data - show all 24 hours
    const hourlyMap = new Map();
    
    for (let h = 0; h < 24; h++) {
      const hourKey = h.toString().padStart(2, '0') + ':00';
      hourlyMap.set(hourKey, {
        time: hourKey,
        utilization: 0,
        activeMinutes: 0
      });
    }
    
    let activeStart = null;
    
    for (let i = 0; i < filtered.length; i++) {
      const currentTime = new Date(filtered[i].created_at);
      const isActive = filtered[i].type === true || filtered[i].type === 1 || filtered[i].type === 'true' || filtered[i].type === '1';
      const hourKey = currentTime.getHours().toString().padStart(2, '0') + ':00';
      
      if (isActive && !activeStart) {
        activeStart = currentTime;
      } else if (!isActive && activeStart) {
        const durationMs = currentTime.getTime() - activeStart.getTime();
        const activeMinutes = durationMs / (1000 * 60);
        
        // Distribute active minutes across hours in the range
        const startHour = activeStart.getHours();
        const endHour = currentTime.getHours();
        const hoursInRange = endHour - startHour + 1;
        
        for (let h = startHour; h <= endHour; h++) {
          const hKey = h.toString().padStart(2, '0') + ':00';
          const entry = hourlyMap.get(hKey);
          if (entry) {
            entry.activeMinutes += activeMinutes / hoursInRange;
            entry.utilization = parseFloat(Math.min((entry.activeMinutes / 60) * 100, 100).toFixed(1));
          }
        }
        activeStart = null;
      }
    }
    
    if (activeStart) {
      const endDate = new Date(endTime);
      const durationMs = endDate.getTime() - activeStart.getTime();
      const activeMinutes = durationMs / (1000 * 60);
      const startHour = activeStart.getHours();
      const hoursRemaining = 24 - startHour;
      
      for (let h = startHour; h < 24; h++) {
        const hKey = h.toString().padStart(2, '0') + ':00';
        const entry = hourlyMap.get(hKey);
        if (entry) {
          entry.activeMinutes += activeMinutes / hoursRemaining;
          entry.utilization = parseFloat(Math.min((entry.activeMinutes / 60) * 100, 100).toFixed(1));
        }
      }
    }
    
    return Array.from(hourlyMap.values());
  } else {
    // Multi-day - ONLY return days that have data (not all days in range)
    const dailyMap = new Map();
    
    let activeStart = null;
    
    for (let i = 0; i < filtered.length; i++) {
      const currentTime = new Date(filtered[i].created_at);
      const isActive = filtered[i].type === true || filtered[i].type === 1 || filtered[i].type === 'true' || filtered[i].type === '1';
      const dateKey = currentTime.toISOString().split('T')[0];
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          time: currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }),
          date: dateKey,
          utilization: 0,
          activeHours: 0
        });
      }
      
      if (isActive && !activeStart) {
        activeStart = currentTime;
      } else if (!isActive && activeStart) {
        const durationHours = (currentTime.getTime() - activeStart.getTime()) / (1000 * 60 * 60);
        const entry = dailyMap.get(dateKey);
        if (entry) {
          entry.activeHours += durationHours;
          entry.utilization = parseFloat(Math.min((entry.activeHours / 8) * 100, 100).toFixed(1));
        }
        activeStart = null;
      }
    }
    
    if (activeStart) {
      const durationHours = (endTime - activeStart.getTime()) / (1000 * 60 * 60);
      const dateKey = activeStart.toISOString().split('T')[0];
      const entry = dailyMap.get(dateKey);
      if (entry) {
        entry.activeHours += durationHours;
        entry.utilization = parseFloat(Math.min((entry.activeHours / 8) * 100, 100).toFixed(1));
      }
    }
    
    return Array.from(dailyMap.values());
  }
};

const processPowerData = (data, startTime, endTime, isSingleDay) => {
  if (!data.power_consumptions?.length) {
    console.log('No power data found');
    return [];
  }
  
  const filtered = data.power_consumptions.filter(item => {
    const time = new Date(item.created_at).getTime();
    return time >= startTime && time <= endTime;
  });

  console.log('Power filtering:', {
    totalRecords: data.power_consumptions.length,
    filteredRecords: filtered.length,
    firstRecordTime: filtered[0]?.created_at,
    lastRecordTime: filtered[filtered.length - 1]?.created_at
  });

  if (filtered.length === 0) {
    console.log('No power data in range');
    return [];
  }

  if (isSingleDay) {
    const hourlyMap = new Map();
    
    for (let h = 0; h < 24; h++) {
      const hourKey = h.toString().padStart(2, '0') + ':00';
      hourlyMap.set(hourKey, { time: hourKey, power: 0, count: 0 });
    }
    
    filtered.forEach(item => {
      const hour = new Date(item.created_at).getHours().toString().padStart(2, '0') + ':00';
      const entry = hourlyMap.get(hour);
      if (entry) {
        entry.power += (item.consumption || 0);
        entry.count++;
      }
    });
    
    hourlyMap.forEach(v => {
      v.power = v.count > 0 ? parseFloat((v.power / v.count).toFixed(2)) : 0;
      delete v.count;
    });
    
    return Array.from(hourlyMap.values());
  } else {
    // Multi-day - ONLY return days that have data
    const dailyMap = new Map();
    
    filtered.forEach(item => {
      const date = new Date(item.created_at);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }),
          date: dateKey,
          power: 0,
          count: 0
        });
      }
      
      const entry = dailyMap.get(dateKey);
      entry.power += (item.consumption || 0);
      entry.count++;
    });
    
    dailyMap.forEach(v => {
      v.power = v.count > 0 ? parseFloat((v.power / v.count).toFixed(2)) : 0;
      delete v.count;
    });
    
    return Array.from(dailyMap.values());
  }
};

const calculateStats = (data, utilizationData, powerData, startTime, endTime, totalDays, isSingleDay) => {
  let totalActiveHours = 0;
  
  if (data.utilizations?.length) {
    const filtered = data.utilizations.filter(item => {
      const time = new Date(item.created_at).getTime();
      return time >= startTime && time <= endTime;
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    let activeStart = null;
    
    for (let i = 0; i < filtered.length; i++) {
      const currentTime = new Date(filtered[i].created_at).getTime();
      const isActive = filtered[i].type === true || filtered[i].type === 1 || filtered[i].type === 'true' || filtered[i].type === '1';
      
      if (isActive && !activeStart) {
        activeStart = currentTime;
      } else if (!isActive && activeStart) {
        totalActiveHours += (currentTime - activeStart) / (1000 * 60 * 60);
        activeStart = null;
      }
    }
    
    if (activeStart) {
      totalActiveHours += (endTime - activeStart) / (1000 * 60 * 60);
    }
  }
  
  // Count days with actual data
  const daysWithData = new Set();
  const daysWithUtilization = new Set();
  const daysWithPower = new Set();
  
  if (data.utilizations?.length) {
    data.utilizations.forEach(item => {
      const time = new Date(item.created_at).getTime();
      if (time >= startTime && time <= endTime) {
        const dateKey = new Date(item.created_at).toISOString().split('T')[0];
        daysWithData.add(dateKey);
        daysWithUtilization.add(dateKey);
      }
    });
  }
  
  if (data.power_consumptions?.length) {
    data.power_consumptions.forEach(item => {
      const time = new Date(item.created_at).getTime();
      if (time >= startTime && time <= endTime) {
        const dateKey = new Date(item.created_at).toISOString().split('T')[0];
        daysWithData.add(dateKey);
        daysWithPower.add(dateKey);
      }
    });
  }
  
  const activeDays = daysWithData.size || 1;
  
  // Calculate peak power from raw data
  let peakPower = 0;
  let totalPower = 0;
  
  if (data.power_consumptions?.length) {
    const filteredPower = data.power_consumptions.filter(item => {
      const time = new Date(item.created_at).getTime();
      return time >= startTime && time <= endTime;
    });
    
    filteredPower.forEach(item => {
      const power = item.consumption || 0;
      totalPower += power;
      if (power > peakPower) peakPower = power;
    });
  }
  
  // Calculate peak utilization from raw data per day
  let peakUtilization = 0;
  
  if (data.utilizations?.length && daysWithUtilization.size > 0) {
    daysWithUtilization.forEach(dateKey => {
      const dayUtils = data.utilizations.filter(item => {
        const time = new Date(item.created_at).getTime();
        return time >= startTime && time <= endTime && 
               new Date(item.created_at).toISOString().split('T')[0] === dateKey;
      }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      let dayActiveHours = 0;
      let activeStart = null;
      
      for (let i = 0; i < dayUtils.length; i++) {
        const currentTime = new Date(dayUtils[i].created_at).getTime();
        const isActive = dayUtils[i].type === true || dayUtils[i].type === 1 || dayUtils[i].type === 'true' || dayUtils[i].type === '1';
        
        if (isActive && !activeStart) {
          activeStart = currentTime;
        } else if (!isActive && activeStart) {
          dayActiveHours += (currentTime - activeStart) / (1000 * 60 * 60);
          activeStart = null;
        }
      }
      
      if (activeStart) {
        const dayEnd = new Date(dateKey + 'T23:59:59.999').getTime();
        dayActiveHours += (Math.min(dayEnd, endTime) - activeStart) / (1000 * 60 * 60);
      }
      
      const dayUtilization = Math.min((dayActiveHours / 8) * 100, 100);
      if (dayUtilization > peakUtilization) {
        peakUtilization = dayUtilization;
      }
    });
  }
  
  // Average utilization: total active hours / (total days in range * 8 hours)
  const avgUtilization = parseFloat(Math.min((totalActiveHours / (8 * totalDays)) * 100, 100).toFixed(1));
  
  // Average power per day: total power / total days in range
  const avgPowerPerDay = totalDays > 0 ? parseFloat((totalPower / totalDays).toFixed(2)) : 0;
  
  console.log('Stats calculated:', {
    totalActiveHours,
    activeDays,
    daysWithUtilization: daysWithUtilization.size,
    daysWithPower: daysWithPower.size,
    totalDaysInRange: totalDays,
    avgUtilization,
    peakUtilization,
    peakPower,
    totalPower,
    avgPowerPerDay
  });
  
  return {
    avgUtilization,
    peakPower: parseFloat(peakPower.toFixed(2)),
    peakUtilization: parseFloat(peakUtilization.toFixed(1)),
    avgPowerPerDay,
    totalDays, // Total days in range
    activeDays, // Days with actual data
    totalDaysInRange: totalDays
  };
};