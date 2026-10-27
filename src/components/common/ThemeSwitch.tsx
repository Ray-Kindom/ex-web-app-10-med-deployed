import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeSwitchProps {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({
  className = '',
  compact = false,
  showLabel = true,
}) => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      title={
        isDark
          ? 'Switch to Light Theme (লাইট থিমে পরিবর্তন করুন)'
          : 'Switch to Dark Theme (ডার্ক থিমে পরিবর্তন করুন)'
      }
      className={`group relative inline-flex items-center gap-2 rounded-xl transition-all cursor-pointer font-sans select-none ${
        compact
          ? 'p-2 sm:px-2.5 sm:py-1.5 text-xs'
          : 'px-3 py-1.5 text-xs font-semibold'
      } ${
        isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 hover:border-slate-400 shadow-sm'
      } ${className}`}
    >
      {/* Sliding Icon Container */}
      <div
        className={`flex items-center justify-center w-5 h-5 rounded-lg transition-transform duration-200 ${
          isDark
            ? 'bg-amber-500/15 text-amber-400 group-hover:scale-110'
            : 'bg-indigo-50 text-indigo-600 group-hover:scale-110'
        }`}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
        )}
      </div>

      {/* Optional Theme Text Label */}
      {showLabel && (
        <div className="flex items-center gap-1.5 font-medium leading-none">
          <span className="hidden sm:inline">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
          <span className="sm:hidden">
            {isDark ? 'Light' : 'Dark'}
          </span>
          <span
            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
              isDark
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            {isDark ? 'Dark' : 'Light'}
          </span>
        </div>
      )}
    </button>
  );
};
