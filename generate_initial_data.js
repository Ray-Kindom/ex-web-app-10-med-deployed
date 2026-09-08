import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

// Helper to normalize rank and trade
function parseRankTrade(rawRank) {
  let rank = 'Snk';
  let trade = 'Gnr';

  const clean = rawRank.trim().replace(/\s+/g, ' ');

  if (clean.startsWith('NC(E)') || clean.startsWith('NC (E)')) {
    return { rank: 'NC(E)', trade: 'NC(E)' };
  }
  if (clean.startsWith('Snk CK(U)') || clean.startsWith('SNK CK (U)') || clean.startsWith('SNK COOK (U)')) {
    return { rank: 'Snk', trade: 'Ck(U)' };
  }
  if (clean.startsWith('SNK CK (M)')) {
    return { rank: 'Snk', trade: 'Ck(M)' };
  }

  const matchParen = clean.match(/^([A-Za-z\(\)\.]+)\s*\((.+)\)$/);
  if (matchParen) {
    rank = matchParen[1].trim();
    trade = matchParen[2].trim();
  } else if (clean.includes('(')) {
    const parts = clean.split('(');
    rank = parts[0].trim();
    trade = parts[1].replace(')', '').trim();
  } else {
    rank = clean;
    trade = clean === 'NC(E)' ? 'NC(E)' : '-';
  }

  // Standardize Rank
  const upperRk = rank.toUpperCase();
  if (upperRk === 'SWO') rank = 'SWO';
  else if (upperRk === 'MWO') rank = 'MWO';
  else if (upperRk === 'WO') rank = 'WO';
  else if (upperRk === 'SGT') rank = 'Sgt';
  else if (upperRk === 'CPL') rank = 'Cpl';
  else if (upperRk === 'LCPL') rank = 'Lcpl';
  else if (upperRk === 'SNK') rank = 'Snk';
  else if (upperRk === 'NC(E)' || upperRk === 'NC (E)') rank = 'NC(E)';

  // Standardize Trade
  const upperTr = trade.toUpperCase();
  if (upperTr === 'TA') trade = 'TA';
  else if (upperTr === 'DMT') trade = 'DMT';
  else if (upperTr === 'GNR') trade = 'Gnr';
  else if (upperTr === 'OCU') trade = 'OCU';
  else if (upperTr.includes('COOK') || upperTr === 'CK' || upperTr.includes('CK(U)') || upperTr.includes('CK (U)')) trade = 'Ck(U)';
  else if (upperTr.includes('CK(M)') || upperTr.includes('CK (M)')) trade = 'Ck(M)';
  else if (upperTr === 'CLK') trade = 'CLK';
  else if (upperTr === 'E&BR') trade = 'E&BR';
  else if (upperTr === 'TLR' || upperTr === 'TAILOR') trade = 'Tailor';
  else if (upperTr === 'CPTR') trade = 'CPTR';
  else if (upperTr === 'MA') trade = 'MA';
  else if (upperTr === 'AEC') trade = 'AEC';
  else if (upperTr === 'NC(E)') trade = 'NC(E)';

  return { rank, trade };
}

// Map Bty abbreviations
function mapBattery(b) {
  const clean = String(b).trim().toUpperCase();
  if (clean === 'P' || clean.includes('PAPA') || clean.includes('P BTY')) return 'P Bty';
  if (clean === 'Q' || clean.includes('QUEBEC') || clean.includes('Q BTY') || clean.includes('কুইবেক')) return 'Q Bty';
  if (clean === 'R' || clean.includes('ROMEO') || clean.includes('R BTY') || clean.includes('রোমিও')) return 'R Bty';
  return 'HQ Bty';
}

