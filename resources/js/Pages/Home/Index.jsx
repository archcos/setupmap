import { MapPin, Zap, ArrowRight, Sparkles, Stars, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import SetupLogo from '@/../../resources/assets/SETUP_logo.webp';
import Logo from '@/../../resources/assets/logo.webp';
import P3Logo from '@/../../resources/assets/P3_LOGO.png';
import LogoSong from '@/../../resources/assets/LOGOSONG.mp3';
import { Head } from '@inertiajs/react';

export default function Index() {
  const audioRef = useRef(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [setupLogoHovered, setSetupLogoHovered] = useState(false);
  const [p3LogoHovered, setP3LogoHovered] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [loadingButton, setLoadingButton] = useState(null); // 'equipment' or 'location'

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
    if (loadingButton) return; // Prevent double clicks
    setLoadingButton('equipment');
    playEquipmentSound();
    
    // Small delay to show the loading animation
    setTimeout(() => {
      window.location.href = '/equipment';
    }, 600);
  };

  const handleMapClick = () => {
    if (loadingButton) return; // Prevent double clicks
    setLoadingButton('location');
    playLocationSound();
    
    // Small delay to show the loading animation
    setTimeout(() => {
      window.location.href = '/map';
    }, 600);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#e8f0fe] to-[#f3e8ff] flex flex-col items-center justify-between p-6 sm:p-8 lg:p-12 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-float-slower" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100/10 rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      <audio ref={audioRef} src={LogoSong} preload="auto" />
      
      {/* Main Content */}
      <div className="relative w-full max-w-6xl flex-1 flex items-center">
        <div className="w-full">
          <Head title="DOST-NorMin SETUP P3 Portal" />
          
          {/* P3 Logo - Main Logo at top center */}
          <div className="flex justify-center mb-8 lg:mb-10">
            <button
              onClick={playLogoSound}
              onMouseEnter={() => {
                setP3LogoHovered(true);
                playLogoSound();
              }}
              onMouseLeave={() => setP3LogoHovered(false)}
              className="group relative inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 rounded-2xl"
              aria-label="Play P3 logo sound"
            >
              <div className={`absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-2xl blur-xl transition-all duration-700 ${p3LogoHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-90'}`} />
              <img 
                src={P3Logo} 
                alt="P3 Logo" 
                className="relative h-20 sm:h-24 md:h-28 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]"
              />
            </button>
          </div>

          {/* Website Title - Centered */}
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
                  if (!loadingButton) {
                    setActiveCard('equipment');
                    playEquipmentSound();
                  }
                }}
                onMouseLeave={() => setActiveCard(null)}
                disabled={loadingButton !== null}
                className={`group w-full relative rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.99] px-6 py-5 sm:px-8 sm:py-6 border-2 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 ${
                  loadingButton === 'equipment'
                    ? 'border-blue-300 shadow-xl bg-blue-50 cursor-wait'
                    : activeCard === 'equipment' 
                      ? 'border-blue-300 shadow-xl bg-white' 
                      : 'border-slate-200 shadow-lg bg-white hover:border-blue-200 hover:shadow-xl'
                } ${loadingButton !== null && loadingButton !== 'equipment' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="relative flex items-center gap-5">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-3.5 rounded-xl shadow-md transition-all duration-300 ${
                      loadingButton === 'equipment' ? 'animate-pulse scale-105 shadow-blue-500/25' : 'group-hover:scale-105 group-hover:shadow-blue-500/25'
                    }`}>
                      {loadingButton === 'equipment' ? (
                        <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-spin" />
                      ) : (
                        <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
                      )}
                    </div>
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1 text-left min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors duration-300 mb-1">
                      Equipment Manager
                    </h2>
                    <p className="text-sm sm:text-base text-slate-500 group-hover:text-slate-700 transition-colors duration-300">
                      {loadingButton === 'equipment' ? 'Opening...' : 'Manage and monitor equipment inventory'}
                    </p>
                  </div>

                  {/* Arrow or Spinner */}
                  <div className={`flex-shrink-0 transition-all duration-300 ${
                    loadingButton === 'equipment' 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                  }`}>
                    {loadingButton === 'equipment' ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
                
                {/* Loading progress bar */}
                {loadingButton === 'equipment' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-loading-bar" />
                  </div>
                )}
              </button>

              {/* Location Tracking Card */}
              <button
                onClick={handleMapClick}
                onMouseEnter={() => {
                  if (!loadingButton) {
                    setActiveCard('location');
                    playLocationSound();
                  }
                }}
                onMouseLeave={() => setActiveCard(null)}
                disabled={loadingButton !== null}
                className={`group w-full relative rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.99] px-6 py-5 sm:px-8 sm:py-6 border-2 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 ${
                  loadingButton === 'location'
                    ? 'border-emerald-300 shadow-xl bg-emerald-50 cursor-wait'
                    : activeCard === 'location' 
                      ? 'border-emerald-300 shadow-xl bg-white' 
                      : 'border-slate-200 shadow-lg bg-white hover:border-emerald-200 hover:shadow-xl'
                } ${loadingButton !== null && loadingButton !== 'location' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="relative flex items-center gap-5">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-3.5 rounded-xl shadow-md transition-all duration-300 ${
                      loadingButton === 'location' ? 'animate-pulse scale-105 shadow-emerald-500/25' : 'group-hover:scale-105 group-hover:shadow-emerald-500/25'
                    }`}>
                      {loadingButton === 'location' ? (
                        <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-spin" />
                      ) : (
                        <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
                      )}
                    </div>
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1 text-left min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 group-hover:text-emerald-700 transition-colors duration-300 mb-1">
                      Equipment Tracker
                    </h2>
                    <p className="text-sm sm:text-base text-slate-500 group-hover:text-slate-700 transition-colors duration-300">
                      {loadingButton === 'location' ? 'Opening...' : 'Track equipment location on interactive map'}
                    </p>
                  </div>

                  {/* Arrow or Spinner */}
                  <div className={`flex-shrink-0 transition-all duration-300 ${
                    loadingButton === 'location' 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                  }`}>
                    {loadingButton === 'location' ? (
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                </div>
                
                {/* Loading progress bar */}
                {loadingButton === 'location' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-100">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 animate-loading-bar" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - All Rights Reserved */}
      <footer className="relative w-full max-w-6xl mt-8 pt-4 border-t border-slate-200/50">
        <div className="text-center">
          <p className="text-sm text-slate-500">
            &copy; {currentYear} DOST-NorMin SETUP P3 Portal. AAC. All Rights Reserved.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Department of Science and Technology - Northern Mindanao
          </p>
        </div>
      </footer>

      {/* Add custom keyframes for loading bar animation */}
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 0.6s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}