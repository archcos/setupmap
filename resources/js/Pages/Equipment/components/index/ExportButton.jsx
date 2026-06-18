// components/common/ExportButton.jsx
import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { downloadCSV, downloadPDF, filterDataForExport } from './downloadUtils';

export default function ExportButton({ 
  data, 
  filters, 
  dateRangeLabel,
  buttonText = 'Export',
  variant = 'primary',
  size = 'medium'
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const dataToExport = data.length > 0 ? data : filterDataForExport(data, filters);
  const count = dataToExport.length;

  if (count === 0) return null;

  const handleExport = (format) => {
    setLoading(true);
    try {
      if (format === 'csv') {
        downloadCSV(dataToExport, filters, dateRangeLabel);
      } else if (format === 'pdf') {
        downloadPDF(dataToExport, filters, dateRangeLabel);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`);
    } finally {
      setLoading(false);
      setShowDropdown(false);
    }
  };

  const getButtonStyles = () => {
    const base = 'flex items-center gap-2 rounded-lg font-medium transition-colors';
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
    return `${base} ${sizes[size] || sizes.medium} ${variants[variant] || variants.primary}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className={getButtonStyles()}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download size={16} />
            <span className="hidden sm:inline">{buttonText}</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{count}</span>
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {showDropdown && !loading && (
        <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 min-w-[200px] py-1">
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm transition-colors"
          >
            <FileSpreadsheet size={16} className="text-green-600" />
            <span>Download CSV</span>
            <span className="text-xs text-gray-400 ml-auto">.csv</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-sm border-t transition-colors"
          >
            <FileText size={16} className="text-red-600" />
            <span>Download PDF</span>
            <span className="text-xs text-gray-400 ml-auto">.pdf</span>
          </button>
        </div>
      )}
    </div>
  );
}