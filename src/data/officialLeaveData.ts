import { Battery, MilitaryRank, Personnel } from '../types';

export interface OfficialLeaveEntry {
  sl: number;
  snkNo: string;
  altSnkNo?: string;
  rank: MilitaryRank | string;
  trade: string;
  name: string;
  battery: Battery;
  category: 'P/Lve' | 'C/Lve';
  totalDays: number;
  startDate: string; // YYYY-MM-DD
  joiningDate: string; // YYYY-MM-DD
}

/**
 * Calculates remaining days from the current date until joining date.
 * If joiningDate is today -> 0
 * If in future -> positive number of days
 * If past -> negative number of days
 */
export function calculateRemainingDays(joiningDate: string): number {
  if (!joiningDate) return 0;
  const parts = joiningDate.split('-');
  if (parts.length !== 3) return 0;
  const end = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = end.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export const OFFICIAL_P_LVE_LIST: OfficialLeaveEntry[] = [
  { sl: 1, snkNo: '1233280', rank: 'Lcpl', trade: 'OCU', name: 'Md Babul Hossain', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-07-25', joiningDate: '2026-09-12' },
  { sl: 2, snkNo: '1228468', rank: 'Sgt', trade: 'Gnr', name: 'Md Bashirul Alam', battery: 'P Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-08-29', joiningDate: '2026-09-12' },
  { sl: 3, snkNo: '1229542', rank: 'Cpl', trade: 'DMT', name: 'Md Zakaria Kabir', battery: 'P Bty', category: 'P/Lve', totalDays: 40, startDate: '2026-08-08', joiningDate: '2026-09-16' },
  { sl: 4, snkNo: '1234442', rank: 'Lcpl', trade: 'OCU', name: 'Md Al Mamun', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-07-29', joiningDate: '2026-09-16' },
  { sl: 5, snkNo: '1232049', rank: 'Cpl', trade: 'DMT', name: 'Md Ashraful Islam', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-07-31', joiningDate: '2026-09-18' },
  { sl: 6, snkNo: '1248951', rank: 'Snk', trade: 'OCU', name: 'Md Fahim Ahmed', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-03', joiningDate: '2026-09-21' },
  { sl: 7, snkNo: '1229971', rank: 'Cpl', trade: 'Gnr', name: 'Md Aminuzzaman', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-03', joiningDate: '2026-09-21' },
  { sl: 8, snkNo: '1233061', rank: 'Lcpl', trade: 'OCU', name: 'Md Jahidul Islam', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-05', joiningDate: '2026-09-23' },
  { sl: 9, snkNo: '1227117', rank: 'Sgt', trade: 'Gnr', name: 'Md Rajib Uddin', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-05', joiningDate: '2026-09-23' },
  { sl: 10, snkNo: 'BJO-52936', altSnkNo: '52936', rank: 'WO', trade: 'Gnr', name: 'Ripon', battery: 'P Bty', category: 'P/Lve', totalDays: 30, startDate: '2026-08-27', joiningDate: '2026-09-25' },
  { sl: 11, snkNo: '1228067', rank: 'Sgt', trade: 'Gnr', name: 'Md Abdul Salam', battery: 'P Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-25', joiningDate: '2026-10-13' },
  { sl: 12, snkNo: 'BJO-52668', altSnkNo: '52668', rank: 'SWO', trade: 'TA', name: 'Muhammad Rezaul Karim', battery: 'P Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-05', joiningDate: '2026-09-19' },
  { sl: 13, snkNo: '1232373', rank: 'Cpl', trade: 'Gnr', name: 'Md Borhan Mia', battery: 'P Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-03', joiningDate: '2026-09-17' },
  { sl: 14, snkNo: '1234805', rank: 'Lcpl', trade: 'Gnr', name: 'Md Rabiul Islam', battery: 'P Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-10', joiningDate: '2026-09-24' },
  { sl: 15, snkNo: '1235939', rank: 'Lcpl', trade: 'Gnr', name: 'Md Tuhin Rana', battery: 'P Bty', category: 'P/Lve', totalDays: 33, startDate: '2026-09-01', joiningDate: '2026-10-03' },
  { sl: 16, snkNo: '1243686', rank: 'Snk', trade: 'TA', name: 'Sheikh Jahurul Islam', battery: 'P Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-04', joiningDate: '2026-09-18' },
  { sl: 17, snkNo: '1234483', rank: 'Cpl', trade: 'Gnr', name: 'Md Rubel Hossain', battery: 'P Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-11', joiningDate: '2026-09-25' },
  { sl: 18, snkNo: '1245816', rank: 'Snk', trade: 'DMT', name: 'Md Shahadat', battery: 'P Bty', category: 'P/Lve', totalDays: 16, startDate: '2026-09-11', joiningDate: '2026-09-26' },
  { sl: 19, snkNo: '1234160', rank: 'Lcpl', trade: 'OCU', name: 'Toyebur Rahman', battery: 'Q Bty', category: 'P/Lve', totalDays: 35, startDate: '2026-07-29', joiningDate: '2026-09-16' },
  { sl: 20, snkNo: '1240702', rank: 'Snk', trade: 'DMT', name: 'Md Rubel', battery: 'Q Bty', category: 'P/Lve', totalDays: 35, startDate: '2026-08-15', joiningDate: '2026-09-19' },
  { sl: 21, snkNo: '1225491', rank: 'Sgt', trade: 'Gnr', name: 'Md Akram Ullah', battery: 'Q Bty', category: 'P/Lve', totalDays: 30, startDate: '2026-08-17', joiningDate: '2026-09-20' },
  { sl: 22, snkNo: '1228362', rank: 'Sgt', trade: 'Gnr', name: 'Shamimul Islam', battery: 'Q Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-04', joiningDate: '2026-09-22' },
  { sl: 23, snkNo: '1241474', rank: 'Snk', trade: 'DMT', name: 'Al Amin Mia', battery: 'Q Bty', category: 'P/Lve', totalDays: 30, startDate: '2026-08-25', joiningDate: '2026-09-23' },
  { sl: 24, snkNo: '1225502', rank: 'Sgt', trade: 'Gnr', name: 'Md Jannatul Ferdous', battery: 'Q Bty', category: 'P/Lve', totalDays: 35, startDate: '2026-08-22', joiningDate: '2026-09-25' },
  { sl: 25, snkNo: '1249451', rank: 'Snk', trade: 'OCU', name: 'Md Moshinur Rahman', battery: 'Q Bty', category: 'P/Lve', totalDays: 45, startDate: '2026-08-25', joiningDate: '2026-10-08' },
  { sl: 26, snkNo: '1230874', rank: 'Cpl', trade: 'OCU', name: 'Md Tohidul Islam', battery: 'Q Bty', category: 'P/Lve', totalDays: 30, startDate: '2026-09-06', joiningDate: '2026-10-05' },
  { sl: 27, snkNo: '1235983', rank: 'Lcpl', trade: 'Gnr', name: 'Md Emdadul Haque', battery: 'Q Bty', category: 'P/Lve', totalDays: 40, startDate: '2026-09-06', joiningDate: '2026-10-15' },
  { sl: 28, snkNo: '1230495', rank: 'Lcpl', trade: 'Gnr', name: 'Md Jahidul Islam', battery: 'Q Bty', category: 'P/Lve', totalDays: 35, startDate: '2026-09-03', joiningDate: '2026-10-07' },
  { sl: 29, snkNo: '1244601', rank: 'Snk', trade: 'DMT', name: 'Ashiqur Rahman', battery: 'Q Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-08', joiningDate: '2026-09-22' },
  { sl: 30, snkNo: '1241023', rank: 'Snk', trade: 'Ck(U)', name: 'Md Mobarak Hossain', battery: 'Q Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-06', joiningDate: '2026-09-20' },
  { sl: 31, snkNo: '1231387', rank: 'Cpl', trade: 'DMT', name: 'Abdullah Al Mamun', battery: 'Q Bty', category: 'P/Lve', totalDays: 20, startDate: '2026-09-03', joiningDate: '2026-09-22' },
  { sl: 32, snkNo: '1247868', rank: 'Snk', trade: 'Gnr', name: 'Md Nazirur Rahman', battery: 'Q Bty', category: 'P/Lve', totalDays: 40, startDate: '2026-09-04', joiningDate: '2026-10-13' },
  { sl: 33, snkNo: '1242780', rank: 'Snk', trade: 'Gnr', name: 'Rabbi Mina', battery: 'Q Bty', category: 'P/Lve', totalDays: 35, startDate: '2026-09-02', joiningDate: '2026-10-06' },
  { sl: 34, snkNo: '1244267', rank: 'Snk', trade: 'DMT', name: 'Md Moazzem Hossain', battery: 'Q Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-11', joiningDate: '2026-09-25' },
  { sl: 35, snkNo: '1240802', rank: 'Snk', trade: 'Gnr', name: 'Md Nasir Molla', battery: 'Q Bty', category: 'P/Lve', totalDays: 35, startDate: '2026-09-04', joiningDate: '2026-10-08' },
  { sl: 36, snkNo: '1244634', rank: 'Snk', trade: 'Gnr', name: 'Md Habibur', battery: 'Q Bty', category: 'P/Lve', totalDays: 40, startDate: '2026-09-04', joiningDate: '2026-10-13' },
  { sl: 37, snkNo: '1238338', rank: 'Snk', trade: 'Gnr', name: 'Shershah', battery: 'R Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-07-29', joiningDate: '2026-09-16' },
  { sl: 38, snkNo: '1241388', rank: 'Snk', trade: 'OCU', name: 'Md Rabiul Islam', battery: 'R Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-07-30', joiningDate: '2026-09-17' },
  { sl: 39, snkNo: '1234858', rank: 'Lcpl', trade: 'Gnr', name: 'Md Mojahid Hossain', battery: 'R Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-01', joiningDate: '2026-09-19' },
  { sl: 40, snkNo: '1238506', rank: 'Snk', trade: 'DMT', name: 'Abdullah Sheikh', battery: 'R Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-02', joiningDate: '2026-09-20' },
  { sl: 41, snkNo: '1234076', rank: 'Lcpl', trade: 'Gnr', name: 'Md Mosharraf Hossain', battery: 'R Bty', category: 'P/Lve', totalDays: 20, startDate: '2026-08-27', joiningDate: '2026-09-25' },
  { sl: 42, snkNo: '1238556', rank: 'Snk', trade: 'DMT', name: 'Bappi Hasan', battery: 'R Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-07', joiningDate: '2026-09-25' },
  { sl: 43, snkNo: '1227007', rank: 'Cpl', trade: 'Gnr', name: 'Md Selim Reza', battery: 'R Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-10', joiningDate: '2026-09-29' },
  { sl: 44, snkNo: '1241013', rank: 'Snk', trade: 'Ck(U)', name: 'Imran Hasan', battery: 'R Bty', category: 'P/Lve', totalDays: 21, startDate: '2026-09-10', joiningDate: '2026-09-30' },
  { sl: 45, snkNo: '1243153', rank: 'Snk', trade: 'TA', name: 'Md Masud Rana', battery: 'R Bty', category: 'P/Lve', totalDays: 15, startDate: '2026-09-05', joiningDate: '2026-09-19' },
  { sl: 46, snkNo: '1243402', rank: 'Snk', trade: 'TA', name: 'Rahad Hossain', battery: 'R Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-09-05', joiningDate: '2026-10-24' },
  { sl: 47, snkNo: '1248460', rank: 'Snk', trade: 'OCU', name: 'Md Abu Jihad', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-07-25', joiningDate: '2026-09-12' },
  { sl: 48, snkNo: '1247066', rank: 'Snk', trade: 'DMT', name: 'Md Milladun Nabi', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-02', joiningDate: '2026-09-20' },
  { sl: 49, snkNo: '1226928', rank: 'Sgt', trade: 'DMT', name: 'Md Shafiqul Islam', battery: 'HQ Bty', category: 'P/Lve', totalDays: 45, startDate: '2026-08-08', joiningDate: '2026-09-21' },
  { sl: 50, snkNo: '1245554', rank: 'Snk', trade: 'OCU', name: 'Md Ariful Islam', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-03', joiningDate: '2026-09-21' },
  { sl: 51, snkNo: '1243245', rank: 'Snk', trade: 'Ck(U)', name: 'Shahin Alam', battery: 'HQ Bty', category: 'P/Lve', totalDays: 30, startDate: '2026-08-25', joiningDate: '2026-09-23' },
  { sl: 52, snkNo: '1242717', rank: 'Snk', trade: 'DMT', name: 'Romjan Sardar', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-08', joiningDate: '2026-09-26' },
  { sl: 53, snkNo: '1234522', rank: 'Cpl', trade: 'Gnr', name: 'Abul Hashim', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-08', joiningDate: '2026-09-26' },
  { sl: 54, snkNo: '1241274', rank: 'Snk', trade: 'DMT', name: 'Md Alif Hossain', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-13', joiningDate: '2026-10-01' },
  { sl: 55, snkNo: '1241476', rank: 'Snk', trade: 'TA', name: 'Baijul Islam Robin', battery: 'HQ Bty', category: 'P/Lve', totalDays: 45, startDate: '2026-08-25', joiningDate: '2026-10-08' },
  { sl: 56, snkNo: '1242774', rank: 'Snk', trade: 'DMT', name: 'Md Mizanur Rahman', battery: 'HQ Bty', category: 'P/Lve', totalDays: 45, startDate: '2026-08-25', joiningDate: '2026-10-08' },
  { sl: 57, snkNo: '1228826', rank: 'BKMS', trade: 'TA', name: 'Md Mizanur Rahman', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-20', joiningDate: '2026-10-08' },
  { sl: 58, snkNo: '1235177', rank: 'Lcpl', trade: 'DMT', name: 'Md Hafijur Rahman', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-08-22', joiningDate: '2026-10-10' },
  { sl: 59, snkNo: 'BJO-53017', altSnkNo: '53017', rank: 'WO', trade: 'Clk', name: 'Md Arifur Rahman', battery: 'HQ Bty', category: 'P/Lve', totalDays: 20, startDate: '2026-09-09', joiningDate: '2026-09-29' },
  { sl: 60, snkNo: 'BJO-87129', altSnkNo: '87129', rank: 'WO', trade: 'AEC', name: 'Md Abdul Halim', battery: 'HQ Bty', category: 'P/Lve', totalDays: 30, startDate: '2026-09-01', joiningDate: '2026-09-30' },
  { sl: 61, snkNo: '1249779', rank: 'Snk', trade: 'TA', name: 'Md Azizul Islam', battery: 'HQ Bty', category: 'P/Lve', totalDays: 40, startDate: '2026-09-04', joiningDate: '2026-10-13' },
  { sl: 62, snkNo: '1233828', altSnkNo: '1233518', rank: 'Lcpl', trade: 'OCU', name: 'Md Riad', battery: 'HQ Bty', category: 'P/Lve', totalDays: 40, startDate: '2026-09-04', joiningDate: '2026-10-14' },
  { sl: 63, snkNo: '1226889', rank: 'RQMS', trade: 'Gnr', name: 'Md Azizul Haque', battery: 'HQ Bty', category: 'P/Lve', totalDays: 35, startDate: '2026-09-01', joiningDate: '2026-10-05' },
  { sl: 64, snkNo: '1237352', rank: 'NC(E)', trade: '-', name: 'Nuruzzaman', battery: 'HQ Bty', category: 'P/Lve', totalDays: 50, startDate: '2026-09-10', joiningDate: '2026-10-29' },
  { sl: 65, snkNo: '2416197', rank: 'Lcpl', trade: 'TVV', name: 'Md Tuhin Sardar', battery: 'EME', category: 'P/Lve', totalDays: 45, startDate: '2026-08-07', joiningDate: '2026-10-20' },
  { sl: 66, snkNo: '2418593', rank: 'Snk', trade: 'RCT', name: 'Md Sobuj Mia', battery: 'EME', category: 'P/Lve', totalDays: 30, startDate: '2026-08-17', joiningDate: '2026-09-15' },
  { sl: 67, snkNo: '2417678', rank: 'Lcpl', trade: 'TSS', name: 'Md Sujon Mia', battery: 'EME', category: 'P/Lve', totalDays: 45, startDate: '2026-09-04', joiningDate: '2026-10-18' },
];

export const OFFICIAL_C_LVE_LIST: OfficialLeaveEntry[] = [
  { sl: 1, snkNo: '1248602', rank: 'Snk', trade: 'OCU', name: 'Md Mottalib Prodhan', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-04', joiningDate: '2026-09-15' },
  { sl: 2, snkNo: '1247923', rank: 'Snk', trade: 'OCU', name: 'Mohammad Murad Hossain', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-10', joiningDate: '2026-09-21' },
  { sl: 3, snkNo: '1238014', rank: 'Lcpl', trade: 'TA', name: 'Maruf Mia', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-05', joiningDate: '2026-09-16' },
  { sl: 4, snkNo: '1242501', rank: 'Snk', trade: 'DMT', name: 'Shahidul Islam', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-10', joiningDate: '2026-09-21' },
  { sl: 5, snkNo: '1228283', rank: 'Sgt', trade: 'Gnr', name: 'Rabiul Islam', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-09', joiningDate: '2026-09-20' },
  { sl: 6, snkNo: '1235084', rank: 'Lcpl', trade: 'Gnr', name: 'Sayed Hasan', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-05', joiningDate: '2026-09-16' },
  { sl: 7, snkNo: '1242535', rank: 'Snk', trade: 'Gnr', name: 'Md Hafiz Molla', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-05', joiningDate: '2026-09-16' },
  { sl: 8, snkNo: '1242589', rank: 'Snk', trade: 'Gnr', name: 'Md Mizarul Islam', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-06', joiningDate: '2026-09-17' },
  { sl: 9, snkNo: '1243728', rank: 'Snk', trade: 'Gnr', name: 'Atikul Islam', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-04', joiningDate: '2026-09-15' },
  { sl: 10, snkNo: '1244958', rank: 'Snk', trade: 'Gnr', name: 'Md Wasimul Murad', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-09', joiningDate: '2026-09-20' },
  { sl: 11, snkNo: '1250191', rank: 'Snk', trade: 'Gnr', name: 'Munna Mia', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-05', joiningDate: '2026-09-16' },
  { sl: 12, snkNo: '1241288', rank: 'Snk', trade: 'Gnr', name: 'Md Mahmudur Rahman Emon', battery: 'P Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-07', joiningDate: '2026-09-18' },
  { sl: 13, snkNo: '1234261', rank: 'Lcpl', trade: 'OCU', name: 'Md Masum Sikder', battery: 'R Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-04', joiningDate: '2026-09-15' },
  { sl: 14, snkNo: '1243042', rank: 'Snk', trade: 'DMT', name: 'Md Kiramul Islam', battery: 'R Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-05', joiningDate: '2026-09-16' },
  { sl: 15, snkNo: '1234322', rank: 'Snk', trade: 'Gnr', name: 'Md Shahinuzzaman', battery: 'R Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-01', joiningDate: '2026-09-12' },
  { sl: 16, snkNo: '1224696', rank: 'Lcpl', trade: 'DMT', name: 'Md Mahbub Hasan', battery: 'HQ Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-11', joiningDate: '2026-09-22' },
  { sl: 17, snkNo: '1237390', rank: 'Lcpl', trade: 'DMT', name: 'Sobuj Hasan', battery: 'HQ Bty', category: 'C/Lve', totalDays: 15, startDate: '2026-09-05', joiningDate: '2026-09-19' },
  { sl: 18, snkNo: '1244033', rank: 'Snk', trade: 'DMT', name: 'Bilayet Biswas', battery: 'HQ Bty', category: 'C/Lve', totalDays: 15, startDate: '2026-09-05', joiningDate: '2026-09-19' },
  { sl: 19, snkNo: '1236493', rank: 'Cpl', trade: 'CLK', name: 'Abdullah Al Mahmud', battery: 'HQ Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-05', joiningDate: '2026-09-16' },
  { sl: 20, snkNo: '1235261', rank: 'NC(E)', trade: '-', name: 'Amirul Islam', battery: 'HQ Bty', category: 'C/Lve', totalDays: 12, startDate: '2026-09-04', joiningDate: '2026-09-15' },
];

/**
 * 2 Personnel from official leave rosters that were previously not in INITIAL_PERSONNEL:
 * 1. 1225491: Sgt Md Akram Ullah (Q Bty) - P/Lve
 * 2. 1224696: Lcpl Md Mahbub Hasan (HQ Bty) - C/Lve
 */
export const NEWLY_REGISTERED_LEAVE_SOLDIERS: Personnel[] = [
  {
    id: 'snk-1225491',
    snkNo: '1225491',
    rk: 'Sgt',
    trade: 'Gnr',
    name: 'Md Akram Ullah',
    battery: 'Q Bty',
    status: 'P/Lve',
    bloodGroup: 'B+',
    medicalCategory: 'AYE',
    outOfUnitCategory: 'P/Lve',
    leaveType: 'P/Lve',
    startDate: '2026-08-17',
    endDate: '2026-09-20',
    outOfUnitStartDate: '2026-08-17',
    outOfUnitEndDate: '2026-09-20',
    leaveFrom: '2026-08-17',
    leaveTo: '2026-09-20',
    durationDays: 30,
    remainingDays: calculateRemainingDays('2026-09-20'),
    statusDetails: `P/Lve (30 Days - অবশিষ্ট ${calculateRemainingDays('2026-09-20')} দিন)`,
    outOfUnitRemarks: `বাৎসরিক ছুটি (মোট ৩০ দিন, অবশিষ্ট ${calculateRemainingDays('2026-09-20')} দিন, যোগদানের তারিখ: ২০-০৯-২০২৬)`,
  },
  {
    id: 'snk-1224696',
    snkNo: '1224696',
    rk: 'Lcpl',
    trade: 'DMT',
    name: 'Md Mahbub Hasan',
    battery: 'HQ Bty',
    status: 'C/Lve',
    bloodGroup: 'O+',
    medicalCategory: 'AYE',
    outOfUnitCategory: 'C/Lve',
    leaveType: 'C/Lve',
    startDate: '2026-09-11',
    endDate: '2026-09-22',
    outOfUnitStartDate: '2026-09-11',
    outOfUnitEndDate: '2026-09-22',
    leaveFrom: '2026-09-11',
    leaveTo: '2026-09-22',
    durationDays: 12,
    remainingDays: calculateRemainingDays('2026-09-22'),
    statusDetails: `C/Lve (12 Days - অবশিষ্ট ${calculateRemainingDays('2026-09-22')} দিন)`,
    outOfUnitRemarks: `নৈমিত্তিক ছুটি (মোট ১২ দিন, অবশিষ্ট ${calculateRemainingDays('2026-09-22')} দিন, যোগদানের তারিখ: ২২-০৯-২০২৬)`,
  },
];
