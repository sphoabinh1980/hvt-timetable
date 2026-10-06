import XLSX from 'xlsx';

const strip = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .trim();

const norm = (value) => strip(value).toLowerCase().replace(/\s+/g, ' ');

function parseDay(value) {
  const text = norm(value);
  const match = text.match(/(?:thu\s*)?([2-7])/);
  return match ? Number(match[1]) : null;
}

function parsePeriod(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseLesson(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/^(.+?)\s+-\s+(.+)$/);
  if (!match) return { raw, subject: raw, teacherCode: null };
  return { raw, subject: match[1].trim(), teacherCode: match[2].trim() };
}

function canonicalTeacherCode(value) {
  if (!value) return null;
  let code = String(value).replace(/\s+/g, '').trim();
  if (!code) return null;
  if (code === 'N.T.Hoà') code = 'N.T.Hòa';
  return code;
}

function abbreviateName(value) {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return canonicalTeacherCode(parts[0]) || '';
  return canonicalTeacherCode(`${parts.slice(0, -1).map((x) => x[0]).join('.')}.${parts.at(-1)}`) || '';
}

const SUBJECT_CODE_BY_NAME = new Map([
  ['toan','T'],['ngu van','V'],['van','V'],['vat li','L'],['ly','L'],['hoa hoc','H'],['hoa','H'],
  ['sinh hoc','S'],['sinh','S'],['tin hoc','TN'],['tin','TN'],['lich su','SU'],['su','SU'],
  ['dia li','Đ'],['dia','Đ'],['tieng anh','A'],['anh','A'],['tieng phap','P'],['phap','P'],
  ['tieng nga','N'],['nga','N'],['tieng trung','TQ'],['trung','TQ'],['cong nghe','CN'],
  ['gdkt&pl','KTPL'],['giao duc kt&pl','KTPL'],['gdqp-an','GDQP'],['giao duc quoc phong-an ninh','GDQP']
]);

function subjectCodeFromName(value) {
  const key = norm(value);
  return SUBJECT_CODE_BY_NAME.get(key) || String(value ?? '').trim();
}

const CLASS_SUFFIX = new Map([
  ['toan1','T1'],['toan 1','T1'],['toan2','T2'],['toan 2','T2'],['toan','T'],
  ['ly','L'],['vat ly','L'],['hoa','H'],['hoa hoc','H'],['sinh','S'],['sinh hoc','S'],
  ['tin','TIN'],['tin hoc','TIN'],['van1','V1'],['van 1','V1'],['van2','V2'],['van 2','V2'],['van','V'],
  ['su','SỬ'],['lich su','SỬ'],['dia','Đ'],['dia li','Đ'],['anh1','A1'],['anh 1','A1'],
  ['anh2','A2'],['anh 2','A2'],['anh','A'],['phap','P'],['nga','N'],['trung','TQ']
]);

function classCodeFromLongName(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{2})\s+(.+)$/);
  if (!match) return null;
  const suffix = CLASS_SUFFIX.get(norm(match[2]));
  return suffix ? `${match[1]}${suffix}` : null;
}

function parseTeacherProfiles(workbook) {
  const worksheet = workbook.Sheets.KIEM_TRA_PHAN_CONG;
  if (!worksheet) return [];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });
  if (!rows.length) return [];
  const headerIndex = rows.findIndex((row) => {
    const h = row.map(norm);
    return h.includes('lop') && h.includes('mon') && h.some((x) => x === 'giao vien');
  });
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map(norm);
  const classCol = headers.indexOf('lop');
  const subjectCol = headers.indexOf('mon');
  const teacherCol = headers.indexOf('giao vien');
  if (classCol < 0 || subjectCol < 0 || teacherCol < 0) return [];

  const grouped = new Map();
  for (let r = headerIndex + 1; r < rows.length; r += 1) {
    const classLong = String(rows[r]?.[classCol] ?? '').trim();
    const subjectName = String(rows[r]?.[subjectCol] ?? '').trim();
    const fullName = String(rows[r]?.[teacherCol] ?? '').trim();
    if (!classLong || !subjectName || !fullName) continue;
    const code = abbreviateName(fullName);
    if (!code) continue;
    const subjectCode = subjectCodeFromName(subjectName);
    const className = classCodeFromLongName(classLong);
    const profileKey = `${code}|${subjectCode}|${fullName}`;
    if (!grouped.has(profileKey)) {
      grouped.set(profileKey, {
        profileKey,
        teacherCode: code,
        fullName,
        subjectCode,
        subjectName,
        classNames: new Set()
      });
    }
    if (className) grouped.get(profileKey).classNames.add(className);
  }
  return [...grouped.values()].map((x) => ({
    ...x,
    classNames: [...x.classNames].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
  }));
}

function sessionFromSheet(sheetName, row, sessionCol) {
  const suffix = sheetName.match(/-([SC])$/i)?.[1]?.toUpperCase();
  if (suffix === 'S') return 'Sáng';
  if (suffix === 'C') return 'Chiều';
  const cell = sessionCol >= 0 ? norm(row[sessionCol]) : '';
  return cell.includes('chieu') ? 'Chiều' : 'Sáng';
}