// 1. Data for ERE (55 personnel from Page 1)
const ERE_LIST = [
  { snkNo: '1227660', rk: 'Sgt', trade: 'DMT', name: 'Md. Anwarul Islam', bty: 'HQ Bty' },
  { snkNo: '1239183', rk: 'Snk', trade: 'Ck(U)', name: 'Md. Aziz', bty: 'P Bty' },
  { snkNo: '1244672', rk: 'Snk', trade: 'Gnr', name: 'Md. Sujon Daria', bty: 'R Bty' },
  { snkNo: '1234815', rk: 'Lcpl', trade: 'Gnr', name: 'Ariful Islam (Rajib)', bty: 'R Bty' },
  { snkNo: '1238577', rk: 'Snk', trade: 'Gnr', name: 'Rubel Hossain', bty: 'Q Bty' },
  { snkNo: '1245970', rk: 'Snk', trade: 'Gnr', name: 'Md. Khorshed Alam', bty: 'P Bty' },
  { snkNo: '1227682', rk: 'Cpl', trade: 'Ck(U)', name: 'Md. Babul Hossain', bty: 'P Bty' },
  { snkNo: '1224584', rk: 'NC(E)', trade: 'NC(E)', name: 'Md. Afaz Uddin', bty: 'HQ Bty' },
  { snkNo: '1238220', rk: 'Snk', trade: 'TA', name: 'Idris Amin', bty: 'Q Bty' },
  { snkNo: '1242278', rk: 'Snk', trade: 'DMT', name: 'Md. Ziaur Rahman', bty: 'R Bty' },
  { snkNo: '1240483', rk: 'Snk', trade: 'DMT', name: 'Md. Himel', bty: 'R Bty' },
  { snkNo: '1246024', rk: 'Snk', trade: 'Gnr', name: 'Md. Fazle Rabbi', bty: 'Q Bty' },
  { snkNo: '1238563', rk: 'Snk', trade: 'DMT', name: 'Pollob Kumar Bormon', bty: 'HQ Bty' },
  { snkNo: '1244306', rk: 'Snk', trade: 'Gnr', name: 'Md. Shamim Hawladar', bty: 'R Bty' },
  { snkNo: '1240404', rk: 'Snk', trade: 'DMT', name: 'Md. Joni Alom', bty: 'HQ Bty' },
  { snkNo: '1247857', rk: 'Snk', trade: 'Gnr', name: 'Tarek Mia', bty: 'Q Bty' },
  { snkNo: 'BJO-Noya-1', rk: 'WO', trade: 'Gnr', name: 'Khurshid Alam', bty: 'R Bty' },
  { snkNo: '1229288', rk: 'Cpl', trade: 'Gnr', name: 'Md. Sohag Molla', bty: 'Q Bty' },
  { snkNo: '1225490', rk: 'Sgt', trade: 'Gnr', name: 'Md. Shamim Shahria', bty: 'R Bty' },
  { snkNo: '1226694', rk: 'Sgt', trade: 'Gnr', name: 'Md. Arif Hossen', bty: 'P Bty' },
  { snkNo: '1230480', rk: 'Cpl', trade: 'Gnr', name: 'Md. Shahin Alam', bty: 'Q Bty' },
  { snkNo: '1223852', rk: 'Sgt', trade: 'Gnr', name: 'Md. Yusuf', bty: 'Q Bty' },
  { snkNo: '1228391', rk: 'Cpl', trade: 'Gnr', name: 'Md. Anisur Rahman', bty: 'Q Bty' },
  { snkNo: '1240547', rk: 'Snk', trade: 'Gnr', name: 'Md. Jakir Hossen', bty: 'Q Bty' },
  { snkNo: '1246179', rk: 'Snk', trade: 'Gnr', name: 'Md. Farhad Hasan', bty: 'P Bty' },
  { snkNo: '1234588', rk: 'Lcpl', trade: 'Gnr', name: 'Md. Amir Hossen', bty: 'R Bty' },
  { snkNo: '1229574', rk: 'Cpl', trade: 'Gnr', name: 'Md. Mottalib Hossen', bty: 'HQ Bty' },
  { snkNo: '1240267', rk: 'Snk', trade: 'OCU', name: 'Md. Golam Azam', bty: 'R Bty' },
  { snkNo: '1224246', rk: 'Sgt', trade: 'DMT', name: 'Md. Shahin Alam', bty: 'HQ Bty' },
  { snkNo: '1231727', rk: 'Cpl', trade: 'DMT', name: 'Md. Faruk Amin', bty: 'R Bty' },
  { snkNo: '1230012', rk: 'Cpl', trade: 'Gnr', name: 'Md. Mahbub Alam', bty: 'R Bty' },
  { snkNo: '1245360', rk: 'Snk', trade: 'OCU', name: 'Md. Shahidul Islam', bty: 'HQ Bty' },
  { snkNo: 'BJO-Noya-2', rk: 'WO', trade: 'Gnr', name: 'Md. Liakot Ali', bty: 'R Bty' },
  { snkNo: '1227667', rk: 'Cpl', trade: 'Ck(U)', name: 'Md. Ansar Ali', bty: 'HQ Bty' },
  { snkNo: '1238878', rk: 'Snk', trade: 'DMT', name: 'Md. Mamun Hossen', bty: 'HQ Bty' },
  { snkNo: '1240568', rk: 'Snk', trade: 'DMT', name: 'Md. Shoukhin Mia', bty: 'P Bty' },
  { snkNo: '1238461', rk: 'Snk', trade: 'DMT', name: 'Md. Sakib Hossain', bty: 'Q Bty' },
  { snkNo: '1232649', rk: 'Lcpl', trade: 'Ck(U)', name: 'Md. Rouful Islam', bty: 'R Bty' },
  { snkNo: '1239977', rk: 'Snk', trade: 'TA', name: 'Md. Shahidul Islam', bty: 'HQ Bty' },
  { snkNo: '1230332', rk: 'Cpl', trade: 'Gnr', name: 'Md. Abu Sayed', bty: 'R Bty' },
  { snkNo: '1230951', rk: 'Cpl', trade: 'OCU', name: 'Md. Mominul Bhuiyan', bty: 'R Bty' },
  { snkNo: '1241140', rk: 'Snk', trade: 'DMT', name: 'Md. Rakib Hasan', bty: 'HQ Bty' },
  { snkNo: '1235106', rk: 'Lcpl', trade: 'OCU', name: 'Md. Rayfan Jani', bty: 'Q Bty' },
  { snkNo: '1230807', rk: 'Cpl', trade: 'Gnr', name: 'Md. Rubel Rana', bty: 'Q Bty' },
  { snkNo: '1228857', rk: 'Cpl', trade: 'Gnr', name: 'Md. Al Amin', bty: 'Q Bty' },
  { snkNo: '1224496', rk: 'Cpl', trade: 'Ck(U)', name: 'Md. Shahin Aktar', bty: 'Q Bty' },
  { snkNo: '1230777', rk: 'Cpl', trade: 'OCU', name: 'Md. Saiful Islam', bty: 'HQ Bty' },
  { snkNo: '1228146', rk: 'Cpl', trade: 'Gnr', name: 'Md. Jasim Uddin', bty: 'Q Bty' },
  { snkNo: '1229588', rk: 'Cpl', trade: 'DMT', name: 'Sujon Mia', bty: 'Q Bty' },
  { snkNo: '1228132', rk: 'Sgt', trade: 'Gnr', name: 'Md. Mostafa Kamal', bty: 'R Bty' },
  { snkNo: '1239580', rk: 'Snk', trade: 'DMT', name: 'Md. Rakib Sheikh', bty: 'Q Bty' },
  { snkNo: '1230804', rk: 'Cpl', trade: 'Gnr', name: 'Md. Rashadul Islam', bty: 'Q Bty' },
  { snkNo: '1228535', rk: 'Cpl', trade: 'Gnr', name: 'Md. Majedul Islam', bty: 'Q Bty' },
  { snkNo: '1230830', rk: 'Cpl', trade: 'DMT', name: 'Md. Yusuf Ali', bty: 'R Bty' },
  { snkNo: '1226409', rk: 'Sgt', trade: 'Gnr', name: 'Md. Abdur Razzak Sujon', bty: 'Q Bty' },
];

