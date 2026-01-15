import Logo from '@/../../resources/assets/logo.webp';

const heartbeatStyles = `
  @keyframes heartbeat {
    0% { transform: scale(1); }
    25% { transform: scale(1.15); }
    50% { transform: scale(1); }
    75% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  
  .animate-heartbeat {
    animation: heartbeat 1.5s ease-in-out infinite;
  }
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = heartbeatStyles;
  document.head.appendChild(styleEl);
}

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-50 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 animate-heartbeat">
          <span className="text-5xl"><img src={Logo} alt="Loading" className="w-16 h-16 animate-heartbeat" /></span>
        </div>
        <p className="text-sm font-medium text-gray-700">Loading... Please wait...</p>
      </div>
    </div>
  );
}