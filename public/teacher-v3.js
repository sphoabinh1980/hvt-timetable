import {api,todayLocal,formatDate,renderGrid,setupBrand,escapeHtml,showToast,subjectName} from './common.js';
import {printSchedule} from './print.js';

const versionSelect=document.querySelector('#versionSelect');
const select=document.querySelector('#teacherSelect');
const picker=document.querySelector('#teacherPicker');
const pickerButton=document.querySelector('#teacherPickerButton');
const pickerMenu=document.querySelector('#teacherPickerMenu');
const pickerCode=document.querySelector('#teacherPickerCode');
const pickerName=document.querySelector('#teacherPickerName');
const status=document.querySelector('#status');
const msg=document.querySelector('#message');
const card=document.querySelector('#scheduleCard');
const summary=document.querySelector('#teacherSummary');
let versions=[];
let currentOptions=[];

const SPLIT_TEACHERS={
  'N.P.Nga':[
    {value:'N.P.Nga::NINH',baseCode:'N.P.Nga',subjects:['V','TrN','TrNg'],primarySubject:'V',label:'Ninh Phương Nga'},
    {value:'N.P.Nga::NGUYEN',baseCode:'N.P.Nga',subjects:['P'],primarySubject:'P',label:'Nguyễn Phương Nga'}
  ],
  'N.T.Hạnh':[
    {value:'N.T.Hạnh::V',baseCode:'N.T.Hạnh',subjects:['V'],primarySubject:'V',label:'Nguyễn Thị Hạnh (Ngữ văn)'},
    {value:'N.T.Hạnh::TQ',baseCode:'N.T.Hạnh',subjects:['TQ'],primarySubject:'TQ',label:'Nguyễn Thị Hạnh (Tiếng Trung)'}
  ],
  'V.T.P.Thảo':[
    {value:'V.T.P.Thảo::VO',baseCode:'V.T.P.Thảo',subjects:['H','H1','Hóa2'],primarySubject:'H',label:'Võ Thị Phương Thảo'},
    {value:'V.T.P.Thảo::VU',baseCode:'V.T.P.Thảo',subjects:['SU'],primarySubject:'SU',label:'Vũ Thị Phương Thảo'}
  ],
  'P.T.Nga':[
    {value:'P.T.Nga::PHAM_THANH',baseCode:'P.T.Nga',subjects:['V','TrN','TrNg'],classes:['10TIN','10TN','11N','11P'],primarySubject:'V',label:'Phạm Thanh Nga'},
    {value:'P.T.Nga::PHAM_THI',baseCode:'P.T.Nga',subjects:['V','TrN','TrNg'],classes:['10P','12S','12SỬ','12SU'],primarySubject:'V',label:'Phạm Thị Nga'}
  ]
};

const NAME_OVERRIDES={'M.T.T.Ninh':'Mai Thị Thúy Ninh'};
const PRIMARY_SUBJECT={
'B.M.Tuấn':'L','B.T.Hiền':'L','B.T.Hương':'T','B.T.T.Cúc':'Đ','B.T.T.Ngân':'S','B.T.T.Phương':'Đ','B.V.Thiện':'L','B.V.Đường':'L','B.Đ.Dương':'T','H.H.Hà':'A','H.M.Linh':'S','H.N.Khánh':'H','H.T.Hảo':'GDQP','H.T.Sáu':'A','K.V.Mạnh':'S','L.H.Hà':'H','L.N.Thuyết':'H','L.T.H.Hạnh':'KTPL','L.T.Hường':'V','L.T.K.Tuyến':'S','L.T.Nam':'TN','L.T.Nghĩa':'T','L.T.Nguyệt':'TQ','L.T.Nhung':'V','L.T.T.Oanh':'A','L.T.Vinh':'SU','L.Đ.Thọ':'T','M.T.T.Ninh':'V','N.C.Nhung':'V','N.C.Tâm':'T','N.G.Hương':'V','N.H.Thái':'TN','N.K.Thủy':'V','N.M.Hùng':'Đ','N.M.Loan':'L','N.M.Tuấn':'A','N.N.Hà':'SU','N.N.Thủy':'V','N.N.Xuân':'T','N.P.Nga':'V','N.P.Thành':'V','N.T.B.Hòa':'P','N.T.Dũng':'TN','N.T.H.Lan':'H','N.T.H.Thanh':'SU','N.T.Hoà':'Đ','N.T.Hòa':'TrN','N.T.Hạnh':'TQ','N.T.L.Anh':'TQ','N.T.Long':'T','N.T.Lý':'TN','N.T.M.Anh':'V','N.T.M.Nguyệt':'Đ','N.T.Nhung':'S','N.T.P.Loan':'T','N.T.Phương':'A','N.T.Quý':'L','N.T.T.Cảnh':'A','N.T.T.Hoan':'L','N.T.T.Huyền':'A','N.T.T.Hương':'T','N.T.T.Hường':'V','N.T.T.Trang':'Đ','N.T.T.Vân':'CN','N.T.Thúy':'T','N.T.Tùng':'CN','N.T.V.Hà':'P','N.T.Đức':'TN','N.V.Nam':'GDQP','N.V.Thụ':'H','P.H.Quang':'L','P.M.Anh':'N','P.N.L.Hương':'A','P.T.B.Hiền':'T','P.T.Huệ':'L','P.T.Khuyên':'H','P.T.M.Hòa':'V','P.T.Mai':'SU','P.T.Minh':'A','P.T.Nga':'V','P.T.Ngân':'T','P.Đ.Mẫn':'L','P.Đ.Thắng':'CN','Q.T.T.Phương':'V','Q.T.T.Quế':'T','T.M.Hạnh':'SU','T.T.N.Quỳnh':'T','T.T.P.Thùy':'T','T.T.T.Huế':'KTPL','T.T.T.Hà':'A','T.T.T.Hương':'L','T.V.Hùng':'T','V.C.Cường':'GDQP','V.T.H.Xiêm':'SU','V.T.Hiền':'KTPL','V.T.Hằng':'V','V.T.P.Thảo':'H','V.X.Thanh':'Đ','Đ.H.Lan':'T','Đ.Q.Nga':'V','Đ.T.H.Nhung':'N','Đ.T.Hường':'T','Đ.T.K.Nho':'T','Đ.T.L.Anh':'S','Đ.T.T.Hằng':'TN','Đ.T.T.Linh':'N','Đ.T.T.Mai':'A'
};