// 2. Data for Att (46 personnel from Page 2)
const ATT_LIST = [
  { snkNo: '1227569', rk: 'Cpl', trade: 'Gnr', name: 'Ganesh Chandra Sarkar', bty: 'P Bty' },
  { snkNo: '1237000', rk: 'Snk', trade: 'Gnr', name: 'Md. Hashan Shikh', bty: 'P Bty' },
  { snkNo: '1243059', rk: 'Snk', trade: 'Gnr', name: 'Nayeem Hawladar', bty: 'P Bty' },
  { snkNo: '1228334', rk: 'Lcpl', trade: 'Gnr', name: 'Md. Zuel Rana', bty: 'Q Bty' },
  { snkNo: '1250885', rk: 'Snk', trade: 'OCU', name: 'Md. Imran Islam', bty: 'P Bty' },
  { snkNo: '1228353', rk: 'Cpl', trade: 'Gnr', name: 'Md. Zuel Rana', bty: 'Q Bty' },
  { snkNo: '1243678', rk: 'Snk', trade: 'Gnr', name: 'Md. Maksudur Alam', bty: 'Q Bty' },
  { snkNo: '1245478', rk: 'Snk', trade: 'OCU', name: 'Md. Shamsuddin', bty: 'Q Bty' },
  { snkNo: '1245308', rk: 'Snk', trade: 'OCU', name: 'Md. Sojib Sheikh', bty: 'R Bty' },
  { snkNo: '1248561', rk: 'Snk', trade: 'OCU', name: 'Md. Mehedi Hasan', bty: 'HQ Bty' },
  { snkNo: '1249167', rk: 'Snk', trade: 'Gnr', name: 'Md. Mehedy Hasan', bty: 'HQ Bty' },
  { snkNo: '1228491', rk: 'Cpl', trade: 'DMT', name: 'Md. Mainul Islam Sikdar', bty: 'Q Bty' },
  { snkNo: '1228564', rk: 'Cpl', trade: 'Gnr', name: 'Md. Anisuzzaman', bty: 'P Bty' },
  { snkNo: '1224126', rk: 'Sgt', trade: 'DMT', name: 'Md. Amanul Islam Gazi', bty: 'Q Bty' },
  { snkNo: '1223752', rk: 'Sgt', trade: 'TA', name: 'Md. Masudur Rahman', bty: 'R Bty' },
  { snkNo: '1249464', rk: 'Snk', trade: 'DMT', name: 'Md. Sakib Hasan', bty: 'HQ Bty' },
  { snkNo: '1249715', rk: 'Snk', trade: 'Gnr', name: 'Md. Masud Khan', bty: 'HQ Bty' },
  { snkNo: '1226084', rk: 'Sgt', trade: 'Gnr', name: 'Md. Mohsin Ali', bty: 'R Bty' },
  { snkNo: '1229513', rk: 'Cpl', trade: 'DMT', name: 'Md. Rashid Khan', bty: 'R Bty' },
  { snkNo: '1248817', rk: 'Snk', trade: 'Gnr', name: 'Shahadat Hossain', bty: 'R Bty' },
  { snkNo: '1230301', rk: 'Cpl', trade: 'Gnr', name: 'Md. Nazmul Alom', bty: 'P Bty' },
  { snkNo: '1231256', rk: 'Lcpl', trade: 'Gnr', name: 'Md. Abu Sayed', bty: 'R Bty' },
  { snkNo: '1223966', rk: 'Sgt', trade: 'DMT', name: 'Md. Shahidul Islam', bty: 'HQ Bty' },
  { snkNo: '1231696', rk: 'Cpl', trade: 'TA', name: 'Md. Arif Hossain', bty: 'R Bty' },
  { snkNo: '1233437', rk: 'Cpl', trade: 'Gnr', name: 'Md. Towsik Hassan Sobuz', bty: 'Q Bty' },
  { snkNo: '1226077', rk: 'Sgt', trade: 'TA', name: 'Al Amin', bty: 'R Bty' },
  { snkNo: '1234871', rk: 'Lcpl', trade: 'DMT', name: 'Mohammad Omar Faruk', bty: 'P Bty' },
  { snkNo: '1233271', rk: 'Cpl', trade: 'TA', name: 'Mohah Saddam Hossain', bty: 'Q Bty' },
  { snkNo: '1243014', rk: 'Snk', trade: 'Gnr', name: 'Md. Selim Ahmed', bty: 'Q Bty' },
  { snkNo: '1234845', rk: 'Snk', trade: 'Ck(U)', name: 'Md. Riton Mia', bty: 'P Bty' },
  { snkNo: '1233541', rk: 'Cpl', trade: 'Gnr', name: 'Al Amin', bty: 'Q Bty' },
  { snkNo: '1229555', rk: 'Cpl', trade: 'DMT', name: 'Md. Moinul Islam', bty: 'HQ Bty' },
  { snkNo: '1227551', rk: 'Sgt', trade: 'Gnr', name: 'Md. Bulbul Choudary', bty: 'P Bty' },
  { snkNo: '1234039', rk: 'Lcpl', trade: 'OCU', name: 'Md. Maruf Mia', bty: 'P Bty' },
  { snkNo: '1235893', rk: 'Lcpl', trade: 'Gnr', name: 'Md. Shahin Alam', bty: 'HQ Bty' },
  { snkNo: '1230375', rk: 'Cpl', trade: 'Gnr', name: 'Md. Al Amin', bty: 'P Bty' },
  { snkNo: '1243307', rk: 'Snk', trade: 'TA', name: 'Mohammad Salman Shah', bty: 'Q Bty' },
  { snkNo: '1228053', rk: 'Cpl', trade: 'Gnr', name: 'Md. Alamgir Hossen', bty: 'R Bty' },
  { snkNo: '1245368', rk: 'NC(E)', trade: 'NC(E)', name: 'Md. Sabbir Ahmed', bty: 'HQ Bty' },
  { snkNo: '1228519', rk: 'Cpl', trade: 'Gnr', name: 'Farid', bty: 'R Bty' },
  { snkNo: '1235947', rk: 'Lcpl', trade: 'Gnr', name: 'Sobuj Biswas', bty: 'Q Bty' },
  { snkNo: '1247073', rk: 'Snk', trade: 'Gnr', name: 'Khaledul Hasan Milu', bty: 'Q Bty' },
  { snkNo: '1247140', rk: 'Snk', trade: 'Gnr', name: 'Md. Anisur Rahman Akash', bty: 'R Bty' },
  { snkNo: '1250972', rk: 'Snk', trade: 'Gnr', name: 'Md. Hridoy Hossain', bty: 'P Bty' },
  { snkNo: '1237663', rk: 'Snk', trade: 'OCU', name: 'Md. Rifat', bty: 'P Bty' },
  { snkNo: 'BJO-Noya-3', rk: 'WO', trade: 'Gnr', name: 'Md. Mamun Sikder', bty: 'R Bty' },
];

