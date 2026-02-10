/**
 * BI Management - Serial Sticker Print
 * طباعة ستيكر سيريال (باركود + مواصفات)
 */

/**
 * طباعة ستيكر سيريال
 * @param {Object} device - بيانات الجهاز {serial_number, product_name, specs}
 */
export function printSerialSticker(device) {
  const printWindow = window.open('', '_blank', 'width=400,height=300')
  if (!printWindow) return

  const serial = device.serial_number || '—'
  const name = device.product_name || device.name || '—'
  const specs = []
  if (device.processor) specs.push(device.processor)
  if (device.ram_size) specs.push(`${device.ram_size}GB`)
  if (device.storage_size) specs.push(`${device.storage_size}GB ${device.storage_type || 'SSD'}`)

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>ستيكر ${serial}</title>
<style>
  @page { size: 60mm 35mm; margin: 2mm; }
  body { font-family: Arial, Tahoma, sans-serif; margin: 0; padding: 4px; width: 56mm; }
  .company { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .barcode { text-align: center; font-family: 'Libre Barcode 39', monospace; font-size: 28px; letter-spacing: 2px; margin: 2px 0; }
  .barcode-text { text-align: center; font-size: 9px; font-family: monospace; font-weight: bold; letter-spacing: 1px; }
  .serial { text-align: center; font-size: 12px; font-weight: bold; font-family: monospace; margin: 3px 0; }
  .name { text-align: center; font-size: 9px; margin: 1px 0; }
  .specs { text-align: center; font-size: 8px; color: #555; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="company">BI Company</div>
  <div class="barcode">*${serial}*</div>
  <div class="serial">${serial}</div>
  <div class="name">${name}</div>
  ${specs.length > 0 ? `<div class="specs">${specs.join(' | ')}</div>` : ''}
</body></html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 200)
}

/**
 * طباعة عدة ستيكرات
 */
export function printMultipleStickers(devices) {
  const printWindow = window.open('', '_blank', 'width=600,height=800')
  if (!printWindow) return

  const stickers = (devices || []).map(d => {
    const serial = d.serial_number || '—'
    const name = d.product_name || d.name || '—'
    const specs = []
    if (d.processor) specs.push(d.processor)
    if (d.ram_size) specs.push(`${d.ram_size}GB`)
    if (d.storage_size) specs.push(`${d.storage_size}GB`)

    return `<div class="sticker">
      <div class="company">BI Company</div>
      <div class="barcode">*${serial}*</div>
      <div class="serial">${serial}</div>
      <div class="name">${name}</div>
      ${specs.length > 0 ? `<div class="specs">${specs.join(' | ')}</div>` : ''}
    </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>ستيكرات سيريال</title>
<style>
  @page { margin: 5mm; }
  body { font-family: Arial, Tahoma, sans-serif; margin: 0; padding: 0; }
  .sticker { width: 58mm; height: 33mm; border: 1px dashed #ccc; padding: 3px; margin: 2mm; display: inline-block; page-break-inside: avoid; overflow: hidden; }
  .company { font-size: 10px; font-weight: bold; text-align: center; }
  .barcode { text-align: center; font-family: 'Libre Barcode 39', monospace; font-size: 26px; letter-spacing: 2px; margin: 1px 0; }
  .serial { text-align: center; font-size: 11px; font-weight: bold; font-family: monospace; }
  .name { text-align: center; font-size: 8px; }
  .specs { text-align: center; font-size: 7px; color: #555; }
</style></head>
<body>${stickers}</body></html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 300)
}

export default { printSerialSticker, printMultipleStickers }
