export const DAYS = [2,3,4,5,6,7];
export const DAY_LABEL = {2:'Thứ 2',3:'Thứ 3',4:'Thứ 4',5:'Thứ 5',6:'Thứ 6',7:'Thứ 7'};
export const SESSIONS = [
  {name:'Sáng', periods:[1,2,3,4,5], className:'morning', note:'5 tiết'},
  {name:'Chiều', periods:[1,2,3,4], className:'afternoon', note:'4 tiết'}
];

const SUBJECT_NAMES={
  'T':'Toán','T1':'Toán','V':'Ngữ văn','TN':'Tin học','Tin':'Tin học',
  'L':'Vật lý','LY':'Vật lý','H':'Hóa học','H1':'Hóa học','Hóa2':'Hóa học',
  'S':'Sinh học','S1':'Sinh học','SU':'Lịch sử','Đ':'Địa lý',
  'A':'Tiếng Anh','A1':'Tiếng Anh','P':'Tiếng Pháp','N':'Tiếng Nga','TQ':'Tiếng Trung',
  'CN':'Công nghệ','GDTC':'Giáo dục thể chất','GDQP':'GDQP-AN','QPAN':'GDQP-AN',
  'GDKT&PL':'Giáo dục KT&PL','KTPL':'Giáo dục KT&PL','GDĐP':'Giáo dục địa phương','GDĐP1':'Giáo dục địa phương',
  'TrN':'Hoạt động trải nghiệm','TrNg':'Hoạt động trải nghiệm','Nâng cao':'Nâng cao','Nângcao':'Nâng cao','ÔnTN':'Ôn tốt nghiệp'
};

