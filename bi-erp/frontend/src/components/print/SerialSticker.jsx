/**
 * BI Management - Serial Sticker Print
 * طباعة ستيكر سيريال مع باركود حقيقي (JsBarcode)
 */
import JsBarcode from 'jsbarcode'

/**
 * توليد SVG باركود كنص
 */
function generateBarcodeSVG(text) {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, text, {
      format: 'CODE128',
      width: 1.5,
      height: 30,
      displayValue: false,
      margin: 0,
    })
    return new XMLSerializer().serializeToString(svg)
  } catch (e) {
    return `<svg width="150" height="30"><text x="0" y="20" font-size="10">${text}</text></svg>`
  }
}

/**
 * طباعة ستيكر سيريال واحد
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

  const barcodeSVG = generateBarcodeSVG(serial)

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>ستيكر ${serial}</title>
<style>
  @page { size: 60mm 35mm; margin: 2mm; }
  body { font-family: Arial, Tahoma, sans-serif; margin: 0; padding: 3px; width: 56mm; }
  .company { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 1px; }
  .barcode { text-align: center; margin: 2px 0; }
  .barcode svg { max-width: 100%; height: 28px; }
  .serial { text-align: center; font-size: 11px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px; }
  .name { text-align: center; font-size: 8px; margin: 1px 0; }
  .specs { text-align: center; font-size: 7px; color: #555; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="company">BI Company</div>
  <div class="barcode">${barcodeSVG}</div>
  <div class="serial">${serial}</div>
  <div class="name">${name}</div>
  ${specs.length > 0 ? `<div class="specs">${specs.join(' | ')}</div>` : ''}
</body></html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 300)
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
    const barcodeSVG = generateBarcodeSVG(serial)

    return `<div class="sticker">
      <div class="company">BI Company</div>
      <div class="barcode">${barcodeSVG}</div>
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
  .sticker { width: 58mm; height: 34mm; border: 1px dashed #ccc; padding: 2px; margin: 2mm; display: inline-block; page-break-inside: avoid; overflow: hidden; }
  .company { font-size: 9px; font-weight: bold; text-align: center; }
  .barcode { text-align: center; margin: 1px 0; }
  .barcode svg { max-width: 100%; height: 24px; }
  .serial { text-align: center; font-size: 10px; font-weight: bold; font-family: monospace; }
  .name { text-align: center; font-size: 7px; }
  .specs { text-align: center; font-size: 6px; color: #555; }
</style></head>
<body>${stickers}</body></html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print() }, 400)
}

export default { printSerialSticker, printMultipleStickers }