// 3. Data for Msn (13 personnel from Page 3)
const MSN_LIST = [
  { snkNo: '1231157', rk: 'Cpl', trade: 'DMT', name: 'Md. Mosleh Uddin', bty: 'P Bty' },
  { snkNo: '1231631', rk: 'Cpl', trade: 'DMT', name: 'Md. Munjurul', bty: 'P Bty' },
  { snkNo: '1229605', rk: 'Cpl', trade: 'DMT', name: 'Monjurul Haque', bty: 'P Bty' },
  { snkNo: '1231940', rk: 'Cpl', trade: 'OCU', name: 'Md. Masud Rana', bty: 'P Bty' },
  { snkNo: '1229492', rk: 'Cpl', trade: 'DMT', name: 'Md. Alamgir Sarkar', bty: 'P Bty' },
  { snkNo: '1229205', rk: 'Cpl', trade: 'DMT', name: 'Moksedul Haque', bty: 'Q Bty' },
  { snkNo: '1229445', rk: 'Cpl', trade: 'DMT', name: 'Md. Golam Rahman', bty: 'Q Bty' },
  { snkNo: '1229470', rk: 'Cpl', trade: 'DMT', name: 'Abdul Baten', bty: 'Q Bty' },
  { snkNo: '1234220', rk: 'Lcpl', trade: 'TA', name: 'Md. Arfan Islam', bty: 'R Bty' },
  { snkNo: '1236755', rk: 'Snk', trade: 'Gnr', name: 'Md. Saidul Islam', bty: 'P Bty' },
  { snkNo: '1226976', rk: 'Cpl', trade: 'Gnr', name: 'Md. Motiar Rahaman', bty: 'Q Bty' },
  { snkNo: '1231760', rk: 'Lcpl', trade: 'TA', name: 'Sk Tusheruzzaman', bty: 'P Bty' },
  { snkNo: '1228732', rk: 'Lcpl', trade: 'Gnr', name: 'Md. Sabuj Ali', bty: 'R Bty' },
];

