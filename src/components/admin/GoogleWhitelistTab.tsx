import React, { useState } from 'react';
import { useApp, OWNER_EMAILS } from '../../context/AppContext';
import { Role, Battery, ALL_BATTERIES } from '../../types';
import {
  Cloud,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Mail,
  Building2,
  Trash2,
  Sparkles,
  Clock,
  ShieldAlert,
  Database,
  Code,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  syncAuthorizedUsersToSupabase,
  getSupabaseSchemaSql,
} from '../../lib/supabase';

const AVAILABLE_BATTERIES: Battery[] = ALL_BATTERIES;

const MILITARY_RANKS = [
  'Lt Col',
  'Maj',
  'Capt',
  'Lt',
  'SWO',
  'MWO',
  'WO',
  'Sgt',
  'Cpl',
  'Lcpl',
  'Snk',
  'Gnr',
  'Admin',
];

const ROLES_LIST: { role: Role; label: string }[] = [
  { role: 'CO', label: 'Commanding Officer (CO)' },
  { role: 'Offr', label: 'Officer (Offr)' },
  { role: 'RSM', label: 'Regimental Sgt Major (RSM)' },
  { role: 'P BSM', label: 'P Battery Sgt Major (P BSM)' },
  { role: 'Q BSM', label: 'Q Battery Sgt Major (Q BSM)' },
  { role: 'R BSM', label: 'R Battery Sgt Major (R BSM)' },
  { role: 'HQ BSM', label: 'HQ Battery Sgt Major (HQ BSM)' },
  { role: 'Admin', label: 'System Admin' },
];

