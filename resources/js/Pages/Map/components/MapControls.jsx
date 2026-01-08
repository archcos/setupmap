import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { terrainTypes } from '../constants/mapConstants';

export function MapControls({ terrain, onTerrainChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition flex items-center gap-2 pointer-events-auto"
      >
        <span className="text-xs font-semibold text-gray-700">Map Style</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg p-2 min-w-max pointer-events-auto">
          <div className="space-y-1">
            {Object.entries(terrainTypes).map(([key, { name }]) => (
              <button
                key={key}
                onClick={() => {
                  onTerrainChange(key);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded transition ${
                  terrain === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
