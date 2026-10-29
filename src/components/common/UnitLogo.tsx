import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Camera, Upload } from 'lucide-react';
import defaultUnitLogo from '../../assets/unit-logo.png';

interface UnitLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  showText?: boolean;
  allowAdminUpload?: boolean;
}

export const UnitLogo: React.FC<UnitLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  allowAdminUpload = false,
}) => {
  const { customLogo, setCustomLogo, currentUser, showNotification } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = currentUser?.role === 'Admin';

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    custom: '',
  };

  const dimClass = sizeMap[size];
  const logoSrc = customLogo || defaultUnitLogo;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator can upload or change the unit logo.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file (PNG, JPG, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomLogo(result);
        showNotification('Unit logo updated successfully.');
      }
    };
    reader.readAsDataURL(file);
  };

  const [imgError, setImgError] = React.useState(false);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex-shrink-0 ${dimClass} rounded-full shadow-lg shadow-black/40 overflow-hidden group bg-slate-950/40 flex items-center justify-center`}>
        {logoSrc && !imgError ? (
          <img
            src={logoSrc}
            alt="10 Medium Regiment Artillery Logo"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain select-none p-0.5"
          />
        ) : (
          <svg
            viewBox="0 0 500 500"
            className="w-full h-full drop-shadow-md select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradients for rich military heraldry */}
              <radialGradient id="navyShine" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0B1C4D" />
                <stop offset="100%" stopColor="#050C24" />
              </radialGradient>
              <linearGradient id="artilleryRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E61C24" />
                <stop offset="100%" stopColor="#B30E15" />
              </linearGradient>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#CA8A04" />
              </linearGradient>
              <linearGradient id="cannonMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#E2E8F0" />
                <stop offset="100%" stopColor="#94A3B8" />
              </linearGradient>

              {/* Arched path for top text */}
              <path
                id="topTextPath"
                d="M 80,240 A 185,185 0 0,1 420,240"
                fill="none"
              />
            </defs>

            {/* Outer Ring & Border */}
            <circle cx="250" cy="250" r="244" fill="#061234" stroke="#FFFFFF" strokeWidth="9" />
            <circle cx="250" cy="250" r="232" fill="none" stroke="#0B1C4D" strokeWidth="5" />

            {/* Top Half Red Field */}
            <path
              d="M 22,250 A 228,228 0 0,1 478,250 Z"
              fill="url(#artilleryRed)"
            />

            {/* Bottom Half Blue Field */}
            <path
              d="M 22,250 A 228,228 0 0,0 478,250 Z"
              fill="url(#navyShine)"
            />

            {/* Divider line across diameter */}
            <line x1="22" y1="250" x2="478" y2="250" stroke="#FFFFFF" strokeWidth="8" />

            {/* Top Arc Text: BORN DESTROYER */}
            <text fill="#FFFFFF" fontSize="34" fontWeight="900" letterSpacing="4" fontFamily="'Cinzel', 'Impact', sans-serif">
              <textPath href="#topTextPath" startOffset="50%" textAnchor="middle">
                BORN DESTROYER
              </textPath>
            </text>

            {/* Central Heraldic Artillery Shield */}
            <g transform="translate(250, 240) scale(0.92)">
              {/* Shield Outline Outer Shadow */}
              <path
                d="M -140,-130 L 140,-130 L 140,-40 Q 140,90 0,165 Q -140,90 -140,-40 Z"
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeWidth="6"
              />

              {/* Split Shield: Left Blue, Right Red */}
              <path
                d="M -132,-124 L 0,-124 L 0,154 Q -132,82 -132,-40 Z"
                fill="#0F2870"
              />
              <path
                d="M 0,-124 L 132,-124 L 132,-40 Q 132,82 0,154 Z"
                fill="#DC2626"
              />

              {/* Inner Shield Dividers */}
              <line x1="0" y1="-124" x2="0" y2="154" stroke="#FFFFFF" strokeWidth="5" />

              {/* Crossed Artillery Cannon Barrels */}
              <g transform="rotate(42)">
                <rect x="-14" y="-120" width="28" height="240" rx="4" fill="url(#cannonMetal)" stroke="#0F2870" strokeWidth="4" />
                <rect x="-18" y="-132" width="36" height="16" rx="3" fill="#FFFFFF" stroke="#0F2870" strokeWidth="3" />
                <rect x="-16" y="96" width="32" height="26" rx="3" fill="#CBD5E1" stroke="#0F2870" strokeWidth="3" />
                <rect x="-14" y="-70" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="-50" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="-30" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="30" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="50" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="70" width="28" height="10" fill="#DC2626" />
              </g>

              <g transform="rotate(-42)">
                <rect x="-14" y="-120" width="28" height="240" rx="4" fill="url(#cannonMetal)" stroke="#0F2870" strokeWidth="4" />
                <rect x="-18" y="-132" width="36" height="16" rx="3" fill="#FFFFFF" stroke="#0F2870" strokeWidth="3" />
                <rect x="-16" y="96" width="32" height="26" rx="3" fill="#CBD5E1" stroke="#0F2870" strokeWidth="3" />
                <rect x="-14" y="-70" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="-50" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="-30" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="30" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="50" width="28" height="10" fill="#DC2626" />
                <rect x="-14" y="70" width="28" height="10" fill="#DC2626" />
              </g>

              {/* Top Motto Scroll in English */}
              <path
                d="M -125,-105 C -70,-130 70,-130 125,-105 C 115,-80 95,-75 75,-88 C 25,-100 -25,-100 -75,-88 C -95,-75 -115,-80 -125,-105 Z"
                fill="#FFFFFF"
                stroke="#0B1C4D"
                strokeWidth="4"
              />
              <text x="0" y="-92" fill="#0B1C4D" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="'Cinzel', system-ui, sans-serif" letterSpacing="1">
                HONOUR & GLORY
              </text>
            </g>

            {/* Left & Right Artillery Embellishments */}
            <g transform="translate(110, 325) scale(0.65)">
              <circle cx="0" cy="20" r="30" fill="#FFFFFF" stroke="#0B1C4D" strokeWidth="5" />
              <path d="M -25,0 C -35,-35 0,-55 0,-70 C 0,-55 35,-35 25,0 Z" fill="#FFFFFF" stroke="#0B1C4D" strokeWidth="4" />
            </g>
            <g transform="translate(390, 325) scale(0.65)">
              <circle cx="0" cy="20" r="30" fill="#FFFFFF" stroke="#0B1C4D" strokeWidth="5" />
              <path d="M -25,0 C -35,-35 0,-55 0,-70 C 0,-55 35,-35 25,0 Z" fill="#FFFFFF" stroke="#0B1C4D" strokeWidth="4" />
            </g>

            {/* Bottom Banner Scroll in English */}
            <g transform="translate(250, 395)">
              <path
                d="M -200,-15 Q -140,-50 0,-40 Q 140,-50 200,-15 C 175,15 170,40 185,55 L 145,35 Q 0,10 -145,35 L -185,55 C -170,40 -175,15 -200,-15 Z"
                fill="#FFFFFF"
                stroke="#061234"
                strokeWidth="6"
              />
              <text x="0" y="4" fill="#061234" fontSize="17" fontWeight="900" textAnchor="middle" fontFamily="'Cinzel', system-ui, sans-serif" letterSpacing="1">
                10 MEDIUM REGIMENT ARTILLERY
              </text>
            </g>
          </svg>
        )}

        {/* Admin Upload Overlay Trigger */}
        {(allowAdminUpload || isAdmin) && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                title="Only Admin can upload Unit Logo"
                className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              >
                <Camera className="w-4 h-4 text-rose-400 drop-shadow" />
              </button>
            )}
          </>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide text-base leading-tight font-sans">
              10 Med Regt Arty
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
              Born Destroyer
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Smart Personnel & Parade State System
          </span>
        </div>
      )}
    </div>
  );
};
