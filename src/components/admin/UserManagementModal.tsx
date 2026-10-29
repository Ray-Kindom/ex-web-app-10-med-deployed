import React, { useState, useEffect } from 'react';
import { UserAccount, Role, Battery, ALL_BATTERIES, isOfficerRank, isBsmRole } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  UserPlus,
  Shield,
  KeyRound,
  Lock,
  User,
  Building2,
  Check,
  AlertTriangle,
  AlertCircle,
  Edit,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  CheckCircle2,
  Camera,
  Upload,
  Trash2,
  Cloud,
  Mail,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUser: (userData: Omit<UserAccount, 'id'>, editId?: string) => void;
  editUser?: UserAccount | null;
}

const AVAILABLE_BATTERIES: Battery[] = ALL_BATTERIES;

const MILITARY_RANKS: { rank: string; category: string }[] = [
  { rank: 'Lt Col', category: 'Offr' },
  { rank: 'Maj', category: 'Offr' },
  { rank: 'Capt', category: 'Offr' },
  { rank: 'Lt', category: 'Offr' },
  { rank: 'SWO', category: 'JCO' },
  { rank: 'WO', category: 'JCO' },
  { rank: 'Sgt', category: 'NCO' },
  { rank: 'Cpl', category: 'NCO' },
  { rank: 'Lcpl', category: 'NCO' },
  { rank: 'Snk', category: 'Snk' },
  { rank: 'Gnr', category: 'Snk' },
  { rank: 'Admin', category: 'Staff' },
];

