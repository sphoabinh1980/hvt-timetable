import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { createAuth, parseCookies } from './auth.js';
import { createDb } from './db.js';
import { parseTimetableWorkbook, parseTeacherRoster, buildTeacherWorkbook, buildTeacherTimetableWorkbook } from './parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readEnvFile() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
readEnvFile();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
  console.warn('ADMIN_PASSWORD is not set. Admin login is disabled until the environment variable is configured.');
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DATA_DIR = path.resolve(root, process.env.DATA_DIR || './data');
const SCHOOL_NAME = process.env.SCHOOL_NAME || 'HVT';
const isProduction = process.env.NODE_ENV === 'production';

const { db, importVersion, importTeachers, resolveVersion } = createDb(DATA_DIR);
const auth = createAuth({ user: ADMIN_USER, secret: SESSION_SECRET });
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(root, 'public'), { extensions: ['html'] }));

const attempts = new Map();
function allowLogin(ip) {
  const now = Date.now();
  const state = attempts.get(ip) || { count: 0, since: now };
  if (now - state.since > 15 * 60 * 1000) {
    attempts.set(ip, { count: 0, since: now });
    return true;
  }
  return state.count < 8;
}
function recordFailure(ip) {
  const now = Date.now();
  const state = attempts.get(ip) || { count: 0, since: now };
  state.count += 1;
  attempts.set(ip, state);
}
function adminOnly(req, res, next) {
  const token = parseCookies(req.headers.cookie).hvt_session;
  const data = auth.verify(token);
  if (!data) return res.status(401).json({ error: 'Bạn cần đăng nhập Admin.' });
  req.admin = data.sub;
  next();
}

function validateDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}
function requestedDate(req) {
  const value = String(req.query.date || '');
  if (validateDate(value)) return value;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function versionPayload(version) {
  if (!version) return null;
  return { id: version.id, name: version.name, effectiveDate: version.effective_date, sourceFilename: version.source_filename, importedAt: version.imported_at };
}
function teacherDisplay(row) { return row.full_name || row.teacher_code; }

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/config', (_req, res) => res.json({ schoolName: SCHOOL_NAME }));

app.get('/api/versions', (_req, res) => {
  const rows = db.prepare(`SELECT v.*, COUNT(l.id) lesson_count FROM versions v LEFT JOIN lessons l ON l.version_id = v.id GROUP BY v.id ORDER BY v.effective_date DESC, v.id DESC`).all();
  res.json(rows.map((x) => ({ ...versionPayload(x), lessonCount: x.lesson_count })));
});

app.get('/api/options', (req, res) => {
  const date = requestedDate(req);
  const version = resolveVersion(date);
  if (!version) return res.json({ date, version: null, classes: [], teachers: [] });
  const classes = db.prepare(`SELECT ci.class_name, ci.grade, ci.homeroom_teacher_code, t.full_name homeroom_name FROM class_info ci LEFT JOIN teachers t ON t.code = ci.homeroom_teacher_code WHERE ci.version_id = ? ORDER BY ci.grade, ci.class_name`).all(version.id);
  const teachers = db.prepare(`SELECT DISTINCT l.teacher_code code, t.full_name, COALESCE(t.subject, '') subject FROM lessons l LEFT JOIN teachers t ON t.code = l.teacher_code WHERE l.version_id = ? AND l.teacher_code IS NOT NULL AND l.teacher_code <> '' ORDER BY COALESCE(t.full_name, l.teacher_code), l.teacher_code`).all(version.id);
  res.json({
    date,
    version: versionPayload(version),
    classes: classes.map((x) => ({ name: x.class_name, grade: x.grade, homeroomTeacherCode: x.homeroom_teacher_code, homeroomTeacherName: x.homeroom_name })),
    teachers: teachers.map((x) => ({ code: x.code, fullName: x.full_name, subject: x.subject, displayName: x.full_name ? `${x.full_name} (${x.code})` : x.code }))
  });
});

app.get('/api/timetable/class', (req, res) => {
  const date = requestedDate(req);
  const version = resolveVersion(date);
  if (!version) return res.json({ date, version: null, className: req.query.className || '', lessons: [] });
  const className = String(req.query.className || '').trim();
  if (!className) return res.status(400).json({ error: 'Thiếu lớp.' });
  const lessons = db.prepare(`SELECT l.*, t.full_name FROM lessons l LEFT JOIN teachers t ON t.code = l.teacher_code WHERE l.version_id = ? AND l.class_name = ? ORDER BY l.day_of_week, CASE l.session WHEN 'Sáng' THEN 0 ELSE 1 END, l.period`).all(version.id, className);
  const info = db.prepare(`SELECT ci.*, t.full_name homeroom_name FROM class_info ci LEFT JOIN teachers t ON t.code = ci.homeroom_teacher_code WHERE ci.version_id = ? AND ci.class_name = ?`).get(version.id, className) || null;
  res.json({ date, version: versionPayload(version), className, homeroom: info ? { code: info.homeroom_teacher_code, fullName: info.homeroom_name } : null, lessons: lessons.map((x) => ({ day: x.day_of_week, period: x.period, session: x.session, subject: x.subject, className: x.class_name, teacherCode: x.teacher_code, teacherName: teacherDisplay(x), raw: x.raw_value })) });
});

app.get('/api/timetable/teacher', (req, res) => {
  const date = requestedDate(req);
  const version = resolveVersion(date);
  if (!version) return res.json({ date, version: null, teacherCode: req.query.teacherCode || '', lessons: [] });
  const teacherCode = String(req.query.teacherCode || '').trim();
  if (!teacherCode) return res.status(400).json({ error: 'Thiếu giáo viên.' });
  const teacher = db.prepare(`SELECT * FROM teachers WHERE code = ?`).get(teacherCode) || { code: teacherCode, full_name: null, subject: null };
  const lessons = db.prepare(`SELECT * FROM lessons WHERE version_id = ? AND teacher_code = ? ORDER BY day_of_week, CASE session WHEN 'Sáng' THEN 0 ELSE 1 END, period, class_name`).all(version.id, teacherCode);
  res.json({ date, version: versionPayload(version), teacher: { code: teacher.code, fullName: teacher.full_name, subject: teacher.subject, displayName: teacher.full_name || teacher.code }, lessons: lessons.map((x) => ({ day: x.day_of_week, period: x.period, session: x.session, subject: x.subject, className: x.class_name, raw: x.raw_value })) });
});

app.post('/api/admin/login', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!allowLogin(ip)) return res.status(429).json({ error: 'Đăng nhập sai quá nhiều lần. Hãy thử lại sau.' });
  const user = String(req.body.username || '');
  const password = String(req.body.password || '');
  const digest = (value) => crypto.createHash('sha256').update(value).digest();
  const okUser = crypto.timingSafeEqual(digest(user), digest(ADMIN_USER));
  const okPassword = crypto.timingSafeEqual(digest(password), digest(ADMIN_PASSWORD));
  if (!okUser || !okPassword) { recordFailure(ip); return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu.' }); }
  attempts.delete(ip);
  const token = auth.issue(ADMIN_USER);
  res.setHeader('Set-Cookie', `hvt_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${isProduction ? '; Secure' : ''}`);
  res.json({ ok: true, username: ADMIN_USER });
});

