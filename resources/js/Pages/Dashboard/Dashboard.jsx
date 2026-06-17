import { MapPin, Zap } from 'lucide-react';
import { useRef } from 'react';
import SetupLogo from '@/../../resources/assets/SETUP_logo.webp';
import Logo from '@/../../resources/assets/logo.webp';
import LogoSong from '@/../../resources/assets/LOGOSONG.mp3';

export default function Dashboard() {
  const audioRef = useRef(null);

  const playLogoSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const playEquipmentSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  const playLocationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 500;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  const handleEquipmentClick = () => {
    playEquipmentSound();
    window.location.href = '/equipment';
  };

  const handleMapClick = () => {
    playLocationSound();
    window.location.href = '/map';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center p-4">
      <audio ref={audioRef} src={LogoSong} />
      
      <div className="w-full max-w-4xl">
        {/* Header - More Compact */}
        <div className="text-center mb-8">
          <div 
            className="inline-block mb-3 transition-transform duration-300 hover:scale-110 cursor-pointer"
            onMouseEnter={playLogoSound} 
            onClick={playLogoSound}
          >
            <img 
              src={Logo} 
              alt="Logo" 
              className="h-16 md:h-20 mx-auto"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
            DOST Northern Mindanao
          </h1>
          
          <div className="h-0.5 w-20 mx-auto bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mb-3"></div>
          
          <div 
            className="inline-block transition-transform duration-300 hover:scale-105 cursor-pointer"
            onMouseEnter={playLogoSound} 
            onClick={playLogoSound}
          >
            <img 
              src={SetupLogo} 
              alt="Setup Logo" 
              className="h-12 md:h-14 mx-auto opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>

        {/* Cards - More Compact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {/* Equipment Data Button */}
          <button
            onClick={handleEquipmentClick}
            onMouseEnter={playEquipmentSound}
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 p-6 md:p-7 border border-slate-200/60 hover:border-blue-300/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative flex flex-col items-center text-center space-y-2.5">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50/80 p-2.5 rounded-xl group-hover:from-blue-200/80 group-hover:to-blue-100/80 transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-110">
                <Zap className="w-8 h-8 text-blue-600 group-hover:text-blue-700 transition-colors" strokeWidth={1.8} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">Equipment Data</h2>
              <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors">Manage equipment inventory</p>
            </div>
          </button>

          {/* Location Tracking Button */}
          <button
            onClick={handleMapClick}
            onMouseEnter={playLocationSound}
            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 p-6 md:p-7 border border-slate-200/60 hover:border-emerald-300/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative flex flex-col items-center text-center space-y-2.5">
              <div className="bg-gradient-to-br from-emerald-100 to-emerald-50/80 p-2.5 rounded-xl group-hover:from-emerald-200/80 group-hover:to-emerald-100/80 transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-110">
                <MapPin className="w-8 h-8 text-emerald-600 group-hover:text-emerald-700 transition-colors" strokeWidth={1.8} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">Equipment Tracking</h2>
              <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors">Track equipment on map</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}