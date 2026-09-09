import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SystemCategory, SubCategoryItem, Battery, ALL_BATTERIES } from '../../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  MoveUp,
  MoveDown,
  Shield,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export const CategoryManagementTab: React.FC = () => {
  const {
    categoriesList,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    reorderCategories,
    isAdmin,
    showNotification,
  } = useApp();

  const [expandedCatId, setExpandedCatId] = useState<string | null>(categoriesList[0]?.id || null);

  // Main Category Modal/Form state
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState<SystemCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catBtys, setCatBtys] = useState<Battery[]>(ALL_BATTERIES);

  // Sub Category Form state
  const [addingSubForCatId, setAddingSubForCatId] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<{ catId: string; sub: SubCategoryItem } | null>(null);
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subBtys, setSubBtys] = useState<Battery[]>(ALL_BATTERIES);
  const [subContributesTotalOut, setSubContributesTotalOut] = useState(false);
  const [subContributesOffParade, setSubContributesOffParade] = useState(true);

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-3">
        <Shield className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">ADMIN Access Required</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Only the System Administrator has authority to modify database categories, sub-categories, or calculation structures.
        </p>
      </div>
    );
  }

  const handleOpenAddCat = () => {
    setCatName('');
    setCatCode('');
    setCatDesc('');
    setCatBtys(ALL_BATTERIES);
    setEditingCat(null);
    setIsAddingCat(true);
  };

  const handleOpenEditCat = (cat: SystemCategory) => {
    setCatName(cat.name);
    setCatCode(cat.code);
    setCatDesc(cat.description || '');
    setCatBtys((cat.applicableSubUnits as Battery[]) || ALL_BATTERIES);
    setEditingCat(cat);
    setIsAddingCat(true);
  };

  const handleSaveCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showNotification('Category Name cannot be empty.');
      return;
    }

    if (editingCat) {
      updateCategory(editingCat.id, {
        name: catName.trim(),
        code: catCode.trim() || catName.trim().toUpperCase().replace(/\s+/g, '_'),
        description: catDesc.trim(),
        applicableSubUnits: catBtys,
      });
      showNotification(`Category "${catName}" updated.`);
    } else {
      addCategory({
        name: catName.trim(),
        code: catCode.trim() || catName.trim().toUpperCase().replace(/\s+/g, '_'),
        description: catDesc.trim(),
        isActive: true,
        order: categoriesList.length + 1,
        applicableSubUnits: catBtys,
        subCategories: [],
      });
      showNotification(`Category "${catName}" created.`);
    }

    setIsAddingCat(false);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categoriesList.length - 1) return;

    const newIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...categoriesList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);

    reorderCategories(reordered.map((c) => c.id));
  };

  const handleOpenAddSub = (catId: string) => {
    setSubName('');
    setSubDesc('');
    setSubBtys(ALL_BATTERIES);
    setSubContributesTotalOut(false);
    setSubContributesOffParade(true);
    setEditingSub(null);
    setAddingSubForCatId(catId);
  };

  const handleOpenEditSub = (catId: string, sub: SubCategoryItem) => {
    setSubName(sub.name);
    setSubDesc(sub.description || '');
    setSubBtys((sub.applicableSubUnits as Battery[]) || ALL_BATTERIES);
    setSubContributesTotalOut(!!sub.contributesToTotalOut);
    setSubContributesOffParade(!!sub.contributesToOffParade);
    setEditingSub({ catId, sub });
    setAddingSubForCatId(catId);
  };

  const handleSaveSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !addingSubForCatId) {
      showNotification('Sub-category Name cannot be empty.');
      return;
    }

    if (editingSub) {
      updateSubCategory(editingSub.catId, editingSub.sub.id, {
        name: subName.trim(),
        description: subDesc.trim(),
        applicableSubUnits: subBtys,
        contributesToTotalOut: subContributesTotalOut,
        contributesToOffParade: subContributesOffParade,
      });
      showNotification(`Sub-category "${subName}" updated.`);
    } else {
      addSubCategory(addingSubForCatId, {
        name: subName.trim(),
        description: subDesc.trim(),
        isActive: true,
        order: 99,
        applicableSubUnits: subBtys,
        contributesToTotalOut: subContributesTotalOut,
        contributesToOffParade: subContributesOffParade,
      });
      showNotification(`Sub-category "${subName}" created.`);
    }

    setAddingSubForCatId(null);
    setEditingSub(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Dynamic Categories & Sub-Categories Manager
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
              ADMIN CONTROL ONLY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure system categories in real-time. Changes made here dynamically update across all Parade State views, modals, and reports immediately.
          </p>
        </div>

        <button
          onClick={handleOpenAddCat}
          id="btn-admin-add-category"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Main Category</span>
        </button>
      </div>

      {/* Main Categories List */}
      <div className="space-y-3">
        {(categoriesList || []).map((cat, catIdx) => {
          const isExpanded = expandedCatId === cat.id;

          return (
            <div
              key={cat.id}
              className={`rounded-xl border transition-all ${
                cat.isActive
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/70 border-slate-800/50 opacity-60'
              }`}
            >
              {/* Category Header Row */}
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveCategory(catIdx, 'up')}
                      disabled={catIdx === 0}
                      className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800"
                      title="Move Category Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveCategory(catIdx, 'down')}
                      disabled={catIdx === (categoriesList || []).length - 1}
                      className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800"
                      title="Move Category Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div
                    onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{cat.name}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {cat.code}
                      </span>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        {cat.subCategories?.length || 0} sub-categories
                      </span>
                      {!cat.isActive && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
                  {/* Applicable Sub-units Badges */}
                  <div className="flex items-center gap-1">
                    {ALL_BATTERIES.map((bty) => {
                      const isApplicable = (cat.applicableSubUnits || ALL_BATTERIES).includes(bty);
                      return (
                        <span
                          key={bty}
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isApplicable
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-transparent text-slate-600 line-through'
                          }`}
                        >
                          {bty.replace(' Bty', '')}
                        </span>
                      );
                    })}
                  </div>

                  {/* Toggle Active */}
                  <button
                    onClick={() => updateCategory(cat.id, { isActive: !cat.isActive })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      cat.isActive
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'text-slate-400 bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Disabled'}
                  </button>

                  {/* Edit Category */}
                  <button
                    onClick={() => handleOpenEditCat(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Edit Category Name & Properties"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Add Sub Category */}
                  <button
                    onClick={() => handleOpenAddSub(cat.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Sub</span>
                  </button>

                  {/* Delete Category */}
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete Category "${cat.name}"? This action is strictly Admin authorized.`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Expand / Collapse Button */}
                  <button
                    onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Sub-Categories Section */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                    <span className="font-semibold text-slate-300">
                      Sub-Categories under "{cat.name}" ({cat.subCategories?.length || 0})
                    </span>
                    <button
                      onClick={() => handleOpenAddSub(cat.id)}
                      className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Sub-category</span>
                    </button>
                  </div>

                  {(!cat.subCategories || cat.subCategories.length === 0) ? (
                    <div className="p-4 text-center text-xs text-slate-500 rounded-lg bg-slate-950/50 border border-dashed border-slate-800">
                      No sub-categories defined. Click "+ Add Sub-category" above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {(cat.subCategories || []).map((sub, sIdx) => {
                        return (
                          <div
                            key={sub.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-500 w-5">
                                #{sIdx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-white">{sub.name}</span>
                                {sub.description && (
                                  <span className="text-[11px] text-slate-400 ml-2">
                                    ({sub.description})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Calculation Flags */}
                              {sub.contributesToOffParade && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  Off Parade
                                </span>
                              )}
                              {sub.contributesToTotalOut && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  Total Out
                                </span>
                              )}

                              {/* Batteries Tag */}
                              <div className="flex items-center gap-1">
                                {ALL_BATTERIES.map((bty) => {
                                  const enabled = (sub.applicableSubUnits || ALL_BATTERIES).includes(bty);
                                  return (
                                    <span
                                      key={bty}
                                      className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                                        enabled
                                          ? 'bg-slate-800 text-slate-300'
                                          : 'bg-transparent text-slate-600 line-through'
                                      }`}
                                    >
                                      {bty.replace(' Bty', '')}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Toggle Active */}
                              <button
                                onClick={() =>
                                  updateSubCategory(cat.id, sub.id, { isActive: !sub.isActive })
                                }
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  sub.isActive
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                    : 'text-slate-500 bg-slate-900 border-slate-800'
                                }`}
                              >
                                {sub.isActive ? 'Active' : 'Off'}
                              </button>

                              {/* Edit Sub */}
                              <button
                                onClick={() => handleOpenEditSub(cat.id, sub)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                title="Edit Sub-category"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {/* Delete Sub */}
                              <button
                                onClick={() => {
                                  if (confirm(`Delete sub-category "${sub.name}"?`)) {
                                    deleteSubCategory(cat.id, sub.id);
                                  }
                                }}
                                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800"
                                title="Delete Sub-category"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Category Add/Edit Modal */}
      {isAddingCat && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <span>{editingCat ? 'Edit Main Category' : 'Create New Main Category'}</span>
              </h3>
              <button
                onClick={() => setIsAddingCat(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCat} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Category Display Name *
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Sy Duty, Working, Cmpt, Training..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Category Code (Optional identifier)
                </label>
                <input
                  type="text"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  placeholder="e.g. SY_DUTY, WORKING"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="e.g. Operational security and sentry points"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Applicable Sub Units / Batteries
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_BATTERIES.map((bty) => {
                    const isChecked = catBtys.includes(bty);
                    return (
                      <label
                        key={bty}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-rose-950/30 border-rose-500/50 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCatBtys([...catBtys, bty]);
                            } else {
                              setCatBtys(catBtys.filter((b) => b !== bty));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                        />
                        <span>{bty}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingCat(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  {editingCat ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Category Add/Edit Modal */}
      {addingSubForCatId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-400" />
                <span>{editingSub ? 'Edit Sub-Category' : 'Add New Sub-Category'}</span>
              </h3>
              <button
                onClick={() => {
                  setAddingSubForCatId(null);
                  setEditingSub(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Sub-Category Name *
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Fresh Duty, Regt RP, Ammo Guard..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Description / Specification
                </label>
                <input
                  type="text"
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  placeholder="e.g. Daily morning fresh supply collection duty"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">Calculation Rules:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={subContributesOffParade}
                    onChange={(e) => setSubContributesOffParade(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Contributes to <strong>Off Parade</strong> count</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={subContributesTotalOut}
                    onChange={(e) => setSubContributesTotalOut(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500"
                  />
                  <span>Contributes to <strong>Total Out</strong> count</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Applicable Sub Units
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_BATTERIES.map((bty) => {
                    const isChecked = subBtys.includes(bty);
                    return (
                      <label
                        key={bty}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-rose-950/30 border-rose-500/50 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSubBtys([...subBtys, bty]);
                            } else {
                              setSubBtys(subBtys.filter((b) => b !== bty));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                        />
                        <span>{bty}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAddingSubForCatId(null);
                    setEditingSub(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  {editingSub ? 'Save Sub-category' : 'Add Sub-category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
