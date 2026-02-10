/**
 * BI Management - Voucher Print Template
 * قالب طباعة سند قبض/دفع
 */

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

/**
 * طباعة سند قبض/دفع
 */
export function printVoucher(voucher, company) {
  const printWindow = window.open('', '_blank', 'width=800,height=500')
  if (!printWindow) return

  const v = voucher || {}
  const co = company || { name: 'BI Company', address: 'بغداد، العراق', phone: '+964 XXX XXX XXXX' }
  const isReceipt = v.type === 'receipt'
  const title = isReceipt ? 'سند قبض' : 'سند دفع'
  const bgColor = isReceipt ? '#059669' : '#dc2626'

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${title} - ${v.voucher_number || ''}</title>
<style>
  @page { size: A5 landscape; margin: 10mm; }
  body { font-family: Arial, Tahoma, sans-serif; margin: 0; padding: 20px; max-width: 210mm; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${bgColor}; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 18px; }
  .type-badge { background: ${bgColor}; color: white; padding: 6px 16px; border-radius: 8px; font-size: 16px; font-weight: bold; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .info-box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
  .info-box label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; }
  .info-box span { font-size: 14px; font-weight: bold; }
  .amount-box { text-align: center; border: 3px solid ${bgColor}; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .amount-box .label { font-size: 12px; color: #666; }
  .amount-box .value { font-size: 28px; font-weight: bold; color: ${bgColor}; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; font-size: 12px; margin-top: 40px; }
  .signatures div { border-top: 1px solid #999; padding-top: 6px; margin-top: 30px; }
  .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 20px; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="header">
    <div><h1>${co.name}</h1><p style="margin:2px 0 0;font-size:12px;color:#666">${co.address || ''} | ${co.phone || ''}</p></div>
    <div class="type-badge">${title}</div>
  </div>

  <div class="info-grid">
    <div class="info-box"><label>رقم السند</label><span style="font-family:monospace">${v.voucher_number || '—'}</span></div>
    <div class="info-box"><label>التاريخ</label><span>${formatDate(v.created_at)}</span></div>
    <div class="info-box"><label>${isReceipt ? 'استلمنا من' : 'دفعنا إلى'}</label><span>${v.customer_name || v.supplier_name || v.party_name || '—'}</span></div>
    <div class="info-box"><label>الصندوق</label><span>${v.cash_box_name || 'الصندوق الرئيسي'}</span></div>
  </div>

  <div class="amount-box">
    <div class="label">المبلغ</div>
    <div class="value">${formatNumber(v.amount)} د.ع</div>
  </div>

  ${v.description ? `<div style="border:1px solid #eee;border-radius:8px;padding:10px;margin:12px 0"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">البيان:</label><span style="font-size:13px">${v.description}</span></div>` : ''}

  <div class="signatures">
    <div>المحرر</div>
    <div>المدقق</div>
    <div>المستلم</div>
  </div>

  <div class="footer">
    <span>تم الطباعة بواسطة نظام BI Management</span> | <span>${new Date().toLocaleString('ar-IQ')}</span>
  </div>
</body></html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 300)
}

/**
 * طباعة كشف حساب
 */
export function printAccountStatement(statement, entityType, company) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return

  const co = company || { name: 'BI Company', address: 'بغداد، العراق', phone: '+964 XXX XXX XXXX' }
  const entity = statement?.customer || statement?.supplier || {}
  const movements = statement?.movements || []
  const title = entityType === 'customer' ? 'كشف حساب عميل' : 'كشف حساب مورد'

  const rows = movements.map(m => `
    <tr>
      <td style="border:1px solid #ddd;padding:5px 8px;font-size:12px">${m.date ? new Date(m.date).toLocaleDateString('ar-IQ') : '—'}</td>
      <td style="border:1px solid #ddd;padding:5px 8px;font-size:12px">${m.description || ''}</td>
      <td style="border:1px solid #ddd;padding:5px 8px;text-align:center;font-size:12px;color:#dc2626">${m.debit > 0 ? formatNumber(m.debit) : ''}</td>
      <td style="border:1px solid #ddd;padding:5px 8px;text-align:center;font-size:12px;color:#059669">${m.credit > 0 ? formatNumber(m.credit) : ''}</td>
      <td style="border:1px solid #ddd;padding:5px 8px;text-align:center;font-size:12px;font-weight:bold">${formatNumber(Math.abs(m.balance || 0))}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${title} - ${entity.name || ''}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, Tahoma, sans-serif; margin: 0; padding: 16px; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px">
    <div><h1 style="margin:0;font-size:20px">${co.name}</h1><p style="margin:2px 0;font-size:12px;color:#666">${co.address || ''}</p></div>
    <div style="text-align:left"><h2 style="margin:0;font-size:16px;color:#444">${title}</h2><p style="margin:2px 0;font-size:12px">${new Date().toLocaleDateString('ar-IQ')}</p></div>
  </div>
  <div style="background:#f3f4f6;border-radius:8px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between">
    <div><strong>${entityType === 'customer' ? 'العميل' : 'المورد'}:</strong> ${entity.name || '—'}</div>
    <div><strong>الهاتف:</strong> ${entity.phone || '—'}</div>
    <div><strong>الرصيد:</strong> <span style="font-weight:bold;color:${(statement?.final_balance || 0) >= 0 ? '#dc2626' : '#059669'}">${formatNumber(Math.abs(statement?.final_balance || 0))} د.ع ${(statement?.final_balance || 0) >= 0 ? '(لنا)' : '(علينا)'}</span></div>
  </div>
  <table>
    <thead><tr style="background:#f3f4f6"><th style="border:1px solid #ddd;padding:6px;font-size:11px;text-align:right">التاريخ</th><th style="border:1px solid #ddd;padding:6px;font-size:11px;text-align:right">البيان</th><th style="border:1px solid #ddd;padding:6px;font-size:11px;text-align:center;width:90px">مدين</th><th style="border:1px solid #ddd;padding:6px;font-size:11px;text-align:center;width:90px">دائن</th><th style="border:1px solid #ddd;padding:6px;font-size:11px;text-align:center;width:90px">الرصيد</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:#f3f4f6;font-weight:bold"><td colspan="2" style="border:1px solid #ddd;padding:6px;font-size:12px">المجموع</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-size:12px;color:#dc2626">${formatNumber(statement?.total_debit || 0)}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-size:12px;color:#059669">${formatNumber(statement?.total_credit || 0)}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-size:12px;font-weight:bold">${formatNumber(Math.abs(statement?.final_balance || 0))}</td></tr></tfoot>
  </table>
  <div style="margin-top:24px;display:flex;justify-content:space-between;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:8px"><span>BI Management</span><span>${new Date().toLocaleString('ar-IQ')}</span></div>
</body></html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 300)
}

export default { printVoucher, printAccountStatement }
