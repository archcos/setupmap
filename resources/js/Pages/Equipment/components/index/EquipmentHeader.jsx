// components/index/EquipmentHeader.jsx
import { useState } from 'react';
import { ArrowLeft, Activity, Info } from 'lucide-react';
import { router } from '@inertiajs/react';
import ExportDropdown from '../ExportDropdown'; // Changed from './common/ExportDropdown'
import { getFilterDescriptions } from './downloadUtils'; // Changed path

export default function EquipmentHeader({ 
  dateRangeLabel, 
  allEquipmentData, 
  filteredData,
  filterStatus,
  selectedLocation,
  dateFilter,
  selectedDate,
  loading = false
}) {
  // Prepare filters object for utils
  const filters = {
    status: filterStatus,
    location: selectedLocation,
    dateFilter: dateFilter,
    selectedDate: selectedDate
  };

  const filterDescriptions = getFilterDescriptions(filters, dateRangeLabel);

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.visit('/')} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Activity className="text-blue-600" size={24} />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Equipment Management</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filter info tooltip */}
            {filterDescriptions.length > 0 && (
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <Info size={14} className="text-blue-500" />
                <span>{filterDescriptions.join(' • ')}</span>
              </div>
            )}
            
            <span className="text-xs text-gray-500 hidden sm:inline">
              {dateRangeLabel}
            </span>
            
            {/* Use the new ExportDropdown component */}
            <ExportDropdown
              data={allEquipmentData}
              filteredData={filteredData}
              filters={filters}
              dateRangeLabel={dateRangeLabel}
              buttonText="Export"
              buttonVariant="primary"
              buttonSize="medium"
              showCount={true}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}