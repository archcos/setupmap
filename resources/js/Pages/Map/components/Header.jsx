import { Menu, X } from 'lucide-react';

export default function Header({ sidebarOpen, onToggleSidebar }) {
  return (
    <header className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md flex items-center justify-between lg:justify-start relative z-50">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Northern Mindanao</h1>
        <p className="text-blue-100 text-xs sm:text-sm">Interactive Province Map</p>
      </div>
      
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 text-white hover:bg-blue-500 rounded-lg transition"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </header>
  );
}