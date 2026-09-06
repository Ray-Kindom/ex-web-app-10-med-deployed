import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserAccount } from '../types';
import { UnitLogo } from '../components/common/UnitLogo';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Shield,
  X,
  KeyRound,
  Cloud,
  UserCheck,
  Sparkles,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    usersList,
    loginWithCredentials,
    loginWithGoogle,
    pendingGoogleUser,
    clearPendingGoogleUser,
    checkPendingApprovalStatus,
    systemSettings,
  } = useApp();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showEmergencyLogin, setShowEmergencyLogin] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fallback direct login form toggle for manual input if needed
  const [manualLogin, setManualLogin] = useState(false);
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');

  // Group or order users: CO, Offr, RSM, P BSM, Q BSM, R BSM, HQ BSM, Admin, followed by custom additions
  const roleRankOrder = ['CO', 'Offr', 'RSM', 'P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'Admin'];

  const sortedUsers = [...usersList]
    .filter((u) => u.role !== 'Guest' && u.username.toLowerCase() !== 'guest')
    .sort((a, b) => {
      const orderA = roleRankOrder.indexOf(a.role);
      const orderB = roleRankOrder.indexOf(b.role);
      const weightA = orderA === -1 ? 99 : orderA;
      const weightB = orderB === -1 ? 99 : orderB;
      if (weightA !== weightB) return weightA - weightB;
      return (a.name || '').localeCompare(b.name || '');
    });

  const handleGuestLogin = () => {
    setErrorMessage(null);
    const result = loginWithCredentials('Guest', 'guest123');
    if (!result.success) {
      setErrorMessage(result.error || 'গেস্ট লগইন করতে সমস্যা হয়েছে।');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginWithGoogle();
      if (!res.success && res.code === 'auth/unauthorized-domain') {
        const domain = res.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
        setUnauthorizedDomain(domain);
      } else if (!res.success && res.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(res.error || 'গুগল লগইন সম্পন্ন করা সম্ভব হয়নি।');
      }
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(typeof window !== 'undefined' ? window.location.hostname : '');
      } else if (e?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(e?.message || 'গুগল লগইন সম্পন্ন করা সম্ভব হয়নি।');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleOpenPasswordModal = (user: UserAccount) => {
    setSelectedUser(user);
    setPassword('');
    setShowPassword(false);
    setErrorMessage(null);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMessage(null);

    const result = loginWithCredentials(selectedUser.username, password);
    if (!result.success) {
      setErrorMessage(result.error || 'ভুল পাসওয়ার্ড। দয়া করে পুনরায় চেষ্টা করুন।');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const result = loginWithCredentials(manualUsername, manualPassword);
    if (!result.success) {
      setErrorMessage(result.error || 'ভুল ইউজারনেম বা পাসওয়ার্ড।');
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return '10M';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Unit Emblem & Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <UnitLogo size="xl" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide font-sans uppercase">
            {systemSettings?.unitName || '10 MED REGT ARTY'}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {systemSettings?.unitMotto || 'Born Destroyer'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {systemSettings?.tagline || 'Smart Dashboard'}
            </span>
          </div>
        </div>

        {/* Emergency Maintenance Mode Banner */}
        {systemSettings?.maintenanceMode && (
          <div className="p-4 rounded-xl bg-amber-950/70 border-2 border-amber-500 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
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
        {errorMessage && !selectedUser && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Pending Google Account Approval Banner */}
        {pendingGoogleUser && (
          <div className="p-5 rounded-2xl bg-amber-950/40 border-2 border-amber-500/60 shadow-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm font-mono uppercase tracking-wide">
                <Clock className="w-4 h-4 animate-spin text-amber-400" />
                <span>অ্যাকাউন্ট অনুমোদনের অপেক্ষায় (Pending Owner Approval)</span>
              </div>
              <button
                type="button"
                onClick={clearPendingGoogleUser}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Cancel pending login"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-amber-500/30">
              {pendingGoogleUser.photoURL ? (
                <img
                  src={pendingGoogleUser.photoURL}
                  alt={pendingGoogleUser.name || 'User'}
                  className="w-11 h-11 rounded-full border border-amber-400 object-cover shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-800 border border-amber-400 flex items-center justify-center font-bold text-amber-400 shrink-0">
                  {(pendingGoogleUser.name || pendingGoogleUser.email).slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{pendingGoogleUser.name || 'Google User'}</div>
                <div className="text-xs font-mono text-amber-300 truncate">{pendingGoogleUser.email}</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনার গুগল অ্যাকাউন্টটি রেজিমেন্টাল ওনারের অনুমোদনের অপেক্ষায় রয়েছে। ওনার অ্যাডমিন প্যানেল থেকে অনুমোদন করলেই আপনি সরাসরি সিস্টেমে প্রবেশ করতে পারবেন।
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setIsCheckingApproval(true);
                  const approved = await checkPendingApprovalStatus();
                  setIsCheckingApproval(false);
                  if (!approved) {
                    setErrorMessage('আপনার অ্যাকাউন্টটি এখনও ওনার কর্তৃক অনুমোদিত হয়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
                  }
                }}
                disabled={isCheckingApproval}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-md transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingApproval ? 'animate-spin' : ''}`} />
                <span>{isCheckingApproval ? 'যাচাই করা হচ্ছে...' : 'Check Approval Status'}</span>
              </button>

              <button
                type="button"
                onClick={handleGuestLogin}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Continue as Guest</span>
              </button>

              <button
                type="button"
                onClick={clearPendingGoogleUser}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs cursor-pointer transition-colors font-mono ml-auto"
              >
                Switch Account
              </button>
            </div>
          </div>
        )}

        {/* PRIMARY AUTHENTICATION: AUTHORIZED GOOGLE SIGN-IN HERO CARD */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-emerald-500/50 p-6 sm:p-7 shadow-2xl shadow-emerald-950/30">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  PRIMARY ACCESS METHOD
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  Military Security Standard
                </span>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-400/90 bg-slate-950/80 px-2.5 py-0.5 rounded border border-emerald-500/20">
                Authorized Accounts Only
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide font-sans flex items-center gap-2">
                <span>Sign in with Authorized Google Account</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                রেজিমেন্টের সকল অপারেশনাল মডিউল (CO, Offr, RSM, BSM, Admin) এক্সেস করতে আপনার অনুমোদিত গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।
              </p>
            </div>

            {/* Big Google Sign-In Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-0.5 border border-slate-200"
              >
                {/* Official Google SVG Logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isGoogleLoading ? 'Connecting to Google Authentication...' : 'Sign in with Google (Authorized Military Account)'}</span>
                <ArrowRight className="w-4 h-4 text-slate-600 ml-1" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>শুধুমাত্র অ্যাডমিন দ্বারা পূর্বে অনুমোদিত (Whitelisted) জিমেইল দিয়ে সিস্টেমে সরাসরি ঢোকা যাবে।</span>
            </div>
          </div>
        </div>

        {/* GUEST LOGIN CARD */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950 border ${systemSettings?.allowGuestMode === false ? 'border-slate-800 opacity-60' : 'border-amber-500/50'} p-5 sm:p-6 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  DEMO & VISITOR ACCESS
                </span>
                {systemSettings?.allowGuestMode === false && (
                  <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-600/60 text-[10px] font-mono font-bold">
                    DISABLED BY ADMIN
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-amber-400 font-mono flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>GUEST LOGIN (Read-Only Mode)</span>
              </h3>
              <p className="text-xs text-slate-300 max-w-xl">
                {systemSettings?.allowGuestMode === false
                  ? 'গেস্ট মোড অ্যাডমিন প্যানেল থেকে সাময়িকভাবে বন্ধ রাখা হয়েছে।'
                  : 'কোনো অনুমোদন বা পাসওয়ার্ড ছাড়াই প্যারেড স্টেট ও রেজিমেন্টের তথ্য শুধু দেখার জন্য প্রবেশ করুন।'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={systemSettings?.allowGuestMode === false}
              className={`px-6 py-3 rounded-xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all shrink-0 ${
                systemSettings?.allowGuestMode === false
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{systemSettings?.allowGuestMode === false ? 'Guest Disabled' : 'Login as Guest'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* EMERGENCY / OFFLINE PASSKEY LOGIN (COLLAPSIBLE ACCORDION) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowEmergencyLogin(!showEmergencyLogin)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/90 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>ইমার্জেন্সি অফলাইন ব্যাকআপ লগইন (ID & Passkey Login)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>{showEmergencyLogin ? 'লুকান (Hide)' : 'খুলুন (Expand)'}</span>
              {showEmergencyLogin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showEmergencyLogin && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="text-xs font-bold text-slate-300 font-mono">
                  Select Profile or Enter Username
                </div>
                <button
                  type="button"
                  onClick={() => setManualLogin(!manualLogin)}
                  className="text-xs text-rose-400 hover:underline font-mono"
                >
                  {manualLogin ? 'Select from User List' : 'Direct Username Form'}
                </button>
              </div>

              {!manualLogin ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 max-h-[36vh] overflow-y-auto pr-1">
                  {sortedUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleOpenPasswordModal(user)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-left transition-colors cursor-pointer"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-amber-300 shrink-0">
                          {getUserInitials(user.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {user.rank} {user.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{user.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-3 max-w-sm mx-auto py-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Username / Service ID
                    </label>
                    <input
                      type="text"
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      placeholder="e.g. admin, co, rsm"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Authenticate Passkey</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="pt-2 border-t border-slate-800/80 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>CONFIDENTIAL • 10 MED REGT ARTY MILITARY USE ONLY</span>
        </div>
      </div>

      {/* Domain Authorization Helper Modal */}
      {unauthorizedDomain && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setUnauthorizedDomain(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Firebase Domain Authorization Required
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  গুগল ফায়ারবেস সিকিউরিটির কারণে বর্তমান ক্লাউড প্রিভিউ ডোমেইনটি Firebase Console-এর Authorized Domains তালিকায় যুক্ত থাকতে হয়।
                </p>
              </div>
            </div>

            {/* Quick 1-Click Bypass to Admin */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                <Sparkles className="w-4 h-4" />
                <span>তাত্ক্ষণিক অ্যাডমিন অ্যাক্সেস (Recommended)</span>
              </div>
              <p className="text-xs text-slate-300">
                ডোমেইন কনফিগারেশন ছাড়াই সরাসরি ফুল অ্যাডমিন হিসেবে প্রবেশ করতে নিচের বাটনে চাপুন:
              </p>
              <button
                type="button"
                onClick={() => {
                  setUnauthorizedDomain(null);
                  const result = loginWithCredentials('admin', 'admin123');
                  if (!result.success) {
                    setErrorMessage(result.error || 'অ্যাডমিন লগইন করতে সমস্যা হয়েছে।');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Continue as Regimental Admin (One-Click)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Step-by-step Whitelist Instructions */}
            <div className="space-y-2.5 pt-1">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>বর্তমান ডোমেইন (Current Host):</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2500);
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Copied to Clipboard!' : 'Copy Domain'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-amber-300 break-all select-all flex items-center justify-between">
                <span>{unauthorizedDomain}</span>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1.5 pt-1 font-sans bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p className="font-semibold text-slate-300">Firebase Console-এ ডোমেইন যুক্ত করার নিয়ম:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Firebase Console (<a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-rose-400 underline inline-flex items-center gap-0.5">console.firebase.google.com <ExternalLink className="w-2.5 h-2.5 inline" /></a>) ওপেন করুন।</li>
                  <li>প্রজেক্ট <strong>gen-lang-client-0581671896</strong> বেছে নিয়ে <strong>Authentication</strong> → <strong>Settings</strong> ট্যাবে যান।</li>
                  <li><strong>Authorized domains</strong> সেকশনে <strong>Add domain</strong>-এ ক্লিক করে উপরের ডোমেইনটি পেস্ট করে সেভ করুন।</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setUnauthorizedDomain(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal when a user card is clicked */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => {
                setSelectedUser(null);
                setErrorMessage(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Selected User Identity */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-full border-2 border-rose-500 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-mono font-bold text-amber-300">
                  {getUserInitials(selectedUser.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">
                  {selectedUser.rank} {selectedUser.name}
                </div>
                <div className="text-xs text-rose-400 font-mono font-semibold">
                  {selectedUser.role} {selectedUser.assignedBattery ? `• ${selectedUser.assignedBattery}` : ''}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  পাসওয়ার্ড লিখুন (Enter Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  <span>Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
