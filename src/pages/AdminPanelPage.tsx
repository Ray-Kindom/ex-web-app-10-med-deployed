import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Role, Battery, UserAccount } from '../types';
import { UserManagementModal } from '../components/admin/UserManagementModal';
import { UnitLogo } from '../components/common/UnitLogo';
import { CategoryManagementTab } from '../components/admin/CategoryManagementTab';
import { ParadeStateManagementTab } from '../components/admin/ParadeStateManagementTab';
import { AuthEstablishmentTab } from '../components/admin/AuthEstablishmentTab';
import { SubUnitsAndRanksTab } from '../components/admin/SubUnitsAndRanksTab';
import { CalculationRulesTab } from '../components/admin/CalculationRulesTab';
import { GoogleWhitelistTab } from '../components/admin/GoogleWhitelistTab';
import { SystemSettingsTab } from '../components/admin/SystemSettingsTab';
import { MasterDatabaseHubTab } from '../components/admin/MasterDatabaseHubTab';
import { PersonnelDatabaseTab } from '../components/admin/PersonnelDatabaseTab';
import { DutyDatabaseTab } from '../components/admin/DutyDatabaseTab';
import {
  Settings,
  Shield,
  Users,
  Database,
  KeyRound,
  FileText,
  RotateCcw,
  CheckCircle2,
  Server,
  Sparkles,
  Lock,
  UserPlus,
  Trash2,
  Edit2,
  AlertTriangle,
  Download,
  Building2,
  ShieldAlert,
  Search,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Layers,
  CalendarDays,
  Calculator,
  Award,
  Cloud,
  Clock,
} from 'lucide-react';

