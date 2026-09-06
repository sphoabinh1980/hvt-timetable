import fs from 'node:fs';
import { parseTimetableWorkbook } from '../src/parser.js';

const file = process.argv[2];
if (!file) {
  console.error('Dùng: npm run validate -- /duong-dan/TKBL1.xlsx');
  process.exit(1);
}
const parsed = parseTimetableWorkbook(fs.readFileSync(file));
const teachers = new Set(parsed.lessons.map(x => x.teacherCode).filter(Boolean));
console.log(JSON.stringify({ file, lessons: parsed.lessons.length, classes: parsed.classInfo.length, teachers: teachers.size, sheets: parsed.parsedSheets }, null, 2));