export const GoogleWhitelistTab: React.FC = () => {
  const {
    usersList,
    accessRequests,
    approveGoogleRequest,
    rejectGoogleRequest,
    preApproveGoogleUser,
    revokeGoogleUserApproval,
    updateGoogleUserRole,
    showNotification,
  } = useApp();

  // Form State for Pre-Approving a Google user
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState('Capt');
  const [newRole, setNewRole] = useState<Role>('Offr');
  const [newBattery, setNewBattery] = useState<Battery>('HQ Bty');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-pending request state selection
  const [requestOverrides, setRequestOverrides] = useState<
    Record<string, { rank: string; role: Role; battery: Battery }>
  >({});

  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // Pending access requests
  const pendingRequests = accessRequests.filter((r) => r.status === 'pending');

  // Approved users that have an email or approved access requests
  const approvedAccountsMap = new Map<
    string,
    {
      email: string;
      name: string;
      rank: string;
      role: Role;
      battery: string;
      isOwner: boolean;
      approvedBy?: string;
      approvedAt?: string;
      source: 'owner' | 'user' | 'request';
      id?: string;
    }
  >();

  // 1. Add Master Owner (Single Master Admin: int10med2026@gmail.com)
  OWNER_EMAILS.forEach((ownerEmail) => {
    approvedAccountsMap.set(ownerEmail.toLowerCase(), {
      email: ownerEmail.toLowerCase(),
      name: 'Regimental Master Admin',
      rank: 'Owner / Admin',
      role: 'Admin',
      battery: 'All Btys',
      isOwner: true,
      approvedBy: 'Permanent Master Owner',
      approvedAt: 'Permanent Master',
      source: 'owner',
    });
  });

  // 2. Add users with email from usersList
  usersList.forEach((u) => {
    if (u.email && u.isApproved !== false) {
      const emailLower = u.email.toLowerCase();
      if (!approvedAccountsMap.has(emailLower)) {
        approvedAccountsMap.set(emailLower, {
          email: emailLower,
          name: u.name,
          rank: u.rank,
          role: u.role,
          battery: u.assignedBattery || 'HQ Bty',
          isOwner: false,
          approvedBy: u.approvedBy || 'Admin',
          approvedAt: u.approvedAt || 'Active',
          source: 'user',
          id: u.id,
        });
      }
    }
  });

  // 3. Add approved access requests
  accessRequests
    .filter((r) => r.status === 'approved')
    .forEach((r) => {
      const emailLower = r.email.toLowerCase();
      if (!approvedAccountsMap.has(emailLower)) {
        approvedAccountsMap.set(emailLower, {
          email: emailLower,
          name: r.name,
          rank: r.assignedRank || 'Offr',
          role: r.assignedRole || 'Offr',
          battery: r.assignedBattery || 'HQ Bty',
          isOwner: false,
          approvedBy: r.reviewedBy || 'Admin',
          approvedAt: r.reviewedAt || 'Approved',
          source: 'request',
          id: r.id,
        });
      }
    });

  const approvedList = Array.from(approvedAccountsMap.values());

  const handlePreApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      showNotification('অনুগ্রহ করে সঠিক জিমেইল অ্যাড্রেস লিখুন।');
      return;
    }
    setIsSubmitting(true);
    try {
      await preApproveGoogleUser(
        newEmail.trim().toLowerCase(),
        newName.trim() || newEmail.split('@')[0],
        newRank,
        newRole,
        newBattery
      );
      setNewEmail('');
      setNewName('');
      setNewRank('Capt');
      setNewRole('Offr');
      setNewBattery('HQ Bty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePending = async (requestId: string, reqName: string) => {
    const override = requestOverrides[requestId] || {
      rank: 'Capt',
      role: 'Offr',
      battery: 'HQ Bty',
    };
    await approveGoogleRequest(
      requestId,
      override.role,
      override.rank,
      reqName,
      override.battery
    );
  };

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
      showNotification('ডোমেইন ক্লিপবোর্ডে কপি হয়েছে।');
    }
  };

  const handleSyncWhitelistToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      showNotification('Supabase URL অথবা Anon Key কনফিগার করা নেই। অনুগ্রহ করে .env ফাইল চেক করুন।');
      return;
    }
    setIsSyncingSupabase(true);
    try {
      const res = await syncAuthorizedUsersToSupabase(usersList);
      if (res.success) {
        showNotification(`সফলভাবে ${res.count} জন অনুমোদিত ইউজার Supabase authorized_users টেবিলে সিঙ্ক হয়েছে!`);
      } else {
        showNotification(`Supabase ত্রুটি: ${res.error}`);
      }
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleCopySql = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(getSupabaseSchemaSql());
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
      showNotification('Supabase PostgreSQL Schema SQL ক্লিপবোর্ডে কপি হয়েছে!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Stats Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <Cloud className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide font-sans">
                অথরাইজড গুগল অ্যাকাউন্ট ও অনুমোদন ব্যবস্থাপনা
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              এই ড্যাশবোর্ডে শুধুমাত্র অনুমোদিত (Approved) গুগল অ্যাকাউন্ট দিয়ে লগইন করা যাবে।
              অ্যাডমিন এখান থেকে যে কোনো জিমেইল অ্যাড্রেস নির্দিষ্ট রোল ও ব্যাটারিসহ অগ্রিম তালিকাভুক্ত (Pre-Approve) করতে পারবেন।
              অননুমোদিত কোনো জিমেইল দিয়ে সিস্টেমে প্রবেশ করা সম্ভব নয়।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Supabase Action Buttons */}
            <button
              type="button"
              onClick={handleSyncWhitelistToSupabase}
              disabled={isSyncingSupabase}
              className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Sync all approved accounts directly to Supabase authorized_users table"
            >
              <Database className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
              <span>{isSyncingSupabase ? 'Syncing...' : 'Sync to Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View Supabase table schema SQL"
            >
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              <span>Supabase SQL</span>
            </button>

            <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 font-mono uppercase">Master Owners</span>
              <span className="text-base font-black text-rose-400 font-mono">{OWNER_EMAILS.length}</span>
            </div>
            <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 font-mono uppercase">Total Approved</span>
              <span className="text-base font-black text-emerald-400 font-mono">{approvedList.length}</span>
            </div>
            <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
              <span className="block text-[10px] text-slate-400 font-mono uppercase">Pending Requests</span>
              <span className="text-base font-black text-amber-400 font-mono">{pendingRequests.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval Requests Banner (if any) */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-amber-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
              অনুমোদনের অপেক্ষায় থাকা গুগল অনুরোধ ({pendingRequests.length})
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            নিচের ব্যবহারকারীগণ তাদের গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করেছেন এবং অনুমোদনের অপেক্ষায় আছেন।
            তাদের পদবি ও রোল সিলেক্ট করে অনুমোদন করুন:
          </p>

          <div className="grid grid-cols-1 gap-3">
            {pendingRequests.map((req) => {
              const currentOverride = requestOverrides[req.id] || {
                rank: 'Capt',
                role: 'Offr',
                battery: 'HQ Bty',
              };

              return (
                <div
                  key={req.id}
                  className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {req.photoURL ? (
                      <img
                        src={req.photoURL}
                        alt={req.name}
                        className="w-11 h-11 rounded-full object-cover border border-amber-400 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                        {req.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{req.name}</div>
                      <div className="text-xs font-mono text-amber-300 truncate">{req.email}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>অনুরোধের সময়: {new Date(req.requestedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Rank Selection */}
                    <select
                      value={currentOverride.rank}
                      onChange={(e) =>
                        setRequestOverrides((prev) => ({
                          ...prev,
                          [req.id]: { ...currentOverride, rank: e.target.value },
                        }))
                      }
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    >
                      {MILITARY_RANKS.map((rk) => (
                        <option key={rk} value={rk}>
                          {rk}
                        </option>
                      ))}
                    </select>

                    {/* Role Selection */}
                    <select
                      value={currentOverride.role}
                      onChange={(e) =>
                        setRequestOverrides((prev) => ({
                          ...prev,
                          [req.id]: { ...currentOverride, role: e.target.value as Role },
                        }))
                      }
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    >
                      {ROLES_LIST.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.role}
                        </option>
                      ))}
                    </select>

                    {/* Battery Selection */}
                    <select
                      value={currentOverride.battery}
                      onChange={(e) =>
                        setRequestOverrides((prev) => ({
                          ...prev,
                          [req.id]: { ...currentOverride, battery: e.target.value as Battery },
                        }))
                      }
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    >
                      {AVAILABLE_BATTERIES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>

                    {/* Actions */}
                    <button
                      type="button"
                      onClick={() => handleApprovePending(req.id, req.name)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectGoogleRequest(req.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-rose-400 font-semibold text-xs flex items-center gap-1 cursor-pointer border border-slate-700 hover:border-rose-500 transition-colors"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pre-Approve Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
            অগ্রিম গুগল অ্যাকাউন্ট অনুমোদন করুন (Pre-Approve Whitelist)
          </h3>
        </div>
        <p className="text-xs text-slate-300">
          যেকোনো কর্মকর্তা বা সৈনিকের জিমেইল অ্যাড্রেস আগে থেকেই সিস্টেমে অনুমোদন দিয়ে রাখতে পারেন।
          তিনি ওয়েবসাইটে এসে "Sign in with Google" চাপলে সাথে সাথে অনুমোদিত হয়ে নির্ধারিত রোলে প্রবেশ করতে পারবেন।
        </p>

        <form onSubmit={handlePreApproveSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Email */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Google Account (Gmail) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. officer.10med@gmail.com"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Official Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Capt Iftekhar Mahmud Abir"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Rank & Role & Battery */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Rank & Role</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={newRank}
                onChange={(e) => setNewRank(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              >
                {MILITARY_RANKS.map((rk) => (
                  <option key={rk} value={rk}>
                    {rk}
                  </option>
                ))}
              </select>

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              >
                {ROLES_LIST.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Battery & Submit */}
          <div className="flex flex-col justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'অ্যাপ্রুভ হচ্ছে...' : 'Pre-Approve Account'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Approved Accounts Whitelist Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
              অনুমোদিত গুগল অ্যাকাউন্টের তালিকা ({approvedList.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <th className="p-3">Google Email</th>
                <th className="p-3">Name / Rank</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Battery Access</th>
                <th className="p-3">Approval Authority</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {approvedList.map((acc) => {
                return (
                  <tr key={acc.email} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-100">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{acc.email}</span>
                        {acc.isOwner && (
                          <span className="text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                            MASTER OWNER
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-white">{acc.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{acc.rank}</div>
                    </td>

                    <td className="p-3">
                      <select
                        value={acc.role}
                        onChange={(e) => updateGoogleUserRole(acc.email, e.target.value as Role)}
                        className={`font-bold text-xs font-mono px-2 py-1 rounded border cursor-pointer focus:outline-none transition-colors ${
                          acc.role === 'Admin'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-600/60 focus:border-rose-400'
                            : acc.role === 'CO'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600/60 focus:border-amber-400'
                            : acc.role === 'Offr'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-600/60 focus:border-blue-400'
                            : acc.role === 'RSM'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-600/60 focus:border-purple-400'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 focus:border-emerald-400'
                        }`}
                        title="ক্লিক করে রোল পরিবর্তন করুন (Click to change role)"
                      >
                        {ROLES_LIST.map((r) => (
                          <option key={r.role} value={r.role} className="bg-slate-900 text-white font-sans">
                            {r.role} - {r.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3 font-mono text-slate-300">
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{acc.battery}</span>
                      </span>
                    </td>

                    <td className="p-3 text-[11px] text-slate-400">
                      <div className="font-medium text-slate-300">{acc.approvedBy}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{acc.approvedAt}</div>
                    </td>

                    <td className="p-3 text-right">
                      {acc.isOwner ? (
                        <span className="text-[10px] font-mono text-slate-500 italic">Protected</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => revokeGoogleUserApproval(acc.email)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 text-xs flex items-center gap-1 ml-auto cursor-pointer transition-colors border border-slate-700"
                          title="Revoke Google Access"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Revoke</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Firebase Authorized Domain Helper */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
            Firebase Google Sign-In Domain Whitelist
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          গুগল দিয়ে লগইন কাজ করার জন্য আপনার বর্তমান ওয়েবসাইটের ডোমেইনটি Firebase Console-এ অথরাইজড থাকতে হবে:
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-xs">
          <span className="text-slate-400">Current Hostname:</span>
          <code className="text-amber-300 font-bold bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
            {currentHostname || 'localhost'}
          </code>
          <button
            type="button"
            onClick={handleCopyDomain}
            className="sm:ml-auto px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedDomain ? 'Copied' : 'Copy Domain'}</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
          <div className="font-semibold text-slate-300">যদি <code>auth/unauthorized-domain</code> বা সিকিউরিটি সতর্কতা দেখা দেয়:</div>
          <div>1. ক্লাউড অথরাইজড ডোমেইন সেটিংসে বর্তমান হোস্ট ডোমেইনটি যুক্ত আছে কিনা নিশ্চিত করুন।</div>
          <div>2. উপরে প্রদর্শিত বর্তমান ডোমেইনটি কপি করে আপনার অথেন্টিকেশন সেটিংসে সেভ করুন।</div>
        </div>
      </div>

      {/* Supabase Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm font-mono">Supabase PostgreSQL Schema SQL</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/80 leading-relaxed">
              <p className="text-amber-300 mb-3 text-[11px]">
                ℹ️ এই SQL স্ক্রিপ্টটি Supabase ড্যাশবোর্ডের <strong>SQL Editor</strong>-এ পেস্ট করে <strong>Run</strong> করুন। এটি স্বয়ংক্রিয়ভাবে authorized_users, personnel এবং parade_records টেবিল ও RLS তৈরি করবে:
              </p>
              <pre className="p-3 bg-black/60 rounded-xl border border-slate-800 overflow-x-auto text-[11px] text-emerald-300/90 whitespace-pre">
                {getSupabaseSchemaSql()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
