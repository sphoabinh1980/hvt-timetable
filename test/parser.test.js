import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { parseTimetableWorkbook } from '../src/parser.js';

function workbookBuffer() {
  const wb = XLSX.utils.book_new();
  const k10 = [['THỜI KHÓA BIỂU'],['BUỔI SÁNG'],['Áp dụng'],['CHỦ NHIỆM', null, 'GV CN 10T1', 'GV CN 10L'],['Thứ', 'Tiết', '10T1', '10L'],['Thứ 2', 1, 'T - GV01', 'V - GV02'],[null, 2, 'GDTC', 'T - GV01']];
  const k11 = [['THỜI KHÓA BIỂU'],['BUỔI CHIỀU'],['Áp dụng'],['TT', null, null, 'GV CN 11T'],['Thứ', 'Buổi', 'Tiết', '11T'],['Thứ 3', 'Chiều', 1, 'H - GV03']];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(k10), 'Khoi10-S');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(k11), 'Khoi11-C');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

test('đọc được hai kiểu bố cục khối 10 và 11/12', () => {
  const parsed = parseTimetableWorkbook(workbookBuffer());
  assert.equal(parsed.classInfo.length, 3);
  assert.equal(parsed.lessons.length, 5);
  assert.equal(parsed.lessons.find(x => x.rawValue === 'T - GV01').teacherCode, 'GV01');
  assert.equal(parsed.lessons.find(x => x.rawValue === 'GDTC').teacherCode, null);
  assert.equal(parsed.lessons.find(x => x.className === '11T').session, 'Chiều');
});
