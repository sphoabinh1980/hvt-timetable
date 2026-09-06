import {api,todayLocal,formatDate,renderGrid,setupBrand,escapeHtml,showToast,subjectName,teacherFullName} from './common.js';

const versionSelect=document.querySelector('#versionSelect');
const select=document.querySelector('#teacherSelect');
const status=document.querySelector('#status');
const msg=document.querySelector('#message');
const card=document.querySelector('#scheduleCard');
const summary=document.querySelector('#teacherSummary');
const pickerButton=document.querySelector('#teacherPickerButton');
const pickerMenu=document.querySelector('#teacherPickerMenu');
const pickerCode=document.querySelector('#teacherPickerCode');
const pickerName=document.querySelector('#teacherPickerName');
let versions=[];
let currentOptions=[];
const printMode=new URLSearchParams(location.search).get('print')==='1';

const SPLIT_TEACHERS={
  'N.P.Nga':[
    {value:'N.P.Nga::NINH',baseCode:'N.P.Nga',subjects:['V','TrN','TrNg'],subjectCode:'V',label:'Ninh Phương Nga',subjectLabel:'Ngữ văn / HĐTN'},
    {value:'N.P.Nga::NGUYEN',baseCode:'N.P.Nga',subjects:['P'],subjectCode:'P',label:'Nguyễn Phương Nga',subjectLabel:'Tiếng Pháp'}
  ],
  'N.T.Hạnh':[
    {value:'N.T.Hạnh::V',baseCode:'N.T.Hạnh',subjects:['V'],subjectCode:'V',label:'Nguyễn Thị Hạnh (Ngữ văn)',subjectLabel:'Ngữ văn'},
    {value:'N.T.Hạnh::TQ',baseCode:'N.T.Hạnh',subjects:['TQ'],subjectCode:'TQ',label:'Nguyễn Thị Hạnh (Tiếng Trung)',subjectLabel:'Tiếng Trung'}
  ],
  'V.T.P.Thảo':[
    {value:'V.T.P.Thảo::VO',baseCode:'V.T.P.Thảo',subjects:['H','H1','Hóa2'],subjectCode:'H',label:'Võ Thị Phương Thảo',subjectLabel:'Hóa học'},
    {value:'V.T.P.Thảo::VU',baseCode:'V.T.P.Thảo',subjects:['SU'],subjectCode:'SU',label:'Vũ Thị Phương Thảo',subjectLabel:'Lịch sử'}
  ],
  'P.T.Nga':[
    {value:'P.T.Nga::PHAM_THANH',baseCode:'P.T.Nga',subjects:['V','TrN','TrNg'],classes:['10TIN','10TN','11N','11P'],subjectCode:'V',label:'Phạm Thanh Nga',subjectLabel:'Ngữ văn / HĐTN'},
    {value:'P.T.Nga::PHAM_THI',baseCode:'P.T.Nga',subjects:['V','TrN','TrNg'],classes:['10P','12S','12SỬ','12SU'],subjectCode:'V',label:'Phạm Thị Nga',subjectLabel:'Ngữ văn / HĐTN'}
  ]
};

const NAME_OVERRIDES={'M.T.T.Ninh':'Mai Thị Thúy Ninh'};

function chooseDefaultVersion(){
  if(!versions.length) return '';
  const today=todayLocal();
  const active=versions.find(v=>v.effectiveDate<=today);
  return (active||versions[versions.length-1]).effectiveDate;
}

async function loadVersions(){
  versions=await api('/api/versions');
  versionSelect.innerHTML=versions.map(v=>`<option value="${escapeHtml(v.effectiveDate)}">${formatDate(v.effectiveDate)}</option>`).join('');
  const preferred=chooseDefaultVersion();
  if(preferred) versionSelect.value=preferred;
}

function teacherOptions(teachers){
  const out=[];
  for(const teacher of teachers){
    const splits=SPLIT_TEACHERS[teacher.code];
    if(splits){
      for(const split of splits) out.push({...split});
    }else{
      const normalizedName=NAME_OVERRIDES[teacher.code]||teacher.fullName||teacherFullName(teacher.code,'','',teacher.code);
      out.push({
        value:teacher.code,
        baseCode:teacher.code,
        subjects:null,
        classes:null,
        subjectCode:teacher.subject||'',
        label:normalizedName,
        subjectLabel:teacher.subject||''
      });
    }
  }
  return out.sort((a,b)=>{
    const s=(a.subjectCode||'').localeCompare(b.subjectCode||'','vi',{numeric:true,sensitivity:'base'});
    if(s) return s;
    const c=(a.baseCode||'').localeCompare(b.baseCode||'','vi',{numeric:true,sensitivity:'base'});
    if(c) return c;
    return (a.label||'').localeCompare(b.label||'','vi',{sensitivity:'base'});
  });
}

function selectedIdentity(){
  const value=select.value;
  return currentOptions.find(x=>x.value===value)||{value,baseCode:value,subjects:null,classes:null,subjectCode:'',label:NAME_OVERRIDES[value]||teacherFullName(value,'','',value),subjectLabel:''};
}

function pickerTop(option){
  return `${option.subjectCode||'?'}-${option.baseCode}`;
}

function pickerLine(option){
  return `${pickerTop(option)} — ${option.label||option.baseCode}`;
}

function updatePickerButton(){
  const option=currentOptions.find(x=>x.value===select.value);
  if(!option){pickerCode.textContent='Chọn giáo viên';pickerName.textContent='';return;}
  pickerCode.textContent=pickerLine(option);
  pickerName.textContent='';
}

