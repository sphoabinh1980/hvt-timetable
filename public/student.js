import {api,todayLocal,formatDate,renderGrid,setupBrand,escapeHtml,showToast} from './common.js';

const versionSelect=document.querySelector('#versionSelect');
const classSelect=document.querySelector('#classSelect');
const status=document.querySelector('#status');
const msg=document.querySelector('#message');
const card=document.querySelector('#scheduleCard');
let versions=[];

function chooseDefaultVersion(){
  if(!versions.length) return '';
  const today=todayLocal();
  const active=versions.find(v=>v.effectiveDate<=today);
  return (active||versions[versions.length-1]).effectiveDate;
}

async function loadVersions(){
  versions=await api('/api/versions');
  versionSelect.innerHTML=versions.map(v=>`<option value="${escapeHtml(v.effectiveDate)}">${formatDate(v.effectiveDate)} · ${escapeHtml(v.name)}</option>`).join('');
  const preferred=chooseDefaultVersion();
  if(preferred) versionSelect.value=preferred;
}

async function loadOptions(keep=true){
  if(!versionSelect.value){
    status.innerHTML='';
    card.classList.add('hidden');
    msg.innerHTML='<div class="notice">Chưa có phiên bản thời khóa biểu nào.</div>';
    return false;
  }
  const old=keep?classSelect.value:'';
  const data=await api(`/api/options?date=${encodeURIComponent(versionSelect.value)}`);
  classSelect.innerHTML=data.classes.map(x=>`<option value="${escapeHtml(x.name)}">${escapeHtml(x.name)}</option>`).join('');
  if(old&&data.classes.some(x=>x.name===old)) classSelect.value=old;
  if(!data.version){
    status.innerHTML='';
    card.classList.add('hidden');
    msg.innerHTML='<div class="notice">Không tìm thấy thời khóa biểu của ngày áp dụng đã chọn.</div>';
    return false;
  }
  status.innerHTML=`<span class="badge"><span class="dot"></span>Áp dụng từ ${formatDate(data.version.effectiveDate)}</span><span class="badge muted">${escapeHtml(data.version.name)}</span>`;
  msg.innerHTML='';
  return true;
}

async function load(){
  try{
    const ok=await loadOptions(true);
    if(!ok||!classSelect.value) return;
    const data=await api(`/api/timetable/class?date=${encodeURIComponent(versionSelect.value)}&className=${encodeURIComponent(classSelect.value)}`);
    document.querySelector('#scheduleTitle').textContent=`Lớp ${data.className}`;
    document.querySelector('#homeroom').textContent=data.homeroom?.code?`GVCN: ${data.homeroom.fullName||data.homeroom.code}`:'';
    document.querySelector('#source').textContent=`Nguồn: ${data.version.sourceFilename}`;
    renderGrid(document.querySelector('#schedule'),data.lessons,'class');
    card.classList.remove('hidden');
  }catch(e){showToast(e.message,true)}
}

document.querySelector('#reloadBtn').onclick=load;
versionSelect.onchange=()=>load().catch(e=>showToast(e.message,true));
classSelect.onchange=load;
setupBrand();
(async()=>{
  try{
    await loadVersions();
    await load();
  }catch(e){showToast(e.message,true)}
})();
