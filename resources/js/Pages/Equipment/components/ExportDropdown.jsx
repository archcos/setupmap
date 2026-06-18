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
    const headers = ['Date/Time', 'Utilization (%)', 'Power (W)'];
    const maxLength = Math.max(utilizationData.length, powerData.length);
    const rows = [];
    
    for (let i = 0; i < maxLength; i++) {
      const utilItem = utilizationData[i] || {};
      const powerItem = powerData[i] || {};
      rows.push([
        utilItem.fullDate || utilItem.time || powerItem.fullDate || powerItem.time || '',
        utilItem.utilization?.toFixed(2) || '0',
        powerItem.power?.toFixed(2) || '0'
      ]);
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
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Equipment Report - ${equipment.equipment_name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; }
          .container { max-width: 1100px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; }
          .header .subtitle { color: #64748b; margin-top: 5px; }
          .filters-section { background: #f1f5f9; padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
          .filters-section h3 { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .filters-section p { font-size: 14px; margin: 4px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
          .stat-card { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; }
          .stat-card .number { font-size: 28px; font-weight: 700; color: #2563eb; }
          .stat-card .label { font-size: 12px; color: #64748b; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1e293b; color: white; padding: 10px 14px; text-align: left; }
          td { padding: 8px 14px; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
          ${includeCharts ? `
          .chart-section { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
          .chart-section h3 { margin-bottom: 15px; color: #475569; }
          .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .chart-box { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .chart-box .title { font-weight: 600; margin-bottom: 10px; font-size: 14px; }
          .bar-chart { display: flex; align-items: flex-end; height: 150px; gap: 4px; padding: 10px 0; }
          .bar { flex: 1; background: #3b82f6; border-radius: 3px 3px 0 0; min-height: 4px; }
          .bar-label { font-size: 9px; text-align: center; margin-top: 4px; color: #64748b; transform: rotate(-45deg); }
          ` : ''}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Equipment Report</h1>
            <p class="subtitle"><strong>Equipment:</strong> ${equipment.equipment_name} (ID: ${equipment.equipment_id})</p>
            <p class="subtitle"><strong>Specifications:</strong> ${equipment.equipment_specifications || 'N/A'}</p>
            <p class="subtitle"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${filterDescriptions.length > 0 ? `
            <div class="filters-section">
              <h3>Applied Filters</h3>
              ${filterDescriptions.map(desc => `<p>• ${desc}</p>`).join('')}
            </div>
          ` : ''}
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="number">${statsData.avgUtilization.toFixed(1)}%</div>
              <div class="label">Average Utilization (${statsData.totalDays} days)</div>
            </div>
            <div class="stat-card">
              <div class="number">${statsData.peakPower.toFixed(1)}W</div>
              <div class="label">Peak Power</div>
            </div>
            <div class="stat-card">
              <div class="number">${statsData.peakUtilization.toFixed(1)}%</div>
              <div class="label">Peak Utilization</div>
            </div>
          </div>
          
          ${includeCharts && utilizationData.length > 0 ? `
            <div class="chart-section">
              <h3>Performance Charts</h3>
              <div class="chart-grid">
                <div class="chart-box">
                  <div class="title">Utilization</div>
                  <div class="bar-chart">
                    ${utilizationData.slice(0, 24).map(item => `
                      <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
                        <div class="bar" style="height:${(item.utilization || 0) * 1.5}px;"></div>
                        <div class="bar-label">${item.time || ''}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div class="chart-box">
                  <div class="title">Power Consumption</div>
                  <div class="bar-chart">
                    ${powerData.slice(0, 24).map(item => `
                      <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
                        <div class="bar" style="height:${Math.min((item.power || 0) * 0.5, 150)}px;background:#f59e0b;"></div>
                        <div class="bar-label">${item.time || ''}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
          
          <table>
            <thead><tr><th>Date/Time</th><th>Utilization (%)</th><th>Power (W)</th></tr></thead>
            <tbody>
              ${utilizationData.slice(0, 50).map((item, index) => `
                <tr>
                  <td>${item.fullDate || item.time || ''}</td>
                  <td>${item.utilization?.toFixed(2) || '0'}</td>
                  <td>${powerData[index]?.power?.toFixed(2) || '0'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated from Equipment Management System</p>
            <p>${dateRangeLabel}</p>
            <p style="margin-top:10px;color:#cbd5e1;font-size:11px;">Report ID: ${filterLabel}_${new Date().getTime()}</p>
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
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; }
          .header .subtitle { color: #64748b; margin-top: 5px; }
          .filters-section { background: #f1f5f9; padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
          .filters-section h3 { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .filters-section p { font-size: 14px; margin: 4px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
          .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
          .stat-card .number { font-size: 28px; font-weight: 700; color: #2563eb; }
          .stat-card .number.green { color: #22c55e; }
          .stat-card .number.gray { color: #94a3b8; }
          .stat-card .label { font-size: 12px; color: #64748b; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
          th { background: #1e293b; color: white; padding: 10px 14px; text-align: left; font-weight: 600; }
          td { padding: 8px 14px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #fafbfc; }
          .status-active { color: #22c55e; font-weight: 600; }
          .status-inactive { color: #94a3b8; font-weight: 600; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
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
            <p>Generated from Equipment Management System</p>
            <p>${dateRangeLabel}</p>
            <p style="margin-top:10px;color:#cbd5e1;font-size:11px;">Report ID: ${filterLabel}_${new Date().getTime()}</p>
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
      
      const win = window.open('', '_blank', 'width=1200,height=800');
      if (win) {
        win.document.write(htmlContent);
        win.document.close();
        setTimeout(() => win.print(), 500);
      } else {
        alert('Please allow popups to download the PDF report.');
      }
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
                <p key={i} className="text-xs text-gray-600 mt-0.5">• {desc}</p>
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