import React from 'react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Edit3,
  Settings,
  ChevronRight,
  Shield,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const {
    activePage,
    setActivePage,
    currentUser,
    personnelList,
    getRegimentalTotals,
    setDailyParadeModalOpen,
    setSelectedBatteryFilter,
    isRealAdmin,
    isSimulating,
    exitSimulation,
    systemSettings,
    hasModulePermission,
  } = useApp();

  const totals = getRegimentalTotals();
  const outOfUnitCount = (personnelList || []).filter((p) => {
    return (
      Boolean(p.outOfUnitCategory) ||
      p.status === 'CMH/Sick' ||
      p.status === 'Course/Trg' ||
      p.status === 'Attached Out' ||
      p.status === 'Temp Duty' ||
      p.leaveType === 'P/Lve' ||
      p.leaveType === 'C/Lve'
    );
  }).length;
  const role = currentUser.role;

  // Build navigation items based on role specifications:
  // CO & Offr: Main Dashboard, Parade State Dashboard, Regt Nominal
  // RSM: Main Dashboard, Parade State Dashboard, Regt Nominal, Data Update
  // BSM (P, Q, R, HQ): Bty Dashboard, Parade State Dashboard, Regt Nominal, Data Update
  // Admin: All items including Admin Panel

  interface NavItem {
    id: string;
    label: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
    action?: () => void;
    hasSubmenu?: boolean;
  }

  const items: NavItem[] = [];

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM'].includes(role);
  const isCoOrOffr = role === 'CO' || role === 'Offr';
  const isRsm = role === 'RSM';
  const isAdmin = role === 'Admin';

  const [btySubmenuOpen, setBtySubmenuOpen] = React.useState(false);

  if (isBsm) {
    items.push({
      id: 'battery_dashboard',
      label: 'Bty Dashboard',
      description: `${currentUser.assignedBattery || 'Assigned'} Sub-unit`,
      icon: Building2,
      badge: currentUser.assignedBattery || 'Bty',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      hasSubmenu: true,
    });
    items.push({
      id: 'parade_state',
      label: 'Parade State Dashboard',
      description: 'Morning & Evening Muster Roll',
      icon: ClipboardList,
      badge: 'Live',
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    });
    items.push({
      id: 'master_personnel',
      label: 'Regt Nominal',
      description: 'Battery & Regimental Nominal Roll',
      icon: Users,
      badge: `${personnelList.length}`,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    });
    items.push({
      id: 'data_update',
      label: 'Data Update',
      description: 'Update Daily Parade & Out of Unit',
      icon: Edit3,
      badge: 'Edit',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      action: () => setDailyParadeModalOpen(true),
    });
  } else if (isRsm) {
    items.push({
      id: 'main_dashboard',
      label: 'Main Dashboard',
      description: 'Regimental Overview & Parade KPIs',
      icon: LayoutDashboard,
      badge: `${totals.presentPercentage}%`,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    });
    items.push({
      id: 'parade_state',
      label: 'Parade State Dashboard',
      description: 'Morning & Evening Muster Roll',
      icon: ClipboardList,
      badge: 'Live',
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    });
    items.push({
      id: 'duty_detail',
      label: 'Duty Detailing',
      description: 'RSM Duty Allocation Board',
      icon: ShieldAlert,
      badge: 'Duty',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    });
    items.push({
      id: 'out_of_unit',
      label: 'Out Of Unit',
      description: 'Leave, CMH, Course & Detached',
      icon: ArrowRightLeft,
      badge: `${outOfUnitCount}`,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    });
    items.push({
      id: 'master_personnel',
      label: 'Regt Nominal',
      description: 'All 10 Med Regt Nominal Roll',
      icon: Users,
      badge: `${personnelList.length}`,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    });
    items.push({
      id: 'data_update',
      label: 'Data Update',
      description: 'RSM Consolidated Entry & Status',
      icon: Edit3,
      badge: 'Muster',
      badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      action: () => setDailyParadeModalOpen(true),
    });
  } else if (isCoOrOffr) {
    items.push({
      id: 'main_dashboard',
      label: 'Main Dashboard',
      description: 'Regimental Overview & Parade KPIs',
      icon: LayoutDashboard,
      badge: `${totals.presentPercentage}%`,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    });
    items.push({
      id: 'battery_dashboard',
      label: 'Bty Dashboard',
      description: 'Sub-unit Battery Controls',
      icon: Building2,
      badge: '5 Units',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    });
    items.push({
      id: 'parade_state',
      label: 'Parade State Dashboard',
      description: 'Morning & Evening Muster Roll',
      icon: ClipboardList,
      badge: 'Live',
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    });
    items.push({
      id: 'master_personnel',
      label: 'Regt Nominal',
      description: 'All 10 Med Regt Nominal Roll',
      icon: Users,
      badge: `${personnelList.length}`,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    });
  } else {
    // Admin full access
    items.push({
      id: 'main_dashboard',
      label: 'Main Dashboard',
      description: 'Regimental Overview & Parade KPIs',
      icon: LayoutDashboard,
      badge: `${totals.presentPercentage}%`,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    });
    items.push({
      id: 'battery_dashboard',
      label: 'Bty Dashboard',
      description: 'Sub-unit Battery Controls',
      icon: Building2,
      badge: '5 Units',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    });
    items.push({
      id: 'parade_state',
      label: 'Parade State Dashboard',
      description: 'Morning & Evening Muster Roll',
      icon: ClipboardList,
      badge: 'Live',
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    });
    items.push({
      id: 'duty_detail',
      label: 'Duty Detailing',
      description: 'RSM Duty Allocation Board',
      icon: ShieldAlert,
      badge: 'Duty',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    });
    items.push({
      id: 'out_of_unit',
      label: 'Out Of Unit',
      description: 'Leave, CMH, Course & Detached',
      icon: ArrowRightLeft,
      badge: `${outOfUnitCount}`,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    });
    items.push({
      id: 'master_personnel',
      label: 'Regt Nominal',
      description: 'All 10 Med Regt Nominal Roll',
      icon: Users,
      badge: `${personnelList.length}`,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    });
    items.push({
      id: 'data_update',
      label: 'Data Update',
      description: 'Update Daily Parade & Out of Unit',
      icon: Edit3,
      badge: 'Edit',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      action: () => setDailyParadeModalOpen(true),
    });
    items.push({
      id: 'admin_panel',
      label: 'Admin Panel',
      description: 'Roles, Passwords, Users & Audit Logs',
      icon: Settings,
      badge: 'Admin',
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    });
  }

  // If real admin is currently simulating another role or permitted by RBAC matrix, ensure Admin Panel is accessible
  const canAccessAdmin = isRealAdmin || hasModulePermission('admin_panel');
  if (canAccessAdmin && !items.some((i) => i.id === 'admin_panel')) {
    items.push({
      id: 'admin_panel',
      label: 'Admin Panel',
      description: 'এডমিন কন্ট্রোল ও সেটিংস',
      icon: Settings,
      badge: 'Admin',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    });
  }

  // Filter navigation items dynamically based on systemSettings RBAC matrix
  const displayItems = items.filter((item) => {
    if (isRealAdmin && item.id === 'admin_panel') return true;
    const permKey = item.id === 'data_update' ? 'out_of_unit' : item.id;
    return hasModulePermission(permKey);
  });

  const handleNavClick = (item: NavItem) => {
    if (item.action) {
      item.action();
    } else {
      setActivePage(item.id);
    }
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 w-72 bg-slate-950/95 border-r border-slate-800/80 z-40 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
            <span>Command Navigation</span>
            <span className="text-slate-400">{currentUser.role} View</span>
          </div>

          {isSimulating && (
            <div className="mx-1 mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 font-bold font-mono text-[11px] text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  <span>SIMULATING: {currentUser.role}</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                  Test View
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 mb-2">
                সিমুলেশন চলছে। অ্যাডমিন রোল-এ ফিরে যেতে নিচের বাটনে ক্লিক করুন:
              </p>
              <button
                onClick={() => {
                  exitSimulation();
                  onCloseMobile();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
              >
                <span>Exit Simulation (এডমিনে ফিরুন)</span>
              </button>
            </div>
          )}

          {displayItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => {
                    if (item.hasSubmenu) {
                      setBtySubmenuOpen(!btySubmenuOpen);
                    }
                    handleNavClick(item);
                  }}
                  className={`w-full group flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-rose-950/40 text-white border border-rose-500/40 shadow-md shadow-rose-950/30'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                        isActive
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-900 text-slate-400 group-hover:text-rose-400 group-hover:bg-slate-850 border border-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-xs truncate">
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {item.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        item.hasSubmenu && btySubmenuOpen ? 'rotate-90 text-rose-400' : isActive ? 'text-rose-400 translate-x-0.5' : 'group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>

                {/* Sub-category for viewing other batteries */}
                {item.hasSubmenu && btySubmenuOpen && (
                  <div className="pl-11 pr-2 py-1 space-y-1 bg-slate-950/60 rounded-xl border border-slate-850 my-1 animate-fadeIn">
                    <div className="text-[10px] text-slate-400 font-mono uppercase px-2 py-0.5 font-bold">
                      অন্যান্য ব্যাটারি দেখুন:
                    </div>
                    {(['P Bty', 'Q Bty', 'R Bty', 'HQ Bty', 'EME'] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setSelectedBatteryFilter(b);
                          setActivePage('battery_dashboard');
                          onCloseMobile();
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          currentUser.assignedBattery === b
                            ? 'text-rose-300 font-bold bg-rose-950/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <span>{b}</span>
                        {currentUser.assignedBattery === b && (
                          <span className="text-[9px] font-mono px-1 rounded bg-rose-600/30 text-rose-300">
                            (Nijer)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer info & Regiment quick badge */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-925 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-500" />
                <span>Unit Readiness</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {totals.presentPercentage}% FIT
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totals.presentPercentage}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>POSTED: {totals.totalPosted}</span>
              <span>PRESENT: {totals.totalPresent}</span>
              <span>DUTY: {totals.totalDuty}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