const TEACHER_NAMES={
  'B.M.Tuấn':'Bùi Mạnh Tuấn','B.T.Hiền':'Bùi Thị Hiền','B.T.Hương':'Bùi Thị Hương','B.T.T.Cúc':'Bùi Thị Thu Cúc','B.T.T.Ngân':'Bùi Thị Thúy Ngân','B.T.T.Phương':'Bùi Thị Thanh Phương','B.V.Thiện':'Bùi Văn Thiện','B.V.Đường':'Bùi Văn Đường','B.Đ.Dương':'Bùi Đức Dương',
  'H.H.Hà':'Hoàng Hải Hà','H.M.Linh':'Hoàng Mai Linh','H.N.Khánh':'Hoàng Ngân Khánh','H.T.Hảo':'Hoàng Thị Hảo','H.T.Sáu':'Hoàng Thị Sáu','K.V.Mạnh':'Kiều Vũ Mạnh',
  'L.H.Hà':'Lương Hoàng Hà','L.N.Thuyết':'Lương Ngọc Thuyết','L.T.H.Hạnh':'Lê Thị Hồng Hạnh','L.T.Hường':'Lê Thị Hường','L.T.K.Tuyến':'Lý Thị Kim Tuyến','L.T.Nam':'Lê Thành Nam','L.T.Nghĩa':'Lê Thanh Nghĩa','L.T.Nguyệt':'Lê Thị Nguyệt','L.T.Nhung':'Lê Thùy Nhung','L.T.T.Oanh':'Lưu Thị Thu Oanh','L.T.Vinh':'Lưu Thị Vinh','L.Đ.Thọ':'Lê Đức Thọ',
  'M.T.T.Ninh':'Mai Thị Thúy Ninh','N.C.Nhung':'Nguyễn Cẩm Nhung','N.C.Tâm':'Nguyễn Chí Tâm','N.G.Hương':'Nguyễn Giáng Hương','N.H.Thái':'Nguyễn Hồng Thái','N.K.Thủy':'Nguyễn Kim Thủy','N.M.Hùng':'Nguyễn Mạnh Hùng','N.M.Loan':'Nguyễn Minh Loan','N.M.Tuấn':'Nguyễn Mạnh Tuấn','N.N.Hà':'Nguyễn Ngọc Hà','N.N.Thủy':'Nguyễn Ngọc Thủy','N.N.Xuân':'Nguyễn Ngọc Xuân','N.P.Thành':'Nguyễn Phú Thành',
  'N.T.B.Hòa':'Nguyễn Thị Bích Hòa','N.T.Dũng':'Nguyễn Tiến Dũng','N.T.H.Lan':'Nguyễn Thị Hương Lan','N.T.H.Thanh':'Nguyễn Thị Hồng Thanh','N.T.Hòa':'Nguyễn Thị Hòa','N.T.L.Anh':'Nguyễn Thị Lan Anh','N.T.Long':'Nguyễn Thanh Long','N.T.Lý':'Nguyễn Thị Lý','N.T.M.Anh':'Nguyễn Thị Mai Anh','N.T.M.Nguyệt':'Nguyễn Thị Minh Nguyệt','N.T.N.Hà':'Nguyễn Ngọc Hà','N.T.Nhung':'Nguyễn Thị Nhung','N.T.P.Loan':'Nguyễn Thị Phương Loan','N.T.Phương':'Nguyễn Thu Phương','N.T.Quý':'Nguyễn Thị Quý','N.T.T.Cảnh':'Nguyễn Thị Thanh Cảnh','N.T.T.Hoan':'Ngô Thị Tố Hoan','N.T.T.Huyền':'Nguyễn Thị Thu Huyền','N.T.T.Hương':'Nguyễn Thị Thanh Hương','N.T.T.Hường':'Nguyễn Thị Thu Hường','N.T.T.Trang':'Nguyễn Thị Thu Trang','N.T.T.Vân':'Nguyễn Thị Thanh Vân','N.T.Thúy':'Nguyễn Thị Thúy','N.T.Tùng':'Nguyễn Tiến Tùng','N.T.V.Hà':'Nguyễn Thị Việt Hà','N.T.Đức':'Nguyễn Tiến Đức','N.V.Nam':'Nguyễn Văn Nam','N.V.Thụ':'Nguyễn Văn Thụ',
  'P.H.Quang':'Phạm Hồng Quang','P.M.Anh':'Phan Mai Anh','P.N.L.Hương':'Phùng Ngọc Liên Hương','P.T.B.Hiền':'Phạm Thị Bích Hiền','P.T.Huệ':'Phan Thị Huệ','P.T.Khuyên':'Phạm Thị Khuyên','P.T.M.Hòa':'Phạm Thị Minh Hòa','P.T.Mai':'Phạm Thị Mai','P.T.Minh':'Phạm Thị Minh','P.T.Ngân':'Phạm Thùy Ngân','P.Đ.Mẫn':'Phạm Đình Mẫn','P.Đ.Thắng':'Phùng Đình Thắng',
  'Q.T.T.Phương':'Quản Thị Thu Phương','Q.T.T.Quế':'Quách Thị Thu Quế','T.M.Hạnh':'Trần Mỹ Hạnh','T.T.N.Quỳnh':'Trần Thị Ngọc Quỳnh','T.T.P.Thùy':'Trần Thị Phương Thùy','T.T.T.Huế':'Trần Thị Thu Huế','T.T.T.Hà':'Tô Thị Thanh Hà','T.T.T.Hương':'Trịnh Thị Thanh Hương','T.V.Hùng':'Trần Văn Hùng',
  'V.C.Cường':'Vũ Cao Cường','V.T.H.Xiêm':'Vũ Thị Hoàng Xiêm','V.T.Hiền':'Vũ Thị Hiền','V.T.Hằng':'Vũ Thị Hằng','V.X.Thanh':'Vũ Xuân Thanh','Đ.H.Lan':'Đinh Hoàng Lan','Đ.Q.Nga':'Đỗ Quỳnh Nga','Đ.T.H.Nhung':'Đặng Thị Hồng Nhung','Đ.T.Hường':'Đinh Thu Hường','Đ.T.K.Nho':'Đinh Thị Kim Nho','Đ.T.L.Anh':'Đặng Thị Lan Anh','Đ.T.T.Hằng':'Đinh Thị Thúy Hằng','Đ.T.T.Linh':'Đỗ Thị Thùy Linh','Đ.T.T.Mai':'Đào Thị Thúy Mai'
};