export function parseTimetableWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const lessons = [];
  const classInfo = [];
  const parsedSheets = [];

  for (const sheetName of workbook.SheetNames) {
    const main = sheetName.match(/^Khoi(10|11|12)-(S|C)$/i);
    if (!main) continue;

    const grade = Number(main[1]);
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(norm);
      return headers.includes('thu') && headers.includes('tiet');
    });
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex].map(norm);
    const dayCol = headers.indexOf('thu');
    const periodCol = headers.indexOf('tiet');
    const sessionCol = headers.indexOf('buoi');
    const classStart = periodCol + 1;
    const classCols = [];

    for (let col = classStart; col < rows[headerIndex].length; col += 1) {
      const className = String(rows[headerIndex][col] ?? '').trim();
      if (!/^\d{2}/.test(className)) continue;
      classCols.push({ col, className });
      const homeroomRaw = String(rows[headerIndex - 1]?.[col] ?? '').trim() || null;
      classInfo.push({
        grade,
        className,
        homeroomTeacherCode: canonicalTeacherCode(homeroomRaw),
        homeroomTeacherCodeRaw: homeroomRaw
      });
    }

    let currentDay = null;
    let count = 0;
    for (let r = headerIndex + 1; r < rows.length; r += 1) {
      const row = rows[r];
      const day = parseDay(row[dayCol]);
      if (day) currentDay = day;
      const period = parsePeriod(row[periodCol]);
      if (!currentDay || !period || period < 1 || period > 12) continue;
      const session = sessionFromSheet(sheetName, row, sessionCol);

      for (const { col, className } of classCols) {
        const parsed = parseLesson(row[col]);
        if (!parsed) continue;
        lessons.push({
          grade,
          className,
          dayOfWeek: currentDay,
          period,
          session,
          subject: parsed.subject,
          teacherCode: canonicalTeacherCode(parsed.teacherCode),
          rawValue: parsed.raw
        });
        count += 1;
      }
    }
    parsedSheets.push({
      sheetName,
      grade,
      session: main[2].toUpperCase() === 'S' ? 'Sáng' : 'Chiều',
      classes: classCols.length,
      lessons: count
    });
  }

  const requiredSheets=['Khoi10-S','Khoi11-S','Khoi12-S','Khoi10-C','Khoi11-C','Khoi12-C'];
  const parsedNames=new Set(parsedSheets.map((x)=>x.sheetName));
  const missingSheets=requiredSheets.filter((x)=>!parsedNames.has(x));
  if (missingSheets.length) throw new Error(`Thiếu sheet thời khóa biểu: ${missingSheets.join(', ')}.`);
  if (!lessons.length) throw new Error('Không đọc được ô thời khóa biểu nào từ file Excel.');

  const uniqueClassInfo = new Map();
  for (const item of classInfo) uniqueClassInfo.set(item.className, item);
  const teacherProfiles = parseTeacherProfiles(workbook);
  return { lessons, classInfo: [...uniqueClassInfo.values()], teacherProfiles, parsedSheets };
}

export function parseTeacherRoster(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (!rows.length) throw new Error('File danh sách giáo viên đang trống.');

  let headerIndex = -1;
  let mapping = null;
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const headers = rows[i].map(norm);
    const code = headers.findIndex((x) => ['ma gv', 'ma giao vien', 'code', 'ma'].includes(x));
    const name = headers.findIndex((x) => ['ten giao vien', 'ho ten', 'ten gv', 'name'].includes(x));
    if (code >= 0 && name >= 0) {
      const subject = headers.findIndex((x) => ['mon', 'bo mon', 'subject'].includes(x));
      headerIndex = i;
      mapping = { code, name, subject };
      break;
    }
  }
  if (!mapping) throw new Error('Cần có tối thiểu hai cột “Mã GV” và “Tên giáo viên”.');

  const teachers = [];
  for (let r = headerIndex + 1; r < rows.length; r += 1) {
    const code = canonicalTeacherCode(rows[r][mapping.code]);
    const fullName = String(rows[r][mapping.name] ?? '').trim();
    if (!code || !fullName) continue;
    const subject = mapping.subject >= 0 ? String(rows[r][mapping.subject] ?? '').trim() : '';
    teachers.push({ code, fullName, subject });
  }
  return teachers;
}

export function buildTeacherWorkbook(teachers) {
  const rows = [['Mã GV', 'Tên giáo viên', 'Môn', 'Hoạt động']];
  for (const teacher of teachers) rows.push([teacher.code, teacher.full_name || '', teacher.subject || '', teacher.active ? 'Có' : 'Không']);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'GiaoVien');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function buildTeacherTimetableWorkbook(rows, effectiveDate) {
  const data = [['Giáo viên', 'Tên hiển thị', 'Thứ', 'Buổi', 'Tiết', 'Lớp', 'Môn', 'Ngày áp dụng']];
  for (const row of rows) data.push([row.teacher_code, row.full_name || row.teacher_code, `Thứ ${row.day_of_week}`, row.session, row.period, row.class_name, row.subject, effectiveDate]);
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TKB_GiaoVien');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
