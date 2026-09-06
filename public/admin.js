import {api,todayLocal,formatDate,setupBrand,escapeHtml,showToast} from './common.js';

const loginView=document.querySelector('#loginView');
const adminView=document.querySelector('#adminView');
const loginForm=document.querySelector('#loginForm');
const logoutBtn=document.querySelector('#logoutBtn');
const uploadForm=document.querySelector('#uploadForm');
const teacherForm=document.querySelector('#teacherForm');
const exportTimetable=document.querySelector('#exportTimetable');
const importResult=document.querySelector('#importResult');
const versionsBox=document.querySelector('#versions');

async function check(){
  try{
    await api('/api/admin/me');
    loginView?.classList.add('hidden');
    adminView?.classList.remove('hidden');
    const effectiveDate=document.querySelector('[name=effectiveDate]');
    if(effectiveDate && !effectiveDate.value) effectiveDate.value=todayLocal();
    await loadVersions();
  }catch{
    loginView?.classList.remove('hidden');
    adminView?.classList.add('hidden');
  }
}

if(loginForm) loginForm.onsubmit=async(e)=>{
  e.preventDefault();
  const form=e.currentTarget;
  const f=new FormData(form);
  try{
    await api('/api/admin/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(Object.fromEntries(f))
    });
    showToast('Đăng nhập thành công');
    await check();
  }catch(err){
    showToast(err.message,true);
  }
};

if(logoutBtn) logoutBtn.onclick=async()=>{
  await api('/api/admin/logout',{method:'POST'});
  location.reload();
};

if(uploadForm) uploadForm.onsubmit=async(e)=>{
  e.preventDefault();
  const form=e.currentTarget;
  const btn=form.querySelector('button');
  const fileInput=form.querySelector('[name=file]');
  if(btn){
    btn.disabled=true;
    btn.textContent='Đang import...';
  }
  try{
    const data=await api('/api/admin/upload-timetable',{
      method:'POST',
      body:new FormData(form)
    });
    if(importResult){
      importResult.innerHTML=`<span class="badge"><span class="dot"></span>${data.lessonCount} ô · ${data.classCount} lớp · phiên bản #${data.versionId}</span>`;
    }
    showToast('Đã import thời khóa biểu');
    if(fileInput) fileInput.value='';
    await loadVersions();
  }catch(err){
    showToast(err.message,true);
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent='Import thời khóa biểu';
    }
  }
};

if(teacherForm) teacherForm.onsubmit=async(e)=>{
  e.preventDefault();
  const form=e.currentTarget;
  const btn=form.querySelector('button');
  if(btn) btn.disabled=true;
  try{
    const data=await api('/api/admin/import-teachers',{
      method:'POST',
      body:new FormData(form)
    });
    showToast(`Đã import ${data.count} giáo viên`);
    form.reset();
  }catch(err){
    showToast(err.message,true);
  }finally{
    if(btn) btn.disabled=false;
  }
};

if(exportTimetable) exportTimetable.onclick=()=>{
  const d=document.querySelector('[name=effectiveDate]')?.value||todayLocal();
  location.href=`/api/admin/export-teacher-timetables?date=${encodeURIComponent(d)}`;
};

async function loadVersions(){
  if(!versionsBox) return;
  const versions=await api('/api/versions');
  versionsBox.innerHTML=versions.length
    ?versions.map(v=>`<div class="version-item"><div><strong>${escapeHtml(v.name)}</strong><small>Áp dụng ${formatDate(v.effectiveDate)} · ${v.lessonCount} ô · ${escapeHtml(v.sourceFilename)}</small></div><button class="btn btn-danger" data-delete="${v.id}">Xóa</button></div>`).join('')
    :'<div class="notice">Chưa có phiên bản nào.</div>';
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Xóa phiên bản này? Dữ liệu lịch của phiên bản sẽ bị xóa.')) return;
    try{
      await api(`/api/admin/versions/${b.dataset.delete}`,{method:'DELETE'});
      showToast('Đã xóa phiên bản');
      await loadVersions();
    }catch(err){
      showToast(err.message,true);
    }
  });
}

setupBrand();
check();