export const AdminPanelPage: React.FC = () => {
  const {
    auditLogs,
    usersList,
    addUser,
    updateUser,
    deleteUser,
    currentUser,
    switchRole,
    showNotification,
    customLogo,
    setCustomLogo,
    syncNominalRollToCloud,
    syncAllToCloud,
    firebaseUser,
    loginWithGoogle,
    isRealAdmin,
    isSimulating,
    exitSimulation,
    isGuest,
    accessRequests,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<
    'DATABASE_HUB' | 'PERSONNEL_DB' | 'DUTY_DB' | 'SYSTEM_SETTINGS' | 'CATEGORIES' | 'PARADE_STATES' | 'ESTABLISHMENT' | 'SUB_UNITS' | 'CALCULATIONS' | 'ROLES' | 'GOOGLE_WHITELIST' | 'AUDIT' | 'LOGO' | 'FIREBASE'
  >('DATABASE_HUB');
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  const pendingGoogleCount = accessRequests.filter((r) => r.status === 'pending').length;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = !isGuest && (currentUser.role === 'Admin' || isRealAdmin);

  const handleOpenAddUser = () => {
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: UserAccount) => {
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (userData: Omit<UserAccount, 'id'>, editId?: string) => {
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }
    if (editId) {
      updateUser(editId, userData);
    } else {
      addUser(userData);
    }
  };

  const confirmDeleteUser = (user: UserAccount) => {
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }
    if (user.id === currentUser.id) {
      showNotification('Access Violation: Cannot delete your currently active Administrator session.');
      return;
    }
    setUserToDelete(user);
  };

  const executeDeleteUser = () => {
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }
    if (userToDelete) {
      deleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const handleExportAuditLogs = () => {
    const headers = ['ID', 'Timestamp', 'Action', 'Category', 'Performed By', 'Role', 'Details'];
    const rows = auditLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.action}"`,
      l.category,
      `"${l.performedBy}"`,
      l.role,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `10_Med_Regt_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Audit logs exported to CSV.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Admin can upload or change the unit logo.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image file (PNG, JPG, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomLogo(result);
        showNotification('Unit Logo updated successfully.');
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchRank = u.rank.toLowerCase().includes(q);
      const matchRole = u.role.toLowerCase().includes(q);
      const matchSnk = u.snkNo ? u.snkNo.toLowerCase().includes(q) : false;
      return matchName || matchUsername || matchRank || matchRole || matchSnk;
    }
    return true;
  });

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedCategory !== 'All' && log.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                System Administration
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                isGuest
                  ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40'
                  : isAdmin
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
              }`}>
                {isGuest ? 'GUEST — VIEW ONLY' : isAdmin ? 'FULL ADMIN ACCESS' : `VIEW MODE (${currentUser.role})`}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans mt-1">
              Admin & System Security Panel
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                onClick={handleOpenAddUser}
                id="btn-add-user-admin"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add User</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 flex-wrap">
          <button
            onClick={() => setActiveTab('DATABASE_HUB')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'DATABASE_HUB'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Master Database Hub (সকল ডাটাবেজ হাব)</span>
          </button>

          <button
            onClick={() => setActiveTab('PERSONNEL_DB')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PERSONNEL_DB'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>Personnel Nominal Roll (পার্সোনেল ডাটাবেজ)</span>
          </button>

          <button
            onClick={() => setActiveTab('DUTY_DB')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'DUTY_DB'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>Duty & Security Board (ডিউটি ডাটাবেজ)</span>
          </button>

          <button
            onClick={() => setActiveTab('SYSTEM_SETTINGS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SYSTEM_SETTINGS'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Master System Controls (সবকিছু নিয়ন্ত্রণ)</span>
          </button>

          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CATEGORIES'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories & Sub-Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('PARADE_STATES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PARADE_STATES'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Parade States</span>
          </button>

          <button
            onClick={() => setActiveTab('ESTABLISHMENT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ESTABLISHMENT'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Auth Establishment</span>
          </button>

          <button
            onClick={() => setActiveTab('SUB_UNITS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SUB_UNITS'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Sub Units & Ranks</span>
          </button>

          <button
            onClick={() => setActiveTab('CALCULATIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CALCULATIONS'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculation Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('ROLES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ROLES'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('GOOGLE_WHITELIST')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'GOOGLE_WHITELIST'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Whitelist & Approvals</span>
            {pendingGoogleCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-black rounded-full animate-pulse">
                {pendingGoogleCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('LOGO')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'LOGO'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Unit Logo</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('FIREBASE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'FIREBASE'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Cloud Architecture</span>
          </button>
        </div>
      </div>

      {/* Master Database Operations Hub Tab */}
      {activeTab === 'DATABASE_HUB' && (
        <MasterDatabaseHubTab onNavigateTab={(tab) => setActiveTab(tab as any)} />
      )}

      {/* Regimental Personnel Database Tab */}
      {activeTab === 'PERSONNEL_DB' && <PersonnelDatabaseTab />}

      {/* Duty Allocation & Security Board Database Tab */}
      {activeTab === 'DUTY_DB' && <DutyDatabaseTab />}

      {/* Master System Controls Tab */}
      {activeTab === 'SYSTEM_SETTINGS' && <SystemSettingsTab />}

      {/* Dynamic Categories Tab */}
      {activeTab === 'CATEGORIES' && <CategoryManagementTab />}

      {/* Parade States Tab */}
      {activeTab === 'PARADE_STATES' && <ParadeStateManagementTab />}

      {/* Auth Establishment Tab */}
      {activeTab === 'ESTABLISHMENT' && <AuthEstablishmentTab />}

      {/* Sub Units & Ranks Tab */}
      {activeTab === 'SUB_UNITS' && <SubUnitsAndRanksTab />}

      {/* Calculation Rules Tab */}
      {activeTab === 'CALCULATIONS' && <CalculationRulesTab />}

      {/* Tab 1: Roles & Battery Assignments */}
      {activeTab === 'ROLES' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {/* Header with Search & Controls */}
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                    <span>Regimental User Accounts & Battery Access</span>
                    <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {filteredUsers.length} of {usersList.length} Users
                    </span>
                  </h3>
                </div>

                <button
                  onClick={handleOpenAddUser}
                  id="btn-add-user-table-top"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add New User</span>
                </button>
              </div>

              {/* User search & filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="sm:col-span-2 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search user name, username, rank, or service ID..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  >
                    <option value="All">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="CO">Commanding Officer (CO)</option>
                    <option value="Offr">Officer (Offr)</option>
                    <option value="RSM">Regimental Sgt Major (RSM)</option>
                    <option value="P BSM">P Battery Sgt Major (P BSM)</option>
                    <option value="Q BSM">Q Battery Sgt Major (Q BSM)</option>
                    <option value="R BSM">R Battery Sgt Major (R BSM)</option>
                    <option value="HQ BSM">HQ Battery Sgt Major (HQ BSM)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <th className="p-3">User / Rank</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Username & Auth</th>
                    <th className="p-3">Service ID</th>
                    <th className="p-3">Assigned Battery Access</th>
                    <th className="p-3">Access Level</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p>No user accounts found matching current query.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userBtys = u.assignedBatteries && u.assignedBatteries.length > 0
                        ? u.assignedBatteries
                        : u.assignedBattery
                        ? [u.assignedBattery]
                        : ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'];
                      const isAllBtys = userBtys.length === 4;

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* User / Rank */}
                          <td className="p-3 font-semibold text-white">
                            <div className="flex items-center gap-2.5">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-full object-cover border border-rose-500/50"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-amber-400 shadow-inner">
                                  {(() => {
                                    const parts = (u.name || '').trim().split(/\s+/);
                                    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                                  })()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-100">{u.name}</span>
                                  {u.id === currentUser.id && (
                                    <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{u.rank}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-3">
                            <span className={`font-bold text-xs font-mono px-2 py-0.5 rounded border ${
                              u.role === 'Admin'
                                ? 'bg-rose-950/50 text-rose-300 border-rose-600/40'
                                : u.role === 'CO'
                                ? 'bg-amber-950/50 text-amber-300 border-amber-600/40'
                                : u.role === 'Offr'
                                ? 'bg-blue-950/50 text-blue-300 border-blue-600/40'
                                : u.role === 'RSM'
                                ? 'bg-purple-950/50 text-purple-300 border-purple-600/40'
                                : u.role.endsWith('BSM')
                                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-600/40'
                                : 'bg-slate-800 text-slate-200 border-slate-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Username & Auth */}
                          <td className="p-3 font-mono">
                            <div className="text-slate-200 font-semibold">@{u.username}</div>
                            {u.email ? (
                              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 truncate max-w-[170px]" title={u.email}>
                                <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate">{u.email}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>Passkey Set</span>
                              </div>
                            )}
                          </td>

                          {/* Service ID */}
                          <td className="p-3 font-mono text-slate-300">
                            {u.snkNo || 'BA-OFFICER'}
                          </td>

                          {/* Assigned Battery Access (Multi-Battery) */}
                          <td className="p-3">
                            {isAllBtys ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <Building2 className="w-3 h-3" />
                                <span>All 4 Btys (Regimental)</span>
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {userBtys.map((b) => (
                                  <span
                                    key={b}
                                    className="text-[10px] font-mono font-semibold bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                                  >
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Access Level */}
                          <td className="p-3">
                            <span className="text-slate-300 text-[11px] font-medium">
                              {u.accessLevel || 'Standard Regimental View'}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                title="Edit User & Battery Assignments"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => confirmDeleteUser(u)}
                                title="Delete User Account"
                                disabled={u.id === currentUser.id}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.id === currentUser.id
                                    ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                                    : 'bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 cursor-pointer'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => switchRole(u.role, userBtys[0])}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
                              >
                                Switch
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Google Whitelist & Approvals Tab */}
      {activeTab === 'GOOGLE_WHITELIST' && <GoogleWhitelistTab />}

      {/* Tab 2: Unit Logo Management (Strictly Admin Authorized) */}
      {activeTab === 'LOGO' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-rose-400" />
                  <span>Unit Heraldic Logo Management</span>
                </h3>
              </div>

              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                ADMIN PRIVILEGE ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-slate-950 border border-slate-800 items-center">
              {/* Logo Preview */}
              <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                  Active Display Logo
                </span>
                <UnitLogo size="xl" allowAdminUpload />
                <span className="text-[11px] text-slate-500 font-mono">
                  {customLogo ? 'Custom Uploaded Logo Active' : 'Default Official Heraldic Logo'}
                </span>
              </div>

              {/* Upload Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white">Upload New Unit Logo</h4>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        showNotification('Only Admin can upload the unit logo.');
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Logo File</span>
                  </button>

                  {customLogo && (
                    <button
                      onClick={() => setCustomLogo(null)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Restore Default</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs (Strictly Protected for Admin Only) */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          {!isAdmin ? (
            /* Non-Admin Security Lockout */
            <div className="p-8 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  SECURITY CLEARANCE RESTRICTION
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Access Restricted — System Admin Clearance Required
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Activity and military system audit logs contain immutable records of user logins, role switches, and parade state verifications.
                  Only users logged in under the <strong className="text-rose-400">Admin</strong> role are authorized to inspect audit records.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 inline-block">
                Current Role: <strong className="text-amber-400">{currentUser.role}</strong> ({currentUser.name})
              </div>

              <div className="pt-2">
                <button
                  onClick={() => switchRole('Admin')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-colors cursor-pointer"
                >
                  Switch to Admin Role to View Logs
                </button>
              </div>
            </div>
          ) : (
            /* Admin View of Audit Logs */
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ADMIN AUTHORIZED
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {auditLogs.length} Events Logged
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white font-sans mt-1">
                    Military System Audit & Activity Logs
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                  >
                    <option value="All">All Categories</option>
                    <option value="PARADE_STATE">PARADE_STATE</option>
                    <option value="PERSONNEL">PERSONNEL</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="SYSTEM">SYSTEM</option>
                  </select>

                  <button
                    onClick={handleExportAuditLogs}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-blue-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-850/40 px-2 rounded-lg transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white font-mono">{log.action}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          log.category === 'SECURITY'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            : log.category === 'PARADE_STATE'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            : log.category === 'PERSONNEL'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {log.category}
                        </span>
                      </div>
                      <p className="text-slate-300 font-sans">{log.details}</p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Performed By: <span className="text-slate-200 font-semibold">{log.performedBy}</span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-400 whitespace-nowrap self-start sm:self-center">
                      {log.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Firebase Schema Architecture */}
      {activeTab === 'FIREBASE' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Firebase Firestore & Authentication Ready Architecture
            </h3>
          </div>
          <p className="text-slate-400">
            The frontend application is architected with clear TypeScript interfaces and modular service separation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 font-mono">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-amber-400">1. /users Collection</div>
              <p className="text-[11px] text-slate-400">
                Maps to Firebase Authentication UID. Stores rank, name, username, role (CO, Officers, Adjt, RSM, BSM, Admin), assignedBatteries array.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-blue-400">2. /personnel Collection</div>
              <p className="text-[11px] text-slate-400">
                Stores military snkNo, rank (Offr, JCO, NCO, Snk), trade (TA, OCU, DMT, Gnr, Ck(U)), name, battery, status, bloodGroup, medicalCategory.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-emerald-400">3. /parade_states Collection</div>
              <p className="text-[11px] text-slate-400">
                Daily morning & evening consolidated muster states with date, battery totals, submittedBy, and approval stages.
              </p>
            </div>
          </div>

          {/* Cloud Connection & Auto Sync Center */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    firebaseUser
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {firebaseUser ? 'LIVE CLOUD AUTO-SYNC: ON' : 'LOCAL MODE: AUTO-SYNC OFF'}
                  </span>
                  {firebaseUser && (
                    <span className="text-[11px] font-mono text-slate-300">
                      Connected: <strong className="text-white">{firebaseUser.email}</strong>
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-white text-sm">
                  {firebaseUser ? 'Real-Time Cloud Synchronization Active' : 'Connect to Firebase to Enable Real-Time Server Sync'}
                </h4>
                <p className="text-xs text-slate-400">
                  {firebaseUser
                    ? 'All edits to users, nominal roll, and parade states are automatically saved to Firebase Cloud Firestore.'
                    : 'Connect your Google account to automatically push and sync all edits directly to the Google Cloud server.'}
                </p>
              </div>

              {!firebaseUser && (
                <button
                  type="button"
                  onClick={async () => {
                    await loginWithGoogle();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-emerald-950/50"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Connect Google Cloud</span>
                </button>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-left w-full sm:w-auto">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Push All Current Data to Firebase Cloud</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Uploads all users, sub-units, ranks, calculation rules, parade states, and the 606 personnel.
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => syncAllToCloud()}
                  className="px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-lg bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sync Entire Regiment to Cloud</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSaveUser={handleSaveUser}
        editUser={editingUser}
      />

      {/* Confirm Delete User Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                Delete User Account?
              </h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to remove user <strong className="text-white">@{userToDelete.username}</strong> ({userToDelete.rank} {userToDelete.name})? This user will no longer be able to sign in or access the system.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