const SUBJECT_NAME_TO_CODE={'Toán':'T','Ngữ văn':'V','Văn':'V','Tin học':'TN','Tin':'TN','Vật lý':'L','Lý':'L','Hóa học':'H','Hóa':'H','Sinh học':'S','Sinh':'S','Lịch sử':'SU','Sử':'SU','Địa lý':'Đ','Địa':'Đ','Tiếng Anh':'A','Anh':'A','Tiếng Pháp':'P','Pháp':'P','Tiếng Nga':'N','Nga':'N','Tiếng Trung':'TQ','Công nghệ':'CN','Giáo dục thể chất':'GDTC','GDQP-AN':'GDQP','Giáo dục địa phương':'GDĐP','Giáo dục KT&PL':'KTPL','Hoạt động trải nghiệm':'TrN','HĐTN':'TrN'};

function subjectCode(v=''){
  const s=String(v||'').trim();
  if(!s) return '';
  if(SUBJECT_NAME_TO_CODE[s]) return SUBJECT_NAME_TO_CODE[s];
  if(/^[A-Za-zĐđÀ-ỹ0-9&]+$/.test(s)&&s.length<=10) return s;
  const first=s.split(/[\/,;]+/)[0].trim();
  return SUBJECT_NAME_TO_CODE[first]||first;
}

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
      for(const split of splits){
        const sc=split.primarySubject;
        out.push({...split,subjectCode:sc,displayCode:`${sc}-${split.baseCode}`,fullName:split.label});
      }
    }else{
      const fullName=NAME_OVERRIDES[teacher.code]||teacher.fullName||teacher.code;
      const sc=PRIMARY_SUBJECT[teacher.code]||subjectCode(teacher.subject);
      out.push({value:teacher.code,baseCode:teacher.code,subjects:null,classes:null,label:fullName,fullName,subjectCode:sc,displayCode:sc?`${sc}-${teacher.code}`:teacher.code});
    }
  }
  return out.sort((a,b)=>{
    const s=(a.subjectCode||'ZZZ').localeCompare(b.subjectCode||'ZZZ','vi',{numeric:true,sensitivity:'base'});
    if(s) return s;
    const c=a.baseCode.localeCompare(b.baseCode,'vi',{numeric:true,sensitivity:'base'});
    if(c) return c;
    return a.fullName.localeCompare(b.fullName,'vi',{sensitivity:'base'});
  });
}

function rowText(x){return `${x.displayCode} — ${x.fullName}`;}

function updatePickerButton(){
  const item=currentOptions.find(x=>x.value===select.value);
  if(!item){pickerCode.textContent='Chọn giáo viên';pickerName.textContent='';return;}
  pickerCode.textContent=rowText(item);
  pickerName.textContent='';
  pickerMenu.querySelectorAll('.teacher-picker-option').forEach(el=>el.classList.toggle('selected',el.dataset.value===select.value));
}

