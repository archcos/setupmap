import { useState } from 'react';
import { ArrowLeft, Activity, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function EquipmentHeader({ dateRangeLabel, allEquipmentData }) {
  const [showExport, setShowExport] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const downloadCSV = () => {
    setDownloading(true);
    const headers = ['ID', 'Name', 'Owner', 'Location', 'Status', 'Utilization %', 'Hours', 'Power'];
    const rows = allEquipmentData.map(e => [
      e.equipment_id, e.equipment_name, e.owner, e.expected_location,
      e.is_active ? 'Active' : 'Inactive',
      (e.utilization_percentage_8h || 0).toFixed(1) + '%',
      (e.utilization_hours_8h || 0).toFixed(2),
      (e.is_active ? e.power_consumption || 0 : 0).toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `equipment_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setDownloading(false);
    setShowExport(false);
  };

  const downloadPDF = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Equipment Report</title>
      <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1e293b;color:#fff}</style></head>
      <body><h1>Equipment Report</h1><p>${dateRangeLabel}</p>
      <table><tr><th>ID</th><th>Name</th><th>Owner</th><th>Location</th><th>Status</th><th>Utilization</th><th>Power</th></tr>
      ${allEquipmentData.map(e => `<tr><td>${e.equipment_id}</td><td>${e.equipment_name}</td><td>${e.owner}</td><td>${e.expected_location}</td><td>${e.is_active?'Active':'Inactive'}</td><td>${(e.utilization_percentage_8h||0).toFixed(1)}%</td><td>${e.is_active?(e.power_consumption||0).toFixed(1):0}W</td></tr>`).join('')}
      </table></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
    setShowExport(false);
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.visit('/')} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Activity className="text-blue-600" size={24} />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Equipment Management</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline">{dateRangeLabel}</span>
            <div className="relative">
              <button onClick={() => setShowExport(!showExport)} disabled={downloading}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={14} />
              </button>
              {showExport && (
                <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 min-w-[160px]">
                  <button onClick={downloadCSV} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm">
                    <FileSpreadsheet size={16} className="text-green-600" />CSV
                  </button>
                  <button onClick={downloadPDF} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm border-t">
                    <FileText size={16} className="text-red-600" />PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}