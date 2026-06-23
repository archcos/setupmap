import { Menu, X, RefreshCw } from 'lucide-react';
import { Link } from '@inertiajs/react';
import P3Logo from '@/../../resources/assets/P3_LOGO.png';

export function PageHeader({ 
    sidebarCollapsed, 
    onToggleSidebar, 
    onRefresh, 
    isRefreshing,
    currentDateTime 
}) {
    const formatCurrentDateTime = (date) => {
        return date.toLocaleString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Manila'
        });
    };

    return (
        <header className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md flex items-center justify-between z-50">
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 text-white hover:bg-blue-500 rounded-lg transition"
                    aria-label="Toggle sidebar"
                >
                    {sidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
                </button>
                
                {/* P3 Logo - Clickable to Home */}
                <div className="flex items-center gap-3">
                    <Link 
                        href="/" 
                        className="transition-transform hover:scale-105 duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg"
                        aria-label="Go to home"
                    >
                        <img 
                            src={P3Logo} 
                            alt="P3 Logo" 
                            className="h-10 w-auto sm:h-12 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                        />
                    </Link>
                    <div className="hidden sm:block h-8 w-px bg-blue-400/50" />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">SETUP E-MAP</h1>
                        <p className="text-blue-100 text-xs sm:text-sm">
                            Today's Equipment Tracking & Locations
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                    <p className="text-xs text-blue-100">Current Date & Time</p>
                    <p className="text-sm font-semibold">
                        {formatCurrentDateTime(currentDateTime)}
                    </p>
                </div>
                
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-white hover:bg-blue-500 rounded-lg transition disabled:opacity-50"
                    aria-label="Refresh data"
                    title="Refresh today's data"
                >
                    <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>
        </header>
    );
}