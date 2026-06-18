import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getDateLabel } from './dateUtils';

export default function DateRangeSelector({ dateFilter, selectedDate, onDateFilterChange, onDateChange }) {
  const [showDropdowns, setShowDropdowns] = useState({ day: false, month: false, year: false, week: false });

  const toggleDropdown = (type) => {
    setShowDropdowns(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleDateSelect = (type, value) => {
    const newDate = new Date(selectedDate);
    switch (type) {
      case 'day': newDate.setDate(value); break;
      case 'month': newDate.setMonth(value); break;
      case 'year': newDate.setFullYear(value); break;
      case 'week':
        const year = selectedDate.getFullYear();
        const simple = new Date(year, 0, 1 + (value - 1) * 7);
        const dow = simple.getDay();
        simple.setDate(simple.getDate() - dow + 1);
        onDateChange(simple);
        setShowDropdowns(prev => ({ ...prev, week: false }));
        return;
    }
    onDateChange(newDate);
    setShowDropdowns(prev => ({ ...prev, [type]: false }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 border border-gray-200">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Calendar size={20} className="text-blue-600" />
        <h2 className="text-base sm:text-lg font-bold text-gray-900">Time Period</h2>
        <span className="text-sm text-gray-500 ml-auto">{getDateLabel(dateFilter, selectedDate)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {['day', 'week', 'month', 'year'].map((filter) => (
            <button key={filter} onClick={() => { onDateFilterChange(filter); onDateChange(new Date()); }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${dateFilter === filter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          {dateFilter === 'day' && (
            <div className="relative">
              <button onClick={() => toggleDropdown('day')} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                Day {selectedDate.getDate()}<ChevronDown size={12} />
              </button>
              {showDropdowns.day && (
                <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-36">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <button key={day} onClick={() => handleDateSelect('day', day)} className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getDate() === day ? 'bg-blue-100 font-semibold' : ''}`}>{day}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {dateFilter === 'month' && (
            <>
              <div className="relative">
                <button onClick={() => toggleDropdown('month')} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                  {new Date(selectedDate).toLocaleString('default', { month: 'short' })}<ChevronDown size={12} />
                </button>
                {showDropdowns.month && (
                  <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    {Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleString('default', { month: 'short' })).map((month, idx) => (
                      <button key={idx} onClick={() => handleDateSelect('month', idx)} className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getMonth() === idx ? 'bg-blue-100 font-semibold' : ''}`}>{month}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => toggleDropdown('year')} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm flex items-center gap-1">
                  {selectedDate.getFullYear()}<ChevronDown size={12} />
                </button>
                {showDropdowns.year && (
                  <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto w-32">
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                      <button key={year} onClick={() => handleDateSelect('year', year)} className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm ${selectedDate.getFullYear() === year ? 'bg-blue-100 font-semibold' : ''}`}>{year}</button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <button onClick={() => onDateChange(new Date())} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm">Today</button>
        </div>
      </div>
    </div>
  );
}