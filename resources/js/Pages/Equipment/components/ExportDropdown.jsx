// components/common/ExportDropdown.jsx
import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader } from 'lucide-react';

export default function ExportDropdown({ 
  // For equipment details page
  equipment = null,
  utilizationData = [],
  powerData = [],
  stats = null,
  dateRangeLabel = '',
  
  // For equipment list page
  data = [],
  filteredData = [],
  filters = {},
  
  // Common props
  loading = false,
  buttonText = 'Export',
  buttonVariant = 'primary',
  buttonSize = 'medium',
  showCount = true,
  includeCharts = false,
  onExportStart = () => {},
  onExportEnd = () => {},
}) {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if we're in details view or list view
  const isDetailsView = !!equipment;
  const isListView = !isDetailsView && (data.length > 0 || filteredData.length > 0);

  // Get data to export
  const getDataToExport = () => {
    if (isDetailsView && equipment) {
      return [equipment];
    }
    
    if (filteredData && filteredData.length > 0) {
      return filteredData;
    }
    
    if (data && data.length > 0) {
      let result = [...data];
      if (filters.status === 'active') {
        result = result.filter(e => e.is_active);
      } else if (filters.status === 'inactive') {
        result = result.filter(e => !e.is_active);
      }
      if (filters.location && filters.location !== 'all') {
        result = result.filter(e => e.expected_location === filters.location);
      }
      return result;
    }
    
    return [];
  };

  const exportData = getDataToExport();
  const exportCount = exportData.length;

  // Generate filter label for filename
  const getFilterLabel = () => {
    if (isDetailsView && equipment) {
      return `equipment_${equipment.equipment_id}`;
    }
    
    const parts = [];
    if (filters.location && filters.location !== 'all') {
      parts.push(filters.location.replace(/\s+/g, '_'));
    }
    if (filters.status && filters.status !== 'all') {
      parts.push(filters.status);
    }
    if (filters.dateFilter) {
      const dateStr = new Date(filters.selectedDate).toISOString().split('T')[0];
      parts.push(`${filters.dateFilter}_${dateStr}`);
    }
    return parts.length > 0 ? parts.join('_') : 'all';
  };

  // Generate filter descriptions for PDF
  const getFilterDescriptions = () => {
    const descriptions = [];
    
    if (isDetailsView && equipment) {
      descriptions.push(`Equipment: ${equipment.equipment_name} (ID: ${equipment.equipment_id})`);
      if (equipment.expected_location) {
        descriptions.push(`Location: ${equipment.expected_location}`);
      }
      descriptions.push(`Status: ${equipment.is_active ? 'Active' : 'Inactive'}`);
      if (dateRangeLabel) {
        descriptions.push(`Period: ${dateRangeLabel}`);
      }
      return descriptions;
    }
    
    if (filters.location && filters.location !== 'all') {
      descriptions.push(`Location: ${filters.location}`);
    }
    if (filters.status && filters.status !== 'all') {
      descriptions.push(`Status: ${filters.status === 'active' ? 'Active' : 'Inactive'}`);
    }
    if (dateRangeLabel) {
      descriptions.push(`Period: ${dateRangeLabel}`);
    }
    return descriptions;
  };

  // Generate CSV content for equipment list
  const generateListCSV = (data) => {
    const headers = ['ID', 'Name', 'Owner', 'Location', 'Status', 'Utilization %', 'Hours (8h)', 'Power (W)'];
    
    const rows = data.map(e => [
      e.equipment_id || '',
      e.equipment_name || '',
      e.owner || '',
      e.expected_location || '',
      e.is_active ? 'Active' : 'Inactive',
      (e.utilization_percentage_8h || 0).toFixed(1) + '%',
      (e.utilization_hours_8h || 0).toFixed(2),
      (e.is_active ? (e.power_consumption || 0) : 0).toFixed(2)
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  // Generate CSV content for equipment details
  const generateDetailsCSV = () => {
    const headers = ['Date/Time', 'Utilization (%)', 'Hours', 'Power (W)'];
    const maxLength = Math.max(utilizationData.length, powerData.length);
    const rows = [];
    
    // Group data by day and filter out days with 0 power
    const dailyData = new Map();
    
    for (let i = 0; i < maxLength; i++) {
      const utilItem = utilizationData[i] || {};
      const powerItem = powerData[i] || {};
      const dateKey = utilItem.date || powerItem.date || utilItem.fullDate?.split(' ')[0] || powerItem.fullDate?.split(' ')[0] || '';
      
      if (dateKey) {
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { 
            date: dateKey, 
            totalPower: 0, 
            entries: [] 
          });
        }
        
        const dayData = dailyData.get(dateKey);
        dayData.totalPower += parseFloat(powerItem.power || '0');
        dayData.entries.push({
          dateTime: utilItem.fullDate || utilItem.time || powerItem.fullDate || powerItem.time || '',
          utilization: utilItem.utilization?.toFixed(2) || '0',
          power: powerItem.power?.toFixed(2) || '0'
        });
      }
    }
    
    // Only include days that have power data
    const activeDays = Array.from(dailyData.values())
      .filter(day => day.totalPower > 0);
    
    activeDays.forEach(day => {
      day.entries.forEach(entry => {
        const utilizationValue = parseFloat(entry.utilization);
        const hours = (utilizationValue / 100 * 8).toFixed(2);
        rows.push([
          entry.dateTime,
          entry.utilization,
          hours,
          entry.power
        ]);
      });
    });
    
    // Add summary row
    if (activeDays.length > 0) {
      const totalDays = dailyData.size;
      const excludedDays = totalDays - activeDays.length;
      rows.push(['', '', '', '']);
      rows.push(['Note: 100% Utilization = 8 Hours', '', '', '']);
      rows.push([`Only ${activeDays.length} days with utilization shown. ${excludedDays} days with no activity excluded.`, '', '', '']);
    }
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  // Download CSV
  const downloadCSV = () => {
    setExporting(true);
    onExportStart?.();
    
    try {
      let csvContent;
      let filename;
      
      if (isDetailsView) {
        csvContent = generateDetailsCSV();
        filename = `equipment_${equipment.equipment_id}_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        csvContent = generateListCSV(exportData);
        const filterLabel = getFilterLabel();
        filename = `equipment_${filterLabel}_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('CSV download error:', error);
      alert('Failed to download CSV. Please try again.');
    } finally {
      setExporting(false);
      onExportEnd?.();
      setShowExportDropdown(false);
    }
  };

  // Get active days data (days with power > 0)
  const getActiveDaysData = () => {
    const maxLength = Math.max(utilizationData.length, powerData.length);
    const dailyData = new Map();
    
    for (let i = 0; i < maxLength; i++) {
      const utilItem = utilizationData[i] || {};
      const powerItem = powerData[i] || {};
      const dateKey = utilItem.date || powerItem.date || 
                      (utilItem.fullDate ? utilItem.fullDate.split(' ')[0] : '') || 
                      (powerItem.fullDate ? powerItem.fullDate.split(' ')[0] : '') || '';
      
      if (dateKey) {
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { 
            date: dateKey, 
            totalPower: 0, 
            totalUtilization: 0,
            entryCount: 0,
            entries: [] 
          });
        }
        
        const dayData = dailyData.get(dateKey);
        const power = parseFloat(powerItem.power || '0');
        const utilization = parseFloat(utilItem.utilization || '0');
        
        dayData.totalPower += power;
        dayData.totalUtilization += utilization;
        dayData.entryCount++;
        dayData.entries.push({
          dateTime: utilItem.fullDate || utilItem.time || powerItem.fullDate || powerItem.time || '',
          utilization: utilization,
          power: power
        });
      }
    }
    
    // Separate active and inactive days
    const allDays = Array.from(dailyData.values());
    const activeDays = allDays.filter(day => day.totalPower > 0);
    const inactiveDays = allDays.filter(day => day.totalPower === 0);
    
    return {
      activeDays,
      inactiveDays,
      totalDays: allDays.length,
      activeDaysCount: activeDays.length,
      inactiveDaysCount: inactiveDays.length
    };
  };

  // Generate PDF HTML content
  const generatePDFHTML = () => {
    const filterDescriptions = getFilterDescriptions();
    const filterLabel = getFilterLabel();
    
    if (isDetailsView) {
      // Details view PDF
      return generateDetailsPDFHTML(filterDescriptions, filterLabel);
    } else {
      // List view PDF
      return generateListPDFHTML(filterDescriptions, filterLabel);
    }
  };

const generateDetailsPDFHTML = (filterDescriptions, filterLabel) => {
    const statsData = stats || { avgUtilization: 0, peakPower: 0, peakUtilization: 0, avgPowerPerDay: 0, totalDays: 0 };
    const daysData = getActiveDaysData();
    
    // Calculate average power across ALL days (including inactive days)
    const totalPowerAllDays = daysData.activeDays.reduce((sum, day) => sum + day.totalPower, 0);
    const avgPowerPerDay = daysData.totalDays > 0 ? totalPowerAllDays / daysData.totalDays : 0;
    
    // Calculate total utilization hours across active days
    const totalUtilizationHours = daysData.activeDays.reduce((sum, day) => {
      const avgDayUtilization = day.totalUtilization / day.entryCount;
      const dayHours = (avgDayUtilization / 100) * 8;
      return sum + dayHours;
    }, 0);
    
    // Average hours per day (against total days, 8hrs per day expected)
    const avgHoursPerDay = daysData.totalDays > 0 ? totalUtilizationHours / daysData.totalDays : 0;
    
    // Average utilization across all days
    const avgUtilizationAllDays = daysData.totalDays > 0 ? 
      daysData.activeDays.reduce((sum, day) => sum + (day.totalUtilization / day.entryCount), 0) / daysData.totalDays : 0;
    
    // Peak power from active days
    const peakPower = Math.max(...daysData.activeDays.map(day => 
      Math.max(...day.entries.map(entry => entry.power))
    ), 0);
    
    // Peak utilization from active days
    const peakUtilization = Math.max(...daysData.activeDays.map(day => 
      Math.max(...day.entries.map(entry => entry.utilization))
    ), 0);
    
    // Calculate peak hours (based on peak utilization)
    const peakHours = (peakUtilization / 100) * 8;
    
    // Calculate utilization rate
    const utilizationRate = (avgHoursPerDay / 8) * 100;
    
    // Get location and status from filter descriptions
    const locationText = equipment?.expected_location || '';
    const statusText = equipment?.is_active ? 'Active' : 'Inactive';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Equipment Report - ${equipment.equipment_name}</title>
        <style>
          @page {
            margin: 0.25in;
            size: auto;
          }
          @media print {
            @page {
              margin: 0.25in;
            }
            body {
              margin: 0;
              padding: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f8fafc; color: #1e293b; }
          .container { max-width: 100%; margin: 0 auto; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 24px; }
          .header .subtitle { color: #64748b; margin-top: 4px; font-size: 13px; }
          .header .info-row { display: flex; gap: 20px; margin-top: 8px; }
          .header .info-item { font-size: 13px; color: #475569; }
          .header .info-item strong { color: #1e293b; }
          .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 15px 0; }
          .stat-card { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; position: relative; }
          .stat-card .number { font-size: 20px; font-weight: 700; color: #2563eb; }
          .stat-card .number.green { color: #22c55e; }
          .stat-card .number.gray { color: #94a3b8; }
          .stat-card .number.orange { color: #f59e0b; }
          .stat-card .number.purple { color: #8b5cf6; }
          .stat-card .number.red { color: #ef4444; }
          .stat-card .label { font-size: 10px; color: #64748b; margin-top: 6px; }
          .stat-card .tooltip { font-size: 9px; color: #94a3b8; margin-top: 4px; font-style: italic; }
          .note-section { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px 15px; margin: 15px 0; }
          .note-section p { font-size: 12px; color: #92400e; margin: 3px 0; }
          .note-section .note-title { font-weight: 600; color: #d97706; margin-bottom: 8px; }
          .note-section .calculation { background: white; border-radius: 4px; padding: 8px 10px; margin: 8px 0; font-family: 'Courier New', monospace; font-size: 11px; color: #78350f; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; }
          td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
          .day-separator { background: #f1f5f9; font-weight: 600; color: #475569; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Equipment Report</h1>
            <p class="subtitle"><strong>Equipment:</strong> ${equipment.equipment_name} (ID: ${equipment.equipment_id})</p>
            <p class="subtitle"><strong>Specifications:</strong> ${equipment.equipment_specifications || 'N/A'}</p>
            <div class="info-row">
              <span class="info-item"><strong>Period:</strong> ${dateRangeLabel || 'N/A'}</span>
              <span class="info-item"><strong>Status:</strong> ${statusText}</span>
              <span class="info-item"><strong>Location:</strong> ${locationText || 'N/A'}</span>
            </div>
            <p class="subtitle" style="margin-top: 8px;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="number">${avgUtilizationAllDays.toFixed(2)}%</div>
              <div class="label">Avg Utilization</div>
              <div class="tooltip">Across ${daysData.totalDays} days</div>
            </div>
            <div class="stat-card">
              <div class="number">${peakUtilization.toFixed(2)}%</div>
              <div class="label">Peak Utilization</div>
              <div class="tooltip">Highest recorded</div>
            </div>
            <div class="stat-card">
              <div class="number red">${peakHours.toFixed(2)}h</div>
              <div class="label">Peak Hours</div>
              <div class="tooltip">${peakUtilization.toFixed(2)}% of 8h</div>
            </div>
            <div class="stat-card">
              <div class="number purple">${avgHoursPerDay.toFixed(2)}h</div>
              <div class="label">Avg Hours/Day</div>
              <div class="tooltip">Of 8h expected per day</div>
            </div>
            <div class="stat-card">
              <div class="number orange">${avgPowerPerDay.toFixed(2)}W</div>
              <div class="label">Avg Power/Day</div>
              <div class="tooltip">Across ${daysData.totalDays} days</div>
            </div>
            <div class="stat-card">
              <div class="number orange">${peakPower.toFixed(2)}W</div>
              <div class="label">Peak Power</div>
              <div class="tooltip">Highest recorded</div>
            </div>
          </div>
          
          <table>
            <thead><tr><th>Date/Time</th><th>Utilization (%)</th><th>Hours (8h)</th><th>Power (W)</th></tr></thead>
            <tbody>
              ${daysData.activeDays.map(day => {
                const avgDayUtil = day.totalUtilization / day.entryCount;
                const avgDayHours = (avgDayUtil / 100) * 8;
                const avgDayPower = day.totalPower / day.entryCount;
                
                return `
                <tr class="day-separator">
                  <td colspan="4">
                    📅 ${day.date} | 
                    Avg: ${avgDayUtil.toFixed(2)}% (${avgDayHours.toFixed(2)}h) | 
                    Avg Power: ${avgDayPower.toFixed(2)}W | 
                    ${day.entries.length} readings
                  </td>
                </tr>
                ${day.entries.map(entry => {
                  const hours = (entry.utilization / 100 * 8).toFixed(2);
                  return `
                    <tr>
                      <td>${entry.dateTime}</td>
                      <td>${entry.utilization.toFixed(2)}</td>
                      <td>${hours}</td>
                      <td>${entry.power.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              `;
              }).join('')}
            </tbody>
          </table>
          
          ${daysData.totalDays > 0 ? `
            <div class="note-section">
              <p class="note-title">📌 Important Notes & Calculations</p>
              
              <div class="calculation">
                <strong>📐 Conversion Formula:</strong> Hours = (Utilization% ÷ 100) × 8<br>
                <strong>Example:</strong> 50% utilization = (50 ÷ 100) × 8 = 4.00 hours
              </div>
              
              <div class="calculation">
                <strong>📊 Average Utilization Calculation:</strong><br>
                Sum of (Daily Average Utilization) ÷ ${daysData.totalDays} total days = ${avgUtilizationAllDays.toFixed(2)}%<br>
                <small>Only days with power consumption are included in daily averages</small>
              </div>
              
              <div class="calculation">
                <strong>🔺 Peak Hours Calculation:</strong><br>
                (Peak Utilization ${peakUtilization.toFixed(2)}% ÷ 100) × 8 hours = ${peakHours.toFixed(2)} hours<br>
                <small>Highest single utilization reading converted to hours</small>
              </div>
              
              <div class="calculation">
                <strong>⏱️ Average Hours Per Day Calculation:</strong><br>
                Total hours from active days (${totalUtilizationHours.toFixed(2)}h) ÷ ${daysData.totalDays} total days = ${avgHoursPerDay.toFixed(2)} hours/day<br>
                <strong>Expected:</strong> 8.00 hours/day | <strong>Actual:</strong> ${avgHoursPerDay.toFixed(2)} hours/day<br>
                <strong>Utilization Rate:</strong> ${utilizationRate.toFixed(2)}% of expected
              </div>
              
              <div class="calculation">
                <strong>⚡ Average Power Per Day Calculation:</strong><br>
                Total power (${totalPowerAllDays.toFixed(2)}W) ÷ ${daysData.totalDays} total days = ${avgPowerPerDay.toFixed(2)}W/day<br>
                <small>Power is averaged across ALL days (including ${daysData.inactiveDaysCount} days with no consumption)</small>
              </div>
              
              <p style="margin-top: 10px;">
                <strong>📅 Days Summary:</strong><br>
                • <strong>${daysData.activeDaysCount} days</strong> with utilization (power consumption detected)<br>
                • <strong>${daysData.inactiveDaysCount} days</strong> without utilization (excluded from table below)<br>
                • <strong>${daysData.totalDays} total days</strong> in selected period
              </p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Generated from SETUP P3 Portal</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generateListPDFHTML = (filterDescriptions, filterLabel) => {
    const activeCount = exportData.filter(e => e.is_active).length;
    const inactiveCount = exportData.filter(e => !e.is_active).length;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Equipment Report - ${filterLabel}</title>
        <style>
          @page {
            margin: 0.25in;
            size: auto;
          }
          @media print {
            @page {
              margin: 0.25in;
            }
            body {
              margin: 0;
              padding: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f8fafc; color: #1e293b; }
          .container { max-width: 100%; margin: 0 auto; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 24px; }
          .header .subtitle { color: #64748b; margin-top: 4px; font-size: 13px; }
          .filters-section { background: #f1f5f9; padding: 12px 15px; border-radius: 8px; margin: 15px 0; }
          .filters-section h3 { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .filters-section p { font-size: 13px; margin: 3px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 15px 0; }
          .stat-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
          .stat-card .number { font-size: 24px; font-weight: 700; color: #2563eb; }
          .stat-card .number.green { color: #22c55e; }
          .stat-card .number.gray { color: #94a3b8; }
          .stat-card .label { font-size: 11px; color: #64748b; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
          th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
          td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #fafbfc; }
          .status-active { color: #22c55e; font-weight: 600; }
          .status-inactive { color: #94a3b8; font-weight: 600; }
          .footer { margin-top: 10px; padding-top: 10px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          .print-tip { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Equipment Report</h1>
            <p class="subtitle">Generated: ${new Date().toLocaleString()}</p>
            <p class="subtitle">Total Equipment: ${exportData.length}</p>
          </div>
          
          ${filterDescriptions.length > 0 ? `
            <div class="filters-section">
              <h3>Applied Filters</h3>
              ${filterDescriptions.map(desc => `<p>• ${desc}</p>`).join('')}
            </div>
          ` : ''}
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="number">${exportData.length}</div>
              <div class="label">Total Equipment</div>
            </div>
            <div class="stat-card">
              <div class="number green">${activeCount}</div>
              <div class="label">Active</div>
            </div>
            <div class="stat-card">
              <div class="number gray">${inactiveCount}</div>
              <div class="label">Inactive</div>
            </div>
            <div class="stat-card">
              <div class="number">${exportData.length > 0 ? Math.round((activeCount / exportData.length) * 100) : 0}%</div>
              <div class="label">Active Rate</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Owner</th>
                <th>Location</th>
                <th>Status</th>
                <th>Utilization %</th>
                <th>Hours (8h)</th>
                <th>Power (W)</th>
              </tr>
            </thead>
            <tbody>
              ${exportData.slice(0, 100).map(e => `
                <tr>
                  <td><strong>${e.equipment_id || ''}</strong></td>
                  <td>${e.equipment_name || ''}</td>
                  <td>${e.owner || ''}</td>
                  <td>${e.expected_location || ''}</td>
                  <td class="${e.is_active ? 'status-active' : 'status-inactive'}">
                    ${e.is_active ? '● Active' : '○ Inactive'}
                  </td>
                  <td>${(e.utilization_percentage_8h || 0).toFixed(1)}%</td>
                  <td>${(e.utilization_hours_8h || 0).toFixed(2)}h</td>
                  <td>${e.is_active ? (e.power_consumption || 0).toFixed(1) : '0'}W</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${exportData.length > 100 ? `
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:10px;">
              Showing first 100 of ${exportData.length} records
            </p>
          ` : ''}
          
          <div class="footer">
            <p>Generated from SETUP P3 Portal</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Download PDF
  const downloadPDF = () => {
    setExporting(true);
    onExportStart?.();
    
    try {
      const htmlContent = generatePDFHTML();
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      iframe.contentDocument.write(htmlContent);
      iframe.contentDocument.close();
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };
      
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to generate PDF report.');
    } finally {
      setExporting(false);
      onExportEnd?.();
      setShowExportDropdown(false);
    }
  };

  // Get button styles
  const getButtonStyles = () => {
    const base = 'flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50';
    const sizes = {
      small: 'px-2.5 py-1.5 text-xs',
      medium: 'px-3 py-2 text-sm',
      large: 'px-4 py-2.5 text-base'
    };
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
      outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
    };
    return `${base} ${sizes[buttonSize] || sizes.medium} ${variants[buttonVariant] || variants.primary}`;
  };

  // Don't render if no data
  if (!isDetailsView && exportCount === 0 && !loading) {
    return null;
  }

  // Check if we have data for details view
  if (isDetailsView && !equipment) {
    return null;
  }

  return (
    <div className="relative" ref={exportDropdownRef}>
      <button
        onClick={() => setShowExportDropdown(!showExportDropdown)}
        disabled={exporting || loading || (!isDetailsView && exportCount === 0)}
        className={getButtonStyles()}
      >
        {exporting ? (
          <Loader size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        <span className="hidden sm:inline">
          {exporting ? 'Exporting...' : buttonText}
        </span>
        {!exporting && showCount && isListView && exportCount > 0 && (
          <span className={`${buttonVariant === 'primary' ? 'bg-white/20' : 'bg-gray-200'} px-1.5 py-0.5 rounded text-xs`}>
            {exportCount}
          </span>
        )}
        {!exporting && <ChevronDown size={14} />}
      </button>
      
      {showExportDropdown && !exporting && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[220px] overflow-hidden">
          {getFilterDescriptions().length > 0 && (
            <div className="px-4 py-2 border-b bg-gray-50">
              <p className="text-xs text-gray-500">
                {isDetailsView ? 'Exporting equipment data' : `Exporting ${exportCount} items`}
              </p>
              {getFilterDescriptions().slice(0, 2).map((desc, i) => (
                <p key={i} className="text-xs text-gray-600 mt-0.5">• ${desc}</p>
              ))}
              {getFilterDescriptions().length > 2 && (
                <p className="text-xs text-gray-400 mt-0.5">+{getFilterDescriptions().length - 2} more filters</p>
              )}
            </div>
          )}
          
          <button 
            onClick={downloadCSV} 
            disabled={exporting} 
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
          >
            <FileSpreadsheet size={16} className="text-green-600" />
            <span>Export as CSV</span>
            <span className="text-xs text-gray-400 ml-auto">.csv</span>
          </button>
          
          <button 
            onClick={downloadPDF} 
            disabled={exporting} 
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-700 transition-colors border-t border-gray-100"
          >
            <FileText size={16} className="text-red-600" />
            <span>Export as PDF</span>
            <span className="text-xs text-gray-400 ml-auto">.pdf</span>
          </button>
        </div>
      )}
    </div>
  );
}