function renderPicker(options,preferred=''){
  currentOptions=options;
  select.innerHTML=options.map(x=>`<option value="${escapeHtml(x.value)}">${escapeHtml(rowText(x))}</option>`).join('');
  if(preferred&&options.some(x=>x.value===preferred)) select.value=preferred;
  else if(options.length) select.value=options[0].value;
  pickerMenu.innerHTML=options.map(x=>`<button type="button" class="teacher-picker-option single-line${x.value===select.value?' selected':''}" role="option" data-value="${escapeHtml(x.value)}"><strong>${escapeHtml(rowText(x))}</strong></button>`).join('');
  updatePickerButton();
}

function closePicker(){pickerMenu.classList.add('hidden');pickerButton.setAttribute('aria-expanded','false');}
function togglePicker(){const open=pickerMenu.classList.contains('hidden');pickerMenu.classList.toggle('hidden',!open);pickerButton.setAttribute('aria-expanded',String(open));}
pickerButton.addEventListener('click',togglePicker);
pickerMenu.addEventListener('click',async e=>{const option=e.target.closest('.teacher-picker-option');if(!option)return;select.value=option.dataset.value;updatePickerButton();closePicker();await load();});
document.addEventListener('click',e=>{if(!picker.contains(e.target))closePicker();});

function selectedIdentity(){return currentOptions.find(x=>x.value===select.value)||{value:select.value,baseCode:select.value,subjects:null,classes:null,fullName:select.value,displayCode:select.value};}
function matchesIdentity(lesson,identity){if(identity.subjects&&!identity.subjects.includes(lesson.subject))return false;if(identity.classes&&!identity.classes.includes(lesson.className))return false;return true;}

function renderTeacherSummary(lessons){
  const classCounts=new Map(),subjects=new Map();
  for(const x of lessons){classCounts.set(x.className,(classCounts.get(x.className)||0)+1);subjects.set(x.subject,(subjects.get(x.subject)||0)+1);}
  const classes=[...classCounts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'vi',{numeric:true}));
  const subjectEntries=[...subjects.entries()].sort((a,b)=>a[0].localeCompare(b[0],'vi'));
  summary.innerHTML=`<div class="teacher-summary-grid"><div class="teacher-stat primary"><span>Tổng số tiết</span><strong>${lessons.length}</strong><small>tiết / tuần</small></div><div class="teacher-stat"><span>Số lớp dạy</span><strong>${classes.length}</strong><small>lớp</small></div><div class="teacher-detail"><span>Môn đang dạy</span><div class="teacher-chips">${subjectEntries.length?subjectEntries.map(([code,count])=>`<span class="teacher-chip subject">${escapeHtml(subjectName(code))} · ${count} tiết</span>`).join(''):'<span class="teacher-chip">—</span>'}</div></div><div class="teacher-detail"><span>Các lớp đang dạy</span><div class="teacher-chips">${classes.length?classes.map(([name,count])=>`<span class="teacher-chip">${escapeHtml(name)} · ${count} tiết</span>`).join(''):'<span class="teacher-chip">—</span>'}</div></div></div>`;
}

async function loadOptions(keep=true){
  if(!versionSelect.value){status.innerHTML='';card.classList.add('hidden');msg.innerHTML='<div class="notice">Chưa có phiên bản thời khóa biểu nào.</div>';return false;}
  const old=keep?select.value:'';
  const data=await api(`/api/options?date=${encodeURIComponent(versionSelect.value)}`);
  renderPicker(teacherOptions(data.teachers),old);
  if(!data.version){status.innerHTML='';card.classList.add('hidden');msg.innerHTML='<div class="notice">Không tìm thấy thời khóa biểu của ngày áp dụng đã chọn.</div>';return false;}
  status.innerHTML='';msg.innerHTML='';return true;
}

async function load(){
  try{
    const ok=await loadOptions(true);if(!ok||!select.value)return;
    const identity=selectedIdentity();
    const data=await api(`/api/timetable/teacher?date=${encodeURIComponent(versionSelect.value)}&teacherCode=${encodeURIComponent(identity.baseCode)}`);
    const lessons=data.lessons.filter(x=>matchesIdentity(x,identity));
    document.querySelector('#scheduleTitle').textContent=identity.displayCode;
    document.querySelector('#teacherMeta').textContent=identity.fullName;
    document.querySelector('#source').textContent='';
    renderTeacherSummary(lessons);renderGrid(document.querySelector('#schedule'),lessons,'teacher');card.classList.remove('hidden');
  }catch(e){showToast(e.message,true)}
}

document.querySelector('#reloadBtn').onclick=load;
document.querySelector('#printBtn').onclick=()=>printSchedule(document.querySelector('#scheduleTitle').textContent||'Thời khóa biểu giáo viên');
versionSelect.onchange=()=>load().catch(e=>showToast(e.message,true));
setupBrand();
(async()=>{try{await loadVersions();await load();}catch(e){showToast(e.message,true)}})();
