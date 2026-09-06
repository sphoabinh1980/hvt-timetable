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

export function subjectName(code=''){
  return SUBJECT_NAMES[String(code).trim()]||String(code).trim();
}

export function teacherNameForLesson(code='',subject='',className='',fallback=''){
  const teacherCode=String(code||'').trim();
  const subjectCode=String(subject||'').trim();
  const cls=String(className||'').trim();

  if(teacherCode==='N.P.Nga'){
    if(subjectCode==='P') return 'Nguyễn Phương Nga';
    if(['V','TrN','TrNg'].includes(subjectCode)) return 'Ninh Phương Nga';
  }
  if(teacherCode==='N.T.Hạnh'){
    if(subjectCode==='V') return 'Nguyễn Thị Hạnh (Ngữ văn)';
    if(subjectCode==='TQ') return 'Nguyễn Thị Hạnh (Tiếng Trung)';
  }
  if(teacherCode==='V.T.P.Thảo'){
    if(['H','H1','Hóa2'].includes(subjectCode)) return 'Võ Thị Phương Thảo';
    if(subjectCode==='SU') return 'Vũ Thị Phương Thảo';
  }
  if(teacherCode==='P.T.Nga'){
    if(['10P','12S','12SỬ','12SU'].includes(cls)) return 'Phạm Thị Nga';
    if(['10TIN','10TN','11N','11P'].includes(cls)) return 'Phạm Thanh Nga';
  }
  if(teacherCode==='M.T.T.Ninh') return 'Mai Thị Thúy Ninh';

  if(teacherCode==='N.T.T.Hoan' && cls==='10N' && ['L','LY'].includes(subjectCode)) return 'Bùi Thị Hiền';
  if(teacherCode==='N.T.T.Hoan') return 'Ngô Thị Tố Hoan';

  return fallback||teacherCode;
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
