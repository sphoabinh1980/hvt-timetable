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

function normalizeTeacherCode(className, subject, teacherCode) {
  if (!teacherCode) return teacherCode;
  let code = String(teacherCode).trim();
  if (code === 'N.T.Hoà') code = 'N.T.Hòa';
  return code;
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
      const homeroom = String(rows[headerIndex - 1]?.[col] ?? '').trim() || null;
      classInfo.push({ grade, className, homeroomTeacherCode: homeroom });
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
        const teacherCode = normalizeTeacherCode(className, parsed.subject, parsed.teacherCode);
        lessons.push({
          grade,
          className,
          dayOfWeek: currentDay,
          period,
          session,
          subject: parsed.subject,
          teacherCode,
          rawValue: parsed.raw
        });
        count += 1;
      }
    }
    parsedSheets.push({ sheetName, grade, session: main[2].toUpperCase() === 'S' ? 'Sáng' : 'Chiều', classes: classCols.length, lessons: count });
  }

  if (!parsedSheets.length) throw new Error('Không tìm thấy sheet lịch theo mẫu Khoi10-S/Khoi10-C/Khoi11-S/...');
  if (!lessons.length) throw new Error('Không đọc được ô thời khóa biểu nào từ file Excel.');

  const uniqueClassInfo = new Map();
  for (const item of classInfo) uniqueClassInfo.set(item.className, item);
  return { lessons, classInfo: [...uniqueClassInfo.values()], parsedSheets };
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
    let code = String(rows[r][mapping.code] ?? '').trim();
    const fullName = String(rows[r][mapping.name] ?? '').trim();
    if (!code || !fullName) continue;
    if (code === 'N.T.Hoà') code = 'N.T.Hòa';
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
