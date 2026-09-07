import React, { useState } from 'react';
import { useApp, MASTER_ADMIN_EMAIL } from '../context/AppContext';
import { UnitLogo } from '../components/common/UnitLogo';
import {
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  X,
  Cloud,
  UserCheck,
  Sparkles,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Clock,
  RefreshCw,
  Lock,
  UserX,
  CheckCircle2,
  KeyRound,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    loginWithCredentials,
    loginWithGoogle,
    pendingGoogleUser,
    clearPendingGoogleUser,
    checkPendingApprovalStatus,
    systemSettings,
  } = useApp();

  const [authTab, setAuthTab] = useState<'google' | 'credentials'>('google');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCredentialLoading, setIsCredentialLoading] = useState(false);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGuestLogin = () => {
    setErrorMessage(null);
    const result = loginWithCredentials('Guest', 'guest123');
    if (!result.success) {
      setErrorMessage(result.error || 'গেস্ট লগইন করতে সমস্যা হয়েছে।');
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setErrorMessage('অনুগ্রহ করে ইউজারনেম এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }
    setIsCredentialLoading(true);
    try {
      const result = loginWithCredentials(usernameInput.trim(), passwordInput.trim());
      if (!result.success) {
        setErrorMessage(result.error || 'ভুল ইউজারনেম বা পাসওয়ার্ড!');
      }
    } finally {
      setIsCredentialLoading(false);
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
      } else if (!res.success && res.code !== 'auth/popup-closed-by-user' && res.code !== 'auth/pending-approval') {
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Unit Emblem & Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <UnitLogo size="xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider font-sans uppercase">
            {systemSettings?.unitName || '10 MED REGT ARTY'}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20">
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
                  'বর্তমানে সাইটে জরুরি রক্ষণাবেক্ষণ চলছে। শুধুমাত্র মাস্টার অ্যাডমিন লগইন অনুমোদিত।'}
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

        {/* Pending Google Account Approval Screen */}
        {pendingGoogleUser ? (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border-2 border-amber-500 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono uppercase tracking-wide">
                <Clock className="w-5 h-5 animate-spin text-amber-400" />
                <span>অ্যাকাউন্ট অনুমোদনের অপেক্ষায় (Pending Master Approval)</span>
              </div>
              <button
                type="button"
                onClick={clearPendingGoogleUser}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Cancel pending login"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/30">
              {pendingGoogleUser.photoURL ? (
                <img
                  src={pendingGoogleUser.photoURL}
                  alt={pendingGoogleUser.name || 'User'}
                  className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-400 shrink-0">
                  {(pendingGoogleUser.name || pendingGoogleUser.email).slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{pendingGoogleUser.name || 'Google User'}</div>
                <div className="text-xs font-mono text-amber-300 truncate">{pendingGoogleUser.email}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>অ্যাডমিনের অনুমোদনের জন্য অপেক্ষমান</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                <strong>নিরাপত্তা বার্তা:</strong> আপনার জিমেইলটি এখনও মাস্টার অ্যাডমিন কর্তৃক অনুমোদিত নয়।
                শুধুমাত্র মাস্টার অ্যাডমিন (<span className="text-amber-300 font-mono font-semibold">{MASTER_ADMIN_EMAIL}</span>)
                অ্যাডমিন প্যানেল থেকে পদবি (CO, RSM, BSM, Offr) নির্ধারণ করে অনুমোদন দিলে আপনি সিস্টেমে প্রবেশ করতে পারবেন।
              </p>
              <p className="text-slate-400 text-[11px]">
                মাস্টার অ্যাডমিন অনুমোদন দেওয়ার পর নিচের বাটনে ক্লিক করে স্ট্যাটাস চেক করুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setIsCheckingApproval(true);
                  const approved = await checkPendingApprovalStatus();
                  setIsCheckingApproval(false);
                  if (!approved) {
                    setErrorMessage('আপনার জিমেইলটি এখনও মাস্টার অ্যাডমিন কর্তৃক অনুমোদিত হয়নি। অনুগ্রহ করে অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।');
                  }
                }}
                disabled={isCheckingApproval}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingApproval ? 'animate-spin' : ''}`} />
                <span>{isCheckingApproval ? 'যাচাই করা হচ্ছে...' : 'Check Approval Status (যাচাই করুন)'}</span>
              </button>

              <button
                type="button"
                onClick={clearPendingGoogleUser}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors border border-slate-700 ml-auto"
              >
                অন্য জিমেইলে সুইচ করুন
              </button>
            </div>
          </div>
        ) : (
          /* PRIMARY AUTHENTICATION WITH TABS */
          <div className="space-y-5">
            {/* Tab Navigation */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('google');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authTab === 'google'
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span>Google Sign-In (জিমেইল)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthTab('credentials');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authTab === 'credentials'
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Military ID & Password (পাসওয়ার্ড)</span>
              </button>
            </div>

            {/* TAB 1: GOOGLE SIGN-IN */}
            {authTab === 'google' && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-emerald-500/50 p-6 sm:p-7 shadow-2xl shadow-emerald-950/30 animate-in fade-in">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      সম্পূর্ণ জিমেইল ভিত্তিক নিরাপত্তা
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-400/90 bg-slate-950/80 px-2.5 py-1 rounded border border-emerald-500/20">
                      Google Identity Auth
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide font-sans flex items-center gap-2">
                      <span>Sign in with Google Account</span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      রেজিমেন্টের স্মার্ট ড্যাশবোর্ডে প্রবেশ করতে আপনার গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
                    </p>
                  </div>

                  {/* Big Google Sign-In Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading}
                      className="w-full py-4 px-6 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-0.5 border border-slate-200"
                    >
                      {/* Official Google SVG Logo */}
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>
                        {isGoogleLoading
                          ? 'গুগল অথেন্টিকেশন যাচাই করা হচ্ছে...'
                          : 'Sign in with Google (জিমেইল দিয়ে প্রবেশ করুন)'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-600 ml-1" />
                    </button>
                  </div>

                  {/* System Access Rules Info Box */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>লগইন ও নিরাপত্তা নীতিমালা:</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-300">একক মাস্টার অ্যাডমিন: </span>
                        <span className="font-mono text-white bg-slate-900 px-1.5 py-0.5 rounded border border-rose-500/30">
                          {MASTER_ADMIN_EMAIL}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          শুধুমাত্র এই একটি জিমেইল সম্পূর্ণ অ্যাডমিন ক্ষমতার অধিকারী।
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <UserX className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300">অন্যান্য যেকোনো জিমেইল (Strict Whitelist): </span>
                        <span className="text-slate-300">
                          এডমিন কর্তৃক পূর্বে অনুমোদিত তালিকায় (Whitelist) জিমেইলটি তালিকাভুক্ত থাকলে তবেই নির্ধারিত রোলে লগইন হবে। অন্যথায় স্বয়ংক্রিয়ভাবে ব্লক করা হবে।
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MILITARY ID & PASSWORD LOGIN */}
            {authTab === 'credentials' && (
              <form
                onSubmit={handleCredentialsSubmit}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/50 p-6 sm:p-7 shadow-2xl shadow-amber-950/30 space-y-5 animate-in fade-in"
              >
                <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    সামরিক ক্রেডেনশিয়াল মোড
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
                    Encrypted Auth
                  </span>
                </div>

                <div className="space-y-1 relative z-10">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide font-sans">
                    Military ID & Secret Password
                  </h2>
                  <p className="text-xs text-slate-300">
                    আপনার রেজিমেন্টাল ইউজার আইডি ও গোপন পাসওয়ার্ড দিয়ে লগইন করুন।
                  </p>
                </div>

                <div className="space-y-4 relative z-10">
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
                        placeholder="e.g., admin, co, rsm..."
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
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
                        className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
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
            )}

            {/* GUEST / VISITOR ACCESS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>GUEST ACCESS (শুধুমাত্র দেখার জন্য)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  {systemSettings?.allowGuestMode === false
                    ? 'গেস্ট মোড অ্যাডমিন প্যানেল থেকে বন্ধ রাখা হয়েছে।'
                    : 'জিমেইল বা পাসওয়ার্ড ছাড়া কোনো পরিবর্তন না করে শুধু তথ্য দেখার জন্য প্রবেশ করুন।'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={systemSettings?.allowGuestMode === false}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  systemSettings?.allowGuestMode === false
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-400'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Guest হিসেবে প্রবেশ করুন</span>
              </button>
            </div>
          </div>
        )}

        {/* Security Notice Footer */}
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

            {/* Switch to Password Login Notice - NO UNCHECKED BYPASS */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
                <KeyRound className="w-4 h-4" />
                <span>বিকল্প সমাধান: পাসওয়ার্ড দিয়ে প্রবেশ করুন</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ডোমেইন অথরাইজেশনের ঝামেলা এড়িয়ে এখনই ঢুকতে চাইলে আপনার সামরিক ইউজার আইডি ও সিক্রেট পাসওয়ার্ড ব্যবহার করতে পারেন:
              </p>
              <button
                type="button"
                onClick={() => {
                  setUnauthorizedDomain(null);
                  setAuthTab('credentials');
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <KeyRound className="w-4 h-4" />
                <span>Switch to Military Password Login</span>
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
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
