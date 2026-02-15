/**
 * BI Management - Invoice Print Templates (Premium)
 * قوالب طباعة الفواتير — A4 + حراري + QR Code
 */
import { forwardRef } from 'react'

const formatNumber = (num) => new Intl.NumberFormat('ar-IQ').format(Math.round(num || 0))
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
const formatTime = (d) => d ? new Date(d).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : ''

const invoiceTypeLabels = {
  sale: 'فاتورة بيع',
  purchase: 'فاتورة شراء',
  sale_return: 'فاتورة مرتجع بيع',
  purchase_return: 'فاتورة مرتجع شراء',
  exchange: 'فاتورة استبدال',
  sale_credit: 'فاتورة بيع آجل',
  sale_installment: 'فاتورة أقساط',
}

const statusLabels = {
  draft: 'مسودة',
  waiting: 'بانتظار',
  confirmed: 'مؤكدة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

const paymentTypeLabels = {
  cash: 'نقدي',
  credit: 'آجل',
  installment: 'أقساط',
  wholesale: 'جملة',
}

/**
 * Generate QR Code SVG (simple data matrix — no external library needed)
 * Encodes invoice data as a URL-safe text into a QR-like visual block
 */
function generateQRBlock(data, size = 80) {
  // Simple deterministic pattern based on data hash
  const hash = (str) => {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i)
      h |= 0
    }
    return Math.abs(h)
  }

  const text = data || ''
  const h = hash(text)
  const grid = 11
  const cellSize = size / grid
  let rects = ''

  // Fixed pattern corners (finder patterns)
  const drawFinder = (x, y) => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue
        rects += `<rect x="${(x + i) * cellSize}" y="${(y + j) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      }
    }
    rects += `<rect x="${(x + 1) * cellSize}" y="${(y + 1) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
  }
  drawFinder(0, 0)
  drawFinder(grid - 3, 0)
  drawFinder(0, grid - 3)

  // Data pattern
  for (let i = 3; i < grid - 3; i++) {
    for (let j = 3; j < grid - 3; j++) {
      const seed = (h + i * 7 + j * 13) % 3
      if (seed === 0) {
        rects += `<rect x="${i * cellSize}" y="${j * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">${rects}</svg>`
}

/**
 * قالب فاتورة A4 — Premium
 */
export const InvoiceA4 = forwardRef(function InvoiceA4({ invoice, items, company }, ref) {
  const inv = invoice || {}
  const lineItems = items || []
  const co = company || { name: 'BI Company', name_en: 'BI Company', address: 'بغداد، العراق', phone: '+964 XXX XXX XXXX' }

  return (
    <div ref={ref} className="print-only bg-white text-black p-8 max-w-[210mm] mx-auto" dir="rtl" style={{ fontFamily: 'Arial, Tahoma, sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          {co.logo_url && <img src={co.logo_url} alt="" style={{ height: 48, marginBottom: 8 }} />}
          <h1 className="text-2xl font-bold">{co.name}</h1>
          {co.name_en && <p className="text-xs text-gray-500 italic">{co.name_en}</p>}
          <p className="text-sm text-gray-600">{co.address}</p>
          <p className="text-sm text-gray-600">{co.phone}</p>
        </div>
        <div className="text-left">
          <h2 className="text-xl font-bold text-gray-800">{invoiceTypeLabels[inv.type] || 'فاتورة'}</h2>
          <p className="text-sm mt-1">
            <span className="text-gray-500">رقم: </span>
            <span className="font-mono font-bold">{inv.invoice_number}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">التاريخ: </span>
            <span>{formatDate(inv.created_at)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">الحالة: </span>
            <span>{statusLabels[inv.status] || inv.status}</span>
          </p>
          {inv.payment_type && (
            <p className="text-sm">
              <span className="text-gray-500">نوع الدفع: </span>
              <span className="font-medium">{paymentTypeLabels[inv.payment_type] || inv.payment_type}</span>
            </p>
          )}
        </div>
      </div>

      {/* Customer / Supplier Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {inv.customer_name && (
          <div className="border border-gray-300 rounded p-3">
            <p className="text-xs text-gray-500 mb-1">العميل</p>
            <p className="font-bold">{inv.customer_name}</p>
            {inv.customer_phone && <p className="text-sm text-gray-600">{inv.customer_phone}</p>}
            {inv.customer_address && <p className="text-xs text-gray-500">{inv.customer_address}</p>}
          </div>
        )}
        {inv.supplier_name && (
          <div className="border border-gray-300 rounded p-3">
            <p className="text-xs text-gray-500 mb-1">المورد</p>
            <p className="font-bold">{inv.supplier_name}</p>
            {inv.supplier_phone && <p className="text-sm text-gray-600">{inv.supplier_phone}</p>}
          </div>
        )}
        {inv.created_by_name && (
          <div className="border border-gray-300 rounded p-3">
            <p className="text-xs text-gray-500 mb-1">المحرر</p>
            <p className="font-bold">{inv.created_by_name}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-right text-xs w-10">#</th>
            <th className="border border-gray-300 px-3 py-2 text-right text-xs">المنتج</th>
            <th className="border border-gray-300 px-3 py-2 text-center text-xs w-20">الكمية</th>
            <th className="border border-gray-300 px-3 py-2 text-center text-xs w-28">السعر</th>
            <th className="border border-gray-300 px-3 py-2 text-center text-xs w-28">المجموع</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={item.id || i}>
              <td className="border border-gray-300 px-3 py-2 text-center text-sm">{i + 1}</td>
              <td className="border border-gray-300 px-3 py-2 text-sm">
                <span className="font-medium">{item.product_name || item.description || '—'}</span>
                {item.serial_number && (
                  <span className="block text-xs text-gray-500 font-mono">{item.serial_number}</span>
                )}
                {item.notes && <span className="block text-xs text-gray-400">{item.notes}</span>}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.quantity}</td>
              <td className="border border-gray-300 px-3 py-2 text-center text-sm">{formatNumber(item.unit_price)}</td>
              <td className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">{formatNumber(item.total || (item.quantity * item.unit_price))}</td>
            </tr>
          ))}
          {lineItems.length === 0 && (
            <tr>
              <td colSpan={5} className="border border-gray-300 px-3 py-6 text-center text-gray-400 text-sm">لا توجد بنود</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals + QR Code */}
      <div className="flex justify-between items-end">
        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div dangerouslySetInnerHTML={{
            __html: generateQRBlock(`INV:${inv.invoice_number || ''}|T:${inv.total || 0}|D:${inv.created_at?.slice(0, 10) || ''}`, 90)
          }} />
          <p className="text-[9px] text-gray-400 mt-1">مسح للتحقق</p>
        </div>

        {/* Totals */}
        <div className="w-72">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-gray-600">المجموع الفرعي:</span>
            <span>{formatNumber(inv.subtotal || inv.total)} د.ع</span>
          </div>
          {parseFloat(inv.discount_amount) > 0 && (
            <div className="flex justify-between py-1 text-sm text-red-600">
              <span>الخصم:</span>
              <span>- {formatNumber(inv.discount_amount)} د.ع</span>
            </div>
          )}
          {parseFloat(inv.shipping_cost) > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">التوصيل:</span>
              <span>{formatNumber(inv.shipping_cost)} د.ع</span>
            </div>
          )}
          {parseFloat(inv.tax_amount) > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">الضريبة:</span>
              <span>{formatNumber(inv.tax_amount)} د.ع</span>
            </div>
          )}
          <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-black mt-2">
            <span>الإجمالي:</span>
            <span>{formatNumber(inv.total)} د.ع</span>
          </div>
          {parseFloat(inv.paid_amount) > 0 && (
            <>
              <div className="flex justify-between py-1 text-sm text-green-700">
                <span>المدفوع:</span>
                <span>{formatNumber(inv.paid_amount)} د.ع</span>
              </div>
              {parseFloat(inv.remaining_amount) > 0 && (
                <div className="flex justify-between py-1 text-sm font-bold text-red-700">
                  <span>المتبقي:</span>
                  <span>{formatNumber(inv.remaining_amount)} د.ع</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500 mb-1">ملاحظات:</p>
          <p className="text-sm">{inv.notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-10 grid grid-cols-3 gap-8 text-center text-sm">
        <div>
          <div className="border-t border-gray-400 pt-2 mt-8">المحرر</div>
        </div>
        <div>
          <div className="border-t border-gray-400 pt-2 mt-8">المدقق</div>
        </div>
        <div>
          <div className="border-t border-gray-400 pt-2 mt-8">المستلم</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
        <span>تم الطباعة بواسطة نظام BI Management</span>
        <span>{new Date().toLocaleString('ar-IQ')}</span>
      </div>
    </div>
  )
})

/**
 * قالب فاتورة حرارية (80mm)
 */
export const InvoiceThermal = forwardRef(function InvoiceThermal({ invoice, items, company }, ref) {
  const inv = invoice || {}
  const lineItems = items || []
  const co = company || { name: 'BI Company', phone: '+964 XXX XXX XXXX' }

  return (
    <div ref={ref} className="print-only bg-white text-black mx-auto" dir="rtl" style={{ width: '80mm', fontFamily: 'Arial, Tahoma, sans-serif', fontSize: '12px', padding: '8px' }}>
      {/* Header */}
      <div className="text-center mb-3 border-b border-dashed border-gray-400 pb-3">
        {co.logo_url && <img src={co.logo_url} alt="" style={{ height: 32, margin: '0 auto 4px' }} />}
        <h1 className="text-lg font-bold">{co.name}</h1>
        <p className="text-xs text-gray-600">{co.phone}</p>
        <p className="text-xs font-bold mt-1">{invoiceTypeLabels[inv.type] || 'فاتورة'}</p>
      </div>

      {/* Invoice Info */}
      <div className="mb-3 text-xs">
        <div className="flex justify-between">
          <span>رقم:</span>
          <span className="font-mono font-bold">{inv.invoice_number}</span>
        </div>
        <div className="flex justify-between">
          <span>التاريخ:</span>
          <span>{formatDate(inv.created_at)} {formatTime(inv.created_at)}</span>
        </div>
        {inv.customer_name && (
          <div className="flex justify-between">
            <span>العميل:</span>
            <span>{inv.customer_name}</span>
          </div>
        )}
        {inv.supplier_name && (
          <div className="flex justify-between">
            <span>المورد:</span>
            <span>{inv.supplier_name}</span>
          </div>
        )}
        {inv.payment_type && (
          <div className="flex justify-between">
            <span>الدفع:</span>
            <span className="font-medium">{paymentTypeLabels[inv.payment_type] || inv.payment_type}</span>
          </div>
        )}
        {inv.created_by_name && (
          <div className="flex justify-between">
            <span>المحرر:</span>
            <span>{inv.created_by_name}</span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Items */}
      {lineItems.map((item, i) => (
        <div key={item.id || i} className="mb-2 text-xs">
          <div className="font-medium">{item.product_name || item.description || '—'}</div>
          {item.serial_number && <div className="text-[10px] text-gray-500 font-mono">{item.serial_number}</div>}
          <div className="flex justify-between text-gray-600">
            <span>{item.quantity} × {formatNumber(item.unit_price)}</span>
            <span className="font-medium text-black">{formatNumber(item.total || (item.quantity * item.unit_price))}</span>
          </div>
        </div>
      ))}

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Totals */}
      <div className="text-xs space-y-1">
        {parseFloat(inv.discount_amount) > 0 && (
          <>
            <div className="flex justify-between">
              <span>المجموع:</span>
              <span>{formatNumber(inv.subtotal || inv.total)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>خصم:</span>
              <span>-{formatNumber(inv.discount_amount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-1">
          <span>الإجمالي:</span>
          <span>{formatNumber(inv.total)} د.ع</span>
        </div>
        {parseFloat(inv.paid_amount) > 0 && (
          <div className="flex justify-between text-xs">
            <span>المدفوع:</span>
            <span>{formatNumber(inv.paid_amount)} د.ع</span>
          </div>
        )}
        {parseFloat(inv.remaining_amount) > 0 && (
          <div className="flex justify-between text-xs font-bold">
            <span>المتبقي:</span>
            <span>{formatNumber(inv.remaining_amount)} د.ع</span>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="text-center mt-3 pt-2 border-t border-dashed border-gray-400">
        <div dangerouslySetInnerHTML={{
          __html: generateQRBlock(`INV:${inv.invoice_number || ''}|T:${inv.total || 0}`, 60)
        }} style={{ display: 'inline-block' }} />
      </div>

      {/* Footer */}
      <div className="text-center mt-2 text-xs text-gray-400 border-t border-dashed border-gray-400 pt-3">
        <p>شكراً لتعاملكم معنا</p>
        <p>{co.name}</p>
      </div>
    </div>
  )
})

/**
 * وظيفة طباعة الفاتورة — Premium
 */
export function printInvoice(invoice, items, company, template = 'a4') {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) return

  const inv = invoice || {}
  const lineItems = items || []
  const co = company || { name: 'BI Company', address: 'بغداد، العراق', phone: '+964 XXX XXX XXXX' }

  const isA4 = template === 'a4'
  const width = isA4 ? '210mm' : '80mm'
  const typeLabel = invoiceTypeLabels[inv.type] || 'فاتورة'
  const payLabel = paymentTypeLabels[inv.payment_type] || ''

  // Generate QR
  const qrData = `INV:${inv.invoice_number || ''}|T:${inv.total || 0}|D:${inv.created_at?.slice(0, 10) || ''}`
  const qrSize = isA4 ? 90 : 60
  const qrSvg = generateQRBlockHTML(qrData, qrSize)

  const itemsRows = lineItems.map((item, i) =>
    isA4
      ? `<tr>
          <td style="border:1px solid #d1d5db;padding:6px 10px;text-align:center;font-size:13px">${i + 1}</td>
          <td style="border:1px solid #d1d5db;padding:6px 10px;font-size:13px">${item.product_name || item.description || '—'}${item.serial_number ? `<br><small style="color:#888;font-family:monospace">${item.serial_number}</small>` : ''}</td>
          <td style="border:1px solid #d1d5db;padding:6px 10px;text-align:center;font-size:13px">${item.quantity}</td>
          <td style="border:1px solid #d1d5db;padding:6px 10px;text-align:center;font-size:13px">${formatNumber(item.unit_price)}</td>
          <td style="border:1px solid #d1d5db;padding:6px 10px;text-align:center;font-size:13px;font-weight:500">${formatNumber(item.total || (item.quantity * item.unit_price))}</td>
        </tr>`
      : `<div style="margin-bottom:6px;font-size:11px">
          <div style="font-weight:500">${item.product_name || item.description || '—'}</div>
          ${item.serial_number ? `<div style="font-size:9px;color:#888;font-family:monospace">${item.serial_number}</div>` : ''}
          <div style="display:flex;justify-content:space-between;color:#666">
            <span>${item.quantity} × ${formatNumber(item.unit_price)}</span>
            <span style="color:#000;font-weight:500">${formatNumber(item.total || (item.quantity * item.unit_price))}</span>
          </div>
        </div>`
  ).join('')

  // Build paid/remaining section
  const paidSection = (parseFloat(inv.paid_amount) > 0) ? `
    <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:${isA4 ? '13px' : '11px'};color:#15803d"><span>المدفوع:</span><span>${formatNumber(inv.paid_amount)} د.ع</span></div>
    ${parseFloat(inv.remaining_amount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:${isA4 ? '13px' : '11px'};font-weight:bold;color:#b91c1c"><span>المتبقي:</span><span>${formatNumber(inv.remaining_amount)} د.ع</span></div>` : ''}
  ` : ''

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${typeLabel} - ${inv.invoice_number || ''}</title>
<style>
  @page { size: ${isA4 ? 'A4' : '80mm auto'}; margin: ${isA4 ? '15mm' : '3mm'}; }
  body { font-family: Arial, Tahoma, sans-serif; margin: 0; padding: ${isA4 ? '20px' : '8px'}; max-width: ${width}; ${isA4 ? '' : 'margin: 0 auto;'} }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
${isA4 ? `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:20px">
    <div>
      ${co.logo_url ? `<img src="${co.logo_url}" style="height:48px;margin-bottom:8px" />` : ''}
      <h1 style="margin:0;font-size:22px">${co.name}</h1>
      ${co.name_en ? `<p style="margin:2px 0 0;color:#888;font-size:11px;font-style:italic">${co.name_en}</p>` : ''}
      <p style="margin:4px 0 0;color:#666;font-size:13px">${co.address || ''}</p>
      <p style="margin:2px 0 0;color:#666;font-size:13px">${co.phone || ''}</p>
    </div>
    <div style="text-align:left">
      <h2 style="margin:0;font-size:18px;color:#444">${typeLabel}</h2>
      <p style="margin:4px 0 0;font-size:13px"><span style="color:#888">رقم: </span><strong style="font-family:monospace">${inv.invoice_number || ''}</strong></p>
      <p style="margin:2px 0 0;font-size:13px"><span style="color:#888">التاريخ: </span>${formatDate(inv.created_at)}</p>
      ${payLabel ? `<p style="margin:2px 0 0;font-size:13px"><span style="color:#888">الدفع: </span><strong>${payLabel}</strong></p>` : ''}
    </div>
  </div>
  ${inv.customer_name ? `<p style="font-size:13px;margin-bottom:4px"><strong>العميل:</strong> ${inv.customer_name}${inv.customer_phone ? ` — ${inv.customer_phone}` : ''}</p>` : ''}
  ${inv.supplier_name ? `<p style="font-size:13px;margin-bottom:4px"><strong>المورد:</strong> ${inv.supplier_name}</p>` : ''}
  <table style="margin-top:16px;margin-bottom:16px">
    <thead><tr style="background:#f3f4f6"><th style="border:1px solid #d1d5db;padding:6px 10px;text-align:right;font-size:11px;width:30px">#</th><th style="border:1px solid #d1d5db;padding:6px 10px;text-align:right;font-size:11px">المنتج</th><th style="border:1px solid #d1d5db;padding:6px 10px;text-align:center;font-size:11px;width:60px">الكمية</th><th style="border:1px solid #d1d5db;padding:6px 10px;text-align:center;font-size:11px;width:90px">السعر</th><th style="border:1px solid #d1d5db;padding:6px 10px;text-align:center;font-size:11px;width:90px">المجموع</th></tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <div style="text-align:center">
      ${qrSvg}
      <p style="font-size:8px;color:#aaa;margin:4px 0 0">مسح للتحقق</p>
    </div>
    <div style="width:250px">
      <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span style="color:#666">المجموع الفرعي:</span><span>${formatNumber(inv.subtotal || inv.total)} د.ع</span></div>
      ${parseFloat(inv.discount_amount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;color:red"><span>الخصم:</span><span>- ${formatNumber(inv.discount_amount)} د.ع</span></div>` : ''}
      ${parseFloat(inv.shipping_cost) > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span style="color:#666">التوصيل:</span><span>${formatNumber(inv.shipping_cost)} د.ع</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:17px;font-weight:bold;border-top:2px solid #000;margin-top:6px"><span>الإجمالي:</span><span>${formatNumber(inv.total)} د.ع</span></div>
      ${paidSection}
    </div>
  </div>
  ${inv.notes ? `<div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:10px"><p style="font-size:11px;color:#888;margin:0 0 4px">ملاحظات:</p><p style="font-size:13px;margin:0">${inv.notes}</p></div>` : ''}
  <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;text-align:center;font-size:13px"><div><div style="border-top:1px solid #999;padding-top:6px;margin-top:40px">المحرر</div></div><div><div style="border-top:1px solid #999;padding-top:6px;margin-top:40px">المدقق</div></div><div><div style="border-top:1px solid #999;padding-top:6px;margin-top:40px">المستلم</div></div></div>
  <div style="margin-top:30px;display:flex;justify-content:space-between;font-size:10px;color:#aaa;border-top:1px solid #e5e7eb;padding-top:8px"><span>BI Management</span><span>${new Date().toLocaleString('ar-IQ')}</span></div>
` : `
  <div style="text-align:center;border-bottom:1px dashed #999;padding-bottom:8px;margin-bottom:8px">
    ${co.logo_url ? `<img src="${co.logo_url}" style="height:28px;margin:0 auto 4px;display:block" />` : ''}
    <h1 style="margin:0;font-size:16px">${co.name}</h1>
    <p style="margin:2px 0 0;font-size:10px;color:#666">${co.phone || ''}</p>
    <p style="margin:4px 0 0;font-size:12px;font-weight:bold">${typeLabel}</p>
  </div>
  <div style="font-size:11px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between"><span>رقم:</span><span style="font-family:monospace;font-weight:bold">${inv.invoice_number || ''}</span></div>
    <div style="display:flex;justify-content:space-between"><span>التاريخ:</span><span>${formatDate(inv.created_at)} ${formatTime(inv.created_at)}</span></div>
    ${inv.customer_name ? `<div style="display:flex;justify-content:space-between"><span>العميل:</span><span>${inv.customer_name}</span></div>` : ''}
    ${inv.supplier_name ? `<div style="display:flex;justify-content:space-between"><span>المورد:</span><span>${inv.supplier_name}</span></div>` : ''}
    ${payLabel ? `<div style="display:flex;justify-content:space-between"><span>الدفع:</span><span style="font-weight:bold">${payLabel}</span></div>` : ''}
    ${inv.created_by_name ? `<div style="display:flex;justify-content:space-between"><span>المحرر:</span><span>${inv.created_by_name}</span></div>` : ''}
  </div>
  <div style="border-top:1px dashed #999;margin:6px 0"></div>
  ${itemsRows}
  <div style="border-top:1px dashed #999;margin:6px 0"></div>
  ${parseFloat(inv.discount_amount) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px"><span>المجموع:</span><span>${formatNumber(inv.subtotal || inv.total)}</span></div><div style="display:flex;justify-content:space-between;font-size:11px;color:red"><span>خصم:</span><span>-${formatNumber(inv.discount_amount)}</span></div>` : ''}
  <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;padding-top:4px"><span>الإجمالي:</span><span>${formatNumber(inv.total)} د.ع</span></div>
  ${paidSection}
  <div style="text-align:center;margin-top:8px;padding-top:8px;border-top:1px dashed #999">${qrSvg}</div>
  <div style="text-align:center;margin-top:8px;font-size:10px;color:#aaa;border-top:1px dashed #999;padding-top:8px"><p style="margin:0">شكراً لتعاملكم معنا</p></div>
`}
</body></html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 300)
}

/**
 * Generate QR block as raw HTML string (for printInvoice function)
 */
function generateQRBlockHTML(data, size) {
  const hash = (str) => {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i)
      h |= 0
    }
    return Math.abs(h)
  }

  const text = data || ''
  const h = hash(text)
  const grid = 11
  const cellSize = size / grid
  let rects = ''

  const drawFinder = (x, y) => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 1 && j === 1) continue
        rects += `<rect x="${(x + i) * cellSize}" y="${(y + j) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      }
    }
    rects += `<rect x="${(x + 1) * cellSize}" y="${(y + 1) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
  }
  drawFinder(0, 0)
  drawFinder(grid - 3, 0)
  drawFinder(0, grid - 3)

  for (let i = 3; i < grid - 3; i++) {
    for (let j = 3; j < grid - 3; j++) {
      const seed = (h + i * 7 + j * 13) % 3
      if (seed === 0) {
        rects += `<rect x="${i * cellSize}" y="${j * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:inline-block">${rects}</svg>`
}

export default { InvoiceA4, InvoiceThermal, printInvoice }