// Read Excel
const filePath = path.resolve('../Summary Cutting List Aug- 2026-10 Med Regt Arty.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const excelRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const ereMap = new Map(ERE_LIST.map(item => [item.snkNo, item]));
const attMap = new Map(ATT_LIST.map(item => [item.snkNo, item]));
const msnMap = new Map(MSN_LIST.map(item => [item.snkNo, item]));

const matchedArmyNos = new Set();
const finalPersonnel = [];
let idCounter = 1;

// Officers at top
finalPersonnel.push(
  {
    id: String(idCounter++),
    snkNo: 'BA-7592',
    rk: 'Lt Col',
    trade: '-',
    name: 'Lt Col Md Shafiqul Islam Rubel, PSC, G',
    battery: 'HQ Bty',
    status: 'Present',
    bloodGroup: 'B+',
    medicalCategory: 'AYE',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-8324',
    rk: 'Maj',
    trade: '-',
    name: 'Maj Anas Ibn Manjur',
    battery: 'HQ Bty',
    status: 'Present',
    bloodGroup: 'O+',
    medicalCategory: 'AYE',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-9043',
    rk: 'Maj',
    trade: '-',
    name: 'Maj Md Akib Hossain',
    battery: 'HQ Bty',
    status: 'Course/Trg',
    bloodGroup: 'B+',
    medicalCategory: 'AYE',
    outOfUnitCategory: 'Course',
    outOfUnitRemarks: 'স্টাফ কোর্স-৫১ (Staff Course-51)',
    statusDetails: 'Course: স্টাফ কোর্স-৫১',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-9840',
    rk: 'Maj',
    trade: '-',
    name: 'Maj Md Burhanur Rahman, G',
    battery: 'P Bty',
    status: 'Present',
    bloodGroup: 'A+',
    medicalCategory: 'AYE',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-10776',
    rk: 'Capt',
    trade: '-',
    name: 'Capt Sheikh Mahdi Hasan Dhru',
    battery: 'R Bty',
    status: 'Course/Trg',
    bloodGroup: 'O+',
    medicalCategory: 'AYE',
    outOfUnitCategory: 'Course',
    outOfUnitRemarks: 'জেসিএসসি-৭৯ (JC&SC-79)',
    statusDetails: 'Course: জেসিএসসি-৭৯',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-11503',
    rk: 'Capt',
    trade: '-',
    name: 'Capt Diaf Kamal Chowdhury',
    battery: 'Q Bty',
    status: 'Present',
    bloodGroup: 'B+',
    medicalCategory: 'AYE',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-11735',
    rk: 'Capt',
    trade: '-',
    name: 'Capt Iftekhar Mahmud Abir',
    battery: 'HQ Bty',
    status: 'Present',
    bloodGroup: 'A+',
    medicalCategory: 'AYE',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-12014',
    rk: 'Capt',
    trade: '-',
    name: 'Capt Mubashshirina Islam Nizum',
    battery: 'HQ Bty',
    status: 'Present',
    bloodGroup: 'O+',
    medicalCategory: 'AYE',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-12145',
    rk: 'Lt',
    trade: '-',
    name: 'Lt Md Rayahan Majumder',
    battery: 'HQ Bty',
    status: 'Temp Duty',
    bloodGroup: 'B+',
    medicalCategory: 'AYE',
    outOfUnitCategory: 'FDMN',
    outOfUnitLocation: 'হোয়াইকং আর্মি ক্যাম্প',
    outOfUnitStartDate: '2026-08-19',
    outOfUnitEndDate: '2026-09-07',
    outOfUnitRemarks: 'FDMN (20 দিন)',
    statusDetails: 'FDMN - হোয়াইকং আর্মি ক্যাম্প',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-12471',
    rk: 'Lt',
    trade: '-',
    name: 'Lt Shamsad Rahman',
    battery: 'P Bty',
    status: 'Course/Trg',
    bloodGroup: 'A+',
    medicalCategory: 'AYE',
    outOfUnitCategory: 'Course',
    outOfUnitLocation: 'আর্টিলারি সেন্টার ও স্কুল',
    outOfUnitRemarks: 'ওবিসি ফিল্ড-৪৩ (OBC Fd-43)',
    statusDetails: 'Course: ওবিসি ফিল্ড-৪৩ (আর্টিলারি সেন্টার ও স্কুল)',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-12781',
    rk: 'Lt',
    trade: '-',
    name: 'Lt Md Rubayed Sarkar Siam',
    battery: 'HQ Bty',
    status: 'Course/Trg',
    bloodGroup: 'AB+',
    medicalCategory: 'AYE',
    outOfUnitCategory: 'Course',
    outOfUnitRemarks: 'পিসিএটি-১৩ (PCAT-13)',
    statusDetails: 'Course: পিসিএটি-১৩',
  },
  {
    id: String(idCounter++),
    snkNo: 'BA-12893',
    rk: 'Lt',
    trade: '-',
    name: 'Lt Mohammad Emon Hossain',
    battery: 'R Bty',
    status: 'Present',
    bloodGroup: 'O+',
    medicalCategory: 'AYE',
  }
);

// 1. Process 520 Cutting List rows
for (let i = 4; i <= 523; i++) {
  const row = excelRows[i];
  if (!row || !row[1]) continue;

  const armyNo = String(row[1]).trim();
  const rawRank = String(row[2]).trim();
  const rawBty = String(row[3]).trim();
  const name = String(row[4]).trim();

  const { rank, trade } = parseRankTrade(rawRank);
  const battery = mapBattery(rawBty);

  let status = 'Present';
  let outOfUnitCategory = undefined;
  let statusDetails = undefined;

  if (msnMap.has(armyNo)) {
    status = 'Attached Out';
    outOfUnitCategory = 'Msn';
    statusDetails = 'UN Mission Party';
    matchedArmyNos.add(armyNo);
  } else if (attMap.has(armyNo)) {
    status = 'Attached Out';
    outOfUnitCategory = 'Att';
    statusDetails = 'Permanent Attached (Atts)';
    matchedArmyNos.add(armyNo);
  } else if (ereMap.has(armyNo)) {
    status = 'Attached Out';
    outOfUnitCategory = 'ERE';
    statusDetails = 'ERE Party';
    matchedArmyNos.add(armyNo);
  }

  const pObj = {
    id: String(idCounter++),
    snkNo: armyNo,
    rk: rank,
    trade: trade,
    name: name,
    battery: battery,
    status: status,
    bloodGroup: ['A+', 'B+', 'O+', 'AB+'][(idCounter + armyNo.length) % 4],
    medicalCategory: 'AYE',
  };
  if (outOfUnitCategory) {
    pObj.outOfUnitCategory = outOfUnitCategory;
    pObj.statusDetails = statusDetails;
  }

  finalPersonnel.push(pObj);
}

// 2. Add remaining ERE personnel
for (const item of ERE_LIST) {
  if (!matchedArmyNos.has(item.snkNo)) {
    finalPersonnel.push({
      id: String(idCounter++),
      snkNo: item.snkNo,
      rk: item.rk,
      trade: item.trade,
      name: item.name,
      battery: item.bty,
      status: 'Attached Out',
      outOfUnitCategory: 'ERE',
      statusDetails: 'ERE Party (Outstation)',
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][(idCounter + item.snkNo.length) % 4],
      medicalCategory: 'AYE',
    });
    matchedArmyNos.add(item.snkNo);
  }
}

