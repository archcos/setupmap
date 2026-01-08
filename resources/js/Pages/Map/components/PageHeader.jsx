import { Menu, X } from 'lucide-react';

export function PageHeader({ sidebarCollapsed, onToggleSidebar }) {
  return (
    <header className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md flex items-center justify-between z-50">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">SETUP GPS Map</h1>
        <p className="text-blue-100 text-xs sm:text-sm">Equipment Tracking & Locations</p>
      </div>
      
      <button
        onClick={onToggleSidebar}
        className="p-2 text-white hover:bg-blue-500 rounded-lg transition"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
      </button>
    </header>
  );
}
