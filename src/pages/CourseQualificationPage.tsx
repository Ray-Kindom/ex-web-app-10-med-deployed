import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Battery, Personnel } from '../types';
import { RankBadge } from '../components/common/RankBadge';
import {
  COURSE_DEFINITIONS,
  INITIAL_COURSE_QUALIFICATIONS,
  CourseDefinition,
  CourseQualificationRecord,
} from '../data/courseQualificationData';
import {
  GraduationCap,
  Search,
  Plus,
  X,
  Printer,
  Eye,
  Trash2,
  Calendar,
  MapPin,
  Award,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

const STORAGE_KEY_COURSES = '10MED_COURSE_QUALIFICATIONS_V1';

interface CourseQualificationPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenPrintModal?: () => void;
}

export const CourseQualificationPage: React.FC<CourseQualificationPageProps> = ({
  onViewDossier,
}) => {
  const { personnelList, showNotification, isGuest } = useApp();

  // Persistent course qualifications
  const [courseRecords, setCourseRecords] = useState<CourseQualificationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COURSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_COURSE_QUALIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courseRecords));
    } catch (e) {}
  }, [courseRecords]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(COURSE_DEFINITIONS[0].id);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [btyFilter, setBtyFilter] = useState<Battery | 'All'>('All');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formCourseId, setFormCourseId] = useState(COURSE_DEFINITIONS[0].id);
  const [formSoldierSnk, setFormSoldierSnk] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formLocation, setFormLocation] = useState('');
  const [formGrade, setFormGrade] = useState('Qualified (Grade A)');
  const [formAuthority, setFormAuthority] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Helper to find soldier by Army / Snk No
  const findPerson = (snkNo: string): Personnel | undefined => {
    return personnelList.find(
      (p) => (p.snkNo || '').trim().toLowerCase() === snkNo.trim().toLowerCase()
    );
  };

  // Course qualification counts per course
  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    COURSE_DEFINITIONS.forEach((c) => {
      counts[c.id] = 0;
    });

    courseRecords.forEach((cr) => {
      if (counts[cr.courseId] !== undefined) {
        counts[cr.courseId]++;
      } else {
        counts[cr.courseId] = 1;
      }
    });

    return counts;
  }, [courseRecords]);

  const totalQualifications = useMemo(() => {
    return (Object.values(courseCounts) as number[]).reduce((a: number, b: number) => a + b, 0);
  }, [courseCounts]);

  // Selected Course Definition
  const currentCourseDef: CourseDefinition = useMemo(() => {
    return (
      COURSE_DEFINITIONS.find((c) => c.id === selectedCourseId) || COURSE_DEFINITIONS[0]
    );
  }, [selectedCourseId]);

  // Qualified Soldiers list for Selected Course
  const selectedCourseRoster = useMemo(() => {
    let list = courseRecords.filter((cr) => cr.courseId === selectedCourseId);

    // Merge from master personnel if anyone has matching course in their profile
    personnelList.forEach((p) => {
      if (
        p.courseName &&
        (p.courseName.toLowerCase().includes(currentCourseDef.shortCode.toLowerCase()) ||
          p.courseName.toLowerCase().includes(currentCourseDef.name.toLowerCase()))
      ) {
        const exists = list.some(
          (item) => item.snkNo.trim().toLowerCase() === p.snkNo.trim().toLowerCase()
        );
        if (!exists) {
          list.push({
            id: `p-course-${p.id}`,
            courseId: selectedCourseId,
            courseName: currentCourseDef.name,
            snkNo: p.snkNo,
            name: p.name,
            rk: p.rk,
            battery: p.battery,
            completionDate: p.courseTo || p.courseFrom || 'Active / Qualified',
            location: p.courseLocation || currentCourseDef.defaultLocation,
            grade: 'Qualified',
            authority: p.authority || 'Unit Nominal Roll',
            remarks: p.remarks || 'Master Personnel Sync',
          });
        }
      }
    });

    if (btyFilter !== 'All') {
      list = list.filter((cr) => cr.battery === btyFilter);
    }

    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase().trim();
      list = list.filter(
        (cr) =>
          cr.name.toLowerCase().includes(q) ||
          cr.snkNo.toLowerCase().includes(q) ||
          cr.rk.toLowerCase().includes(q) ||
          cr.grade.toLowerCase().includes(q) ||
          cr.location.toLowerCase().includes(q) ||
          (cr.authority || '').toLowerCase().includes(q) ||
          (cr.remarks || '').toLowerCase().includes(q) ||
          cr.battery.toLowerCase().includes(q)
      );
    }

    return list;
  }, [courseRecords, selectedCourseId, currentCourseDef, personnelList, btyFilter, rosterSearch]);

  // Filtered Course Directory
  const filteredCourses = useMemo(() => {
    if (!courseSearchQuery.trim()) return COURSE_DEFINITIONS;
    const q = courseSearchQuery.toLowerCase().trim();
    return COURSE_DEFINITIONS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.bengaliName.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [courseSearchQuery]);

  // Open Modal
  const handleOpenAddModal = (courseId?: string) => {
    const cId = courseId || selectedCourseId;
    const cDef = COURSE_DEFINITIONS.find((c) => c.id === cId) || COURSE_DEFINITIONS[0];
    setFormCourseId(cId);
    setFormLocation(cDef.defaultLocation);
    setFormGrade('Qualified (Grade A)');
    setFormSoldierSnk(personnelList[0]?.snkNo || '');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAuthority('');
    setFormRemarks('');
    setIsAddModalOpen(true);
  };

  // Save Record
  const handleSaveQualification = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন সংরক্ষণ করা সম্ভব নয়।');
      return;
    }

    const soldier = personnelList.find(
      (p) => (p.snkNo || '').trim().toLowerCase() === formSoldierSnk.trim().toLowerCase()
    );

    if (!soldier) {
      showNotification('অনুগ্রহ করে একজন সঠিক সৈনিক নির্বাচন করুন!');
      return;
    }

    const course = COURSE_DEFINITIONS.find((c) => c.id === formCourseId) || COURSE_DEFINITIONS[0];

    const newRecord: CourseQualificationRecord = {
      id: `cq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      courseId: course.id,
      courseName: course.name,
      snkNo: soldier.snkNo,
      name: soldier.name,
      rk: soldier.rk,
      battery: soldier.battery,
      completionDate: formDate,
      location: formLocation || course.defaultLocation,
      grade: formGrade,
      authority: formAuthority || 'Unit Routine Order',
      remarks: formRemarks || '',
    };

    setCourseRecords((prev) => [newRecord, ...prev]);
    setIsAddModalOpen(false);
    showNotification(
      `${soldier.name}-এর জন্য '${course.shortCode}' কোর্স কোয়ালিফিকেশন সফলভাবে যুক্ত হয়েছে।`
    );
  };

  // Delete Record
  const handleDeleteRecord = (id: string, name: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিলিট অনুমোদিত নয়।');
      return;
    }
    setCourseRecords((prev) => prev.filter((r) => r.id !== id));
    showNotification(`${name}-এর কোর্স কোয়ালিফিকেশন রেকর্ড মুছে ফেলা হয়েছে।`);
  };

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* 1. Header Bar: Minimal, Clean & Distinct */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Course & Cadre Qualification
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {totalQualifications} জন কোয়ালিফাইড
              </span>
            </div>
            <p className="text-xs text-slate-400">
              10 Medium Regiment Artillery — রেজিমেন্টাল কোর্স, ক্যাডার ও বিশেষজ্ঞ যোগ্যতার তালিকা
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal(selectedCourseId)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন কোয়ালিফিকেশন যুক্ত করুন</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="প্রিন্ট করুন"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* 2. Main Layout: Two Panels (Course List on Left, Who Did It on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Panel: Course Directory with Qualified Count on the right */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                কোর্স ও ক্যাডার তালিকা
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {filteredCourses.length} টি কোর্স
            </span>
          </div>

          {/* Search Courses */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="কোর্সের নাম লিখুন..."
              value={courseSearchQuery}
              onChange={(e) => setCourseSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Course Items */}
          <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-0.5 scrollbar-thin">
            {filteredCourses.map((c) => {
              const count = courseCounts[c.id] || 0;
              const isSelected = selectedCourseId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCourseId(c.id);
                    setRosterSearch('');
                  }}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/70 shadow-xs'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate text-slate-200">
                      <span className={isSelected ? 'text-emerald-400' : 'text-white'}>
                        {c.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {c.bengaliName}
                    </div>
                  </div>

                  {/* Right side: Qualified Count */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                      title="Qualified Count"
                    >
                      {count} জন
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Who completed the selected course (with when & where) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          {/* Header of Selected Course */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {currentCourseDef.name}
                </h3>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {selectedCourseRoster.length} জন উত্তীর্ণ / কোয়ালিফাইড
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span>{currentCourseDef.bengaliName}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{currentCourseDef.defaultLocation}</span>
                </span>
                <span>·</span>
                <span>মেয়াদ: {currentCourseDef.defaultDuration}</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenAddModal(selectedCourseId)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>সৈনিক যুক্ত করুন</span>
            </button>
          </div>

          {/* Filter and Search Bar for Roster */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            {/* Battery Filter */}
            <div className="flex items-center gap-1 text-xs">
              {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBtyFilter(b)}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    btyFilter === b
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b === 'All' ? 'সব' : b.replace(' Bty', '')}
                </button>
              ))}
            </div>

            {/* Roster Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="সেনা নং, নাম বা স্থান খুঁজুন..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-56"
              />
            </div>
          </div>

          {/* Detailed Table */}
          {selectedCourseRoster.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                <GraduationCap className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                এই কোর্সে বর্তমানে কোনো উত্তীর্ণ সৈনিক তালিকাভুক্ত নেই
              </p>
              <p className="text-[11px] text-slate-500">
                উপরে &ldquo;সৈনিক যুক্ত করুন&rdquo; বাটনে ক্লিক করে নতুন কোয়ালিফিকেশন যুক্ত করুন।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">সেনা নং</th>
                    <th className="py-2.5 px-3">পদবি ও নাম</th>
                    <th className="py-2.5 px-3">ব্যাটারী</th>
                    <th className="py-2.5 px-3">কবে করেছে (তারিখ)</th>
                    <th className="py-2.5 px-3">কোথায় করেছে (স্থান / প্রতিষ্ঠান)</th>
                    <th className="py-2.5 px-3">ফলাফল / গ্রেড</th>
                    <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {selectedCourseRoster.map((item, idx) => {
                    const person = findPerson(item.snkNo) || {
                      id: item.id,
                      snkNo: item.snkNo,
                      rk: item.rk,
                      trade: '-',
                      name: item.name,
                      battery: item.battery,
                      status: 'In Unit',
                      phone: '',
                    };

                    return (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Army No */}
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          {item.snkNo}
                        </td>

                        {/* Rank & Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <RankBadge rank={item.rk} size="sm" />
                            <button
                              type="button"
                              onClick={() => onViewDossier(person)}
                              className="font-medium text-white hover:text-emerald-400 hover:underline cursor-pointer text-left transition-colors"
                              title="ক্লিক করে ডসিয়ার দেখুন"
                            >
                              {item.name}
                            </button>
                          </div>
                        </td>

                        {/* Battery */}
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {item.battery}
                        </td>

                        {/* Completion Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{item.completionDate}</span>
                          </div>
                        </td>

                        {/* Location / Institution */}
                        <td className="py-2.5 px-3 text-slate-300">
                          <div className="flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={item.location}>
                              {item.location}
                            </span>
                          </div>
                        </td>

                        {/* Result / Grade */}
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Award className="w-3 h-3 text-emerald-400" />
                            <span>{item.grade}</span>
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isGuest ? (
                              <button
                                onClick={() => handleDeleteRecord(item.id, item.name)}
                                className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="কোয়ালিফিকেশন মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Add Course Qualification Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>নতুন কোর্স কোয়ালিফিকেশন এন্ট্রি</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQualification} className="space-y-3 text-xs">
              {/* Select Course */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">কোর্স / ক্যাডার</label>
                <select
                  value={formCourseId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setFormCourseId(cId);
                    const cDef = COURSE_DEFINITIONS.find((c) => c.id === cId);
                    if (cDef) {
                      setFormLocation(cDef.defaultLocation);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {COURSE_DEFINITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bengaliName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Soldier */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">সৈনিক নির্বাচন</label>
                <select
                  value={formSoldierSnk}
                  onChange={(e) => setFormSoldierSnk(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.snkNo}>
                      {p.snkNo} — {p.rk} {p.name} ({p.battery})
                    </option>
                  ))}
                </select>
              </div>

              {/* Completion Date */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">কবে করেছে (তারিখ / সাল)</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Location / Institute */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  কোথায় করেছে (প্রতিষ্ঠান / স্থান)
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. AC&S Halishahar / SI&T / 10 Med Ground..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">ফলাফল / গ্রেড</label>
                <input
                  type="text"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  placeholder="e.g. Distinction (Grade A), 1st Class, Qualified..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Authority */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">আদেশ / অথরিটি (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={formAuthority}
                  onChange={(e) => setFormAuthority(e.target.value)}
                  placeholder="e.g. AC&S Trg Order 42/25..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="মন্তব্য..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-sm"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