app.post('/api/admin/logout', (_req, res) => { res.setHeader('Set-Cookie', 'hvt_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/admin/me', adminOnly, (req, res) => res.json({ ok: true, username: req.admin }));

app.post('/api/admin/upload-timetable', adminOnly, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Bạn chưa chọn file Excel.' });
    const effectiveDate = String(req.body.effectiveDate || '');
    if (!validateDate(effectiveDate)) return res.status(400).json({ error: 'Ngày áp dụng không hợp lệ.' });
    const parsed = parseTimetableWorkbook(req.file.buffer);
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const name = String(req.body.name || '').trim() || `TKB áp dụng ${effectiveDate}`;
    const versionId = importVersion({ name, effectiveDate, filename: req.file.originalname, fileHash: hash, importedBy: req.admin, parsed });
    res.json({ ok: true, versionId, lessonCount: parsed.lessons.length, classCount: parsed.classInfo.length, sheets: parsed.parsedSheets });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể đọc file Excel.' }); }
});

app.post('/api/admin/import-teachers', adminOnly, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Bạn chưa chọn file danh sách giáo viên.' });
    const teachers = parseTeacherRoster(req.file.buffer);
    const count = importTeachers(teachers);
    res.json({ ok: true, count });
  } catch (error) { res.status(400).json({ error: error.message || 'Không thể import danh sách giáo viên.' });
  }
});

app.get('/api/admin/export-teachers', adminOnly, (_req, res) => {
  const teachers = db.prepare(`SELECT * FROM teachers ORDER BY COALESCE(full_name, code), code`).all();
  const buffer = buildTeacherWorkbook(teachers);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Danh_sach_giao_vien.xlsx"');
  res.send(buffer);
});

app.get('/api/admin/teacher-template', adminOnly, (_req, res) => {
  const buffer = buildTeacherWorkbook([{ code: 'GV001', full_name: 'Nguyễn Văn A', subject: 'Toán', active: 1 }]);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Mau_import_giao_vien.xlsx"');
  res.send(buffer);
});

app.get('/api/admin/export-teacher-timetables', adminOnly, (req, res) => {
  const date = requestedDate(req);
  const version = resolveVersion(date);
  if (!version) return res.status(404).json({ error: 'Không có TKB phù hợp ngày đã chọn.' });
  const rows = db.prepare(`SELECT l.*, t.full_name FROM lessons l LEFT JOIN teachers t ON t.code = l.teacher_code WHERE l.version_id = ? AND l.teacher_code IS NOT NULL AND l.teacher_code <> '' ORDER BY COALESCE(t.full_name, l.teacher_code), l.teacher_code, l.day_of_week, CASE l.session WHEN 'Sáng' THEN 0 ELSE 1 END, l.period`).all(version.id);
  const buffer = buildTeacherTimetableWorkbook(rows, version.effective_date);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="TKB_giao_vien_${version.effective_date}.xlsx"`);
  res.send(buffer);
});

app.delete('/api/admin/versions/:id', adminOnly, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID không hợp lệ.' });
  const info = db.prepare('DELETE FROM versions WHERE id = ?').run(id);
  res.json({ ok: true, deleted: info.changes });
});

app.use((error, _req, res, _next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File quá lớn (tối đa 15 MB).' });
  console.error(error);
  res.status(500).json({ error: 'Lỗi máy chủ.' });
});

app.listen(PORT, '0.0.0.0', () => { console.log(`HVT Timetable running at http://localhost:${PORT}`); });
