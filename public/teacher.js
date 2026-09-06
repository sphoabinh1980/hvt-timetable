import {api,todayLocal,formatDate,renderGrid,setupBrand,escapeHtml,showToast,subjectName} from './common.js';

const versionSelect=document.querySelector('#versionSelect');
const select=document.querySelector('#teacherSelect');
const status=document.querySelector('#status');
const msg=document.querySelector('#message');
const card=document.querySelector('#scheduleCard');
const summary=document.querySelector('#teacherSummary');
let versions=[];

const SPLIT_TEACHERS={
  'N.T.Hạnh':[
    {value:'N.T.Hạnh::V',baseCode:'N.T.Hạnh',subjects:['V'],label:'Nguyễn Thị Hạnh (Ngữ văn)',subjectLabel:'Ngữ văn'},
    {value:'N.T.Hạnh::TQ',baseCode:'N.T.Hạnh',subjects:['TQ'],label:'Nguyễn Thị Hạnh (Tiếng Trung)',subjectLabel:'Tiếng Trung'}
  ],
  'N.P.Nga':[
    {value:'N.P.Nga::VAN',baseCode:'N.P.Nga',subjects:['V','TrN','TrNg'],label:'Ninh Phương Nga (Ngữ văn)',subjectLabel:'Ngữ văn / HĐTN'},
    {value:'N.P.Nga::P',baseCode:'N.P.Nga',subjects:['P'],label:'Nguyễn Phương Nga (Tiếng Pháp)',subjectLabel:'Tiếng Pháp'}
  ]
};

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

function teacherOptions(teachers){
  const out=[];
  for(const teacher of teachers){
    const splits=SPLIT_TEACHERS[teacher.code];
    if(splits){
      for(const split of splits){
        out.push({...split,displayName:`${split.label} · ${teacher.code}`});
      }
    }else{
      const display=teacher.fullName?`${teacher.fullName} · ${teacher.code}`:teacher.code;
      out.push({value:teacher.code,baseCode:teacher.code,subjects:null,label:teacher.fullName||teacher.code,subjectLabel:teacher.subject||'',displayName:display});
    }
  }
  return out;
}

function selectedIdentity(){
  const value=select.value;
  for(const splits of Object.values(SPLIT_TEACHERS)){
    const found=splits.find(x=>x.value===value);
    if(found) return found;
  }
  return {value,baseCode:value,subjects:null,label:null,subjectLabel:''};
}

function renderTeacherSummary(lessons){
  const classCounts=new Map();
  const subjects=new Map();
  for(const x of lessons){
    classCounts.set(x.className,(classCounts.get(x.className)||0)+1);
    subjects.set(x.subject,(subjects.get(x.subject)||0)+1);
  }
  const classes=[...classCounts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'vi',{numeric:true}));
  const subjectEntries=[...subjects.entries()].sort((a,b)=>subjectName(a[0]).localeCompare(subjectName(b[0]),'vi'));
  summary.innerHTML=`<div class="teacher-summary-grid">
    <div class="teacher-stat primary"><span>Tổng số tiết</span><strong>${lessons.length}</strong><small>tiết / tuần</small></div>
    <div class="teacher-stat"><span>Số lớp dạy</span><strong>${classes.length}</strong><small>lớp trong phiên bản này</small></div>
    <div class="teacher-detail"><span>Môn đang dạy</span><div class="teacher-chips">${subjectEntries.length?subjectEntries.map(([code,count])=>`<span class="teacher-chip subject">${escapeHtml(subjectName(code))} · ${escapeHtml(code)} · ${count} tiết</span>`).join(''):'<span class="teacher-chip">—</span>'}</div></div>
    <div class="teacher-detail"><span>Các lớp đang dạy</span><div class="teacher-chips">${classes.length?classes.map(([name,count])=>`<span class="teacher-chip">${escapeHtml(name)} · ${count} tiết</span>`).join(''):'<span class="teacher-chip">—</span>'}</div></div>
  </div>`;
}

async function loadOptions(keep=true){
  if(!versionSelect.value){
    status.innerHTML='';
    card.classList.add('hidden');
    msg.innerHTML='<div class="notice">Chưa có phiên bản thời khóa biểu nào.</div>';
    return false;
  }
  const old=keep?select.value:'';
  const data=await api(`/api/options?date=${encodeURIComponent(versionSelect.value)}`);
  const options=teacherOptions(data.teachers);
  select.innerHTML=options.map(x=>`<option value="${escapeHtml(x.value)}">${escapeHtml(x.displayName)}</option>`).join('');
  if(old&&options.some(x=>x.value===old)) select.value=old;
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
    if(!ok||!select.value) return;
    const identity=selectedIdentity();
    const data=await api(`/api/timetable/teacher?date=${encodeURIComponent(versionSelect.value)}&teacherCode=${encodeURIComponent(identity.baseCode)}`);
    const lessons=identity.subjects?data.lessons.filter(x=>identity.subjects.includes(x.subject)):data.lessons;
    const title=identity.label||data.teacher.fullName||data.teacher.code;
    document.querySelector('#scheduleTitle').textContent=title;
    const metaParts=[`Mã trong TKB: ${identity.baseCode}`,`Ngày áp dụng: ${formatDate(data.version.effectiveDate)}`];
    if(identity.subjectLabel) metaParts.push(identity.subjectLabel);
    else if(data.teacher.subject) metaParts.push(data.teacher.subject);
    document.querySelector('#teacherMeta').textContent=metaParts.join(' · ');
    document.querySelector('#source').textContent=`Nguồn: ${data.version.sourceFilename}`;
    renderTeacherSummary(lessons);
    renderGrid(document.querySelector('#schedule'),lessons,'teacher');
    card.classList.remove('hidden');
  }catch(e){showToast(e.message,true)}
}

document.querySelector('#reloadBtn').onclick=load;
document.querySelector('#printBtn').onclick=()=>window.print();
versionSelect.onchange=()=>load().catch(e=>showToast(e.message,true));
select.onchange=load;
setupBrand();
(async()=>{
  try{
    await loadVersions();
    await load();
  }catch(e){showToast(e.message,true)}
})();