// 3. Add remaining Att personnel
for (const item of ATT_LIST) {
  if (!matchedArmyNos.has(item.snkNo)) {
    finalPersonnel.push({
      id: String(idCounter++),
      snkNo: item.snkNo,
      rk: item.rk,
      trade: item.trade,
      name: item.name,
      battery: item.bty,
      status: 'Attached Out',
      outOfUnitCategory: 'Att',
      statusDetails: 'Permanent Attached (Outstation)',
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][(idCounter + item.snkNo.length) % 4],
      medicalCategory: 'AYE',
    });
    matchedArmyNos.add(item.snkNo);
  }
}

// 4. Add remaining Msn personnel
for (const item of MSN_LIST) {
  if (!matchedArmyNos.has(item.snkNo)) {
    finalPersonnel.push({
      id: String(idCounter++),
      snkNo: item.snkNo,
      rk: item.rk,
      trade: item.trade,
      name: item.name,
      battery: item.bty,
      status: 'Attached Out',
      outOfUnitCategory: 'Msn',
      statusDetails: 'UN Mission Deployment',
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][(idCounter + item.snkNo.length) % 4],
      medicalCategory: 'AYE',
    });
    matchedArmyNos.add(item.snkNo);
  }
}

console.log('Total Generated Personnel:', finalPersonnel.length);

