import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UnitLogo } from './UnitLogo';
import { Role, Battery } from '../../types';
import { CloudSyncModal } from './CloudSyncModal';
import {
  ShieldAlert,
  Clock,
  UserCheck,
  ChevronDown,
  Search,
  Bell,
  LogOut,
  Menu,
  Sparkles,
  Cloud,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileNav?: () => void;
  onOpenPrintModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileNav,
  onOpenPrintModal,
}) => {
  const {
    currentUser,
    switchRole,
    searchQuery,
    setSearchQuery,
    setActivePage,
    notification,
    firebaseUser,
    isFirebaseReady,
    cloudPermissionDenied,
    logout,
    isRealAdmin,
    isGuest,
    isSimulating,
    exitSimulation,
    systemSettings,
  } = useApp();

  const [militaryTime, setMilitaryTime] = useState<string>('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setMilitaryTime(`${day}-${month}-${year} ${hours}:${mins}:${secs} HRS`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const rolesList: { role: Role; label: string; bty?: Battery; desc: string }[] = [
    { role: 'CO', label: 'Commanding Officer (CO)', desc: 'Executive Strategic View' },
    { role: 'Offr', label: 'Officer (Offr)', desc: 'Regimental Officer Access' },
    { role: 'RSM', label: 'Regimental Sgt Major (RSM)', desc: 'Consolidated Muster & Enlistment' },
    { role: 'P BSM', label: 'P Battery Sgt Major (P BSM)', bty: 'P Bty', desc: 'P Battery In-Charge' },
    { role: 'Q BSM', label: 'Q Battery Sgt Major (Q BSM)', bty: 'Q Bty', desc: 'Q Battery In-Charge' },
    { role: 'R BSM', label: 'R Battery Sgt Major (R BSM)', bty: 'R Bty', desc: 'R Battery In-Charge' },
    { role: 'HQ BSM', label: 'HQ Battery Sgt Major (HQ BSM)', bty: 'HQ Bty', desc: 'HQ Battery In-Charge' },
    { role: 'Admin', label: 'System Admin', desc: 'User Roles & System Controls' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* GUEST — VIEW ONLY Banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-amber-600/30 border-b border-amber-500/50 text-amber-100 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black tracking-wider text-[11px] uppercase shadow-sm">
              GUEST — VIEW ONLY
            </span>
            <span className="font-semibold text-amber-200">
              {isSimulating
                ? `রোল সিমুলেটর সক্রিয়: বর্তমানে ${currentUser.role} ${currentUser.assignedBattery ? `(${currentUser.assignedBattery})` : ''} রোলের ভিউ দেখছেন (Read-Only Demo)`
                : 'রিড-অনলি ডেমো মোড: আপনি সকল ডেটা, রোল ও প্যারেড স্টেট পর্যবেক্ষণ করতে পারবেন'}
            </span>
          </div>
          {isSimulating ? (
            <button
              onClick={exitSimulation}
              className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer shadow"
            >
              গেস্ট ড্যাশবোর্ডে ফিরুন (Exit)
            </button>
          ) : (
            <span className="text-[10px] text-amber-300/80 font-mono hidden sm:inline">
              [No Editing / Saving Permitted]
            </span>
          )}
        </div>
      )}

      {/* Simulation Active Notice Banner for Admin */}
      {!isGuest && isSimulating && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-1 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            <span className="font-semibold text-amber-300">
              এডমিন রোল সিমুলেটর সক্রিয়: বর্তমানে <span className="underline font-bold">{currentUser.role}</span> {currentUser.assignedBattery ? `(${currentUser.assignedBattery})` : ''} প্রোফাইলে আছেন
            </span>
          </div>
          <button
            onClick={exitSimulation}
            className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
          >
            এডমিন মোডে ফিরুন (Exit)
          </button>
        </div>
      )}

      {/* Top Banner alert if notification */}
      {notification && (
        <div className="bg-rose-600/90 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 border-b border-rose-400/40">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{notification}</span>
        </div>
      )}

      <div className="max-w-[1700px] mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-12 sm:h-13 gap-2.5">
          {/* Left: Brand / Logo */}
          <div className="flex items-center gap-2.5">
            {onToggleMobileNav && (
              <button
                onClick={onToggleMobileNav}
                className="lg:hidden p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div
              onClick={() => setActivePage('main_dashboard')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <UnitLogo size="sm" />
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 group-hover:text-white tracking-wide text-xs sm:text-sm font-sans leading-none">
                    {systemSettings?.unitName || '10 Med Regt Arty'}
                  </span>
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded">
                    {systemSettings?.unitMotto || 'Born Destroyer'}
                  </span>
                  {systemSettings?.maintenanceMode && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded animate-pulse">
                      Maintenance Mode
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {systemSettings?.tagline || 'Smart Parade State System'}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search & Military Time */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Army/Snk No, Name, Rank, Trade..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right: Military Time, Role Selector, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Military Clock */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{militaryTime}</span>
            </div>

            {/* Role Switcher Dropdown - AVAILABLE FOR ADMIN AND GUEST DEMO */}
            {(isRealAdmin || isGuest) && (
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  title={
                    isGuest
                      ? (isSimulating
                          ? `ডেমো সিমুলেশন: ${currentUser.role} (ক্লিক করে অন্য রোল সিলেক্ট করুন)`
                          : 'Guest Role Simulator (Demo Mode)')
                      : (isSimulating
                          ? `সিমুলেশন চলছে: ${currentUser.role} (ক্লিক করে অন্য রোল সিলেক্ট করুন অথবা এডমিনে ফিরুন)`
                          : 'Admin Role Simulator')
                  }
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium shadow-sm transition-all cursor-pointer ${
                    isGuest
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-200'
                      : isSimulating
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
                      : 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-850 hover:to-slate-750 border-slate-700 text-slate-200'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isSimulating ? 'bg-amber-400 animate-ping' : isGuest ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                    }`}
                  />
                  <span className={`font-semibold ${isSimulating ? 'text-amber-300 font-bold' : isGuest ? 'text-amber-300' : 'text-amber-300'}`}>
                    {isGuest ? (isSimulating ? `Demo View: ${currentUser.role}` : 'Role Simulator (Demo)') : (isSimulating ? `Simulating: ${currentUser.role}` : 'Role Simulator')}
                  </span>
                  {currentUser.assignedBattery && (
                    <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                      [{currentUser.assignedBattery}]
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-slate-200 divide-y divide-slate-800">
                    <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400 font-semibold font-mono">
                      <span>{isGuest ? 'GUEST ROLE SIMULATOR (DEMO)' : 'ADMIN ROLE SIMULATOR'}</span>
                      {isSimulating && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-sans font-semibold">
                          Active Sim
                        </span>
                      )}
                    </div>

                    {isSimulating && (
                      <div className="p-2 bg-amber-950/40">
                        <button
                          onClick={() => {
                            exitSimulation();
                            setRoleDropdownOpen(false);
                          }}
                          className="w-full text-center px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
                          <span>{isGuest ? 'Exit to Guest View (গেস্টে ফিরুন)' : 'Exit Simulation (এডমিন মোডে ফিরুন)'}</span>
                        </button>
                      </div>
                    )}

                    <div className="py-1 max-h-64 overflow-y-auto">
                      {rolesList.map((r) => {
                        const isCurrent =
                          currentUser.role === r.role && (!r.bty || currentUser.assignedBattery === r.bty);
                        return (
                          <button
                            key={r.role + (r.bty || '')}
                            onClick={() => {
                              switchRole(r.role, r.bty);
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer ${
                              isCurrent ? 'bg-rose-950/40 border-l-2 border-rose-500 text-white font-bold' : ''
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-slate-100 font-medium">{r.label}</span>
                              <span className="text-[10px] text-slate-400">{r.desc}</span>
                            </div>
                            {r.bty && (
                              <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 ml-2">
                                {r.bty}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          logout();
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-center px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center gap-1.5 font-medium cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Logout Session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Firebase Cloud Sync Interactive Button */}
            <button
              type="button"
              onClick={() => setIsCloudModalOpen(true)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm group border ${
                !cloudPermissionDenied
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/40 text-amber-300'
              }`}
              title={
                !cloudPermissionDenied
                  ? "Real-time Cloud Auto-Sync Active (ID/Password Mode) • Click for details"
                  : "Cloud Rules Setup Needed • Click to view instructions"
              }
            >
              <Cloud className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${!cloudPermissionDenied ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span className={`text-[11px] font-bold ${!cloudPermissionDenied ? 'text-emerald-400' : 'text-amber-400'}`}>
                {!cloudPermissionDenied ? 'Cloud Live' : 'Rules Setup'}
              </span>
              <span className="text-[9px] text-slate-400 font-sans hidden lg:inline">
                {!cloudPermissionDenied ? '(Auto-Sync)' : '(Needed)'}
              </span>
            </button>

            {/* Profile Pill with User Photo & Name Initials */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {currentUser.avatar || firebaseUser?.photoURL ? (
                <img
                  src={currentUser.avatar || firebaseUser?.photoURL || ''}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full border border-rose-500/50 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-xs text-white shadow-inner font-mono">
                  {(() => {
                    const name = currentUser.name || '';
                    const parts = name.trim().split(/\s+/);
                    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  })()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-white truncate max-w-[130px]">
                  {currentUser.rank} {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentUser.role} {currentUser.assignedBattery ? `[${currentUser.assignedBattery}]` : ''}
                </span>
              </div>
            </div>

            {/* Universal Logout Button for All Users */}
            <button
              onClick={logout}
              title="লগআউট (Logout Session)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-medium transition-all cursor-pointer ml-1 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-bold">লগআউট</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Auto-Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
      />
    </header>
  );
};
