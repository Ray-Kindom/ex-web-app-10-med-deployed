import React, { useState } from 'react';
import { Personnel, ParadeStatus, isNCERank, isCivilianRank } from '../../types';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { RankBadge } from '../common/RankBadge';
import { UnitLogo } from '../common/UnitLogo';
import {
  X,
  User,
  Shield,
  Activity,
  Heart,
  Phone,
  Calendar,
  Building,
  CheckCircle,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface PersonnelDossierModalProps {
  person: Personnel | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PersonnelDossierModal: React.FC<PersonnelDossierModalProps> = ({
  person,
  isOpen,
  onClose,
}) => {
  const { updateParadeStatus, currentUser } = useApp();
  const [selectedStatus, setSelectedStatus] = useState<ParadeStatus>(person?.status || 'Present');
  const [statusReason, setStatusReason] = useState<string>(person?.statusDetails || '');
  const [isEditingStatus, setIsEditingStatus] = useState<boolean>(false);

  if (!isOpen || !person) return null;

  const handleSaveStatus = () => {
    updateParadeStatus(person.id, selectedStatus, statusReason);
    setIsEditingStatus(false);
  };

  const isCoReadOnly = currentUser.role === 'CO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UnitLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Military Personnel Dossier
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  10 MED REGT
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Official Nominal Roll Record & Parade Tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Soldier Overview Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-700 to-amber-600 flex items-center justify-center font-mono font-bold text-xl text-white shadow-lg border border-white/20">
                {person.rk.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold text-white font-sans">{person.name}</h4>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                    Snk No: {person.snkNo}
                  </span>
                  <RankBadge rank={person.rk} trade={person.trade} size="sm" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                {isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian' ? 'Establishment' : 'Assigned Battery'}
              </span>
              <span className={`text-sm font-bold font-mono px-3 py-1 rounded-lg border mt-0.5 ${
                isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian'
                  ? 'text-purple-300 bg-purple-950/40 border-purple-800/60'
                  : 'text-rose-400 bg-rose-950/40 border-rose-800/60'
              }`}>
                {isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian' ? 'Civilian (No Battery)' : person.battery}
              </span>
            </div>
          </div>

          {/* Current Parade State Section */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span>Today's Parade Muster Status</span>
              </span>

              {!isEditingStatus && !isCoReadOnly && (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  Change Status
                </button>
              )}
            </div>

            {!isEditingStatus ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <StatusBadge
                  status={person.status}
                  outOfUnitCategory={person.outOfUnitCategory}
                  details={person.statusDetails}
                  size="lg"
                />
                <span className="text-xs text-slate-400 font-mono">
                  Verified for 0630 HRS Roll Call
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-900 border border-rose-900/60 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      'Present',
                      'On Duty',
                      'CMH/Sick',
                      'Leave',
                      'Course/Trg',
                      'Temp Duty',
                      'Attached Out',
                      'AWOL/OSL',
                    ] as ParadeStatus[]
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatus(st)}
                      className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                        selectedStatus === st
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">
                    Remarks / Location Details (e.g. CMH Dhaka, Furlough till 15 Sep, Duty Guard):
                  </label>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Enter location or specific reason..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEditingStatus(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveStatus}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/40"
                  >
                    Save Parade State
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Military Profile */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Military Bio-Data</span>
              </span>

              <div className="space-y-2 pt-1 font-sans">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Regiment:</span>
                  <span className="font-semibold text-slate-200">10 Medium Regt Arty</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Trade Classification:</span>
                  <span className="font-semibold text-slate-200">
                    {['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(person.rk)
                      ? 'None (Commissioned Officer - No Trade)'
                      : isNCERank(person.rk, person.trade) || person.rk === 'NC(E)' || person.trade === '-' || !person.trade
                      ? 'None (NC(E) - No Trade)'
                      : person.trade}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Sub-Unit / Battery:</span>
                  <span className={`font-semibold font-mono ${
                    isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian' ? 'text-purple-300' : 'text-rose-400'
                  }`}>
                    {isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian' ? 'Civilian (No Battery)' : person.battery}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Service Status:</span>
                  <span className="font-semibold text-emerald-400 font-mono">ACTIVE SERVICE</span>
                </div>
              </div>
            </div>

            {/* Medical & Emergency */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Medical & Vital Records</span>
              </span>

              <div className="space-y-2 pt-1 font-sans">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Blood Group:</span>
                  <span className="font-bold text-rose-400 font-mono">{person.bloodGroup || 'O+'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Medical Category:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {person.medicalCategory || 'SHAPE-1 / AYE'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Medical History:</span>
                  <span className="text-slate-200 font-medium">Clear / Fit for Field Duty</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Mobile / Contact:</span>
                  <span className="text-emerald-400 font-mono font-medium">{person.phone || person.mobileNo || 'Not Listed'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Next of Kin (NOK):</span>
                  <span className="text-slate-200 font-medium">{person.nokName || 'On Regimental File'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Remarks / Note:</span>
                  <span className="text-slate-300 italic">{person.remarks || person.rmk || 'Nil'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            ID: 10MED-{person.snkNo}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
