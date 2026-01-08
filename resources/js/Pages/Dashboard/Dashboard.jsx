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
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="mb-8">
            <img 
              src={Logo} 
              alt="Logo" 
              className="h-20 mx-auto mb-6"
            />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">DOST Northern Mindanao</h1>
          <div className="mb-8">
            <img 
              src={SetupLogo} 
              alt="Setup Logo" 
              className="h-16 mx-auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Equipment Data Button */}
          <button
            onClick={handleEquipmentClick}
            className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 p-8 border-2 border-transparent hover:border-blue-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-full mb-4 group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-300 shadow-md">
                <Zap className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Equipment Data</h2>
              <p className="text-gray-600">View and manage equipment information</p>
            </div>
          </button>

          {/* Location Tracking Button */}
          <button
            onClick={handleMapClick}
            className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 p-8 border-2 border-transparent hover:border-green-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex flex-col items-center text-center">
              <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-full mb-4 group-hover:from-green-200 group-hover:to-green-100 transition-all duration-300 shadow-md">
                <MapPin className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Location Tracking</h2>
              <p className="text-gray-600">Track equipment locations on the map</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}