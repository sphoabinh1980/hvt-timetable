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

const TEACHER_NAME_OVERRIDES={
  'N.P.Nga':{
    'P':'Nguyễn Phương Nga',
    'V':'Ninh Phương Nga',
    'TrN':'Ninh Phương Nga',
    'TrNg':'Ninh Phương Nga'
  },
  'N.T.Hạnh':{
    'V':'Nguyễn Thị Hạnh (Ngữ văn)',
    'TQ':'Nguyễn Thị Hạnh (Tiếng Trung)'
  }
};

export function subjectName(code=''){
  return SUBJECT_NAMES[String(code).trim()]||String(code).trim();
}

export function teacherNameForLesson(code='',subject='',fallback=''){
  const teacherCode=String(code||'').trim();
  const subjectCode=String(subject||'').trim();
  return TEACHER_NAME_OVERRIDES[teacherCode]?.[subjectCode]||fallback||teacherCode;
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

function renderSession(lessons, session, mode){
  const byKey=new Map();
  for(const lesson of lessons.filter(x=>x.session===session.name)){
    const key=`${lesson.day}|${lesson.period}`;
    if(!byKey.has(key)) byKey.set(key,[]);
    byKey.get(key).push(lesson);
  }

  let html=`<section class="session-panel ${session.className}">
    <div class="session-heading">
      <div><span class="session-kicker">BUỔI</span><h3>${session.name}</h3></div>
      <span class="session-note">${session.note}</span>
    </div>
    <div class="schedule-wrap"><table class="schedule"><thead><tr><th class="slot">Tiết</th>`;
  for(const day of DAYS) html+=`<th>${DAY_LABEL[day]}</th>`;
  html+='</tr></thead><tbody>';

  for(const period of session.periods){
    html+=`<tr><td class="slot"><span class="period-pill">T${period}</span></td>`;
    for(const day of DAYS){
      const items=byKey.get(`${day}|${period}`)||[];
      html+='<td>';
      if(!items.length){
        html+='<div class="empty">—</div>';
      }else{
        for(const item of items){
          if(mode==='class'){
            const code=escapeHtml(item.subject);
            const full=escapeHtml(subjectName(item.subject));
            const teacherCode=escapeHtml(item.teacherCode||'');
            const teacherFull=escapeHtml(teacherNameForLesson(item.teacherCode,item.subject,item.teacherName||''));
            const raw=escapeHtml(item.raw||`${item.subject}${item.teacherCode?' - '+item.teacherCode:''}`);
            html+=`<div class="lesson${items.length>1?' multiple':''}">
              <div class="lesson-subject"><strong>${full}</strong><span class="subject-code">${code}</span></div>
              <span class="lesson-teacher">GV: ${teacherCode || 'Chưa có mã GV'}</span>
              ${teacherFull&&teacherFull!==teacherCode?`<span class="lesson-teacher-name">${teacherFull}</span>`:''}
              <small class="lesson-raw">${raw}</small>
            </div>`;
          }else{
            const full=escapeHtml(subjectName(item.subject));
            const code=escapeHtml(item.subject);
            html+=`<div class="lesson${items.length>1?' multiple':''}">
              <strong>${escapeHtml(item.className)}</strong>
              <span>${full} · ${code}</span>
            </div>`;
          }
        }
      }
      html+='</td>';
    }
    html+='</tr>';
  }
  html+='</tbody></table></div></section>';
  return html;
}

export function renderGrid(container, lessons, mode='class'){
  container.innerHTML=SESSIONS.map(session=>renderSession(lessons,session,mode)).join('');
}

export async function setupBrand(){
  try{
    const cfg=await api('/api/config');
    document.querySelectorAll('[data-school]').forEach(x=>x.textContent=cfg.schoolName||'HVT');
  }catch{}
}