const ROLES_CONFIG: { role: Role; label: string; defaultAccess: string; defaultBatteries: Battery[] }[] = [
  {
    role: 'CO',
    label: 'Commanding Officer (CO)',
    defaultAccess: 'Executive Command & Strategic Overview',
    defaultBatteries: [...ALL_BATTERIES],
  },
  {
    role: 'Offr',
    label: 'Officer (Offr)',
    defaultAccess: 'Regimental Officer Access & Battery Review',
    defaultBatteries: [...ALL_BATTERIES],
  },
  {
    role: 'RSM',
    label: 'Regimental Sgt Major (RSM)',
    defaultAccess: 'Consolidated Muster & Enlistment Master',
    defaultBatteries: [...ALL_BATTERIES],
  },
  {
    role: 'P BSM',
    label: 'P Battery Sgt Major (P BSM)',
    defaultAccess: 'P Battery Roll & Morning Parade In-Charge',
    defaultBatteries: ['P Bty'],
  },
  {
    role: 'Q BSM',
    label: 'Q Battery Sgt Major (Q BSM)',
    defaultAccess: 'Q Battery Roll & Morning Parade In-Charge',
    defaultBatteries: ['Q Bty'],
  },
  {
    role: 'R BSM',
    label: 'R Battery Sgt Major (R BSM)',
    defaultAccess: 'R Battery Roll & Morning Parade In-Charge',
    defaultBatteries: ['R Bty'],
  },
  {
    role: 'HQ BSM',
    label: 'HQ Battery Sgt Major (HQ BSM)',
    defaultAccess: 'HQ Battery Roll & Morning Parade In-Charge',
    defaultBatteries: ['HQ Bty'],
  },
  {
    role: 'Admin',
    label: 'System Admin',
    defaultAccess: 'Full System Administrator & Audit Master',
    defaultBatteries: [...ALL_BATTERIES],
  },
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  onSaveUser,
  editUser,
}) => {
  const { personnelList, usersList, ranksList, subUnitsList, theme } = useApp();
  const isLight = theme === 'light';

  const dynamicRanks = React.useMemo(() => {
    if (ranksList && Array.isArray(ranksList) && ranksList.length > 0) {
      const seen = new Set<string>();
      return ranksList
        .filter((r) => r && r.isActive !== false)
        .filter((r) => {
          if (!r || !r.name || seen.has(r.name)) return false;
          seen.add(r.name);
          return true;
        })
        .map((r) => ({
          rank: r.name,
          category: r.category,
        }));
    }
    return MILITARY_RANKS;
  }, [ranksList]);

  const dynamicBatteries = React.useMemo(() => {
    if (subUnitsList && Array.isArray(subUnitsList) && subUnitsList.length > 0) {
      return subUnitsList.filter((u) => u && u.isActive !== false).map((u) => u.name as Battery);
    }
    return AVAILABLE_BATTERIES;
  }, [subUnitsList]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTradeInfo, setSelectedTradeInfo] = useState<string>('');
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [rank, setRank] = useState('Lt');
  const [role, setRole] = useState<Role>('Offr');
  const [accessLevel, setAccessLevel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [snkNo, setSnkNo] = useState('');
  const [assignedBatteries, setAssignedBatteries] = useState<Battery[]>(['P Bty']);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editUser) {
      setName(editUser.name || '');
      setRank(editUser.rank || 'Lt');
      setRole(editUser.role || 'Offr');
      setAccessLevel(editUser.accessLevel || '');
      setUsername(editUser.username || '');
      setPassword(editUser.password || '');
      setEmail(editUser.email || '');
      setSnkNo(editUser.snkNo || '');
      setAvatar(editUser.avatar || undefined);
      if (editUser.assignedBatteries && editUser.assignedBatteries.length > 0) {
        setAssignedBatteries(editUser.assignedBatteries);
      } else if (editUser.assignedBattery) {
        setAssignedBatteries([editUser.assignedBattery]);
      } else {
        setAssignedBatteries([...ALL_BATTERIES]);
      }
      setSelectedTradeInfo(isOfficerRank(editUser.rank) ? 'No Trade (Officer)' : '');
      setSearchFeedback(null);
    } else {
      // Default new user state
      setName('');
      setRank('Capt');
      setRole('Offr');
      setAccessLevel('Regimental Officer Access & Battery Review');
      setUsername('');
      setPassword('');
      setEmail('');
      setSnkNo('');
      setAvatar(undefined);
      setAssignedBatteries([...ALL_BATTERIES]);
      setSelectedTradeInfo('No Trade (Officer)');
      setSearchFeedback(null);
    }
    setSearchQuery('');
    setShowPassword(false);
    setErrors({});
  }, [editUser, isOpen]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) setAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  // When rank changes, check if it's an officer (Officers have NO trade)
  const handleRankChange = (newRank: string) => {
    setRank(newRank);
    if (isOfficerRank(newRank)) {
      setSelectedTradeInfo('No Trade (Officer)');
    } else {
      if (selectedTradeInfo === 'No Trade (Officer)') {
        setSelectedTradeInfo('Gnr');
      }
    }
  };

  // When role changes, suggest appropriate default access level and batteries
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    const config = ROLES_CONFIG.find((r) => r.role === newRole);
    if (config) {
      setAccessLevel(config.defaultAccess);
      setAssignedBatteries(config.defaultBatteries);
    }
  };

  // Intelligent Search and Auto-fill from Personnel Records (by Snk No, BA No, or Name)
  const handleSelectPersonnel = (person: {
    snkNo: string;
    rk: string;
    trade: string;
    name: string;
    battery: Battery;
  }) => {
    setName(person.name);
    setRank(person.rk);
    setSnkNo(person.snkNo);

    const isOffr = isOfficerRank(person.rk);
    const tradeDisplay = isOffr ? 'No Trade (Officer)' : person.trade || '-';
    setSelectedTradeInfo(tradeDisplay);

    // Suggest role intelligently
    let suggestedRole: Role = 'Offr';
    if (person.rk === 'Lt Col') {
      suggestedRole = 'CO';
    } else if (isOffr) {
      suggestedRole = 'Offr';
    } else if (person.rk === 'SWO' && (person.battery === 'HQ Bty' || person.name.toLowerCase().includes('nasir'))) {
      suggestedRole = 'RSM';
    } else if (person.battery === 'P Bty' && ['SWO', 'WO'].includes(person.rk)) {
      suggestedRole = 'P BSM';
    } else if (person.battery === 'Q Bty' && ['SWO', 'WO'].includes(person.rk)) {
      suggestedRole = 'Q BSM';
    } else if (person.battery === 'R Bty' && ['SWO', 'WO'].includes(person.rk)) {
      suggestedRole = 'R BSM';
    } else if (person.battery === 'HQ Bty' && ['SWO', 'WO'].includes(person.rk)) {
      suggestedRole = 'HQ BSM';
    } else {
      suggestedRole = 'Offr';
    }

    setRole(suggestedRole);
    const roleCfg = ROLES_CONFIG.find((r) => r.role === suggestedRole);
    if (roleCfg) {
      setAccessLevel(roleCfg.defaultAccess);
      setAssignedBatteries(roleCfg.defaultBatteries);
    } else {
      setAssignedBatteries([person.battery]);
    }

    // Auto-generate suggested unique username if username is empty
    if (!username || username === 'new_user') {
      const sanitizedName = person.name
        .toLowerCase()
        .replace(/md\.?|mohah\.?/g, '')
        .trim()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 12);
      const candidate = `${person.rk.toLowerCase().replace(/\s+/g, '')}_${sanitizedName || person.snkNo.toLowerCase()}`;
      // verify candidate uniqueness
      const isCandidateTaken = usersList.some((u) => u.username.toLowerCase() === candidate);
      setUsername(isCandidateTaken ? `${candidate}_${Math.floor(Math.random() * 89 + 10)}` : candidate);
    }

    setSearchFeedback(`Auto-populated from records: ${person.rk} ${person.name} (${person.battery})${isOffr ? ' • Officer: No Trade' : ` • Trade: ${tradeDisplay}`}`);
    setSearchQuery('');
  };

  // Search filter for dropdown
  const matchingPersonnel = searchQuery.trim().length >= 1
    ? (personnelList || []).filter((p) => {
        if (!p) return false;
        const q = searchQuery.toLowerCase();
        return (
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q)
        );
      }).slice(0, 6)
    : [];

  const handleToggleBattery = (battery: Battery) => {
    setAssignedBatteries((prev) => {
      if (prev.includes(battery)) {
        if (prev.length === 1) return prev;
        return prev.filter((b) => b !== battery);
      } else {
        return [...prev, battery];
      }
    });
  };

  const handleSelectAllBatteries = () => {
    if (assignedBatteries.length === AVAILABLE_BATTERIES.length) {
      setAssignedBatteries(['HQ Bty']);
    } else {
      setAssignedBatteries([...AVAILABLE_BATTERIES]);
    }
  };

  // Username validation check for duplicates
  const cleanUsername = username.trim().toLowerCase();
  const duplicateUser = usersList.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.id !== editUser?.id
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!cleanUsername) {
      newErrors.username = 'Username is required';
    } else if (duplicateUser) {
      newErrors.username = `Username "${cleanUsername}" already exists (assigned to ${duplicateUser.name}). Please choose a unique username.`;
    }

    if (!password.trim() && !editUser) newErrors.password = 'Password is required';
    if (assignedBatteries.length === 0) newErrors.batteries = 'Select at least one assigned battery';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const userData: Omit<UserAccount, 'id'> = {
      name: name.trim(),
      rank,
      role,
      accessLevel: accessLevel.trim() || 'Standard Access',
      username: cleanUsername,
      password: password.trim() || (editUser?.password ?? ''),
      snkNo: snkNo.trim() || undefined,
      avatar: avatar || undefined,
      email: email.trim() ? email.trim().toLowerCase() : undefined,
      isApproved: email.trim() ? true : (editUser?.isApproved ?? true),
      assignedBatteries,
      assignedBattery: assignedBatteries[0] || 'P Bty',
    };

    onSaveUser(userData, editUser?.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className={`relative w-full max-w-xl ${
        isLight ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' : 'bg-slate-900 border-slate-700/80 text-white shadow-2xl'
      } border rounded-2xl overflow-hidden my-8`}>
        {/* Modal Header */}
        <div className={`p-5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800'
        } flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${
              isLight ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
            } border flex items-center justify-center`}>
              {editUser ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'} tracking-tight flex items-center gap-2`}>
                <span>{editUser ? 'Edit Regimental User Account' : 'Create New User Account'}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-800 text-amber-400 border-slate-700'
                } border`}>
                  ADMIN ONLY
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
            } transition-colors cursor-pointer`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-Search and Fill Bar from Nominal Roll */}
        <div className={`p-4 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950 border-slate-800/80'} border-b space-y-2`}>
          <div className="flex items-center justify-between">
            <label className={`text-xs font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'} flex items-center gap-1.5`}>
              <Search className="w-3.5 h-3.5" />
              <span>Search Personnel to Auto-populate (Snk No / BA No / Name)</span>
            </label>
            <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'} font-mono`}>
              Auto-fills Rank, Name & Trade
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type Soldier No (e.g. 1243723), BA No (e.g. BA-7592), or Name..."
              className={`w-full ${
                isLight ? 'bg-white border-rose-300 text-slate-900 placeholder-slate-400 focus:border-rose-500' : 'bg-slate-900 border-rose-500/40 text-white placeholder-slate-500 focus:border-rose-400'
              } border rounded-xl px-3 py-2 text-xs focus:outline-none font-mono shadow-sm`}
            />

            {/* Dropdown Results */}
            {matchingPersonnel.length > 0 && (
              <div className={`absolute left-0 right-0 top-full mt-1 ${
                isLight ? 'bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-xl' : 'bg-slate-900 border-slate-700 divide-slate-800 text-white shadow-2xl'
              } border rounded-xl z-20 max-h-48 overflow-y-auto divide-y`}>
                {matchingPersonnel.map((p) => {
                  const isOffr = isOfficerRank(p.rk);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPersonnel(p)}
                      className={`w-full p-2.5 text-left text-xs ${
                        isLight ? 'hover:bg-slate-50 text-slate-900' : 'hover:bg-slate-800 text-white'
                      } flex items-center justify-between gap-2 transition-colors cursor-pointer`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{p.snkNo}</span>
                        <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.rk} {p.name}</span>
                        <span className={`text-[10px] ${
                          isLight ? 'text-slate-600 bg-slate-100 border-slate-200' : 'text-slate-400 bg-slate-950 border-slate-800'
                        } px-1.5 py-0.5 rounded border font-mono`}>
                          {p.battery}
                        </span>
                      </div>
                      <div className={`text-[10px] font-mono ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
                        {isOffr ? 'Officer (No Trade)' : `Trade: ${p.trade}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {searchFeedback && (
            <div className={`flex items-center gap-1.5 text-[11px] ${
              isLight ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            } border px-2.5 py-1 rounded-lg`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{searchFeedback}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* User Photo Upload Section */}
          <div className={`flex items-center gap-4 p-3 rounded-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          } border`}>
            {avatar ? (
              <div className="relative group">
                <img
                  src={avatar}
                  alt="User Avatar"
                  className="w-14 h-14 rounded-full object-cover border-2 border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setAvatar(undefined)}
                  className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-500 cursor-pointer"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className={`w-14 h-14 rounded-full ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-400' : 'bg-slate-900 border-slate-700 text-slate-500'
              } border border-dashed flex items-center justify-center`}>
                <Camera className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'} mb-1`}>
                User Profile Photo
              </label>
              <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              } text-xs font-medium cursor-pointer border transition-colors shadow-sm`}>
                <Upload className="w-3.5 h-3.5 text-rose-500" />
                <span>{avatar ? 'Change Picture' : 'Upload Picture'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Row 1: Name & Rank */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1`}>
                Full Official Name *
              </label>
              <div className="relative">
                <User className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'} absolute left-3 top-1/2 -translate-y-1/2`} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Capt Iftekhar Mahmud Abir / SWO Nasir"
                  className={`w-full ${
                    isLight ? 'bg-white text-slate-900 placeholder-slate-400' : 'bg-slate-950 text-white placeholder-slate-500'
                  } border ${
                    errors.name ? 'border-rose-500' : isLight ? 'border-slate-300' : 'border-slate-700'
                  } rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-rose-500 shadow-sm`}
                />
              </div>
              {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1`}>
                Military Rank *
              </label>
              <select
                value={rank}
                onChange={(e) => handleRankChange(e.target.value)}
                className={`w-full ${
                  isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-700'
                } border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-mono shadow-sm`}
              >
                {dynamicRanks.map((r) => (
                  <option key={r.rank} value={r.rank}>
                    {r.rank} ({r.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Role & Service ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1`}>
                System Role *
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className={`w-full ${
                  isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-700'
                } border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-mono shadow-sm`}
              >
                {ROLES_CONFIG.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1`}>
                Service / BA / Snk No
              </label>
              <input
                type="text"
                value={snkNo}
                onChange={(e) => setSnkNo(e.target.value)}
                placeholder="e.g. BA-7592 or 1243723"
                className={`w-full ${
                  isLight ? 'bg-white text-slate-900 border-slate-300 placeholder-slate-400' : 'bg-slate-950 text-white border-slate-700 placeholder-slate-500'
                } border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-mono shadow-sm`}
              />
            </div>
          </div>

          {/* Trade Info Notice (Explicitly No Trade for Officers) */}
          <div className={`p-3 rounded-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          } border flex items-center justify-between text-xs`}>
            <span className={`${isLight ? 'text-slate-600' : 'text-slate-400'} font-medium`}>Trade Status:</span>
            {isOfficerRank(rank) ? (
              <span className={`text-[11px] font-mono ${
                isLight ? 'text-emerald-700 bg-emerald-100 border-emerald-300' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              } px-2 py-0.5 rounded border font-bold`}>
                Commissioned Officer • No Trade Applicable
              </span>
            ) : (
              <span className={`text-[11px] font-mono ${
                isLight ? 'text-sky-700 bg-sky-100 border-sky-300' : 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20'
              } px-2 py-0.5 rounded border`}>
                {selectedTradeInfo || 'Trade Assigned via Nominal Roll'}
              </span>
            )}
          </div>

          {/* Row 3: Access Level Description */}
          <div>
            <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1`}>
              Access Level / Security Clearance
            </label>
            <div className="relative">
              <Shield className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="text"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                placeholder="e.g. Regimental Officer Access & Battery Review"
                className={`w-full ${
                  isLight ? 'bg-white text-slate-900 border-slate-300 placeholder-slate-400' : 'bg-slate-950 text-white border-slate-700 placeholder-slate-500'
                } border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-rose-500 shadow-sm`}
              />
            </div>
          </div>

          {/* Row 4: Username & Password with Uniqueness Check and View Toggle */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          } border`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Login Username *
                </label>
                {cleanUsername && !duplicateUser && (
                  <span className={`text-[10px] font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'} flex items-center gap-1`}>
                    <Check className="w-3 h-3" /> Unique
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'} absolute left-3 top-1/2 -translate-y-1/2`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) {
                      setErrors((prev) => ({ ...prev, username: '' }));
                    }
                  }}
                  placeholder="e.g. offr_abir"
                  className={`w-full ${
                    isLight ? 'bg-white' : 'bg-slate-900'
                  } border ${
                    errors.username || duplicateUser
                      ? 'border-rose-500 text-rose-500'
                      : isLight ? 'border-slate-300 text-slate-900' : 'border-slate-700 text-white'
                  } rounded-xl pl-9 pr-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-rose-500 font-mono shadow-sm`}
                />
              </div>
              {duplicateUser && (
                <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Username already in use by {duplicateUser.name}</span>
                </p>
              )}
              {errors.username && !duplicateUser && (
                <p className="text-[10px] text-rose-500 mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} mb-1`}>
                Password / Passkey {editUser ? '(Leave empty to keep current)' : '*'}
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'} absolute left-3 top-1/2 -translate-y-1/2`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  placeholder={editUser ? '••••••••' : 'Enter passkey'}
                  className={`w-full ${
                    isLight ? 'bg-white text-slate-900 placeholder-slate-400 border-slate-300' : 'bg-slate-900 text-white placeholder-slate-500 border-slate-700'
                  } border ${
                    errors.password ? 'border-rose-500' : ''
                  } rounded-xl pl-9 pr-10 py-2 text-xs focus:outline-none focus:border-rose-500 font-mono shadow-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
                  } transition-colors cursor-pointer p-0.5`}
                  title={showPassword ? 'Hide password' : 'View password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-rose-500 mt-1">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Row 4.5: Google Account Email (Gmail) for 1-Click Authorized Sign-In */}
          <div className={`p-3.5 rounded-xl ${
            isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-950/70 border-slate-800'
          } border space-y-1.5`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-bold ${isLight ? 'text-emerald-900' : 'text-slate-200'} flex items-center gap-1.5`}>
                <Cloud className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>Authorized Google Account (Gmail)</span>
              </label>
              <span className={`text-[10px] ${isLight ? 'text-emerald-700 font-semibold' : 'text-emerald-400'} font-mono`}>1-Click Google Sign-In</span>
            </div>
            <div className="relative">
              <Mail className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. officer.10med@gmail.com (Optional)"
                className={`w-full ${
                  isLight ? 'bg-white border-emerald-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                } border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-mono shadow-sm`}
              />
            </div>
            <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed`}>
              এখানে জিমেইল যুক্ত রাখলে কর্মকর্তা সরাসরি "Sign in with Google" দিয়ে অনুমোদিত হয়ে লগইন করতে পারবেন।
            </p>
          </div>

          {/* Row 5: Assigned Battery Access (Multi-Battery Assignment) */}
          <div className={`p-4 rounded-xl ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          } border space-y-2.5`}>
            <div className="flex items-center justify-between">
              <div>
                <label className={`block text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-1.5`}>
                  <Building2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Assigned Battery Permissions (Multi-Battery Access)</span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleSelectAllBatteries}
                className={`text-[11px] font-mono ${
                  isLight ? 'text-rose-700 bg-rose-100 border-rose-200 hover:bg-rose-200' : 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                } hover:underline px-2 py-0.5 rounded border cursor-pointer`}
              >
                {assignedBatteries.length === AVAILABLE_BATTERIES.length
                  ? 'Deselect All'
                  : 'Select All (Regimental)'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {AVAILABLE_BATTERIES.map((bty) => {
                const isChecked = assignedBatteries.includes(bty);
                return (
                  <button
                    key={bty}
                    type="button"
                    onClick={() => handleToggleBattery(bty)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                      isChecked
                        ? isLight
                          ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold ring-1 ring-rose-400'
                          : 'bg-rose-950/40 border-rose-500/60 text-white font-bold ring-1 ring-rose-500/40'
                        : isLight
                          ? 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <span>{bty}</span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isChecked
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : isLight ? 'border-slate-300 bg-slate-100' : 'border-slate-700 bg-slate-950'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.batteries && (
              <p className="text-[10px] text-rose-500 mt-1">{errors.batteries}</p>
            )}
          </div>

          {/* Modal Actions */}
          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              } text-xs font-semibold transition-colors cursor-pointer`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!duplicateUser}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-colors cursor-pointer ${
                duplicateUser
                  ? 'bg-slate-500 opacity-60 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{editUser ? 'Save User (Update Account)' : 'Save User (Create Account)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
