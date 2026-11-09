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
  Trash2,
  Calendar,
  MapPin,
  Award,
  ChevronRight,
  BookOpen,
  Edit3,
  RotateCcw,
  Check,
  Tag,
  Clock,
} from 'lucide-react';

const STORAGE_KEY_COURSES = '10MED_COURSE_QUALIFICATIONS_V1';
const STORAGE_KEY_COURSE_DEFINITIONS = '10MED_COURSE_DEFINITIONS_V1';

interface CourseQualificationPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenPrintModal?: () => void;
}

export const CourseQualificationPage: React.FC<CourseQualificationPageProps> = ({
  onViewDossier,
}) => {
  const { personnelList, showNotification, isGuest, theme } = useApp();
  const isLight = theme === 'light';

  // 1. Persistent Course Definitions (allow updating names, adding new courses, deleting)
  const [courseDefinitions, setCourseDefinitions] = useState<CourseDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COURSE_DEFINITIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved course definitions', e);
    }
    return COURSE_DEFINITIONS;
  });

  // 2. Persistent course qualifications
  const [courseRecords, setCourseRecords] = useState<CourseQualificationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COURSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved course qualifications', e);
    }
    return INITIAL_COURSE_QUALIFICATIONS;
  });

  // Guard against race condition: Only sync to server after initial server fetch has finished
  const isServerLoadedRef = React.useRef(false);

  // Helper to persist to server disk for cross-mobile and cross-device sync
  const syncCoursesToServer = (defs: CourseDefinition[], recs: CourseQualificationRecord[]) => {
    fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definitions: defs, records: recs }),
    }).catch((err) => console.warn('Could not sync courses to server:', err));
  };

  // Load centralized courses from server on mount to sync across all devices & mobile phones
  useEffect(() => {
    let isMounted = true;
    const fetchServerCourses = async () => {
      try {
        const res = await fetch('/api/courses');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && isMounted) {
            if (Array.isArray(data.definitions) && data.definitions.length > 0) {
              setCourseDefinitions(data.definitions);
              try {
                localStorage.setItem(STORAGE_KEY_COURSE_DEFINITIONS, JSON.stringify(data.definitions));
              } catch (e) {}
            }
            if (Array.isArray(data.records) && data.records.length > 0) {
              setCourseRecords(data.records);
              try {
                localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(data.records));
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        // Fallback silently to localStorage
      } finally {
        if (isMounted) {
          isServerLoadedRef.current = true;
        }
      }
    };
    fetchServerCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  // ONLY sync to server when user changes definitions AFTER server has loaded
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COURSE_DEFINITIONS, JSON.stringify(courseDefinitions));
    } catch (e) {
      console.error('Failed to persist course definitions', e);
    }
    if (isServerLoadedRef.current && !isGuest) {
      syncCoursesToServer(courseDefinitions, courseRecords);
    }
  }, [courseDefinitions]);

  // ONLY sync to server when user changes records AFTER server has loaded
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courseRecords));
    } catch (e) {
      console.error('Failed to persist course qualifications', e);
    }
    if (isServerLoadedRef.current && !isGuest) {
      syncCoursesToServer(courseDefinitions, courseRecords);
    }
  }, [courseRecords]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    return courseDefinitions[0]?.id || COURSE_DEFINITIONS[0]?.id || 'bgc';
  });

  // Safeguard: if selected course was deleted, select first available
  useEffect(() => {
    if (courseDefinitions.length > 0 && !courseDefinitions.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId(courseDefinitions[0].id);
    }
  }, [courseDefinitions, selectedCourseId]);

  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [btyFilter, setBtyFilter] = useState<Battery | 'All'>('All');

  // Add Soldier Qualification Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formCourseId, setFormCourseId] = useState(courseDefinitions[0]?.id || 'bgc');
  const [formSoldierSnk, setFormSoldierSnk] = useState('');
  const [soldierSearchQuery, setSoldierSearchQuery] = useState('');
  const [isSoldierSearchFocused, setIsSoldierSearchFocused] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formLocation, setFormLocation] = useState('');
  const [formGrade, setFormGrade] = useState('Qualified (Grade A)');
  const [formAuthority, setFormAuthority] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Course Definition Edit / Create Modal State
  const [isCourseEditModalOpen, setIsCourseEditModalOpen] = useState(false);
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false);
  const [courseEditForm, setCourseEditForm] = useState<{
    id: string;
    name: string;
    bengaliName: string;
    shortCode: string;
    category: CourseDefinition['category'];
    defaultDuration: string;
    defaultLocation: string;
  }>({
    id: '',
    name: '',
    bengaliName: '',
    shortCode: '',
    category: 'Artillery Specialist',
    defaultDuration: '4 Weeks',
    defaultLocation: '',
  });

  // Helper to find soldier by Army / Snk No
  const findPerson = (snkNo: string): Personnel | undefined => {
    return personnelList.find(
      (p) => (p.snkNo || '').trim().toLowerCase() === snkNo.trim().toLowerCase()
    );
  };

  // Currently selected soldier in Add Qualification Modal
  const selectedSoldier = useMemo(() => {
    if (!formSoldierSnk) return null;
    return findPerson(formSoldierSnk) || null;
  }, [personnelList, formSoldierSnk]);

  // Matching soldiers when searching in Add Qualification Modal
  const matchingSoldiers = useMemo(() => {
    if (!soldierSearchQuery.trim()) return [];
    const q = soldierSearchQuery.toLowerCase().trim();
    return (personnelList || [])
      .filter((p) => {
        if (!p) return false;
        return (
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q) ||
          (p.trade || '').toLowerCase().includes(q) ||
          (p.battery || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [personnelList, soldierSearchQuery]);

  // Course qualification counts per course
  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    courseDefinitions.forEach((c) => {
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
  }, [courseDefinitions, courseRecords]);

  const totalQualifications = useMemo(() => {
    return (Object.values(courseCounts) as number[]).reduce((a: number, b: number) => a + b, 0);
  }, [courseCounts]);

  // Selected Course Definition
  const currentCourseDef: CourseDefinition = useMemo(() => {
    return (
      courseDefinitions.find((c) => c.id === selectedCourseId) ||
      courseDefinitions[0] || {
        id: 'bgc',
        name: 'Basic Gunner Cadre (BGC)',
        bengaliName: 'বেসিক গানার ক্যাডার',
        shortCode: 'BGC',
        category: 'Artillery Specialist',
        defaultDuration: '6 Weeks',
        defaultLocation: '10 Med Regimental Trg Ground',
      }
    );
  }, [courseDefinitions, selectedCourseId]);

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
    if (!courseSearchQuery.trim()) return courseDefinitions;
    const q = courseSearchQuery.toLowerCase().trim();
    return courseDefinitions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.bengaliName.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [courseDefinitions, courseSearchQuery]);

  // Open Add Soldier Qualification Modal
  const handleOpenAddModal = (courseId?: string) => {
    const cId = courseId || selectedCourseId;
    const cDef = courseDefinitions.find((c) => c.id === cId) || courseDefinitions[0] || COURSE_DEFINITIONS[0];
    setFormCourseId(cId);
    setFormLocation(cDef.defaultLocation);
    setFormGrade('Qualified (Grade A)');
    setFormSoldierSnk(personnelList[0]?.snkNo || '');
    setSoldierSearchQuery('');
    setIsSoldierSearchFocused(false);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAuthority('');
    setFormRemarks('');
    setIsAddModalOpen(true);
  };

  // Open Course Edit Modal
  const handleOpenEditCourse = (course: CourseDefinition) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন করা সম্ভব নয়।');
      return;
    }
    setIsCreatingNewCourse(false);
    setCourseEditForm({
      id: course.id,
      name: course.name,
      bengaliName: course.bengaliName,
      shortCode: course.shortCode,
      category: course.category,
      defaultDuration: course.defaultDuration,
      defaultLocation: course.defaultLocation,
    });
    setIsCourseEditModalOpen(true);
  };

  // Open New Course Modal
  const handleOpenAddCourse = () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন করা সম্ভব নয়।');
      return;
    }
    setIsCreatingNewCourse(true);
    setCourseEditForm({
      id: `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      bengaliName: '',
      shortCode: '',
      category: 'Artillery Specialist',
      defaultDuration: '4 Weeks',
      defaultLocation: '10 Med Regimental Trg Ground',
    });
    setIsCourseEditModalOpen(true);
  };

  // Save Course Definition (Name change or new course)
  const handleSaveCourseDefinition = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন সংরক্ষণ করা সম্ভব নয়।');
      return;
    }

    const trimmedName = courseEditForm.name.trim();
    if (!trimmedName) {
      showNotification('অনুগ্রহ করে কোর্সের নাম প্রদান করুন!');
      return;
    }

    const updatedCourse: CourseDefinition = {
      id: courseEditForm.id,
      name: trimmedName,
      bengaliName: courseEditForm.bengaliName.trim() || trimmedName,
      shortCode: courseEditForm.shortCode.trim() || trimmedName.slice(0, 8).toUpperCase(),
      category: courseEditForm.category,
      defaultDuration: courseEditForm.defaultDuration.trim() || '4 Weeks',
      defaultLocation: courseEditForm.defaultLocation.trim() || '10 Med Regimental Trg Ground',
    };

    if (isCreatingNewCourse) {
      setCourseDefinitions((prev) => [...prev, updatedCourse]);
      setSelectedCourseId(updatedCourse.id);
      showNotification(`নতুন কোর্স "${updatedCourse.name}" সফলভাবে যুক্ত করা হয়েছে।`);
    } else {
      // Find old course to cascade name change across existing records
      const oldCourse = courseDefinitions.find((c) => c.id === updatedCourse.id);
      setCourseDefinitions((prev) =>
        prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
      );

      // Auto-update course name in all qualified soldier records
      if (oldCourse && oldCourse.name !== updatedCourse.name) {
        setCourseRecords((prev) =>
          prev.map((cr) =>
            cr.courseId === updatedCourse.id
              ? { ...cr, courseName: updatedCourse.name }
              : cr
          )
        );
      }
      showNotification(`কোর্সের নাম ও বিবরণ সফলভাবে আপডেট করা হয়েছে: "${updatedCourse.name}"`);
    }

    setIsCourseEditModalOpen(false);
  };

  // Delete Course
  const handleDeleteCourse = (courseId: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোর্স মোছা সম্ভব নয়।');
      return;
    }

    const targetCourse = courseDefinitions.find((c) => c.id === courseId);
    if (!targetCourse) return;

    if (courseDefinitions.length <= 1) {
      showNotification('কমপক্ষে একটি কোর্স তালিকায় থাকা আবশ্যক!');
      return;
    }

    const count = courseRecords.filter((cr) => cr.courseId === courseId).length;
    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে "${targetCourse.name}" কোর্সটি মুছে ফেলতে চান?` +
        (count > 0 ? `\n\nসতর্কতা: এই কোর্সের অন্তর্ভুক্ত ${count} জন সৈনিকের রেকর্ড রয়েছে, যা তালিকা থেকে বাদ পড়বে।` : '')
    );

    if (!confirmed) return;

    setCourseDefinitions((prev) => {
      const nextList = prev.filter((c) => c.id !== courseId);
      if (selectedCourseId === courseId && nextList.length > 0) {
        setSelectedCourseId(nextList[0].id);
      }
      return nextList;
    });

    setCourseRecords((prev) => prev.filter((cr) => cr.courseId !== courseId));
    setIsCourseEditModalOpen(false);
    showNotification(`"${targetCourse.name}" কোর্সটি মুছে ফেলা হয়েছে।`);
  };

  // Reset to Factory Default Courses
  const handleResetDefaultCourses = () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে রিসেট করা সম্ভব নয়।');
      return;
    }
    const confirmed = window.confirm(
      'আপনি কি সকল কোর্স তালিকা মূল অফিশিয়াল ডিফল্ট (১১টি কোর্স) এ রিসেট করতে চান?'
    );
    if (!confirmed) return;

    setCourseDefinitions(COURSE_DEFINITIONS);
    setSelectedCourseId(COURSE_DEFINITIONS[0].id);
    showNotification('কোর্স তালিকা সফলভাবে ডিফল্ট অবস্থায় ফিরিয়ে আনা হয়েছে।');
  };

  // Save Soldier Qualification Record
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

    const course =
      courseDefinitions.find((c) => c.id === formCourseId) || courseDefinitions[0] || COURSE_DEFINITIONS[0];

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
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-4 rounded-xl shadow-sm ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Course & Cadre Qualification
              </h1>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {totalQualifications} জন কোয়ালিফাইড
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
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
        <div className={`lg:col-span-4 border rounded-xl p-3.5 space-y-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className={`flex items-center justify-between pb-2 border-b gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
              <h2 className={`text-xs font-bold uppercase tracking-wider truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                কোর্স ও ক্যাডার তালিকা
              </h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenAddCourse}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="নতুন কোর্স বা ক্যাডার তৈরি করুন"
              >
                <Plus className="w-3 h-3" />
                <span>+ নতুন কোর্স</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefaultCourses}
                className={`p-1 rounded-md text-xs border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="মূল ডিফল্ট কোর্স তালিকায় ফিরিয়ে আনুন"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Courses */}
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="কোর্সের নাম বা কোড লিখুন..."
              value={courseSearchQuery}
              onChange={(e) => setCourseSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
              }`}
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
                  className={`group p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                        : 'bg-slate-800 border-emerald-500/70 shadow-xs'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">
                      <span className={isSelected ? (isLight ? 'text-emerald-900 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-slate-900' : 'text-white')}>
                        {c.name}
                      </span>
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {c.bengaliName}
                    </div>
                  </div>

                  {/* Right side: Qualified Count and Quick Edit Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded border ${
                        isSelected
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isLight
                          ? 'bg-white text-slate-700 border-slate-200'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                      title="উত্তীর্ণ সৈনিক সংখ্যা"
                    >
                      {count} জন
                    </span>

                    {/* Edit Course Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditCourse(c);
                      }}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isSelected
                          ? isLight
                            ? 'hover:bg-emerald-200 text-emerald-800'
                            : 'hover:bg-slate-700 text-emerald-300'
                          : isLight
                          ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                          : 'text-slate-500 hover:text-white hover:bg-slate-800'
                      }`}
                      title="কোর্সের নাম বা বিবরণ পরিবর্তন করুন"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-emerald-500 translate-x-0.5' : isLight ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Who completed the selected course (with when & where) */}
        <div className={`lg:col-span-8 border rounded-xl p-4 space-y-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}>
          {/* Header of Selected Course */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {currentCourseDef.name}
                </h3>
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                  isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  {selectedCourseRoster.length} জন উত্তীর্ণ / কোয়ালিফাইড
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {currentCourseDef.category}
                </span>
              </div>
              <div className={`flex items-center gap-3 text-xs mt-1 flex-wrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>{currentCourseDef.bengaliName}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                  <span>{currentCourseDef.defaultLocation}</span>
                </span>
                <span>·</span>
                <span>মেয়াদ: {currentCourseDef.defaultDuration}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenEditCourse(currentCourseDef)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="কোর্সের নাম বা বিবরণ এডিট করুন"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                <span>কোর্সের নাম এডিট</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedCourseId)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>সৈনিক যুক্ত করুন</span>
              </button>
            </div>
          </div>

          {/* Filter and Search Bar for Roster */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            {/* Battery Filter */}
            <div className="flex items-center gap-1 text-xs">
              {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBtyFilter(b)}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    btyFilter === b
                      ? 'bg-emerald-600 text-white font-semibold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b === 'All' ? 'সব' : b.replace(' Bty', '')}
                </button>
              ))}
            </div>

            {/* Roster Search */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                placeholder="সেনা নং, নাম বা স্থান খুঁজুন..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className={`pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 w-full sm:w-56 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Detailed Table */}
          {selectedCourseRoster.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center ${
                isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-500'
              }`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <p className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                এই কোর্সে বর্তমানে কোনো উত্তীর্ণ সৈনিক তালিকাভুক্ত নেই
              </p>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                উপরে &ldquo;সৈনিক যুক্ত করুন&rdquo; বাটনে ক্লিক করে নতুন কোয়ালিফিকেশন যুক্ত করুন।
              </p>
            </div>
          ) : (
            <div className={`overflow-x-auto rounded-lg border ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] uppercase tracking-wider font-mono ${
                    isLight ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-800 bg-slate-950/70 text-slate-400'
                  }`}>
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
                <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'}`}>
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
                        className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className={`py-2.5 px-3 text-center font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                          {idx + 1}
                        </td>

                        {/* Army No */}
                        <td className={`py-2.5 px-3 font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          {item.snkNo}
                        </td>

                        {/* Rank & Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <RankBadge rank={item.rk} size="sm" />
                            <button
                              type="button"
                              onClick={() => onViewDossier(person)}
                              className={`font-medium hover:underline cursor-pointer text-left transition-colors ${
                                isLight ? 'text-slate-900 hover:text-emerald-700' : 'text-white hover:text-emerald-400'
                              }`}
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
                    const cDef = courseDefinitions.find((c) => c.id === cId);
                    if (cDef) {
                      setFormLocation(cDef.defaultLocation);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {courseDefinitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bengaliName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Soldier with Instant Search */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>সৈনিক নির্বাচন (সার্চ করুন)</span>
                    <span className="text-emerald-400 font-mono text-[11px]">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    সেনা নং বা নাম লিখুন
                  </span>
                </div>

                {/* Instant Search Input */}
                <div className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={soldierSearchQuery}
                      onChange={(e) => {
                        setSoldierSearchQuery(e.target.value);
                        setIsSoldierSearchFocused(true);
                      }}
                      onFocus={() => setIsSoldierSearchFocused(true)}
                      placeholder="সেনা নং (যেমন 1243723), পদবি বা নাম লিখুন..."
                      className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
                    />
                    {soldierSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSoldierSearchQuery('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        title="ক্লিয়ার করুন"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Suggestions List */}
                  {isSoldierSearchFocused && soldierSearchQuery.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 divide-y divide-slate-800 rounded-xl z-30 max-h-56 overflow-y-auto shadow-2xl">
                      {matchingSoldiers.length > 0 ? (
                        matchingSoldiers.map((p) => {
                          const isSelected = p.snkNo.trim().toLowerCase() === formSoldierSnk.trim().toLowerCase();
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setFormSoldierSnk(p.snkNo);
                                setSoldierSearchQuery('');
                                setIsSoldierSearchFocused(false);
                              }}
                              className={`w-full p-2.5 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected ? 'bg-emerald-950/60 text-emerald-200' : 'hover:bg-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-bold text-amber-400 shrink-0">{p.snkNo}</span>
                                <RankBadge rank={p.rk} size="sm" />
                                <span className="font-semibold text-white truncate">{p.name}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-slate-950 border-slate-800 text-slate-400 shrink-0">
                                  {p.battery}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                                {p.trade || 'GD'}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          &ldquo;{soldierSearchQuery}&rdquo; দিয়ে কোনো সৈনিক পাওয়া যায়নি
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Soldier Card */}
                {selectedSoldier ? (
                  <div className="mt-2 p-2.5 rounded-lg border bg-emerald-950/30 border-emerald-500/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-amber-400 text-xs">{selectedSoldier.snkNo}</span>
                          <RankBadge rank={selectedSoldier.rk} size="sm" />
                          <span className="font-bold text-white text-xs truncate">{selectedSoldier.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                            {selectedSoldier.battery}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>ট্রেড: {selectedSoldier.trade || 'GD'}</span>
                          <span>•</span>
                          <span>স্ট্যাটাস: {selectedSoldier.status}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded shrink-0">
                      নির্বাচিত
                    </span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-[11px] text-amber-400/90 flex items-center gap-1">
                    <span>⚠️ অনুগ্রহ করে উপরে সেনা নং বা নাম লিখে সৈনিক নির্বাচন করুন</span>
                  </div>
                )}

                {/* Collapsible Full Roster Select Fallback */}
                <div className="mt-2">
                  <details className="text-[11px] text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-300 transition-colors select-none">
                      বা ড্রপডাউন তালিকা থেকে বেছে নিন ({personnelList.length} জন)
                    </summary>
                    <div className="mt-1.5">
                      <select
                        value={formSoldierSnk}
                        onChange={(e) => setFormSoldierSnk(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {personnelList.map((p) => (
                          <option key={p.id} value={p.snkNo}>
                            {p.snkNo} — {p.rk} {p.name} ({p.battery})
                          </option>
                        ))}
                      </select>
                    </div>
                  </details>
                </div>
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

      {/* 4. Course Edit & Creation Modal */}
      {isCourseEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  {isCreatingNewCourse ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isCreatingNewCourse ? 'নতুন কোর্স / ক্যাডার যুক্ত করুন' : 'কোর্সের নাম ও বিবরণ পরিবর্তন করুন'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isCreatingNewCourse
                      ? 'রেজিমেন্টে নতুন কোর্স তৈরি করুন'
                      : 'কোর্সের নাম পরিবর্তন করলে সম্পন্ন করা সকল সৈনিকের ডাটাতেও স্বয়ংক্রিয়ভাবে আপডেট হবে'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCourseEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourseDefinition} className="space-y-3 text-xs">
              {/* Course Name (English / Main Title) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  কোর্সের পুরো নাম (Course Full Name) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={courseEditForm.name}
                  onChange={(e) => setCourseEditForm({ ...courseEditForm, name: e.target.value })}
                  placeholder="e.g. Basic Gunner Cadre (BGC)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              {/* Bengali Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  বাংলা নাম (Course Bengali Title)
                </label>
                <input
                  type="text"
                  value={courseEditForm.bengaliName}
                  onChange={(e) => setCourseEditForm({ ...courseEditForm, bengaliName: e.target.value })}
                  placeholder="e.g. বেসিক গানার ক্যাডার"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Short Code & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Short Code */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    সংক্ষিপ্ত কোড (Short Code)
                  </label>
                  <input
                    type="text"
                    value={courseEditForm.shortCode}
                    onChange={(e) => setCourseEditForm({ ...courseEditForm, shortCode: e.target.value })}
                    placeholder="e.g. BGC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ক্যাটাগরি (Category)
                  </label>
                  <select
                    value={courseEditForm.category}
                    onChange={(e) =>
                      setCourseEditForm({
                        ...courseEditForm,
                        category: e.target.value as CourseDefinition['category'],
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Artillery Specialist">Artillery Specialist (আর্টিলারি)</option>
                    <option value="Combat & Physical">Combat & Physical (কমব্যাট/শারীরিক)</option>
                    <option value="Technical & Support">Technical & Support (কারিগরি)</option>
                    <option value="Leadership">Leadership (নেতৃত্ব/প্রশাসন)</option>
                  </select>
                </div>
              </div>

              {/* Duration & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Duration */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    মেয়াদ (Duration)
                  </label>
                  <input
                    type="text"
                    value={courseEditForm.defaultDuration}
                    onChange={(e) => setCourseEditForm({ ...courseEditForm, defaultDuration: e.target.value })}
                    placeholder="e.g. 4 Weeks / 6 Weeks"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Default Location */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ডিফল্ট স্থান / প্রতিষ্ঠান (Location)
                  </label>
                  <input
                    type="text"
                    value={courseEditForm.defaultLocation}
                    onChange={(e) => setCourseEditForm({ ...courseEditForm, defaultLocation: e.target.value })}
                    placeholder="e.g. Artillery Centre & School (AC&S)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {!isCreatingNewCourse ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(courseEditForm.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>কোর্স মুছুন</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCourseEditModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-sm transition-colors inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isCreatingNewCourse ? 'কোর্স তৈরি করুন' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
