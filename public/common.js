export const DAYS = [2,3,4,5,6,7];
export const DAY_LABEL = {2:'Thứ 2',3:'Thứ 3',4:'Thứ 4',5:'Thứ 5',6:'Thứ 6',7:'Thứ 7'};
export const SESSIONS = [{name:'Sáng', periods:[1,2,3,4,5]},{name:'Chiều',periods:[1,2,3,4]}];

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
  return String(value).replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
export function showToast(message, error=false){
  document.querySelector('.toast')?.remove();
  const el=document.createElement('div'); el.className=`toast${error?' error':''}`; el.textContent=message; document.body.appendChild(el);
  setTimeout(()=>el.remove(),4200);
}
export function renderGrid(container, lessons, mode='class'){
  const byKey=new Map();
  for(const lesson of lessons){
    const key=`${lesson.day}|${lesson.session}|${lesson.period}`;
    if(!byKey.has(key)) byKey.set(key,[]); byKey.get(key).push(lesson);
  }
  let html='<table class="schedule"><thead><tr><th class="slot">Buổi / Tiết</th>';
  for(const day of DAYS) html+=`<th>${DAY_LABEL[day]}</th>`;
  html+='</tr></thead><tbody>';
  for(const session of SESSIONS){
    html+=`<tr class="session-row"><td colspan="7">${session.name}</td></tr>`;
    for(const period of session.periods){
      html+=`<tr><td class="slot">${session.name} · Tiết ${period}</td>`;
      for(const day of DAYS){
        const items=byKey.get(`${day}|${session.name}|${period}`)||[];
        html+='<td>';
        if(!items.length) html+='<div class="empty">—</div>';
        for(const item of items){
          if(mode==='class'){
            const sub=escapeHtml(item.subject); const teacher=escapeHtml(item.teacherName||item.teacherCode||'');
            html+=`<div class="lesson${items.length>1?' multiple':''}"><strong>${sub}</strong><span>${teacher}</span></div>`;
          }else{
            html+=`<div class="lesson${items.length>1?' multiple':''}"><strong>${escapeHtml(item.className)}</strong><span>${escapeHtml(item.subject)}</span></div>`;
          }
        }
        html+='</td>';
      }
      html+='</tr>';
    }
  }
  html+='</tbody></table>';
  container.innerHTML=html;
}
export async function setupBrand(){
  try{const cfg=await api('/api/config');document.querySelectorAll('[data-school]').forEach(x=>x.textContent=cfg.schoolName||'HVT');}catch{}
}
