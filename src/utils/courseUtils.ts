import { Personnel } from '../types';

export interface MilitaryCourseDetails {
  courseName: string;
  place: string;
  durationWeek: string;
  startDate: string;
  endDate: string;
}

/**
 * Intelligent military course info parser for 10 Med Regt Arty.
 * Extracts clean, direct English course names (no "Course:" prefix, no location),
 * places the venue into the next column (place only), and extracts duration and dates.
 */
export function parseMilitaryCourseInfo(p: Personnel): MilitaryCourseDetails {
  const fullText = [
    p.courseName,
    p.statusDetails,
    p.outOfUnitRemarks,
    p.outOfUnitLocation,
    p.location,
  ]
    .filter(Boolean)
    .join(' ');

  const lower = fullText.toLowerCase();

  let courseName = '';
  let place = '';
  let durationWeek = p.courseDuration || (p.durationDays ? `${Math.ceil(p.durationDays / 7)} Weeks` : '8 Weeks');
  let startDate = p.courseFrom || p.outOfUnitStartDate || p.startDate || '';
  let endDate = p.courseTo || p.outOfUnitEndDate || p.endDate || '';

  // 1. Identify specific Course Name (Strictly English Only, no "Course:" prefix, no location in name)
  if (lower.includes('পিসিএটি') || lower.includes('pcat')) {
    courseName = 'PCAT-13 Course';
    place = 'AC&S, Halishahar';
    durationWeek = '10 Weeks';
    startDate = startDate || '2026-01-10';
    endDate = endDate || '2026-03-25';
  } else if (lower.includes('ওবিসি') || lower.includes('obc')) {
    courseName = 'OBC Field-43 (Officers Basic Course)';
    place = 'AC&S, Halishahar';
    durationWeek = '16 Weeks';
    startDate = startDate || '2026-01-15';
    endDate = endDate || '2026-05-15';
  } else if (lower.includes('জেসিএসসি') || lower.includes('jcsc')) {
    courseName = 'JCSC-79 (Junior Command & Staff Course)';
    place = 'SI&T, Jalalabad';
    durationWeek = '12 Weeks';
    startDate = startDate || '2026-01-12';
    endDate = endDate || '2026-04-12';
  } else if (lower.includes('স্টাফ কোর্স') || lower.includes('staff course') || lower.includes('psc')) {
    courseName = 'Staff Course-51 (PSC)';
    place = 'DSCSC, Mirpur';
    durationWeek = '46 Weeks';
    startDate = startDate || '2026-01-05';
    endDate = endDate || '2026-11-30';
  } else if (lower.includes('পিসি কোর্স') || lower.includes('pre-commission') || lower.includes('pc course')) {
    courseName = 'Pre-Commission Course (PC)';
    place = 'Adhoc 47 Mortar Regt Arty';
    durationWeek = '8 Weeks';
    startDate = startDate || '2026-07-26';
    endDate = endDate || '2026-09-17';
  } else if (lower.includes('এনসিও') || lower.includes('nco')) {
    courseName = 'NCO Leadership Course';
    place = 'NCO Academy, Bogra';
    durationWeek = '8 Weeks';
    startDate = startDate || '2026-01-20';
    endDate = endDate || '2026-03-20';
  } else if (lower.includes('ডিএমটি') || lower.includes('dmt')) {
    courseName = 'Basic Technical Training (DMT)';
    place = '15 Field Regt Arty';
    durationWeek = '9 Weeks';
    startDate = startDate || '2026-07-26';
    endDate = endDate || '2026-10-01';
  } else if (lower.includes('জেএনজিএসসি') || lower.includes('jngsc')) {
    courseName = 'JNGSC (Junior Non-Commissioned Gunnery Staff Course)';
    place = 'AC&S, Halishahar';
    durationWeek = '12 Weeks';
    startDate = startDate || '2026-02-01';
    endDate = endDate || '2026-04-30';
  } else if (lower.includes('ক্লার্ক') || lower.includes('clerk')) {
    courseName = 'Basic Technical Training - Clerk (BTT)';
    place = 'AECS (Army Education Corps School)';
    durationWeek = '8 Weeks';
    startDate = startDate || '2026-01-15';
    endDate = endDate || '2026-03-15';
  } else if (lower.includes('লাইফ সেভার') || lower.includes('cls') || lower.includes('combat life')) {
    courseName = 'Combat Life Saver (CLS) Cadre';
    place = '101 Field Ambulance';
    durationWeek = '8 Weeks';
    startDate = startDate || '2026-07-26';
    endDate = endDate || '2026-09-17';
  } else if (lower.includes('young officer') || lower.includes('yo ') || lower.includes('gsc')) {
    courseName = 'Young Officers Gunnery Course (YOGC)';
    place = 'AC&S, Halishahar';
    durationWeek = '12 Weeks';
    startDate = startDate || '2026-01-10';
    endDate = endDate || '2026-04-05';
  } else if (lower.includes('gun layer') || lower.includes('glc')) {
    courseName = 'Gun Layer Cadre (GLC)';
    place = 'AC&S, Halishahar';
    durationWeek = '4 Weeks';
    startDate = startDate || '2026-02-01';
    endDate = endDate || '2026-03-01';
  } else if (lower.includes('junior leader') || lower.includes('jlc')) {
    courseName = 'Junior Leader Course (JLC)';
    place = 'SI&T, Jalalabad';
    durationWeek = '6 Weeks';
    startDate = startDate || '2026-01-15';
    endDate = endDate || '2026-02-28';
  } else if (lower.includes('survey') || lower.includes('ta cadre') || lower.includes('ta survey')) {
    courseName = 'Technical Assistant (TA) Survey Cadre';
    place = 'AC&S, Halishahar';
    durationWeek = '8 Weeks';
    startDate = startDate || '2026-01-10';
    endDate = endDate || '2026-03-08';
  } else if (lower.includes('driving & maintenance') || lower.includes('smt')) {
    courseName = 'Small Arms & Gunnery SMT Cadre';
    place = '10 Med Workshop';
    durationWeek = '6 Weeks';
    startDate = startDate || '2026-01-15';
    endDate = endDate || '2026-02-28';
  } else if (lower.includes('master gunner')) {
    courseName = 'Master Gunner Layer Cadre';
    place = 'AC&S, Halishahar';
    durationWeek = '4 Weeks';
    startDate = startDate || '2026-01-20';
    endDate = endDate || '2026-02-20';
  } else {
    // Clean string fallback: strip any "Course:" / "কোর্স:" prefix and remove parenthesis
    let raw = (p.courseName || p.statusDetails || '').trim();
    raw = raw.replace(/^(course|কোর্স)\s*[:\-–—]\s*/i, '').trim();
    raw = raw.replace(/\(.*?\)/g, '').trim();
    courseName = raw || 'Basic Gunner Cadre (BGC)';
    place = 'AC&S, Halishahar';
  }

  // 2. Location refinement if location is specifically mentioned
  if (
    lower.includes('আর্টিলারি সেন্টার') ||
    lower.includes('halishahar') ||
    lower.includes('হালিশহর') ||
    lower.includes('ac&s')
  ) {
    place = 'AC&S, Halishahar';
  } else if (lower.includes('১৫ ফিল্ড') || lower.includes('15 field')) {
    place = '15 Field Regt Arty';
  } else if (lower.includes('৪৭ মর্টার') || lower.includes('47 mortar')) {
    place = 'Adhoc 47 Mortar Regt Arty';
  } else if (lower.includes('এনসিও একাডেমি') || lower.includes('nco academy')) {
    place = 'NCO Academy, Bogra';
  } else if (lower.includes('১০১ ফিল্ড') || lower.includes('101 field')) {
    place = '101 Field Ambulance';
  } else if (lower.includes('এশিয়া স্কুল') || lower.includes('aecs')) {
    place = 'AECS (Army Education Corps School)';
  } else if (lower.includes('জালালাবাদ') || lower.includes('jalalabad') || lower.includes('si&t')) {
    place = 'SI&T, Jalalabad';
  } else if (lower.includes('মিরপুর') || lower.includes('mirpur') || lower.includes('dscsc')) {
    place = 'DSCSC, Mirpur';
  }

  // 3. Fallback dates if empty
  if (!startDate) startDate = '2026-01-15';
  if (!endDate) endDate = '2026-03-15';

  return {
    courseName,
    place,
    durationWeek,
    startDate,
    endDate,
  };
}
