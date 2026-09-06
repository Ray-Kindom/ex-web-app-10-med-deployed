import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { SystemSettings, Role } from '../../types';
import {
  Settings,
  Shield,
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  Building2,
  Cloud,
  FileJson,
  Sparkles,
  Layers,
  Database,
  Sliders,
  HelpCircle,
} from 'lucide-react';

export const SystemSettingsTab: React.FC = () => {
  const {
    systemSettings,
    updateSystemSettings,
    exportSystemBackup,
    importSystemBackup,
    resetSystemToDefaults,
    syncAllToCloud,
    isGuest,
    showNotification,
    personnelList,
    usersList,
    categoriesList,
    paradeRecords,
  } = useApp();

  const [formData, setFormData] = useState<SystemSettings>({ ...systemSettings });
  const [activeSubTab, setActiveSubTab] = useState<'IDENTITY' | 'SECURITY' | 'RBAC' | 'BACKUP'>('IDENTITY');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if systemSettings changes externally
  React.useEffect(() => {
    setFormData({ ...systemSettings });
  }, [systemSettings]);

  const handleTextChange = (field: keyof SystemSettings, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleToggle = (field: keyof SystemSettings) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleModulePermissionToggle = (role: string, moduleKey: string) => {
    setFormData((prev) => {
      const currentRolePerms = prev.modulePermissions?.[role] || {};
      const nextRolePerms = {
        ...currentRolePerms,
        [moduleKey]: !currentRolePerms[moduleKey],
      };
      return {
        ...prev,
        modulePermissions: {
          ...prev.modulePermissions,
          [role]: nextRolePerms,
        },
      };
    });
  };

  const handleSave = () => {
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }
    setIsSaving(true);
    const ok = updateSystemSettings(formData);
    setTimeout(() => {
      setIsSaving(false);
      if (ok) {
        showNotification('সিস্টেম কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।');
      }
    }, 400);
  };

  const handleCloudSync = async () => {
    if (isGuest) {
      showNotification('Guest mode is view-only.');
      return;
    }
    setIsSyncingCloud(true);
    try {
      const res = await syncAllToCloud();
      if (res.success) {
        showNotification(`Firestore ক্লাউডে ${res.count || 0} টি রেকর্ড সফলভাবে সিঙ্ক হয়েছে!`);
      } else {
        showNotification(`সিঙ্ক করতে সমস্যা: ${res.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      showNotification(`Cloud sync failed: ${e?.message || 'Error'}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGuest) {
      showNotification('Guest mode is view-only.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const ok = importSystemBackup(json);
        if (ok) {
          showNotification('ব্যাকআপ ফাইল থেকে সফলভাবে সিস্টেম রিস্টোর সম্পন্ন হয়েছে!');
        }
      } catch (err: any) {
        showNotification('অকার্যকর ব্যাকআপ ফাইল (Invalid JSON): ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteReset = () => {
    if (resetConfirmInput !== 'RESET10MED') {
      showNotification('নিশ্চিতকরণ টেক্সট মেলেনি! RESET10MED লিখুন।');
      return;
    }
    resetSystemToDefaults();
    setShowResetModal(false);
    setResetConfirmInput('');
    showNotification('সিস্টেম সম্পূর্ণ ডিফল্ট স্টেট-এ রিসেট করা হয়েছে।');
  };

  const moduleKeys = [
    { key: 'main_dashboard', label: 'Main Dashboard' },
    { key: 'battery_dashboard', label: 'Bty Dashboard' },
    { key: 'parade_state', label: 'Parade State' },
    { key: 'master_personnel', label: 'Regt Nominal' },
    { key: 'duty_detail', label: 'Duty Detailing' },
    { key: 'roll_simulator', label: 'Roll Simulator' },
    { key: 'out_of_unit', label: 'Out of Unit' },
    { key: 'admin_panel', label: 'Admin Panel' },
  ];

  const rolesToConfigure: string[] = [
    'CO',
    'Offr',
    'RSM',
    'BSM',
    'P BSM',
    'Q BSM',
    'R BSM',
    'HQ BSM',
    'Guest',
  ];

  const roleLabels: Record<string, { bn: string; desc: string }> = {
    CO: { bn: 'অধিনায়ক (CO)', desc: 'Commanding Officer Executive Console' },
    Offr: { bn: 'অফিসারবৃন্দ (Officer)', desc: 'Officers & Battery Commanders' },
    RSM: { bn: 'আরএসএম (RSM)', desc: 'Regimental Sergeant Major Console' },
    BSM: { bn: 'বিএসএম (Generic BSM)', desc: 'Battery Sergeant Major Common Role' },
    'P BSM': { bn: 'পি ব্যাটারি বিএসএম', desc: '1st Gun Battery BSM' },
    'Q BSM': { bn: 'কিউ ব্যাটারি বিএসএম', desc: '2nd Gun Battery BSM' },
    'R BSM': { bn: 'আর ব্যাটারি বিএসএম', desc: '3rd Gun Battery BSM' },
    'HQ BSM': { bn: 'এইচকিউ ব্যাটারি বিএসএম', desc: 'Headquarters Battery BSM' },
    Guest: { bn: 'গেস্ট / পরিদর্শক', desc: 'Read-only Visitor Access' },
  };

  const handleSelectAllForRole = (role: string) => {
    setFormData((prev) => {
      const allTrue: Record<string, boolean> = {};
      moduleKeys.forEach((m) => {
        allTrue[m.key] = true;
      });
      return {
        ...prev,
        modulePermissions: {
          ...prev.modulePermissions,
          [role]: allTrue,
        },
      };
    });
  };

  const handleClearAllForRole = (role: string) => {
    setFormData((prev) => {
      const allFalse: Record<string, boolean> = {};
      moduleKeys.forEach((m) => {
        allFalse[m.key] = false;
      });
      return {
        ...prev,
        modulePermissions: {
          ...prev.modulePermissions,
          [role]: allFalse,
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400">Unit Identification</div>
          <div className="text-base font-bold text-white truncate mt-1">{formData.unitName}</div>
          <div className="text-[10px] font-mono text-rose-400">{formData.unitMotto}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400">Guest Access</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                formData.allowGuestMode ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-bold text-white">
              {formData.allowGuestMode ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Disabled)'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">Read-Only Visitor Mode</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400">Passkey Login</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                formData.allowPasskeyLogin ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-bold text-white">
              {formData.allowPasskeyLogin ? 'Enabled' : 'Google Auth Only'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">Emergency Offline Login</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400">System Mode</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                formData.maintenanceMode ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className={`text-sm font-bold ${formData.maintenanceMode ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formData.maintenanceMode ? 'EMERGENCY LOCKDOWN' : 'OPERATIONAL'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">{personnelList.length} Personnel • {usersList.length} Accounts</div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('IDENTITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'IDENTITY'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>রেজিমেন্ট আইডেন্টিটি (Identity & Info)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SECURITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'SECURITY'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>সিকিউরিটি ও অ্যাক্সেস পলিসি (Security & Access)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('RBAC')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'RBAC'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>মডিউল এক্সেস ম্যাট্রিক্স (Role Permissions)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('BACKUP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'BACKUP'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>ডাটা ব্যাকআপ ও ক্লাউড সিঙ্ক (Backup & Restore)</span>
          </button>
        </div>

        {/* Global Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isGuest}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'Save System Settings'}</span>
        </button>
      </div>

      {/* SUB TAB 1: REGIMENT IDENTITY & BRANDING */}
      {activeSubTab === 'IDENTITY' && (
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Building2 className="w-4 h-4 text-rose-500" />
              <span>রেজিমেন্টাল পরিচয় ও ব্র্যান্ডিং সেটিংস</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              এখানে পরিবর্তিত নাম, স্লোগান এবং লোকেশন পুরো ওয়েবসাইটের হেডার, লগইন পেজ এবং প্রিন্ট কপিতে স্বয়ংক্রিয়ভাবে প্রতিফলিত হবে।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                UNIT FULL NAME / রেজিমেন্টের নাম
              </label>
              <input
                type="text"
                value={formData.unitName}
                onChange={(e) => handleTextChange('unitName', e.target.value)}
                placeholder="e.g. 10 MED REGT ARTY"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default: 10 MED REGT ARTY
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                UNIT MOTTO / স্লোগান
              </label>
              <input
                type="text"
                value={formData.unitMotto}
                onChange={(e) => handleTextChange('unitMotto', e.target.value)}
                placeholder="e.g. Born Destroyer"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default: Born Destroyer
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                TAGLINE / সাব-টাইটেল
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleTextChange('tagline', e.target.value)}
                placeholder="e.g. Smart Dashboard & Roll Management"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                STATION / CANTONMENT / সেনানিবাস
              </label>
              <input
                type="text"
                value={formData.station}
                onChange={(e) => handleTextChange('station', e.target.value)}
                placeholder="e.g. Savar Cantonment"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                COMMANDING OFFICER (CO) DISPLAY TITLE
              </label>
              <input
                type="text"
                value={formData.coName || ''}
                onChange={(e) => handleTextChange('coName', e.target.value)}
                placeholder="e.g. Lt Col Command Officer"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                REGIMENTAL HELPLINE / SUPPORT CONTACT
              </label>
              <input
                type="text"
                value={formData.supportContact || ''}
                onChange={(e) => handleTextChange('supportContact', e.target.value)}
                placeholder="e.g. Ext: 4421 / 017XXXXXXXX"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: SECURITY & ACCESS POLICIES */}
      {activeSubTab === 'SECURITY' && (
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>সিকিউরিটি ও অ্যাক্সেস পলিসি নিয়ন্ত্রণ</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ওয়েবসাইটের লগইন পদ্ধতি, গেস্ট এক্সেস এবং ইমার্জেন্সি লকডাউন সংক্রান্ত নিয়মাবলি অ্যাডমিন হিসেবে নিয়ন্ত্রণ করুন।
            </p>
          </div>

          <div className="space-y-4">
            {/* Policy 1: Guest Mode Switch */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white font-mono">Allow Guest Mode (গেস্ট মোড চালু রাখা)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    formData.allowGuestMode
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {formData.allowGuestMode ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  চালু থাকলে যে কেউ লগইন পেজ থেকে রিড-অনলি মোডে গেস্ট হিসেবে সিস্টেমে প্রবেশ করে প্যারেড স্টেট দেখতে পারবেন। বন্ধ করলে গেস্ট লগইন অপশনটি লক হয়ে যাবে।
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('allowGuestMode')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.allowGuestMode ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.allowGuestMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 2: Passkey / Offline Login Switch */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white font-mono">Allow Emergency Passkey Login (অফলাইন পাসকি লগইন)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    formData.allowPasskeyLogin
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {formData.allowPasskeyLogin ? 'ACTIVE' : 'GOOGLE AUTH ENFORCED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  বন্ধ রাখলে লগইন পেজে আইডি ও পাসওয়ার্ডের কোনো অপশন থাকবে না—সকল অফিসার ও ইউজারকে অবশ্যই অনুমোদিত গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করতে হবে।
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('allowPasskeyLogin')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.allowPasskeyLogin ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.allowPasskeyLogin ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 3: Strict Google Approval Enforcement */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white font-mono">Enforce Google Whitelist Approval (কঠোর অনুমোদন)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    formData.requireGoogleApproval
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-600 text-slate-300'
                  }`}>
                    {formData.requireGoogleApproval ? 'STRICT MILITARY APPROVAL' : 'OPEN'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  চালু থাকলে কোনো নতুন গুগল অ্যাকাউন্ট সাইন-ইন করলে তা সরাসরি সিস্টেমে ঢুকতে পারবে না; অ্যাডমিন প্যানেল থেকে আপনি অ্যাপ্রুভ করলেই কেবল প্রবেশাধিকার পাবে।
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('requireGoogleApproval')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.requireGoogleApproval ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.requireGoogleApproval ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 4: Emergency Maintenance / Lockdown Mode */}
            <div className={`p-4 rounded-xl border transition-all ${
              formData.maintenanceMode
                ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/30'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${formData.maintenanceMode ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                    <span className="text-sm font-bold text-white font-mono">
                      System Lockdown / Maintenance Mode (ইমার্জেন্সি লকডাউন মোড)
                    </span>
                    {formData.maintenanceMode && (
                      <span className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded font-mono animate-bounce">
                        LOCKDOWN ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    জরুরি অবস্থা বা ডেটা আপডেটের সময়ে এই মোড অন করলে অ্যাডমিন ছাড়া বাকি সকলের জন্য সাইট লকডাউন থাকবে এবং নিচে দেওয়া নোটিশটি প্রদর্শিত হবে।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle('maintenanceMode')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.maintenanceMode ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {formData.maintenanceMode && (
                <div className="mt-4 pt-3 border-t border-rose-500/30">
                  <label className="block text-xs font-semibold text-rose-300 mb-1 font-mono">
                    MAINTENANCE NOTICE TEXT / লকডাউন নোটিশ বার্তা
                  </label>
                  <textarea
                    rows={2}
                    value={formData.maintenanceMessage || ''}
                    onChange={(e) => handleTextChange('maintenanceMessage', e.target.value)}
                    placeholder="লকডাউন চলাকালীন ব্যবহারকারীদের প্রদর্শনের জন্য বার্তা লিখুন..."
                    className="w-full bg-slate-950 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-100 placeholder-rose-400/50 focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 3: ROLE-BASED ACCESS CONTROL (RBAC MATRIX) */}
      {activeSubTab === 'RBAC' && (
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>রোল ভিত্তিক মডিউল অনুমতি ম্যাট্রিক্স (RBAC Matrix)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                সিও, অফিসার, আরএসএম ও বিএসএম কোন কোন মডিউল দেখতে পাবেন তা নির্ধারণ করুন। বিএসএম শুধুমাত্র নিজ ব্যাটারির ডাটা দেখতে পারবে।
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  modulePermissions: {
                    Admin: { main_dashboard: true, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: true, out_of_unit: true, admin_panel: true },
                    CO: { main_dashboard: true, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: true, out_of_unit: true, admin_panel: false },
                    Offr: { main_dashboard: true, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: true, out_of_unit: true, admin_panel: false },
                    RSM: { main_dashboard: true, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: true, out_of_unit: true, admin_panel: false },
                    BSM: { main_dashboard: false, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: false, out_of_unit: false, admin_panel: false },
                    'P BSM': { main_dashboard: false, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: false, out_of_unit: false, admin_panel: false },
                    'Q BSM': { main_dashboard: false, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: false, out_of_unit: false, admin_panel: false },
                    'R BSM': { main_dashboard: false, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: false, out_of_unit: false, admin_panel: false },
                    'HQ BSM': { main_dashboard: false, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: false, out_of_unit: false, admin_panel: false },
                    Guest: { main_dashboard: true, battery_dashboard: true, parade_state: true, master_personnel: true, duty_detail: true, roll_simulator: true, out_of_unit: true, admin_panel: true },
                  },
                }));
                showNotification('ম্যাট্রিক্স মিলিটারি স্ট্যান্ডার্ড ডিফল্ট-এ ফিরিয়ে আনা হয়েছে।');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
            >
              Reset to Standard Defaults
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-900/90 text-slate-300 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Role / পদবি ও দ্রুত বাটন</th>
                  {moduleKeys.map((m) => (
                    <th key={m.key} className="p-3 text-center whitespace-nowrap">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {rolesToConfigure.map((role) => {
                  const rolePerms = formData.modulePermissions?.[role] || {};
                  const labelInfo = roleLabels[role];
                  return (
                    <tr key={role} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-white font-mono flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              <span>{role}</span>
                              {labelInfo && (
                                <span className="text-[11px] font-normal text-slate-400 font-sans">
                                  ({labelInfo.bn})
                                </span>
                              )}
                            </div>
                            {labelInfo && (
                              <div className="text-[10px] text-slate-500 pl-3.5">
                                {labelInfo.desc}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleSelectAllForRole(role)}
                              disabled={isGuest}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                              title="সব মডিউল চালু করুন"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearAllForRole(role)}
                              disabled={isGuest}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                              title="সব মডিউল বন্ধ করুন"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </td>
                      {moduleKeys.map((m) => {
                        const isChecked = rolePerms[m.key] !== false;
                        return (
                          <td key={m.key} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleModulePermissionToggle(role, m.key)}
                              disabled={isGuest}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 4: BACKUP, RESTORE & DATA CENTER */}
      {activeSubTab === 'BACKUP' && (
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>ডাটা সেন্টার, ব্যাকআপ ও রিস্টোর (Complete Database Management)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              সম্পূর্ণ ওয়েবসাইটের সকল রেজিমেন্টাল তথ্য (নোমিনাল রোল, ইউজার, সেটিংস, হিস্ট্রি) এক ক্লিকে ডাউনলোড করুন অথবা ব্যাকআপ ফাইল আপলোড করে ফিরিয়ে আনুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Export Full Database */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm font-mono">
                <Download className="w-4 h-4" />
                <span>Export Full Website Data (JSON Backup)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                বর্তমান সিস্টেমের সকল সৈন্য, ক্যাটাগরি, সাব-ইউনিট, হিসাবের নিয়ম এবং ব্যবহারকারী অ্যাকাউন্টের একটি পূর্ণাঙ্গ কপি ডাউনলোড করে নিরাপদ স্থানে সংরক্ষণ করুন।
              </p>

              <button
                type="button"
                onClick={exportSystemBackup}
                className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Full Database Backup (.json)</span>
              </button>
            </div>

            {/* Box 2: Import Backup JSON */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm font-mono">
                <Upload className="w-4 h-4" />
                <span>Restore from Backup (রিস্টোর ফাইল আপলোড)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                পূর্বে সেভ করা JSON ব্যাকআপ ফাইল সিলেক্ট করে সম্পূর্ণ সিস্টেমকে এক মুহূর্তে পূর্বের অবস্থায় রিস্টোর করুন।
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".json"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGuest}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Choose & Restore JSON File</span>
              </button>
            </div>

            {/* Box 3: Cloud Firestore Sync */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono">
                <Cloud className="w-4 h-4" />
                <span>Direct Cloud Synchronization (Firestore)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                লোকাল ব্রাউজারে থাকা সকল নোমিনাল রোল, ইউজার এবং সেটিংস স্বয়ংক্রিয়ভাবে গুগল ক্লাউড ফায়ারবেসে পুশ করুন।
              </p>

              <button
                type="button"
                onClick={handleCloudSync}
                disabled={isSyncingCloud || isGuest}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span>{isSyncingCloud ? 'ক্লাউড সিঙ্ক হচ্ছে...' : 'Force Sync All to Cloud Firestore'}</span>
              </button>
            </div>

            {/* Box 4: Factory Reset Zone */}
            <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>Emergency Factory Reset (সিস্টেম রিসেট জোন)</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                সকল পরীক্ষামূলক বা টেস্ট ডেটা মুছে ফেলে সিস্টেমকে মূল রেজিমেন্টাল ডিফল্ট অবস্থায় ফিরিয়ে আনার জন্য এই অপশনটি ব্যবহার করুন।
              </p>

              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                disabled={isGuest}
                className="w-full py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Factory Reset to Initial Regimental State</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-600 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-7 h-7" />
              <h3 className="text-lg font-black text-white font-mono">CONFIRM FACTORY RESET</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি সম্পূর্ণ সিস্টেমকে প্রাথমিক ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান? নিশ্চিত করতে নিচে <strong className="text-rose-400 font-mono">RESET10MED</strong> টাইপ করুন:
            </p>

            <input
              type="text"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              placeholder="Type RESET10MED"
              className="w-full bg-slate-950 border border-rose-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono font-bold focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmInput('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                হ্যাঁ, ফ্যাক্টরি রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
