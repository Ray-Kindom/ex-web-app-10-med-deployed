import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  ShieldCheck,
  X,
  Radio,
  Server,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    syncAllToCloud,
    usersList,
    personnelList,
    currentUser,
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handlePushAllData = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncAllToCloud();
      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `রেজিমেন্টের সকল ডেটা (${personnelList.length} জন সেনাসদস্যের নোমিনাল রোল, ইউজার একাউন্ট ও কনফিগারেশন) ক্লাউড ডাটাবেসে সফলভাবে সিঙ্ক ও সংরক্ষিত হয়েছে!`,
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'সিঙ্ক ব্যর্থ হয়েছে। অনুগ্রহ করে ইন্টারনেট ও ক্লাউড কনফিগারেশন চেক করুন।',
        });
      }
    } catch (e: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `সিঙ্ক এরর: ${e?.message || 'Failed'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cloud Database Synchronization</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                  LIVE CLOUD SYNC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                10 Medium Regiment Artillery • Secure Multi-Device Cloud Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Indicator */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>ক্লাউড ও লোকাল অটো-সিঙ্ক সক্রিয় (Online & Active)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-700/50 font-bold">
                CONNECTED
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              আপনার রেজিমেন্টের যেকোনো ইউজার নিজস্ব <strong>আইডি ও পাসওয়ার্ড</strong> দিয়ে লগইন করে কাজ করতে পারবে। নোমিনাল রোল, হাজিরা, ডিউটি ও যেকোনো এডিট সরাসরি ক্লাউড সার্ভারে তাৎক্ষণিক সংরক্ষিত ও অন্যান্য ডিভাইসে সিঙ্ক হবে।
            </p>
            <div className="pt-2 border-t border-emerald-800/40 flex items-center justify-between text-[11px] font-mono text-emerald-300/90">
              <span>বর্তমান সেশন: <strong>{currentUser.rank} {currentUser.name} ({currentUser.role})</strong></span>
              <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">Auto-Push Ready</span>
            </div>
          </div>

          {/* Sync Status Message */}
          {syncStatusMsg && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
              syncStatusMsg.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
            }`}>
              {syncStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{syncStatusMsg.text}</span>
            </div>
          )}

          {/* Database Specs Card */}
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Target Cloud Database</span>
              <span className="text-slate-200 font-bold flex items-center gap-1.5 truncate">
                <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PostgreSQL / Cloud DB</span>
              </span>
              <span className="text-[10px] text-emerald-400 mt-1 block">Multi-Device • Active</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Current Regiment Roll</span>
              <span className="text-white font-bold block">
                {personnelList.length} Personnel • {usersList.length} Users
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">10 Med Regt Arty Data</span>
            </div>
          </div>

          {/* Force Push / Test Sync Action */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Push / Test Cloud Synchronization (ম্যানুয়াল সিঙ্ক)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  রেজিমেন্টের সম্পূর্ণ নোমিনাল রোল ({personnelList.length} জন), পদবি, ডিউটি ও কনফিগ ক্লাউডে আপলোড ও সিঙ্ক করুন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePushAllData}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'ক্লাউডে ডেটা সিঙ্ক হচ্ছে...' : 'Sync Entire Regiment to Cloud Now (এখনই সিঙ্ক করুন)'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Real-Time Multi-Device Cloud Sync</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