const HOMEROOM_NAMES={
  '10T1':'Nguyễn Ngọc Xuân','10T2':'Nguyễn Thanh Long','10L':'Nguyễn Minh Loan','10H':'Võ Thị Phương Thảo','10S':'Đặng Thị Lan Anh','10TIN':'Lê Thanh Nghĩa','10V1':'Nguyễn Giáng Hương','10V2':'Nguyễn Kim Thủy','10SỬ':'Nguyễn Ngọc Hà','10Đ':'Vũ Xuân Thanh','10A1':'Hoàng Hải Hà','10A2':'Nguyễn Thị Thu Hường','10P':'Nguyễn Thị Bích Hòa','10N':'Đặng Thị Hồng Nhung','10TQ':'Nguyễn Thị Lan Anh',
  '11T':'Bùi Thị Hương','11L':'Phạm Đình Mẫn','11H':'Nguyễn Thị Hương Lan','11S':'Nguyễn Thị Nhung','11TIN':'Nguyễn Thị Phương Loan','11V':'Vũ Thị Hằng','11SỬ':'Vũ Thị Phương Thảo','11Đ':'Nguyễn Thị Thu Trang','11A1':'Nguyễn Thị Thanh Hương','11A2':'Phạm Thị Minh','11P':'Nguyễn Phương Nga','11N':'Phan Mai Anh','11TQ':'Nguyễn Thị Hạnh (Tiếng Trung)',
  '12T':'Nguyễn Chí Tâm','12L':'Phạm Hồng Quang','12H':'Hoàng Ngân Khánh','12S':'Kiều Vũ Mạnh','12TIN':'Nguyễn Thị Quý','12V':'Nguyễn Thị Hạnh (Ngữ văn)','12SỬ':'Phạm Thị Mai','12Đ':'Bùi Thị Thanh Phương','12A1':'Quản Thị Thu Phương','12A2':'Lê Thùy Nhung','12P':'Nguyễn Thị Việt Hà','12N':'Đỗ Thị Thùy Linh','12TQ':'Lê Thị Nguyệt'
};

function cleanTeacherCode(code=''){
  return String(code||'').replace(/\s+/g,'').trim();
}

export function subjectName(code=''){
  return SUBJECT_NAMES[String(code).trim()]||String(code).trim();
}

export function teacherFullName(code='',subject='',className='',fallback=''){
  const teacherCode=cleanTeacherCode(code);
  const subjectCode=String(subject||'').trim();
  const cls=String(className||'').trim();
  if(teacherCode==='N.P.Nga'){
    if(subjectCode==='P'||cls==='11P') return 'Nguyễn Phương Nga';
    if(['V','TrN','TrNg'].includes(subjectCode)) return 'Ninh Phương Nga';
  }
  if(teacherCode==='N.T.Hạnh'){
    if(subjectCode==='TQ'||cls==='11TQ') return 'Nguyễn Thị Hạnh (Tiếng Trung)';
    if(subjectCode==='V'||cls==='12V') return 'Nguyễn Thị Hạnh (Ngữ văn)';
  }
  if(teacherCode==='V.T.P.Thảo'){
    if(['H','H1','Hóa2'].includes(subjectCode)||cls==='10H') return 'Võ Thị Phương Thảo';
    if(subjectCode==='SU'||cls==='11SỬ') return 'Vũ Thị Phương Thảo';
  }
  if(teacherCode==='P.T.Nga'){
    if(['10P','12S','12SỬ','12SU'].includes(cls)) return 'Phạm Thị Nga';
    if(['10TIN','10TN','11N','11P'].includes(cls)) return 'Phạm Thanh Nga';
  }
  if(teacherCode==='M.T.T.Ninh') return 'Mai Thị Thúy Ninh';
  return TEACHER_NAMES[teacherCode]||fallback||teacherCode;
}

export function homeroomFullName(className='',code='',fallback=''){
  const cls=String(className||'').trim();
  return HOMEROOM_NAMES[cls]||teacherFullName(code,'',cls,fallback||code);
}

export function teacherNameForLesson(code='',subject='',className='',fallback=''){
  return teacherFullName(code,subject,className,fallback);
}

