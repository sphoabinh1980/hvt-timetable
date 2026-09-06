import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function createDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'hvt-timetable.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      source_filename TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      imported_at TEXT NOT NULL DEFAULT (datetime('now')),
      imported_by TEXT NOT NULL DEFAULT 'admin'
    );

    CREATE INDEX IF NOT EXISTS idx_versions_effective ON versions(effective_date DESC, id DESC);

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
      grade INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      period INTEGER NOT NULL,
      session TEXT NOT NULL,
      subject TEXT NOT NULL,
      teacher_code TEXT,
      raw_value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(version_id, class_name, day_of_week, session, period);
    CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(version_id, teacher_code, day_of_week, session, period);

    CREATE TABLE IF NOT EXISTS class_info (
      version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
      grade INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      homeroom_teacher_code TEXT,
      PRIMARY KEY (version_id, class_name)
    );

    CREATE TABLE IF NOT EXISTS teachers (
      code TEXT PRIMARY KEY,
      full_name TEXT,
      subject TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const insertVersion = db.prepare(`INSERT INTO versions(name, effective_date, source_filename, file_hash, imported_by) VALUES (?, ?, ?, ?, ?)`);
  const insertLesson = db.prepare(`INSERT INTO lessons(version_id, grade, class_name, day_of_week, period, session, subject, teacher_code, raw_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertClass = db.prepare(`INSERT OR REPLACE INTO class_info(version_id, grade, class_name, homeroom_teacher_code) VALUES (?, ?, ?, ?)`);
  const touchTeacher = db.prepare(`INSERT INTO teachers(code, full_name, subject, active) VALUES (?, NULL, ?, 1)
    ON CONFLICT(code) DO UPDATE SET subject = CASE WHEN teachers.subject IS NULL OR teachers.subject = '' THEN excluded.subject ELSE teachers.subject END, updated_at = datetime('now')`);

  const importVersion = db.transaction(({ name, effectiveDate, filename, fileHash, importedBy, parsed }) => {
    const versionId = Number(insertVersion.run(name, effectiveDate, filename, fileHash, importedBy).lastInsertRowid);
    for (const lesson of parsed.lessons) {
      insertLesson.run(versionId, lesson.grade, lesson.className, lesson.dayOfWeek, lesson.period, lesson.session, lesson.subject, lesson.teacherCode, lesson.rawValue);
      if (lesson.teacherCode) touchTeacher.run(lesson.teacherCode, lesson.subject);
    }
    for (const info of parsed.classInfo) {
      insertClass.run(versionId, info.grade, info.className, info.homeroomTeacherCode);
      if (info.homeroomTeacherCode) touchTeacher.run(info.homeroomTeacherCode, 'Chủ nhiệm');
    }
    return versionId;
  });

  const upsertTeacher = db.prepare(`INSERT INTO teachers(code, full_name, subject, active) VALUES (?, ?, ?, 1)
    ON CONFLICT(code) DO UPDATE SET full_name = excluded.full_name, subject = excluded.subject, active = 1, updated_at = datetime('now')`);
  const importTeachers = db.transaction((items) => {
    for (const item of items) upsertTeacher.run(item.code, item.fullName, item.subject || '');
    return items.length;
  });

  function resolveVersion(date) {
    return db.prepare(`SELECT * FROM versions WHERE effective_date <= ? ORDER BY effective_date DESC, id DESC LIMIT 1`).get(date) || null;
  }

  return { db, importVersion, importTeachers, resolveVersion };
}
