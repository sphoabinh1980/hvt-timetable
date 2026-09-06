import pg from 'pg';

pg.types.setTypeParser(1082, (value) => value);

const badOrder = "ORDER BY COALESCE(t.full_name,l.teacher_code),l.teacher_code";
const goodOrder = "ORDER BY t.full_name NULLS LAST,l.teacher_code";

function patchQuery(proto) {
  const original = proto.query;
  if (original.__hvtPatched) return;
  function patched(...args) {
    const first = args[0];
    if (typeof first === 'string' && first.includes('SELECT DISTINCT l.teacher_code code') && first.includes(badOrder)) {
      args[0] = first.replace(badOrder, goodOrder);
    } else if (first && typeof first === 'object' && typeof first.text === 'string' && first.text.includes('SELECT DISTINCT l.teacher_code code') && first.text.includes(badOrder)) {
      args[0] = { ...first, text: first.text.replace(badOrder, goodOrder) };
    }
    return original.apply(this, args);
  }
  patched.__hvtPatched = true;
  proto.query = patched;
}

patchQuery(pg.Pool.prototype);
patchQuery(pg.Client.prototype);
