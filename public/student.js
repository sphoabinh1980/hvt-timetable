import {api, todayLocal, formatDate, renderGrid, setupBrand, escapeHtml, showToast} from './common.js';
const dateInput=document.querySelector('#dateInput'), classSelect=document.querySelector('#classSelect'), status=document.querySelector('#status'), history=document.querySelector('#history'), msg=document.querySelector('#message'), card=document.querySelector('#scheduleCard');
dateInput.value=todayLocal();
async function loadOptions(keep=true){
  const old=keep?classSelect.value:''; const data=await api(`/api/options?date=${dateInput.value}`);
  classSelect.innerHTML=data.classes.map(x=>`<option value="${escapeHtml(x.name)}">${escapeHtml(x.name)}</option>`).join('');
  if(old && data.classes.some(x=>x.name===old)) classSelect.value=old;
  if(!data.version){status.innerHTML='';card.classList.add('hidden');msg.innerHTML='<div class="notice">Chưa có thời khóa biểu nào có ngày áp dụng trước hoặc bằng ngày đã chọn.</div>';return false;}
  status.innerHTML=`<span class="badge"><span class="dot"></span>Đang áp dụng từ ${formatDate(data.version.effectiveDate)}</span><span class="badge muted">${escapeHtml(data.version.name)}</span>`;msg.innerHTML='';return true;
}
async function loadHistory(){const versions=await api('/api/versions');history.innerHTML=versions.map(v=>`<button data-date="${v.effectiveDate}">${formatDate(v.effectiveDate)} · ${escapeHtml(v.name)}</button>`).join('');history.querySelectorAll('button').forEach(b=>b.onclick=()=>{dateInput.value=b.dataset.date;load();});}
async function load(){try{const ok=await loadOptions(true);if(!ok)return; if(!classSelect.value)return; const data=await api(`/api/timetable/class?date=${dateInput.value}&className=${encodeURIComponent(classSelect.value)}`);document.querySelector('#scheduleTitle').textContent=`Lớp ${data.className}`;document.querySelector('#homeroom').textContent=data.homeroom?.code?`GVCN: ${data.homeroom.fullName||data.homeroom.code}`:'';document.querySelector('#source').textContent=`Nguồn: ${data.version.sourceFilename}`;renderGrid(document.querySelector('#schedule'),data.lessons,'class');card.classList.remove('hidden');}catch(e){showToast(e.message,true)}}
document.querySelector('#reloadBtn').onclick=load;dateInput.onchange=()=>loadOptions(true).catch(e=>showToast(e.message,true));classSelect.onchange=load;setupBrand();loadHistory().catch(()=>{});load();