function renderPicker(){
  pickerMenu.innerHTML=currentOptions.map(x=>`<button type="button" class="teacher-picker-option${x.value===select.value?' selected':''}" data-value="${escapeHtml(x.value)}" role="option"><strong>${escapeHtml(pickerLine(x))}</strong></button>`).join('');
  pickerMenu.querySelectorAll('.teacher-picker-option').forEach(btn=>{
    btn.onclick=()=>{
      select.value=btn.dataset.value;
      updatePickerButton();
      pickerMenu.classList.add('hidden');
      pickerButton.setAttribute('aria-expanded','false');
      load();
    };
  });
  updatePickerButton();
}

pickerButton.onclick=()=>{
  const willOpen=pickerMenu.classList.contains('hidden');
  pickerMenu.classList.toggle('hidden',!willOpen);
  pickerButton.setAttribute('aria-expanded',String(willOpen));
};
document.addEventListener('click',e=>{
  if(!document.querySelector('#teacherPicker')?.contains(e.target)){
    pickerMenu.classList.add('hidden');
    pickerButton.setAttribute('aria-expanded','false');
  }
});

function matchesIdentity(lesson,identity){
  if(identity.subjects && !identity.subjects.includes(lesson.subject)) return false;
  if(identity.classes && !identity.classes.includes(lesson.className)) return false;
  return true;
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
    <div class="teacher-stat"><span>Số lớp dạy</span><strong>${classes.length}</strong><small>lớp</small></div>
    <div class="teacher-detail"><span>Môn đang dạy</span><div class="teacher-chips">${subjectEntries.length?subjectEntries.map(([code,count])=>`<span class="teacher-chip subject">${escapeHtml(subjectName(code))} · ${escapeHtml(code)} · ${count} tiết</span>`).join(''):'<span class="teacher-chip">—</span>'}</div></div>
    <div class="teacher-detail"><span>Các lớp đang dạy</span><div class="teacher-chips">${classes.length?classes.map(([name,count])=>`<span class="teacher-chip">${escapeHtml(name)} · ${count} tiết</span>`).join(''):'<span class="teacher-chip">—</span>'}</div></div>
  </div>`;
}

async function loadOptions(keep=true){
  if(!versionSelect.value){
    status.innerHTML='';card.classList.add('hidden');
    msg.innerHTML='<div class="notice">Chưa có phiên bản thời khóa biểu nào.</div>';
    return false;
  }
  const old=keep?select.value:'';
  const data=await api(`/api/options?date=${encodeURIComponent(versionSelect.value)}`);
  currentOptions=teacherOptions(data.teachers);
  select.innerHTML=currentOptions.map(x=>`<option value="${escapeHtml(x.value)}">${escapeHtml(pickerLine(x))}</option>`).join('');
  if(old&&currentOptions.some(x=>x.value===old)) select.value=old;
  renderPicker();
  if(!data.version){
    status.innerHTML='';card.classList.add('hidden');
    msg.innerHTML='<div class="notice">Không tìm thấy thời khóa biểu của ngày áp dụng đã chọn.</div>';
    return false;
  }
  status.innerHTML='';
  msg.innerHTML='';
  return true;
}

async function load(){
  try{
    const ok=await loadOptions(true);
    if(!ok||!select.value) return;
    const identity=selectedIdentity();
    const data=await api(`/api/timetable/teacher?date=${encodeURIComponent(versionSelect.value)}&teacherCode=${encodeURIComponent(identity.baseCode)}`);
    const lessons=data.lessons.filter(x=>matchesIdentity(x,identity));
    const title=identity.label||NAME_OVERRIDES[data.teacher.code]||data.teacher.fullName||teacherFullName(data.teacher.code,'','',data.teacher.code);
    document.querySelector('#scheduleTitle').textContent=pickerTop(identity);
    document.querySelector('#teacherMeta').textContent=title;
    document.querySelector('#source').textContent='';
    renderTeacherSummary(lessons);
    renderGrid(document.querySelector('#schedule'),lessons,'teacher');
    card.classList.remove('hidden');
  }catch(e){showToast(e.message,true)}
}

function enterPrintMode(){
  document.body.classList.add('print-mode');
  let bar=document.querySelector('#printModeBar');
  if(!bar){
    bar=document.createElement('div');bar.id='printModeBar';bar.className='print-mode-bar no-print';
    bar.innerHTML='<button type="button" id="printNowBtn">In / Lưu PDF</button><button type="button" id="printBackBtn">Quay lại</button>';
    document.body.appendChild(bar);
    document.querySelector('#printNowBtn').onclick=()=>window.print();
    document.querySelector('#printBackBtn').onclick=()=>history.length>1?history.back():location.assign('/teachers.html');
  }
  setTimeout(()=>{try{window.print()}catch{}},700);
}

function openPrintView(){
  const url=new URL(location.href);url.searchParams.set('print','1');
  const w=window.open(url.toString(),'_blank');
  if(!w) location.href=url.toString();
}

document.querySelector('#reloadBtn').onclick=load;
document.querySelector('#printBtn').onclick=openPrintView;
versionSelect.onchange=()=>load().catch(e=>showToast(e.message,true));
select.onchange=()=>{updatePickerButton();load();};
setupBrand();
(async()=>{
  try{
    await loadVersions();
    await load();
    if(printMode) enterPrintMode();
  }catch(e){showToast(e.message,true)}
})();
