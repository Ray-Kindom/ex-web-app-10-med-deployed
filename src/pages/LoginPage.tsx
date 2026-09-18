import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UnitLogo } from '../components/common/UnitLogo';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  UserCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    loginWithCredentials,
    systemSettings,
  } = useApp();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCredentialLoading, setIsCredentialLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGuestLogin = async () => {
    setErrorMessage(null);
    setIsCredentialLoading(true);
    try {
      const result = await loginWithCredentials('guest', 'guest123');
      if (!result.success) {
        setErrorMessage(result.error || 'গেস্ট লগইন করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'গেস্ট লগইন করতে সমস্যা হয়েছে।');
    } finally {
      setIsCredentialLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setErrorMessage('অনুগ্রহ করে ইউজারনেম এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }
    setIsCredentialLoading(true);
    try {
      const result = await loginWithCredentials(usernameInput.trim(), passwordInput.trim());
      if (!result.success) {
        setErrorMessage(result.error || 'ভুল ইউজারনেম বা পাসওয়ার্ড!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'লগইন যাচাই করতে সমস্যা হয়েছে।');
    } finally {
      setIsCredentialLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Unit Emblem & Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <UnitLogo size="xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider font-sans uppercase">
            {systemSettings?.unitName || '10 MED REGT ARTY'}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
              {systemSettings?.unitMotto || 'Born Destroyer'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {systemSettings?.tagline || 'Military Command Portal'}
            </span>
          </div>
        </div>

        {/* Emergency Maintenance Mode Banner */}
        {systemSettings?.maintenanceMode && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border-2 border-amber-500 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300 text-sm font-mono">
                সিস্টেম রক্ষণাবেক্ষণ মোড সক্রিয় (MAINTENANCE MODE ACTIVE)
              </p>
              <p className="text-amber-200/90 mt-0.5 leading-relaxed">
                {systemSettings.maintenanceMessage ||
                  'বর্তমানে সাইটে জরুরি রক্ষণাবেক্ষণ চলছে। শুধুমাত্র অ্যাডমিন লগইন অনুমোদিত।'}
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* MILITARY ID & PASSWORD LOGIN */}
        <form
          onSubmit={handleCredentialsSubmit}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              মিলিটারি ক্রেডেনশিয়াল মোড
            </span>
            <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
              Secure Auth
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide font-sans">
              Military ID & Secret Password
            </h2>
            <p className="text-xs text-slate-400">
              আপনার রেজিমেন্টাল ইউজারনেম ও পাসওয়ার্ড দিয়ে সিস্টেমে প্রবেশ করুন।
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                Username / Army No (ইউজারনেম)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g., admin, co, offr, rsm, p_bsm..."
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                Secret Password (পাসওয়ার্ড)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password..."
                  required
                  className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCredentialLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isCredentialLoading ? 'যাচাই করা হচ্ছে...' : 'প্রবেশ করুন (Secure Login)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* GUEST / VISITOR ACCESS */}
        {systemSettings?.allowGuestMode !== false && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>GUEST ACCESS (শুধুমাত্র দেখার জন্য)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                কোনো পরিবর্তন না করে শুধুমাত্র রিপোর্ট ও স্টেটাস পরিদর্শনের জন্য প্রবেশ করুন।
              </p>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-400"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Guest হিসেবে প্রবেশ করুন</span>
            </button>
          </div>
        )}

        {/* Security Notice Footer */}
        <div className="pt-2 border-t border-slate-800/80 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>CONFIDENTIAL • 10 MED REGT ARTY MILITARY USE ONLY</span>
        </div>
      </div>
    </div>
  );
};
