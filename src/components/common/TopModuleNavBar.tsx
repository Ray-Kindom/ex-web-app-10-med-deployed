import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Settings,
  ShieldAlert,
  ArrowRightLeft,
  Target,
  GraduationCap,
  Home,
  PlaneTakeoff,
} from 'lucide-react';

export const TopModuleNavBar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    currentUser,
    isRealAdmin,
    hasModulePermission,
    personnelList,
    customTeams,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  const role = currentUser.role;
  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(role);
  const assignedBty =
    currentUser.assignedBattery ||
    (role === 'P BSM'
      ? 'P Bty'
      : role === 'Q BSM'
      ? 'Q Bty'
      : role === 'R BSM'
      ? 'R Bty'
      : role === 'HQ BSM'
      ? 'HQ Bty'
      : 'P Bty');

  const outOfUnitCount = React.useMemo(() => {
    return (personnelList || []).filter((p) => {
      if (isBsm && assignedBty && p.battery !== assignedBty) return false;
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
  }, [personnelList, isBsm, assignedBty]);

  const activeLeaveCount = React.useMemo(() => {
    return (personnelList || []).filter((p) => {
      if (isBsm && assignedBty && p.battery !== assignedBty) return false;
      return (
        p.status === 'Leave' ||
        p.status === 'P/Lve' ||
        p.status === 'C/Lve' ||
        p.outOfUnitCategory === 'P/Lve' ||
        p.outOfUnitCategory === 'C/Lve' ||
        p.leaveType === 'P/Lve' ||
        p.leaveType === 'C/Lve'
      );
    }).length;
  }, [personnelList, isBsm, assignedBty]);

  interface NavTab {
    id: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
    action?: () => void;
    permissionKey: string;
  }

  // Candidate tabs based on role
  const candidateTabs: NavTab[] = [
    {
      id:
        role === 'CO'
          ? 'co_dashboard'
          : role === 'Offr'
          ? 'offr_dashboard'
          : role === 'RSM'
          ? 'rsm_dashboard'
          : isBsm
          ? 'battery_dashboard'
          : 'main_dashboard',
      label:
        role === 'CO'
          ? 'CO Console'
          : role === 'Offr'
          ? 'Offr Console'
          : role === 'RSM'
          ? 'RSM Console'
          : isBsm
          ? 'Bty Dashboard'
          : 'Main Dashboard',
      icon: isBsm ? Building2 : LayoutDashboard,
      badge: isBsm ? assignedBty : undefined,
      permissionKey: isBsm ? 'battery_dashboard' : 'main_dashboard',
    },
    // Sub-unit battery dashboard for non-BSM users
    ...(!isBsm
      ? [
          {
            id: 'battery_dashboard',
            label: 'Bty Dashboard',
            icon: Building2,
            permissionKey: 'battery_dashboard',
          },
        ]
      : []),
    {
      id: 'trg_state',
      label: 'Trg State',
      icon: Target,
      badge: 'Trg',
      permissionKey: 'trg_state',
    },
    {
      id: 'course_qualification',
      label: 'Course/Cdre Qual',
      icon: GraduationCap,
      badge: 'Course',
      permissionKey: 'trg_state',
    },
    {
      id: 'parade_state',
      label: 'Parade State',
      icon: ClipboardList,
      permissionKey: 'parade_state',
    },
    {
      id: 'duty_detail',
      label: 'Duty Detailing',
      icon: ShieldAlert,
      permissionKey: 'duty_detail',
    },
    {
      id: 'teams',
      label: 'Team',
      icon: Users,
      badge: customTeams && customTeams.length > 0 ? `${customTeams.length}` : undefined,
      permissionKey: 'teams',
    },
    {
      id: 'out_of_unit',
      label: 'Out Of Unit',
      icon: ArrowRightLeft,
      badge: outOfUnitCount > 0 ? `${outOfUnitCount}` : undefined,
      permissionKey: 'out_of_unit',
    },
    {
      id: 'family_man_state',
      label: 'Family Man State',
      icon: Home,
      badge: 'Living',
      permissionKey: 'out_of_unit',
    },
    {
      id: 'leave_management',
      label: 'Lve Mgt',
      icon: PlaneTakeoff,
      badge: activeLeaveCount > 0 ? `${activeLeaveCount}` : 'P/C/Ni',
      permissionKey: 'parade_state',
    },
    {
      id: 'master_personnel',
      label: isBsm ? 'Bty Nominal' : 'Regt Nominal',
      icon: Users,
      badge: isBsm ? assignedBty : undefined,
      permissionKey: 'master_personnel',
    },
    {
      id: 'admin_panel',
      label: 'Admin Panel',
      icon: Settings,
      badge: 'Admin',
      permissionKey: 'admin_panel',
    },
  ];

  // Dynamically filter tabs based on Admin RBAC matrix permissions
  const displayTabs = candidateTabs.filter((tab) => {
    if (tab.permissionKey === 'admin_panel' && isRealAdmin) return true;
    return hasModulePermission(tab.permissionKey);
  });

  return (
    <div className="sticky top-13 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 mb-3 transition-colors">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-w-[1700px] mx-auto">
        {displayTabs.map((tab) => {
          const Icon = tab.icon;
          const isDashboardTab =
            tab.permissionKey === 'main_dashboard' &&
            ['main_dashboard', 'co_dashboard', 'offr_dashboard', 'rsm_dashboard'].includes(activePage);
          const isActive = activePage === tab.id || isDashboardTab;

          return (
            <button
              key={tab.id}
              onClick={() => (tab.action ? tab.action() : setActivePage(tab.id))}
              className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none min-w-0 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-normal shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

};
