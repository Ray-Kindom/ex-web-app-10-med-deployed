import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { TopModuleNavBar } from './components/common/TopModuleNavBar';
import { PersonnelDossierModal } from './components/personnel/PersonnelDossierModal';
import { AddPersonnelModal } from './components/personnel/AddPersonnelModal';
import { ParadeStatePrintSheet } from './components/parade/ParadeStatePrintSheet';
import { DailyParadeStateModal } from './components/parade/DailyParadeStateModal';
import { OutOfUnitManagerModal } from './components/parade/OutOfUnitManagerModal';
import { Personnel } from './types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

// Pages
import { LoginPage } from './pages/LoginPage';
import { MainDashboardPage } from './pages/MainDashboardPage';
import { MasterPersonnelPage } from './pages/MasterPersonnelPage';
import { BatteryDashboardPage } from './pages/BatteryDashboardPage';
import { ParadeStatePage } from './pages/ParadeStatePage';
import { RsmDashboardPage } from './pages/RsmDashboardPage';
import { CoDashboardPage } from './pages/CoDashboardPage';
import { OffrDashboardPage } from './pages/OffrDashboardPage';
import { AdminPanelPage } from './pages/AdminPanelPage';
import { DutyDetailPage } from './pages/DutyDetailPage';
import { OutOfUnitPage } from './pages/OutOfUnitPage';

const AppContent: React.FC = () => {
  const {
    activePage,
    setActivePage,
    currentUser,
    isAuthenticated,
    hasModulePermission,
    dailyParadeModalOpen,
    setDailyParadeModalOpen,
    outOfUnitModalOpen,
    setOutOfUnitModalOpen,
    activeOutOfUnitCategory,
  } = useApp();

  // Modal States
  const [dossierPerson, setDossierPerson] = useState<Personnel | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const handleViewDossier = (person: Personnel) => {
    setDossierPerson(person);
    setIsDossierOpen(true);
  };

  const renderActivePage = () => {
    // Normalization of permission keys
    const permKey =
      activePage === 'co_dashboard' ||
      activePage === 'offr_dashboard' ||
      activePage === 'rsm_dashboard'
        ? 'main_dashboard'
        : activePage;

    // RBAC Security Check
    if (activePage !== 'login' && !hasModulePermission(permKey)) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl bg-slate-900/95 border border-rose-500/30 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-sans">
              অ্যাক্সেস অনুমোদিত নয় / Access Restricted
            </h2>
            <p className="text-sm text-slate-300">
              আপনার বর্তমান রোল <strong className="text-rose-400 font-mono">[{currentUser.role}]</strong>-এর জন্য এই মডিউলটি (<span className="text-amber-400 font-mono">{activePage}</span>) দেখার এক্সেস অনুমোদিত নয়।
            </p>
            <p className="text-xs text-slate-500">
              নিরাপত্তা ও ডাটা পৃথকীকরণ নীতি অনুযায়ী অ্যাডমিন কর্তৃক এই মডিউলটি সীমাবদ্ধ রাখা হয়েছে।
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                if (currentUser.role === 'CO') setActivePage('co_dashboard');
                else if (currentUser.role === 'Offr') setActivePage('offr_dashboard');
                else if (currentUser.role === 'RSM') setActivePage('rsm_dashboard');
                else if (['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role))
                  setActivePage('battery_dashboard');
                else setActivePage('main_dashboard');
              }}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-900/30 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>অনুমোদিত ড্যাশবোর্ডে ফিরে যান (Return to Allowed Dashboard)</span>
            </button>
          </div>
        </div>
      );
    }

    switch (activePage) {
      case 'login':
        return <LoginPage />;
      case 'main_dashboard':
        if (currentUser.role === 'CO') {
          return (
            <CoDashboardPage
              onViewDossier={handleViewDossier}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
            />
          );
        }
        if (currentUser.role === 'Offr') {
          return (
            <OffrDashboardPage
              onViewDossier={handleViewDossier}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
            />
          );
        }
        if (currentUser.role === 'RSM') {
          return (
            <RsmDashboardPage
              onViewDossier={handleViewDossier}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
            />
          );
        }
        if (['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role)) {
          return (
            <BatteryDashboardPage
              onViewDossier={handleViewDossier}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
            />
          );
        }
        return (
          <MainDashboardPage
            onViewDossier={handleViewDossier}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'master_personnel':
        return (
          <MasterPersonnelPage
            onViewDossier={handleViewDossier}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'battery_dashboard':
        return (
          <BatteryDashboardPage
            onViewDossier={handleViewDossier}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'parade_state':
        return (
          <ParadeStatePage
            onViewDossier={handleViewDossier}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'duty_detail':
        return (
          <DutyDetailPage
            onViewDossier={handleViewDossier}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'out_of_unit':
        return (
          <OutOfUnitPage
            onViewDossier={handleViewDossier}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'rsm_dashboard':
        return (
          <RsmDashboardPage
            onViewDossier={handleViewDossier}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'co_dashboard':
        return (
          <CoDashboardPage
            onViewDossier={handleViewDossier}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'offr_dashboard':
        return (
          <OffrDashboardPage
            onViewDossier={handleViewDossier}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
      case 'admin_panel':
        return <AdminPanelPage />;
      default:
        return (
          <MainDashboardPage
            onViewDossier={handleViewDossier}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
          />
        );
    }
  };

  // Strict Route Guard: If not authenticated or on login page, render isolated login screen
  if (!isAuthenticated || activePage === 'login') {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
      />

      <div className="flex-1 flex max-w-[1700px] w-full mx-auto">
        {/* Main Content Area (Full width, left sidebar removed) */}
        <main className="flex-1 min-w-0 flex flex-col w-full">
          <TopModuleNavBar />
          <div className="p-2 sm:p-4 lg:p-5 max-w-[1700px] mx-auto w-full">{renderActivePage()}</div>
        </main>
      </div>

      {/* Global Dossier Modal */}
      <PersonnelDossierModal
        person={dossierPerson}
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          setDossierPerson(null);
        }}
      />

      {/* Global Add / Enlist Soldier Modal */}
      <AddPersonnelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Official Military Print Document Modal */}
      <ParadeStatePrintSheet
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Updt Daily Parade State Modal (29 Points) */}
      <DailyParadeStateModal
        isOpen={dailyParadeModalOpen}
        onClose={() => setDailyParadeModalOpen(false)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
      />

      {/* Updt Out Of Unit Modal (ERE, Msn, Att, FDMN, CMH, Course, Comd, Leaves) */}
      <OutOfUnitManagerModal
        isOpen={outOfUnitModalOpen}
        onClose={() => setOutOfUnitModalOpen(false)}
        defaultCategory={activeOutOfUnitCategory}
        onViewDossier={handleViewDossier}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
