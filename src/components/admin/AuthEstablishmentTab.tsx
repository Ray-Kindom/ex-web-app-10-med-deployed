import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AuthEstablishmentItem, Battery } from '../../types';
import {
  Building2,
  Edit2,
  Save,
  Check,
  X,
  Shield,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const AuthEstablishmentTab: React.FC = () => {
  const {
    authEstablishmentList,
    updateAuthEstablishment,
    addAuthEstablishmentItem,
    deleteAuthEstablishmentItem,
    personnelList,
    isAdmin,
    showNotification,
  } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOffr, setEditOffr] = useState(0);
  const [editJco, setEditJco] = useState(0);
  const [editOr, setEditOr] = useState(0);

  // Add new establishment row
  const [isAdding, setIsAdding] = useState(false);
  const [newSubUnit, setNewSubUnit] = useState<string>('HQ Bty');
  const [newCategory, setNewCategory] = useState<string>('War Establishment');
  const [newOffr, setNewOffr] = useState(0);
  const [newJco, setNewJco] = useState(0);
  const [newOr, setNewOr] = useState(0);

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-3">
        <Shield className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">ADMIN Access Required</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Authorized Establishment (PE/WE) is classified regimental data. Only the System Administrator can alter establishment strengths.
        </p>
      </div>
    );
  }

  const handleStartEdit = (item: AuthEstablishmentItem) => {
    setEditingId(item.id);
    setEditOffr(item.offr ?? 0);
    setEditJco(item.jco ?? 0);
    setEditOr(item.or ?? (item.total || item.authorized || 0));
  };

  const handleSaveEdit = (id: string) => {
    const total = editOffr + editJco + editOr;
    updateAuthEstablishment(id, {
      offr: editOffr,
      jco: editJco,
      or: editOr,
      total,
      authorized: total,
    });
    setEditingId(null);
    showNotification('Authorized Establishment figures updated.');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const total = newOffr + newJco + newOr;
    addAuthEstablishmentItem({
      subUnit: newSubUnit,
      category: newCategory,
      offr: newOffr,
      jco: newJco,
      or: newOr,
      total,
    });
    setIsAdding(false);
    showNotification('New Establishment row added.');
  };

  // Compute live held counts per battery
  const getHeldCounts = (subUnit: string) => {
    if (subUnit === 'Total Unit' || subUnit === 'All') {
      const offr = personnelList.filter((p) => p.category === 'Officer' || p.category === 'Offr').length;
      const jco = personnelList.filter((p) => p.category === 'JCO').length;
      const or = personnelList.filter((p) => p.category === 'OR' || p.category === 'NCO' || p.category === 'Soldier').length;
      return { offr, jco, or, total: offr + jco + or };
    }

    const bty = subUnit as Battery;
    const offr = personnelList.filter((p) => p.battery === bty && (p.category === 'Officer' || p.category === 'Offr')).length;
    const jco = personnelList.filter((p) => p.battery === bty && p.category === 'JCO').length;
    const or = personnelList.filter((p) => p.battery === bty && (p.category === 'OR' || p.category === 'NCO' || p.category === 'Soldier')).length;
    return { offr, jco, or, total: offr + jco + or };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Authorized Establishment (AUTH / PE / WE)
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
              STRICT ADMIN CONTROL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure the official Authorized Establishment for HQ Battery, Gun Batteries (P, Q, R), and Regiment Total.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Establishment Row</span>
        </button>
      </div>

      {/* Establishment Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">Sub Unit / Formation</th>
                <th className="py-3.5 px-4 font-bold">Category</th>
                <th className="py-3.5 px-4 font-bold text-center">Auth OFFR</th>
                <th className="py-3.5 px-4 font-bold text-center">Auth JCO</th>
                <th className="py-3.5 px-4 font-bold text-center">Auth OR</th>
                <th className="py-3.5 px-4 font-bold text-center text-white">Auth Total</th>
                <th className="py-3.5 px-4 font-bold text-center text-emerald-400">Held Nominal</th>
                <th className="py-3.5 px-4 font-bold text-center">Surplus / Deficit</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {authEstablishmentList.map((item) => {
                const isEditing = editingId === item.id;
                const subUnitLabel = item.subUnit || item.category || 'Unit';
                const held = getHeldCounts(subUnitLabel);
                const itemTotal = typeof item.total === 'number' ? item.total : (item.authorized || 0);
                const diff = held.total - (isEditing ? editOffr + editJco + editOr : itemTotal);
                const isUnitTotal = subUnitLabel === 'Total Unit' || subUnitLabel === 'Total' || item.id === 'auth-total';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isUnitTotal
                        ? 'bg-rose-950/20 font-bold border-t-2 border-rose-500/40'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>{subUnitLabel}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-400">{item.category}</td>

                    {/* OFFR */}
                    <td className="py-3 px-4 text-center font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editOffr}
                          onChange={(e) => setEditOffr(parseInt(e.target.value, 10) || 0)}
                          className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-center font-bold"
                        />
                      ) : (
                        <span className="text-white font-bold">{item.offr ?? '-'}</span>
                      )}
                    </td>

                    {/* JCO */}
                    <td className="py-3 px-4 text-center font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editJco}
                          onChange={(e) => setEditJco(parseInt(e.target.value, 10) || 0)}
                          className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-center font-bold"
                        />
                      ) : (
                        <span className="text-white font-bold">{item.jco ?? '-'}</span>
                      )}
                    </td>

                    {/* OR */}
                    <td className="py-3 px-4 text-center font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editOr}
                          onChange={(e) => setEditOr(parseInt(e.target.value, 10) || 0)}
                          className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-center font-bold"
                        />
                      ) : (
                        <span className="text-white font-bold">{item.or ?? '-'}</span>
                      )}
                    </td>

                    {/* TOTAL */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-white text-sm bg-slate-950/40">
                      {isEditing ? editOffr + editJco + editOr : itemTotal}
                    </td>

                    {/* HELD */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                      {held.total}
                    </td>

                    {/* SURPLUS / DEFICIT */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          diff === 0
                            ? 'text-slate-400 bg-slate-800'
                            : diff > 0
                            ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                            : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                        }`}
                      >
                        {diff > 0 ? `+${diff} (Surplus)` : diff < 0 ? `${diff} (Deficit)` : 'Full'}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Authorized Numbers"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isUnitTotal && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove establishment row for ${item.subUnit}?`)) {
                                  deleteAuthEstablishmentItem(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-400" />
                <span>Add Authorized Establishment Row</span>
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sub Unit Name *</label>
                <input
                  type="text"
                  value={newSubUnit}
                  onChange={(e) => setNewSubUnit(e.target.value)}
                  placeholder="e.g. HQ Bty, P Bty, Attached Troops"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category / Table</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. War Establishment, Peace Establishment"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Auth Offr</label>
                  <input
                    type="number"
                    min="0"
                    value={newOffr}
                    onChange={(e) => setNewOffr(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Auth JCO</label>
                  <input
                    type="number"
                    min="0"
                    value={newJco}
                    onChange={(e) => setNewJco(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Auth OR</label>
                  <input
                    type="number"
                    min="0"
                    value={newOr}
                    onChange={(e) => setNewOr(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-center font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
                <span className="text-slate-400">Total Authorized:</span>
                <span className="text-base font-bold text-white">{newOffr + newJco + newOr}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  Create Establishment Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
