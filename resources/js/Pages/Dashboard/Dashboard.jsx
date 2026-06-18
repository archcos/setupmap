import { MapPin, Zap, ArrowRight, Sparkles, Stars } from 'lucide-react';
import { useRef, useState } from 'react';
import SetupLogo from '@/../../resources/assets/SETUP_logo.webp';
import Logo from '@/../../resources/assets/logo.webp';
import LogoSong from '@/../../resources/assets/LOGOSONG.mp3';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
  const audioRef = useRef(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [setupLogoHovered, setSetupLogoHovered] = useState(false);
  const [activeCard, setActiveCard] = useState(null);

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
    <div className="relative min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#e8f0fe] to-[#f3e8ff] flex items-center justify-center p-6 sm:p-8 lg:p-12 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-float-slower" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100/10 rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      <audio ref={audioRef} src={LogoSong} preload="auto" />
      
      <div className="relative w-full max-w-6xl">
      <Head title="DOST-NorMin SETUP P3 Portal" />
        {/* Website Title - Centered at top */}
        <div className="text-center mb-12 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x mb-3">
            DOST-NorMin SETUP P3 Portal
          </h1>
          <p className="text-base sm:text-lg text-slate-600 font-medium">
            Power, Pulse, and Position Tracking System
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-blue-400 rounded-full" />
            <Sparkles className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <Stars className="w-3.5 h-3.5 text-purple-500" strokeWidth={1.5} />
            <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-purple-400 rounded-full" />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Side - Branding & Info */}
          <div className="text-center lg:text-left space-y-6">
            {/* Logo Group */}
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <button
                onClick={playLogoSound}
                onMouseEnter={() => {
                  setLogoHovered(true);
                  playLogoSound();
                }}
                onMouseLeave={() => setLogoHovered(false)}
                className="group relative inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 rounded-2xl"
                aria-label="Play logo sound"
              >
                <div className={`absolute -inset-3 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-2xl blur-xl transition-all duration-700 ${logoHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}`} />
                <img 
                  src={Logo} 
                  alt="DOST Logo" 
                  className="relative h-16 sm:h-18 md:h-20 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                />
              </button>

              <button
                onClick={playLogoSound}
                onMouseEnter={() => {
                  setSetupLogoHovered(true);
                  playLogoSound();
                }}
                onMouseLeave={() => setSetupLogoHovered(false)}
                className="group relative inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 rounded-xl"
                aria-label="Play SETUP logo sound"
              >
                <div className={`absolute -inset-2 bg-indigo-400/20 rounded-xl blur-lg transition-all duration-700 ${setupLogoHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}`} />
                <img 
                  src={SetupLogo} 
                  alt="SETUP Logo" 
                  className="relative h-14 sm:h-16 md:h-18 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                />
              </button>
            </div>

            {/* Text Content */}
            <div className="space-y-4">
              <p className="text-lg sm:text-xl text-slate-700 font-semibold leading-relaxed">
                🚀 Science and Technology for Inclusive Development
              </p>
              
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Empowering communities through innovation. Manage and track DOST-SETUP equipment 
                efficiently with our comprehensive monitoring system.
              </p>

              <div className="flex flex-wrap gap-2 justify-center lg:justify-start text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  Real-Time Data
                </span>
                <span className="inline-flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  Data Management
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  Location Tracking
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Navigation Cards */}
          <div className="space-y-4 sm:space-y-5">
            {/* Equipment Data Card */}
            <button
              onClick={handleEquipmentClick}
              onMouseEnter={() => {
                setActiveCard('equipment');
                playEquipmentSound();
              }}
              onMouseLeave={() => setActiveCard(null)}
              className={`group w-full relative rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.99] px-6 py-5 sm:px-8 sm:py-6 border-2 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 ${
                activeCard === 'equipment' 
                  ? 'border-blue-300 shadow-xl bg-white' 
                  : 'border-slate-200 shadow-lg bg-white hover:border-blue-200 hover:shadow-xl'
              }`}
            >
              <div className="relative flex items-center gap-5">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-3.5 rounded-xl shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/25">
                    <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
                  </div>
                </div>
                
                {/* Text */}
                <div className="flex-1 text-left min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors duration-300 mb-1">
                    Equipment Manager
                  </h2>
                  <p className="text-sm sm:text-base text-slate-500 group-hover:text-slate-700 transition-colors duration-300">
                    Manage and monitor equipment inventory
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </button>

            {/* Location Tracking Card */}
            <button
              onClick={handleMapClick}
              onMouseEnter={() => {
                setActiveCard('location');
                playLocationSound();
              }}
              onMouseLeave={() => setActiveCard(null)}
              className={`group w-full relative rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.99] px-6 py-5 sm:px-8 sm:py-6 border-2 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 ${
                activeCard === 'location' 
                  ? 'border-emerald-300 shadow-xl bg-white' 
                  : 'border-slate-200 shadow-lg bg-white hover:border-emerald-200 hover:shadow-xl'
              }`}
            >
              <div className="relative flex items-center gap-5">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-3.5 rounded-xl shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-emerald-500/25">
                    <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
                  </div>
                </div>
                
                {/* Text */}
                <div className="flex-1 text-left min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 group-hover:text-emerald-700 transition-colors duration-300 mb-1">
                    Equipment Tracker
                  </h2>
                  <p className="text-sm sm:text-base text-slate-500 group-hover:text-slate-700 transition-colors duration-300">
                    Track equipment location on interactive map
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-15px) scale(1.05); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-slower { animation: float-slower 10s ease-in-out infinite; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 4s ease infinite; }
      `}</style>
    </div>
  );
}