export function todayLocal(){
  const d = new Date();
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export function formatDate(value){
  if(!value) return '—';
  const [y,m,d]=value.split('-');
  return `${d}/${m}/${y}`;
}

export async function api(url, options={}){
  const res = await fetch(url, options);
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  if(!res.ok) throw new Error(data?.error || data || `HTTP ${res.status}`);
  return data;
}

export function escapeHtml(value=''){
  return String(value).replace(/[&<>'\"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function showToast(message, error=false){
  document.querySelector('.toast')?.remove();
  const el=document.createElement('div');
  el.className=`toast${error?' error':''}`;
  el.textContent=message;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),4200);
}

function lessonMarkup(item,mode,multiple=false){
  const code=escapeHtml(item.subject);
  const full=escapeHtml(subjectName(item.subject));
  if(mode==='class'){
    const teacherCode=escapeHtml(item.teacherCode||'');
    const teacherFull=escapeHtml(teacherNameForLesson(item.teacherCode,item.subject,item.className,item.teacherName||''));
    return `<div class="lesson compact${multiple?' multiple':''}" title="${full}${teacherFull?' · '+teacherFull:''}">
      <strong class="lesson-main">${code}</strong>
      <span class="lesson-secondary">${teacherCode || '—'}</span>
    </div>`;
  }
  return `<div class="lesson compact${multiple?' multiple':''}" title="${full}">
    <strong class="lesson-main">${code}</strong>
    <span class="lesson-secondary">${escapeHtml(item.className)}</span>
  </div>`;
}

function buildSessionIndex(lessons,session){
  const byKey=new Map();
  for(const lesson of lessons.filter(x=>x.session===session.name)){
    const key=`${lesson.day}|${lesson.period}`;
    if(!byKey.has(key)) byKey.set(key,[]);
    byKey.get(key).push(lesson);
  }
  return byKey;
}

function renderDesktopTable(byKey,session,mode){
  let html='<div class="desktop-schedule"><div class="schedule-wrap"><table class="schedule"><thead><tr><th class="slot">Tiết</th>';
  for(const day of DAYS) html+=`<th>${DAY_LABEL[day]}</th>`;
  html+='</tr></thead><tbody>';
  for(const period of session.periods){
    html+=`<tr><td class="slot"><span class="period-pill">T${period}</span></td>`;
    for(const day of DAYS){
      const items=byKey.get(`${day}|${period}`)||[];
      html+='<td>';
      if(!items.length) html+='<div class="empty">—</div>';
      else html+=items.map(item=>lessonMarkup(item,mode,items.length>1)).join('');
      html+='</td>';
    }
    html+='</tr>';
  }
  html+='</tbody></table></div></div>';
  return html;
}

function renderResponsiveCards(byKey,session,mode){
  let html='<div class="mobile-schedule"><div class="day-card-grid">';
  for(const day of DAYS){
    html+=`<section class="day-card"><header class="day-card-title">${DAY_LABEL[day]}</header><div class="day-card-body">`;
    for(const period of session.periods){
      const items=byKey.get(`${day}|${period}`)||[];
      html+=`<div class="mobile-period-row"><div class="mobile-period-label">T${period}</div><div class="mobile-period-content">`;
      if(!items.length) html+='<div class="mobile-empty">—</div>';
      else html+=items.map(item=>lessonMarkup(item,mode,items.length>1)).join('');
      html+='</div></div>';
    }
    html+='</div></section>';
  }
  html+='</div></div>';
  return html;
}

function renderSession(lessons,session,mode){
  const byKey=buildSessionIndex(lessons,session);
  return `<section class="session-panel ${session.className}">
    <div class="session-heading">
      <div><span class="session-kicker">BUỔI</span><h3>${session.name}</h3></div>
      <span class="session-note">${session.note}</span>
    </div>
    ${renderDesktopTable(byKey,session,mode)}
    ${renderResponsiveCards(byKey,session,mode)}
  </section>`;
}

export function renderGrid(container,lessons,mode='class'){
  container.innerHTML=SESSIONS.map(session=>renderSession(lessons,session,mode)).join('');
}

export async function setupBrand(){
  try{
    const cfg=await api('/api/config');
    document.querySelectorAll('[data-school]').forEach(x=>x.textContent=cfg.schoolName||'HVT');
  }catch{}
}
