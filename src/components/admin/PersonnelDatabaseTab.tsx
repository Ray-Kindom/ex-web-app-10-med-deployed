import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Personnel, Battery, ParadeStatus } from '../../types';
import { AddPersonnelModal } from '../personnel/AddPersonnelModal';
import { EditPersonnelModal } from '../personnel/EditPersonnelModal';
import { PersonnelDossierModal } from '../personnel/PersonnelDossierModal';
import { PersonnelTable } from '../personnel/PersonnelTable';
import {
  Users,
  Plus,
  Download,
  Upload,
  Cloud,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

export const PersonnelDatabaseTab: React.FC = () => {
  const {
    personnelList,
    deletePersonnel,
    updatePersonnel,
    syncNominalRollToCloud,
    showNotification,
    isGuest,
  } = useApp();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);
  const [dossierPerson, setDossierPerson] = useState<Personnel | null>(null);
  const [deleteConfirmPerson, setDeleteConfirmPerson] = useState<Personnel | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // High-level Stats focused on permanent nominal distribution
  const stats = useMemo(() => {
    const total = personnelList.length;
    let officers = 0;
    let jcos = 0;
    let ncos = 0;
    let ors = 0;
    let civilians = 0;

    let pBty = 0;
    let qBty = 0;
    let rBty = 0;
    let hqBty = 0;

    (personnelList || []).forEach((p) => {
      if (!p) return;
      const rk = p.rk;
      if (['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(rk)) officers++;
      else if (['SWO', 'WO', 'MWO'].includes(rk)) jcos++;
      else if (['Sgt', 'Cpl', 'Lcpl'].includes(rk)) ncos++;
      else if (['Civ', 'Civilian', 'Cook', 'NC(E)', 'NC(U)'].includes(rk)) civilians++;
      else ors++;

      if (p.battery === 'P Bty') pBty++;
      else if (p.battery === 'Q Bty') qBty++;
      else if (p.battery === 'R Bty') rBty++;
      else if (p.battery === 'HQ Bty') hqBty++;
    });

    return {
      total,
      officers,
      jcos,
      ncos,
      ors,
      civilians,
      pBty,
      qBty,
      rBty,
      hqBty,
    };
  }, [personnelList]);

  // Cloud Sync
  const handleCloudSync = async () => {
    setIsSyncingCloud(true);
    await syncNominalRollToCloud();
    setIsSyncingCloud(false);
  };

  // Export CSV (Full nominal roll)
  const handleExportCSV = () => {
    const headers = [
      'Army No / Snk No',
      'Rank',
      'Trade',
      'Name',
      'Battery',
      'Blood Group',
      'Medical Category',
      'Mobile No',
      'Remarks',
    ];

    const rows = (personnelList || []).map((p) => [
      `"${p.snkNo}"`,
      `"${p.rk}"`,
      `"${p.trade || 'GD'}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.battery}"`,
      `"${p.bloodGroup || 'O+'}"`,
      `"${p.medicalCategory || 'AYE'}"`,
      `"${p.mobileNo || p.phone || ''}"`,
      `"${(p.remarks || p.rmk || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `10_Med_Regt_Nominal_Roll_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Nominal Roll exported as CSV successfully.');
  };

  // Simple CSV Import Parser
  const handleProcessImportCSV = () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ইমপোর্ট করা যাবে না।');
      return;
    }
    if (!csvText.trim()) {
      showNotification('অনুগ্রহ করে CSV টেক্সট পেস্ট করুন।');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        showNotification('CSV ফাইলে ন্যূনতম ১টি ডেটা সারি থাকতে হবে।');
        return;
      }

      let importedCount = 0;
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Basic CSV split
        const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length >= 3) {
          const snkNo = cols[0];
          const rk = cols[1];
          const name = cols[2];
          const trade = cols[3] || 'GD';
          const battery = (cols[4] as Battery) || 'P Bty';
          const status = (cols[5] as ParadeStatus) || 'Present';
          const bloodGroup = cols[7] || 'O+';

          // Check if exists
          const existing = personnelList.find((p) => p.snkNo === snkNo);
          if (existing) {
            updatePersonnel(existing.id, {
              rk,
              name,
              trade,
              battery,
              status,
              bloodGroup,
            });
          } else {
            const newId = `imported-${Date.now()}-${i}`;
            updatePersonnel(newId, {
              id: newId,
              snkNo,
              rk,
              name,
              trade,
              battery,
              status,
              bloodGroup,
              medicalCategory: 'AYE',
            } as any);
          }
          importedCount++;
        }
      }

      showNotification(`${importedCount} personnel records processed from CSV.`);
      setIsImportModalOpen(false);
      setCsvText('');
    } catch (err: any) {
      showNotification(`CSV Import Error: ${err?.message || 'Invalid format'}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Quick Statistics */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Personnel & Nominal Roll Database
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {personnelList.length} Total Enlisted
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              রেজিমেন্টাল সকল সৈনিক ও অফিসারের ডাটাবেজ সরাসরি নিয়ন্ত্রণ, পরিবর্তন ও ক্লাউড সিঙ্ক
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCloudSync}
            disabled={isSyncingCloud}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Force push all personnel records to Cloud Firestore"
          >
            <Cloud
              className={`w-3.5 h-3.5 ${
                isSyncingCloud ? 'animate-pulse text-amber-400' : 'text-cyan-400'
              }`}
            />
            <span>{isSyncingCloud ? 'Syncing...' : 'Sync Firestore'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enlist Soldier</span>
          </button>
        </div>
      </div>

      {/* 2. Micro Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs font-sans">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 text-[11px]">Total Personnel</span>
          <span className="text-lg font-bold font-mono text-white mt-1">{stats.total}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-amber-400 text-[11px]">Officers</span>
          <span className="text-lg font-bold font-mono text-amber-300 mt-1">{stats.officers}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-emerald-400 text-[11px]">JCOs</span>
          <span className="text-lg font-bold font-mono text-emerald-300 mt-1">{stats.jcos}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-blue-400 text-[11px]">NCOs</span>
          <span className="text-lg font-bold font-mono text-blue-300 mt-1">{stats.ncos}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-cyan-400 text-[11px]">Other Ranks (OR)</span>
          <span className="text-lg font-bold font-mono text-cyan-300 mt-1">{stats.ors}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-purple-400 text-[11px]">Civilians</span>
          <span className="text-lg font-bold font-mono text-purple-300 mt-1">{stats.civilians}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-rose-400 text-[11px]">Sub-Unit Distribution</span>
          <div className="text-[11px] font-mono text-slate-300 mt-1 space-y-0.5">
            <div>
              P: <strong className="text-white">{stats.pBty}</strong> | Q:{' '}
              <strong className="text-white">{stats.qBty}</strong>
            </div>
            <div>
              R: <strong className="text-white">{stats.rBty}</strong> | HQ:{' '}
              <strong className="text-white">{stats.hqBty}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Reusable Standard Personnel Table */}
      <PersonnelTable
        personnel={personnelList}
        onViewDossier={(person) => setDossierPerson(person)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onEditPerson={(person) => setEditingPerson(person)}
        onDeletePerson={(person) => setDeleteConfirmPerson(person)}
        allowStatusEdits={!isGuest}
        title="Nominal Roll Database"
      />

      {/* Single Delete Confirmation Modal */}
      {deleteConfirmPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-7 h-7" />
              <h3 className="text-base font-bold text-white">Delete Personnel Record?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">
                {deleteConfirmPerson.rk} {deleteConfirmPerson.name} ({deleteConfirmPerson.snkNo})
              </strong>{' '}
              from the active regimental database and Cloud Firestore?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPerson(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePersonnel(deleteConfirmPerson.id);
                  setDeleteConfirmPerson(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Import Personnel CSV Data</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Paste CSV text below with comma-separated values. Format:
              <br />
              <code className="text-cyan-300 font-mono text-[11px] block mt-1 p-2 rounded bg-slate-950 border border-slate-800">
                SnkNo,Rank,Name,Trade,Battery,Status,StatusDetails,BloodGroup
                <br />
                1234567,Snk,Mohammad Ali,GD,P Bty,Present,,O+
              </code>
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste raw CSV lines here..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessImportCSV}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
              >
                Process & Import Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Personnel Modal */}
      <AddPersonnelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Personnel Modal */}
      <EditPersonnelModal
        isOpen={!!editingPerson}
        onClose={() => setEditingPerson(null)}
        personnel={editingPerson}
      />

      {/* View Dossier Modal */}
      <PersonnelDossierModal
        isOpen={!!dossierPerson}
        onClose={() => setDossierPerson(null)}
        person={dossierPerson}
      />
    </div>
  );
};
