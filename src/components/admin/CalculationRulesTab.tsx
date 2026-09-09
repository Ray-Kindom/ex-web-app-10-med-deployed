import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calculator,
  Shield,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  RotateCcw,
} from 'lucide-react';

export const CalculationRulesTab: React.FC = () => {
  const {
    calculationConfig,
    updateCalculationConfig,
    categoriesList,
    isAdmin,
    showNotification,
  } = useApp();

  const [totalOutFormula, setTotalOutFormula] = useState(
    calculationConfig.totalOutFormula || 'SUM(LEAVE, HOSPITAL, ATT_OUT, COURSE, JAIL, AWOL)'
  );
  const [offParadeFormula, setOffParadeFormula] = useState(
    calculationConfig.offParadeFormula || 'SUM(SY_DUTY, WORKING, CMPT, MESS, SICK_QTR)'
  );
  const [onParadeFormula, setOnParadeFormula] = useState(
    calculationConfig.onParadeFormula || 'POSTED_STRENGTH - (TOTAL_OUT + OFF_PARADE)'
  );

  const [totalOutCats, setTotalOutCats] = useState<string[]>(
    calculationConfig.totalOutCategories || ['Leave', 'Course', 'Hospital', 'Att Out', 'Jail / SCM', 'OSL / AWOL']
  );

  const [offParadeCats, setOffParadeCats] = useState<string[]>(
    calculationConfig.offParadeCategories || ['Sy Duty', 'Working', 'Cmpt', 'Mess & Administrative', 'Sick in Qtr']
  );

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-3">
        <Shield className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">ADMIN Access Required</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Parade state mathematical calculation formulas are strictly managed by System Administration.
        </p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCalculationConfig({
      totalOutFormula,
      offParadeFormula,
      onParadeFormula,
      totalOutCategories: totalOutCats,
      offParadeCategories: offParadeCats,
    });
    showNotification('Parade State Calculation Rules updated by ADMIN.');
  };

  const handleToggleTotalOut = (catName: string) => {
    if (totalOutCats.includes(catName)) {
      setTotalOutCats(totalOutCats.filter((c) => c !== catName));
    } else {
      setTotalOutCats([...totalOutCats, catName]);
    }
  };

  const handleToggleOffParade = (catName: string) => {
    if (offParadeCats.includes(catName)) {
      setOffParadeCats(offParadeCats.filter((c) => c !== catName));
    } else {
      setOffParadeCats([...offParadeCats, catName]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Parade State Calculation Engine & Rules
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
              ADMIN CONTROL ONLY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure how Parade State aggregates are calculated. Select which categories feed into Total Out and Off Parade, and review formulas.
          </p>
        </div>

        {calculationConfig.lastUpdated && (
          <span className="text-[11px] font-mono text-slate-500">
            Last Updated: {new Date(calculationConfig.lastUpdated).toLocaleDateString()}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Category Contribution Matrix */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Category Inclusions Matrix</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (Toggle which categories contribute to each calculation bucket)
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Out Categories */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Total Out (Absent from Unit)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  {totalOutCats.length} categories
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Personnel in these categories are completely absent from the station/unit (e.g. on Leave, Hospitalized, Jail, Courses).
              </p>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(categoriesList || []).map((cat) => {
                  const isChecked = totalOutCats.includes(cat.name);
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'bg-purple-950/30 border-purple-500/40 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTotalOut(cat.name)}
                          className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                        />
                        <span>{cat.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {cat.subCategories?.length || 0} sub-points
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Off Parade Categories */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Off Parade (In Unit, but on Duties / Working)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  {offParadeCats.length} categories
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Personnel present in station but excused from muster ground (e.g. Guard Duties, Sick in Qtr, Working Parties, Mess staff).
              </p>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(categoriesList || []).map((cat) => {
                  const isChecked = offParadeCats.includes(cat.name);
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'bg-amber-950/30 border-amber-500/40 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOffParade(cat.name)}
                          className="rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{cat.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {cat.subCategories?.length || 0} sub-points
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Formulas Reference */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-rose-400" />
              <span>রেজিমেন্টাল প্যারেড স্টেট ফর্মুলা নির্দেশিকা (Official Parade Rules)</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
              10 Med Regt Arty SOP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">১. অনুমোদিত সংখ্যা (Auth Establishment):</span>
              <p className="font-mono text-white text-xs font-bold">
                Auth = 638
              </p>
              <p className="text-[10px] text-slate-500">
                রেজিমেন্টের মোট অনুমোদিত জনবল (HQ: 154, P: 160, Q: 159, R: 159, Wksp: 6)।
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">২. পোস্টেড সৈন্য (Posted Strength):</span>
              <p className="font-mono text-cyan-300 text-xs font-bold">
                Posted = Total - (ERE + Civilian) [= 563]
              </p>
              <p className="text-[10px] text-slate-500">
                ERE ও Civilian সরাসরি মোট সৈন্য থেকে বাদ যায়, পোস্টিং হিসেবে গণ্য হয় না।
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/20 space-y-1">
              <span className="text-rose-400 font-semibold block text-[11px]">৩. ইউনিটের বাইরে (Out of Unit):</span>
              <p className="font-mono text-rose-300 text-xs font-bold">
                Out of Unit = Msn + Att [= 57]
              </p>
              <p className="text-[10px] text-slate-500">
                শুধুমাত্র জাতিসংঘ মিশন (Msn) ও অন্যত্র অ্যাটাচড (Att) জনবল।
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/20 space-y-1">
              <span className="text-amber-400 font-semibold block text-[11px]">৪. নিয়ন্ত্রণে থাকা জনবল (Held Strength):</span>
              <p className="font-mono text-amber-300 text-xs font-bold">
                Held = Posted - Out of Unit (Msn + Att) [= 506]
              </p>
              <p className="text-[10px] text-slate-500">
                পোস্টেড সৈন্য থেকে মিশন ও অ্যাটাচড সৈন্য বাদ দিয়ে অর্জিত সংখ্যা।
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/20 space-y-1">
              <span className="text-purple-400 font-semibold block text-[11px]">৫. মোট আউট (Total Out):</span>
              <p className="font-mono text-purple-300 text-xs font-bold">
                Total Out = Leave + Course + CMH + Comd + FDMN + AWOL [= 66]
              </p>
              <p className="text-[10px] text-slate-500">
                আগের আউটের বাকি উপাদানগুলো (ছুটি, কোর্স, সিএমএইচ, কমান্ড, এফডিএমএন, ইত্যাদি)।
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/20 space-y-1">
              <span className="text-sky-400 font-semibold block text-[11px]">৬. ইউনিটে উপস্থিতি (Present in Unit):</span>
              <p className="font-mono text-sky-300 text-xs font-bold">
                Present in Unit = Held - Total Out [= 440]
              </p>
              <p className="text-[10px] text-slate-500">
                হেল্ড সৈন্য থেকে টোটাল আউট বাদ দিলে প্রকৃত রেজিমেন্টে উপস্থিত সৈন্য।
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">৭. অফ প্যারেড (Off Parade):</span>
              <p className="font-mono text-amber-300 text-xs font-bold">
                Off Parade = Detailing Duties (রোস্টার ডিউটি)
              </p>
              <p className="text-[10px] text-slate-500">
                ডিউটি রোস্টারে ডিটেইল্ড মোট সৈন্য সংখ্যা (সিকিউরিটি, ওয়ার্কিং, ফিক্সড ডিউটি)।
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 bg-emerald-950/10 space-y-1">
              <span className="text-emerald-400 font-semibold block text-[11px]">৮. প্যারেডে হাজির (On Parade):</span>
              <p className="font-mono text-emerald-300 text-xs font-bold">
                On Parade = Present in Unit - Off Parade [= 440]
              </p>
              <p className="text-[10px] text-emerald-400/70">
                উপস্থিত সৈন্য থেকে অফ-প্যারেড (ডিটেইলিং ডিউটি) বাদ দিলে চূড়ান্ত প্যারেড সৈন্য।
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Calculation Rules (ADMIN)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
