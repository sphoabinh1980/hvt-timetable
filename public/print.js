import {showToast,escapeHtml} from './common.js';

function isMobileDevice(){
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||window.matchMedia('(max-width:768px)').matches;
}

export function printSchedule(title='Thời khóa biểu'){
  const card=document.querySelector('#scheduleCard');
  if(!card||card.classList.contains('hidden')){
    showToast('Chưa có thời khóa biểu để in.',true);
    return;
  }

  const popup=window.open('','_blank');
  if(!popup){
    showToast('Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up rồi thử lại.',true);
    return;
  }

  const copy=card.cloneNode(true);
  copy.classList.remove('hidden');
  copy.querySelectorAll('.no-print').forEach(x=>x.remove());
  copy.querySelectorAll('#source').forEach(x=>x.remove());

  popup.document.open();
  popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/enhancements.css"><link rel="stylesheet" href="/theme-blue.css"><style>body{background:#fff!important;margin:0;padding:12px;font-family:Arial,sans-serif}.print-preview-actions{position:sticky;top:0;z-index:999;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px;margin:-12px -12px 12px;background:#fff;border-bottom:1px solid #ddd}.print-preview-actions button{border:0;border-radius:10px;background:#35528E;color:#fff;font-weight:800;padding:11px 18px}.print-preview-actions span{font-size:13px;color:#555}.print-preview-note{max-width:720px;margin:0 auto 12px;padding:10px 12px;border:1px solid #ddd;background:#fff;font-size:13px;line-height:1.45}.table-card{box-shadow:none!important;margin:0 auto!important}@media print{.print-preview-actions,.print-preview-note{display:none!important}body{padding:0!important}}</style></head><body><div class="print-preview-actions"><button type="button" onclick="window.print()">In / Lưu PDF</button><span>PC: hộp thoại in sẽ mở trực tiếp. Điện thoại: nếu nút không mở, dùng menu ⋮ → Chia sẻ → In.</span></div><div class="print-preview-note">Bản xem trước này chỉ chứa thời khóa biểu. Khi in, chọn khổ <b>A4 ngang</b> và bỏ <b>Đầu trang / chân trang</b> nếu trình duyệt đang bật.</div>${copy.outerHTML}</body></html>`);
  popup.document.close();
  popup.focus();

  if(!isMobileDevice()) setTimeout(()=>{try{popup.print();}catch{}},700);
}