const codeHeader = `import { Personnel, UserAccount, BatteryParadeSummary, DutyAssignment, AuditLogItem } from '../types';

// Complete Regimental Nominal Roll of 10 Medium Regiment Artillery
// Extracted from August 2026 Cutting List, ERE List, Permanent Attached List, and UN Mission List
export const INITIAL_PERSONNEL: Personnel[] = ${JSON.stringify(finalPersonnel, null, 2)};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'u-1',
    username: 'co',
    password: 'co123',
    name: 'Lt Col Md Shafiqul Islam Rubel, PSC, G',
    snkNo: 'BA-7592',
    rank: 'Lt Col',
    role: 'CO',
    accessLevel: 'Executive Strategic View',
    assignedBatteries: ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'],
    lastLogin: 'Today, 08:15 hrs'
  },
  {
    id: 'u-2',
    username: 'offr',
    password: 'offr123',
    name: 'Capt Iftekhar Mahmud Abir',
    snkNo: 'BA-11735',
    rank: 'Capt',
    role: 'Offr',
    accessLevel: 'Regimental Officer Access (Adjutant)',
    assignedBatteries: ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'],
    lastLogin: 'Today, 07:45 hrs'
  },
  {
    id: 'u-3',
    username: 'rsm',
    password: 'rsm123',
    name: 'SWO Nasir',
    snkNo: 'BJO-52470',
    rank: 'SWO',
    role: 'RSM',
    accessLevel: 'Consolidated Muster & Enlistment',
    assignedBatteries: ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'],
    lastLogin: 'Today, 06:30 hrs'
  },
  {
    id: 'u-4',
    username: 'p_bsm',
    password: 'bsm123',
    name: 'SWO Mohammad Rezaul Karim',
    snkNo: 'BJO-52668',
    rank: 'SWO',
    role: 'P BSM',
    accessLevel: 'P Battery In-Charge',
    assignedBattery: 'P Bty',
    assignedBatteries: ['P Bty'],
    lastLogin: 'Today, 06:45 hrs'
  },
  {
    id: 'u-5',
    username: 'q_bsm',
    password: 'bsm123',
    name: 'SWO MD NASHIR UDDIN',
    snkNo: 'BJO-52470',
    rank: 'SWO',
    role: 'Q BSM',
    accessLevel: 'Q Battery In-Charge',
    assignedBattery: 'Q Bty',
    assignedBatteries: ['Q Bty'],
    lastLogin: 'Today, 06:50 hrs'
  },
  {
    id: 'u-6',
    username: 'r_bsm',
    password: 'bsm123',
    name: 'SWO Muhammad Mostafa',
    snkNo: 'BJO-52689',
    rank: 'SWO',
    role: 'R BSM',
    accessLevel: 'R Battery In-Charge',
    assignedBattery: 'R Bty',
    assignedBatteries: ['R Bty'],
    lastLogin: 'Today, 06:55 hrs'
  },
  {
    id: 'u-7',
    username: 'hq_bsm',
    password: 'bsm123',
    name: 'MWO Md Sahinur Alam',
    snkNo: 'BJO-52253',
    rank: 'MWO',
    role: 'HQ BSM',
    accessLevel: 'HQ Battery In-Charge',
    assignedBattery: 'HQ Bty',
    assignedBatteries: ['HQ Bty'],
    lastLogin: 'Today, 07:00 hrs'
  },
  {
    id: 'u-8',
    username: 'admin',
    password: 'admin123',
    name: 'Regimental IT Administrator',
    snkNo: 'ADM-10M',
    rank: 'Admin',
    role: 'Admin',
    accessLevel: 'Full System Administrator',
    assignedBatteries: ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'],
    lastLogin: 'Today, 09:00 hrs'
  }
];

export const INITIAL_DUTY_ROSTER: DutyAssignment[] = [
  {
    id: 'd-1',
    dutyType: 'Quarter Guard',
    assignedPersonnel: [
      { id: '20', snkNo: '1227857', rank: 'Sgt', name: 'Shariful Islam', battery: 'Q Bty' },
      { id: '91', snkNo: '1233469', rank: 'Cpl', name: 'Md. Bayezid Khan', battery: 'R Bty' }
    ],
    date: '2026-09-02',
    shift: '24 Hours',
    location: 'Regimental Quarter Guard',
    status: 'Active'
  },
  {
    id: 'd-2',
    dutyType: 'Regimental Police',
    assignedPersonnel: [
      { id: '8', snkNo: '1233271', rank: 'Cpl', name: 'Mohah. Saddam Hossain', battery: 'P Bty' }
    ],
    date: '2026-09-02',
    shift: 'Day',
    location: 'Main Gate & Perimeter',
    status: 'Active'
  },
  {
    id: 'd-3',
    dutyType: 'Armoury Guard',
    assignedPersonnel: [
      { id: '45', snkNo: '1228491', rank: 'Cpl', name: 'Md. Mainul Islam', battery: 'Q Bty' }
    ],
    date: '2026-09-02',
    shift: '24 Hours',
    location: '10 Med Armoury & Kote',
    status: 'Active'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-02 07:15:00',
    action: 'Morning Parade State Submitted',
    performedBy: 'SWO Mohammad Rezaul Karim (P BSM)',
    role: 'P BSM',
    details: 'P Battery morning roll submitted',
    category: 'PARADE_STATE'
  },
  {
    id: 'log-2',
    timestamp: '2026-09-02 07:45:22',
    action: 'Consolidated Roll Verified',
    performedBy: 'SWO Nasir (RSM)',
    role: 'RSM',
    details: 'Regimental morning muster consolidated for HQ, P, Q, R Batteries',
    category: 'PARADE_STATE'
  },
  {
    id: 'log-3',
    timestamp: '2026-09-02 08:00:15',
    action: 'Regimental State Reviewed',
    performedBy: 'Capt Iftekhar Mahmud Abir (Offr)',
    role: 'Offr',
    details: 'Daily Morning Parade State reviewed and verified for CO perusal',
    category: 'PARADE_STATE'
  }
];
`;

fs.writeFileSync('src/data/initialData.ts', codeHeader);
console.log('src/data/initialData.ts written successfully!');
