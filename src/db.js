import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import pg from 'pg';

const { Pool } = pg;

function inferredTeacherSubject(code,subject){
  return code==='N.T.Hòa'?'Đ':subject;
}

function sqliteStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'hvt-timetable.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS versions (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,effective_date TEXT NOT NULL,source_filename TEXT NOT NULL,file_hash TEXT NOT NULL,imported_at TEXT NOT NULL DEFAULT (datetime('now')),imported_by TEXT NOT NULL DEFAULT 'admin');
    CREATE INDEX IF NOT EXISTS idx_versions_effective ON versions(effective_date DESC,id DESC);
    CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY AUTOINCREMENT,version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,grade INTEGER NOT NULL,class_name TEXT NOT NULL,day_of_week INTEGER NOT NULL,period INTEGER NOT NULL,session TEXT NOT NULL,subject TEXT NOT NULL,teacher_code TEXT,raw_value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(version_id,class_name,day_of_week,session,period);
    CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(version_id,teacher_code,day_of_week,session,period);
    CREATE TABLE IF NOT EXISTS class_info (version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,grade INTEGER NOT NULL,class_name TEXT NOT NULL,homeroom_teacher_code TEXT,PRIMARY KEY(version_id,class_name));
    CREATE TABLE IF NOT EXISTS teachers (code TEXT PRIMARY KEY,full_name TEXT,subject TEXT,active INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS teacher_profiles (version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,profile_key TEXT NOT NULL,teacher_code TEXT NOT NULL,full_name TEXT NOT NULL,subject_code TEXT,subject_name TEXT,class_names TEXT NOT NULL DEFAULT '[]',PRIMARY KEY(version_id,profile_key));
    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_version_code ON teacher_profiles(version_id,teacher_code);
  `);
  db.prepare(`UPDATE teachers SET subject='Đ',updated_at=datetime('now') WHERE code='N.T.Hòa' AND (subject IS NULL OR subject='' OR subject IN ('TrN','TrNg','Chủ nhiệm'))`).run();

  const insertVersion=db.prepare(`INSERT INTO versions(name,effective_date,source_filename,file_hash,imported_by) VALUES(?,?,?,?,?)`);
  const insertLesson=db.prepare(`INSERT INTO lessons(version_id,grade,class_name,day_of_week,period,session,subject,teacher_code,raw_value) VALUES(?,?,?,?,?,?,?,?,?)`);
  const insertClass=db.prepare(`INSERT OR REPLACE INTO class_info(version_id,grade,class_name,homeroom_teacher_code) VALUES(?,?,?,?)`);
  const insertProfile=db.prepare(`INSERT OR REPLACE INTO teacher_profiles(version_id,profile_key,teacher_code,full_name,subject_code,subject_name,class_names) VALUES(?,?,?,?,?,?,?)`);
  const touchTeacher=db.prepare(`INSERT INTO teachers(code,full_name,subject,active) VALUES(?,NULL,?,1) ON CONFLICT(code) DO UPDATE SET subject=CASE WHEN teachers.subject IS NULL OR teachers.subject='' OR (teachers.code='N.T.Hòa' AND teachers.subject IN ('TrN','TrNg','Chủ nhiệm')) THEN excluded.subject ELSE teachers.subject END,updated_at=datetime('now')`);
  const importVersionTx=db.transaction(({name,effectiveDate,filename,fileHash,importedBy,parsed})=>{
    const versionId=Number(insertVersion.run(name,effectiveDate,filename,fileHash,importedBy).lastInsertRowid);
    for(const x of parsed.lessons){insertLesson.run(versionId,x.grade,x.className,x.dayOfWeek,x.period,x.session,x.subject,x.teacherCode,x.rawValue);if(x.teacherCode)touchTeacher.run(x.teacherCode,inferredTeacherSubject(x.teacherCode,x.subject));}
    for(const x of parsed.classInfo){insertClass.run(versionId,x.grade,x.className,x.homeroomTeacherCode);if(x.homeroomTeacherCode)touchTeacher.run(x.homeroomTeacherCode,'Chủ nhiệm');}
    for(const x of parsed.teacherProfiles||[]){
      insertProfile.run(versionId,x.profileKey,x.teacherCode,x.fullName,x.subjectCode||'',x.subjectName||'',JSON.stringify(x.classNames||[]));
      const current=db.prepare(`SELECT full_name FROM teachers WHERE code=?`).get(x.teacherCode);
      if(!current?.full_name) db.prepare(`UPDATE teachers SET full_name=?,subject=CASE WHEN subject IS NULL OR subject='' OR subject='Chủ nhiệm' THEN ? ELSE subject END,updated_at=datetime('now') WHERE code=?`).run(x.fullName,x.subjectCode||'',x.teacherCode);
    }
    return versionId;
  });
  const upsertTeacher=db.prepare(`INSERT INTO teachers(code,full_name,subject,active) VALUES(?,?,?,1) ON CONFLICT(code) DO UPDATE SET full_name=excluded.full_name,subject=excluded.subject,active=1,updated_at=datetime('now')`);
  const importTeachersTx=db.transaction(items=>{for(const x of items)upsertTeacher.run(x.code,x.fullName,x.subject||'');return items.length;});

  return {
    kind:'sqlite',db,
    close(){db.close();},
    importVersion:p=>importVersionTx(p),
    importTeachers:i=>importTeachersTx(i),
    resolveVersion:d=>db.prepare(`SELECT * FROM versions WHERE effective_date<=? ORDER BY effective_date DESC,id DESC LIMIT 1`).get(d)||null,
    listVersions:()=>db.prepare(`SELECT v.*,COUNT(l.id) lesson_count FROM versions v LEFT JOIN lessons l ON l.version_id=v.id GROUP BY v.id ORDER BY v.effective_date DESC,v.id DESC`).all(),
    getOptions(versionId){
      const classes=db.prepare(`SELECT ci.class_name,ci.grade,ci.homeroom_teacher_code,t.full_name homeroom_name FROM class_info ci LEFT JOIN teachers t ON REPLACE(t.code,' ','')=REPLACE(ci.homeroom_teacher_code,' ','') WHERE ci.version_id=? ORDER BY ci.grade,ci.class_name`).all(versionId);
      const teachers=db.prepare(`SELECT DISTINCT l.teacher_code code,t.full_name,COALESCE(t.subject,'') subject FROM lessons l LEFT JOIN teachers t ON t.code=l.teacher_code WHERE l.version_id=? AND l.teacher_code IS NOT NULL AND l.teacher_code<>'' ORDER BY COALESCE(t.full_name,l.teacher_code),l.teacher_code`).all(versionId);
      const profiles=db.prepare(`SELECT profile_key,teacher_code code,full_name,subject_code,subject_name,class_names FROM teacher_profiles WHERE version_id=? ORDER BY teacher_code,subject_code,full_name`).all(versionId).map(x=>({...x,class_names:JSON.parse(x.class_names||'[]')}));
      return {classes,teachers,profiles};
    },
    getClassTimetable(versionId,className){return {lessons:db.prepare(`SELECT l.*,t.full_name FROM lessons l LEFT JOIN teachers t ON t.code=l.teacher_code WHERE l.version_id=? AND l.class_name=? ORDER BY l.day_of_week,CASE l.session WHEN 'Sáng' THEN 0 ELSE 1 END,l.period`).all(versionId,className),info:db.prepare(`SELECT ci.*,t.full_name homeroom_name FROM class_info ci LEFT JOIN teachers t ON REPLACE(t.code,' ','')=REPLACE(ci.homeroom_teacher_code,' ','') WHERE ci.version_id=? AND ci.class_name=?`).get(versionId,className)||null};},
    getTeacher:code=>db.prepare(`SELECT * FROM teachers WHERE code=?`).get(code)||null,
    getTeacherLessons:(versionId,code)=>db.prepare(`SELECT * FROM lessons WHERE version_id=? AND teacher_code=? ORDER BY day_of_week,CASE session WHEN 'Sáng' THEN 0 ELSE 1 END,period,class_name`).all(versionId,code),
    listTeachers:()=>db.prepare(`SELECT * FROM teachers ORDER BY COALESCE(full_name,code),code`).all(),
    getTeacherTimetableRows:versionId=>db.prepare(`SELECT l.*,t.full_name FROM lessons l LEFT JOIN teachers t ON t.code=l.teacher_code WHERE l.version_id=? AND l.teacher_code IS NOT NULL AND l.teacher_code<>'' ORDER BY COALESCE(t.full_name,l.teacher_code),l.teacher_code,l.day_of_week,CASE l.session WHEN 'Sáng' THEN 0 ELSE 1 END,l.period`).all(versionId),
    deleteVersion:id=>db.prepare(`DELETE FROM versions WHERE id=?`).run(id).changes
  };
}

async function postgresStore(databaseUrl){
  const pool=new Pool({connectionString:databaseUrl,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:10000});
  await pool.query('SELECT 1');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS versions (id BIGSERIAL PRIMARY KEY,name TEXT NOT NULL,effective_date DATE NOT NULL,source_filename TEXT NOT NULL,file_hash TEXT NOT NULL,imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),imported_by TEXT NOT NULL DEFAULT 'admin');
    CREATE INDEX IF NOT EXISTS idx_versions_effective ON versions(effective_date DESC,id DESC);
    CREATE TABLE IF NOT EXISTS lessons (id BIGSERIAL PRIMARY KEY,version_id BIGINT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,grade INTEGER NOT NULL,class_name TEXT NOT NULL,day_of_week INTEGER NOT NULL,period INTEGER NOT NULL,session TEXT NOT NULL,subject TEXT NOT NULL,teacher_code TEXT,raw_value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(version_id,class_name,day_of_week,session,period);
    CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(version_id,teacher_code,day_of_week,session,period);
    CREATE TABLE IF NOT EXISTS class_info (version_id BIGINT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,grade INTEGER NOT NULL,class_name TEXT NOT NULL,homeroom_teacher_code TEXT,PRIMARY KEY(version_id,class_name));
    CREATE TABLE IF NOT EXISTS teachers (code TEXT PRIMARY KEY,full_name TEXT,subject TEXT,active INTEGER NOT NULL DEFAULT 1,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS teacher_profiles (version_id BIGINT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,profile_key TEXT NOT NULL,teacher_code TEXT NOT NULL,full_name TEXT NOT NULL,subject_code TEXT,subject_name TEXT,class_names TEXT NOT NULL DEFAULT '[]',PRIMARY KEY(version_id,profile_key));
    CREATE INDEX IF NOT EXISTS idx_teacher_profiles_version_code ON teacher_profiles(version_id,teacher_code);
  `);
  await pool.query(`UPDATE teachers SET subject='Đ',updated_at=NOW() WHERE code='N.T.Hòa' AND (subject IS NULL OR subject='' OR subject IN ('TrN','TrNg','Chủ nhiệm'))`);
  const norm=row=>row?{...row,effective_date:row.effective_date instanceof Date?row.effective_date.toISOString().slice(0,10):String(row.effective_date).slice(0,10)}:null;
  return {
    kind:'postgres',
    async close(){await pool.end();},
    async importVersion({name,effectiveDate,filename,fileHash,importedBy,parsed}){
      const c=await pool.connect();
      try{
        await c.query('BEGIN');
        const r=await c.query(`INSERT INTO versions(name,effective_date,source_filename,file_hash,imported_by) VALUES($1,$2,$3,$4,$5) RETURNING id`,[name,effectiveDate,filename,fileHash,importedBy]);
        const versionId=Number(r.rows[0].id);
        for(const x of parsed.lessons){
          await c.query(`INSERT INTO lessons(version_id,grade,class_name,day_of_week,period,session,subject,teacher_code,raw_value) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[versionId,x.grade,x.className,x.dayOfWeek,x.period,x.session,x.subject,x.teacherCode,x.rawValue]);
          if(x.teacherCode)await c.query(`INSERT INTO teachers(code,full_name,subject,active) VALUES($1,NULL,$2,1) ON CONFLICT(code) DO UPDATE SET subject=CASE WHEN teachers.subject IS NULL OR teachers.subject='' OR (teachers.code='N.T.Hòa' AND teachers.subject IN ('TrN','TrNg','Chủ nhiệm')) THEN EXCLUDED.subject ELSE teachers.subject END,updated_at=NOW()`,[x.teacherCode,inferredTeacherSubject(x.teacherCode,x.subject)]);
        }
        for(const x of parsed.classInfo){
          await c.query(`INSERT INTO class_info(version_id,grade,class_name,homeroom_teacher_code) VALUES($1,$2,$3,$4) ON CONFLICT(version_id,class_name) DO UPDATE SET grade=EXCLUDED.grade,homeroom_teacher_code=EXCLUDED.homeroom_teacher_code`,[versionId,x.grade,x.className,x.homeroomTeacherCode]);
          if(x.homeroomTeacherCode)await c.query(`INSERT INTO teachers(code,full_name,subject,active) VALUES($1,NULL,'Chủ nhiệm',1) ON CONFLICT(code) DO UPDATE SET subject=CASE WHEN teachers.subject IS NULL OR teachers.subject='' THEN EXCLUDED.subject ELSE teachers.subject END,updated_at=NOW()`,[x.homeroomTeacherCode]);
        }
        for(const x of parsed.teacherProfiles||[]){
          await c.query(`INSERT INTO teacher_profiles(version_id,profile_key,teacher_code,full_name,subject_code,subject_name,class_names) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(version_id,profile_key) DO UPDATE SET teacher_code=EXCLUDED.teacher_code,full_name=EXCLUDED.full_name,subject_code=EXCLUDED.subject_code,subject_name=EXCLUDED.subject_name,class_names=EXCLUDED.class_names`,[versionId,x.profileKey,x.teacherCode,x.fullName,x.subjectCode||'',x.subjectName||'',JSON.stringify(x.classNames||[])]);
          await c.query(`UPDATE teachers SET full_name=COALESCE(full_name,$1),subject=CASE WHEN subject IS NULL OR subject='' OR subject='Chủ nhiệm' THEN $2 ELSE subject END,updated_at=NOW() WHERE code=$3`,[x.fullName,x.subjectCode||'',x.teacherCode]);
        }
        await c.query('COMMIT');return versionId;
      }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
    },
    async importTeachers(items){const c=await pool.connect();try{await c.query('BEGIN');for(const x of items)await c.query(`INSERT INTO teachers(code,full_name,subject,active) VALUES($1,$2,$3,1) ON CONFLICT(code) DO UPDATE SET full_name=EXCLUDED.full_name,subject=EXCLUDED.subject,active=1,updated_at=NOW()`,[x.code,x.fullName,x.subject||'']);await c.query('COMMIT');return items.length;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}},
    async resolveVersion(date){const r=await pool.query(`SELECT * FROM versions WHERE effective_date<=$1 ORDER BY effective_date DESC,id DESC LIMIT 1`,[date]);return norm(r.rows[0]||null);},
    async listVersions(){const r=await pool.query(`SELECT v.*,COUNT(l.id)::int lesson_count FROM versions v LEFT JOIN lessons l ON l.version_id=v.id GROUP BY v.id ORDER BY v.effective_date DESC,v.id DESC`);return r.rows.map(norm);},
    async getOptions(versionId){
      const [a,b,p]=await Promise.all([
        pool.query(`SELECT ci.class_name,ci.grade,ci.homeroom_teacher_code,t.full_name homeroom_name FROM class_info ci LEFT JOIN teachers t ON REPLACE(t.code,' ','')=REPLACE(ci.homeroom_teacher_code,' ','') WHERE ci.version_id=$1 ORDER BY ci.grade,ci.class_name`,[versionId]),
        pool.query(`SELECT DISTINCT l.teacher_code code,t.full_name,COALESCE(t.subject,'') subject FROM lessons l LEFT JOIN teachers t ON t.code=l.teacher_code WHERE l.version_id=$1 AND l.teacher_code IS NOT NULL AND l.teacher_code<>'' ORDER BY COALESCE(t.full_name,l.teacher_code),l.teacher_code`,[versionId]),
        pool.query(`SELECT profile_key,teacher_code code,full_name,subject_code,subject_name,class_names FROM teacher_profiles WHERE version_id=$1 ORDER BY teacher_code,subject_code,full_name`,[versionId])
      ]);
      return {classes:a.rows,teachers:b.rows,profiles:p.rows.map(x=>({...x,class_names:JSON.parse(x.class_names||'[]')}))};
    },
    async getClassTimetable(versionId,className){const [a,b]=await Promise.all([pool.query(`SELECT l.*,t.full_name FROM lessons l LEFT JOIN teachers t ON t.code=l.teacher_code WHERE l.version_id=$1 AND l.class_name=$2 ORDER BY l.day_of_week,CASE l.session WHEN 'Sáng' THEN 0 ELSE 1 END,l.period`,[versionId,className]),pool.query(`SELECT ci.*,t.full_name homeroom_name FROM class_info ci LEFT JOIN teachers t ON REPLACE(t.code,' ','')=REPLACE(ci.homeroom_teacher_code,' ','') WHERE ci.version_id=$1 AND ci.class_name=$2 LIMIT 1`,[versionId,className])]);return {lessons:a.rows,info:b.rows[0]||null};},
    async getTeacher(code){const r=await pool.query(`SELECT * FROM teachers WHERE code=$1 LIMIT 1`,[code]);return r.rows[0]||null;},
    async getTeacherLessons(versionId,code){return (await pool.query(`SELECT * FROM lessons WHERE version_id=$1 AND teacher_code=$2 ORDER BY day_of_week,CASE session WHEN 'Sáng' THEN 0 ELSE 1 END,period,class_name`,[versionId,code])).rows;},
    async listTeachers(){return (await pool.query(`SELECT * FROM teachers ORDER BY COALESCE(full_name,code),code`)).rows;},
    async getTeacherTimetableRows(versionId){return (await pool.query(`SELECT l.*,t.full_name FROM lessons l LEFT JOIN teachers t ON t.code=l.teacher_code WHERE l.version_id=$1 AND l.teacher_code IS NOT NULL AND l.teacher_code<>'' ORDER BY COALESCE(t.full_name,l.teacher_code),l.teacher_code,l.day_of_week,CASE l.session WHEN 'Sáng' THEN 0 ELSE 1 END,l.period`,[versionId])).rows;},
    async deleteVersion(id){return (await pool.query(`DELETE FROM versions WHERE id=$1`,[id])).rowCount||0;}
  };
}

export function createDb(options={}){
  if(typeof options==='string')return sqliteStore(options);
  const {dataDir,databaseUrl}=options||{};
  if(databaseUrl)return postgresStore(databaseUrl);
  return sqliteStore(dataDir||path.resolve('./data'));
}
