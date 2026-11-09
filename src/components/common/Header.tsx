import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UnitLogo } from './UnitLogo';
import { Role, Battery } from '../../types';
import { CloudSyncModal } from './CloudSyncModal';
import { ThemeSwitch } from './ThemeSwitch';
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
    authUser,
    cloudPermissionDenied,
    logout,
    isRealAdmin,
    isGuest,
    isSimulating,
    exitSimulation,
    systemSettings,
    theme,
  } = useApp();

  const isLight = theme === 'light';

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
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Quiet Guest / Simulation Notice */}
      {isGuest && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 px-4 py-1 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Demo Mode (Read-Only)</span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-amber-800/80 dark:text-amber-300/80">
              {isSimulating ? `Viewing as ${currentUser.role}` : 'All data visible in read-only'}
            </span>
          </div>
          {isSimulating && (
            <button
              onClick={exitSimulation}
              className="text-xs font-medium text-amber-800 dark:text-amber-200 hover:underline cursor-pointer"
            >
              Exit Demo
            </button>
          )}
        </div>
      )}

      {!isGuest && isSimulating && (
        <div className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-4 py-1 flex items-center justify-between text-xs">
          <span className="font-medium">
            Simulating: <strong className="font-semibold">{currentUser.role}</strong> {currentUser.assignedBattery ? `(${currentUser.assignedBattery})` : ''}
          </span>
          <button
            onClick={exitSimulation}
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Exit Simulation
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs px-4 py-1.5 flex items-center justify-center gap-2 border-b border-slate-700">
          <span>{notification}</span>
        </div>
      )}

      <div className="max-w-[1700px] mx-auto px-4">
        <div className="flex items-center justify-between h-13 gap-3">
          {/* Left: Brand / Logo */}
          <div className="flex items-center gap-3">
            {onToggleMobileNav && (
              <button
                onClick={onToggleMobileNav}
                className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div
              onClick={() => setActivePage('main_dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <UnitLogo size="sm" />
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-sm text-slate-900 dark:text-white leading-tight">
                  {systemSettings?.unitName || '10 Med Regt Arty'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
                  {systemSettings?.tagline || 'Smart Parade State System'}
                </span>
              </div>
            </div>
          </div>


          {/* Center: Search */}
          <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search soldier, snk no, rank, trade..."
                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-8.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right: Military Time, Role Simulator, User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Military Clock */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{militaryTime}</span>
            </div>

            {/* Role Switcher - Simple Clean Control */}
            {(isRealAdmin || isGuest) && (
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <span className="font-medium">
                    {isGuest ? (isSimulating ? `Role: ${currentUser.role}` : 'Role Demo') : (isSimulating ? `Role: ${currentUser.role}` : 'Simulator')}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg py-1.5 z-50 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-700/60">
                    <div className="px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Switch Role View</span>
                      {isSimulating && (
                        <button
                          onClick={() => {
                            exitSimulation();
                            setRoleDropdownOpen(false);
                          }}
                          className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="py-1 max-h-60 overflow-y-auto">
                      {rolesList.map((r) => {
                        const isCurrent = currentUser.role === r.role && (!r.bty || currentUser.assignedBattery === r.bty);
                        return (
                          <button
                            key={r.role + (r.bty || '')}
                            onClick={() => {
                              switchRole(r.role, r.bty);
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-slate-100 dark:bg-slate-700/60 font-semibold text-slate-900 dark:text-white'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>{r.label}</span>
                            {r.bty && (
                              <span className="text-[10px] text-slate-400 font-mono ml-2">
                                {r.bty}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          logout();
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1 rounded text-xs flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout Session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme Mode Switcher */}
            <ThemeSwitch />

            {/* Cloud Auto-Sync Simple Status */}
            <button
              type="button"
              onClick={() => setIsCloudModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Cloud Database Sync Status"
            >
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium">Cloud</span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-xs font-mono">
                {(() => {
                  const name = currentUser.name || '';
                  const parts = name.trim().split(/\s+/);
                  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                })()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Clean Logout */}
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
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
