import { MapPin, Zap } from 'lucide-react';
import SetupLogo from '@/../../resources/assets/SETUP_logo.webp';
import Logo from '@/../../resources/assets/logo.webp';

export default function Dashboard() {
  const handleEquipmentClick = () => {
    window.location.href = '/equipment';
  };

  const handleMapClick = () => {
    window.location.href = '/map';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Enhanced Header Section */}
        <div className="text-center mb-16">
          {/* Main Logo */}
          <div className="mb-8 transform transition-transform duration-500 hover:scale-110">
            <img 
              src={Logo} 
              alt="Logo" 
              className="h-28 mx-auto drop-shadow-lg"
            />
          </div>

          {/* Title with Enhanced Styling */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm mb-4 tracking-tight">
              DOST Northern Mindanao
            </h1>
            <div className="h-1.5 w-32 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-md"></div>
          </div>

          {/* Setup Logo */}
          <div className="mt-8 transform transition-transform duration-500 hover:scale-105">
            <img 
              src={SetupLogo} 
              alt="Setup Logo" 
              className="h-20 mx-auto drop-shadow-md"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Equipment Data Button */}
          <button
            onClick={handleEquipmentClick}
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 p-10 border-2 border-transparent hover:border-blue-400 overflow-hidden active:scale-95"
          >
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-200/20 rounded-full blur-3xl group-hover:bg-blue-200/40 transition-all duration-500"></div>

            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-5 rounded-full group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-500 shadow-md group-hover:shadow-lg transform group-hover:scale-110">
                <Zap className="w-14 h-14 text-blue-600 group-hover:text-blue-700 transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors">Equipment Data</h2>
              <p className="text-gray-600 group-hover:text-gray-700 transition-colors">View and manage equipment information</p>
            </div>
          </button>

          {/* Location Tracking Button */}
          <button
            onClick={handleMapClick}
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 p-10 border-2 border-transparent hover:border-green-400 overflow-hidden active:scale-95"
          >
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-200/20 rounded-full blur-3xl group-hover:bg-green-200/40 transition-all duration-500"></div>

            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="bg-gradient-to-br from-green-100 to-green-50 p-5 rounded-full group-hover:from-green-200 group-hover:to-green-100 transition-all duration-500 shadow-md group-hover:shadow-lg transform group-hover:scale-110">
                <MapPin className="w-14 h-14 text-green-600 group-hover:text-green-700 transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 group-hover:text-green-700 transition-colors">Location Tracking</h2>
              <p className="text-gray-600 group-hover:text-gray-700 transition-colors">Track equipment locations on the map</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}