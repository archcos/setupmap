import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader } from 'lucide-react';

export default function ExportDropdown({ equipment, utilizationData, powerData, stats, dateRangeLabel, loading }) {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const downloadCSV = () => {
    setExporting(true);
    try {
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

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `equipment_${equipment.equipment_id}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV download error:', error);
      alert('Failed to download CSV.');
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const downloadPDF = () => {
    setExporting(true);
    try {
      const reportHTML = `
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
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
            .stat-card { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-card .number { font-size: 28px; font-weight: 700; color: #2563eb; }
            .stat-card .label { font-size: 12px; color: #64748b; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #1e293b; color: white; padding: 10px 14px; text-align: left; }
            td { padding: 8px 14px; border-bottom: 1px solid #e2e8f0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Equipment Report</h1>
              <p><strong>Equipment:</strong> ${equipment.equipment_name} (ID: ${equipment.equipment_id})</p>
              <p><strong>Specifications:</strong> ${equipment.equipment_specifications || 'N/A'}</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
            </div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="number">${stats.avgUtilization.toFixed(1)}%</div>
                <div class="label">Average Utilization (${stats.totalDays} days)</div>
              </div>
              <div class="stat-card">
                <div class="number">${stats.peakPower.toFixed(1)}W</div>
                <div class="label">Peak Power</div>
              </div>
              <div class="stat-card">
                <div class="number">${stats.peakUtilization.toFixed(1)}%</div>
                <div class="label">Peak Utilization</div>
              </div>
            </div>
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
            <div class="footer"><p>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
          </div>
        </body>
        </html>
      `;
      
      const win = window.open('', '_blank', 'width=1200,height=800');
      if (win) {
        win.document.write(reportHTML);
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
      setShowExportDropdown(false);
    }
  };

  return (
    <div className="relative" ref={exportDropdownRef}>
      <button
        onClick={() => setShowExportDropdown(!showExportDropdown)}
        disabled={exporting || loading}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
      >
        {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
        <span className="hidden sm:inline">Export</span>
        <ChevronDown size={14} />
      </button>
      
      {showExportDropdown && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] overflow-hidden">
          <button onClick={downloadCSV} disabled={exporting} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-700 transition-colors">
            <FileSpreadsheet size={16} className="text-green-600" />Export as CSV
          </button>
          <button onClick={downloadPDF} disabled={exporting} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-700 transition-colors border-t border-gray-100">
            <FileText size={16} className="text-red-600" />Export as PDF Report
          </button>
        </div>
      )}
    </div>
  );
}