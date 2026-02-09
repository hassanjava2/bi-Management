import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer, XCircle } from 'lucide-react'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { salesAPI } from '../../services/api'
import { invoiceTypes, invoiceStatuses } from './salesConstants'

export default function InvoiceDetailsContent({ invoiceId, onClose, onCancel, onPrinted }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => salesAPI.getInvoice(invoiceId),
    enabled: !!invoiceId,
  })
  const invoice = data?.data?.invoice || data?.data
  const items = data?.data?.items || []
  const type = invoice ? (invoiceTypes[invoice.type] || invoiceTypes.sale) : null
  const status = invoice ? (invoiceStatuses[invoice.status] || invoiceStatuses.draft) : null
  const canWorkflow = invoice && ['draft', 'waiting', 'confirmed'].includes(invoice.status)

  const handleWorkflow = (action) => {
    const fn = action === 'prepare' ? salesAPI.prepareInvoice : action === 'convert' ? salesAPI.convertInvoiceToActive : (id) => salesAPI.transitionInvoice(id, {})
    fn(invoiceId).then(() => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); refetch(); onPrinted?.() }).catch(() => {})
  }

  const handlePrint = () => {
    salesAPI.printInvoice(invoiceId).then((res) => {
      const { invoice: inv, items: its, company } = res?.data?.data || res?.data || {}
      const printWindow = window.open('', '_blank')
      if (!printWindow) return
      printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${inv?.invoice_number || ''}</title><style>body{font-family:system-ui;padding:20px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:right}.header{text-align:center;margin-bottom:24px}.total{font-weight:bold;font-size:1.2em}</style></head><body><div class="header"><h2>${company?.name || 'BI'}</h2><p>${company?.address || ''} | ${company?.phone || ''}</p></div><h3>فاتورة رقم: ${inv?.invoice_number || ''}</h3><p>الزبون: ${inv?.customer_name || inv?.supplier_name || '-'} | التاريخ: ${inv?.created_at ? new Date(inv.created_at).toLocaleDateString('ar-IQ') : ''}</p><table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>${(its || []).map(i => `<tr><td>${i.product_name || '-'}</td><td>${i.quantity || 0}</td><td>${(i.unit_price || 0).toLocaleString()}</td><td>${((i.quantity || 0) * (i.unit_price || 0)).toLocaleString()}</td></tr>`).join('')}</tbody></table><p class="total">الإجمالي: ${(inv?.total || 0).toLocaleString()} د.ع</p></body></html>`)
      printWindow.document.close(); printWindow.focus(); printWindow.print()
      onPrinted?.()
    }).catch(() => {})
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>
  if (error || !invoice) return <p className="text-neutral-500 py-4">تعذر تحميل الفاتورة.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-sm text-neutral-500">رقم الفاتورة</p>
          <p className="font-mono font-semibold text-primary-600">{invoice.invoice_number}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${type?.color}`}>{type?.icon && <type.icon className="w-3 h-3" />}{type?.label}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}>{status?.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-neutral-500">الزبون/المورد:</span> {invoice.customer_name || invoice.supplier_name || '-'}</div>
        <div><span className="text-neutral-500">التاريخ:</span> {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('ar-IQ') : '-'}</div>
        <div><span className="text-neutral-500">المبلغ:</span> <strong>{(invoice.total || 0).toLocaleString()} د.ع</strong></div>
      </div>
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-700/50"><tr><th className="px-3 py-2 text-right">المنتج</th><th className="px-3 py-2 text-right">الكمية</th><th className="px-3 py-2 text-right">السعر</th><th className="px-3 py-2 text-right">المجموع</th></tr></thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {(items || []).map((i, idx) => (
              <tr key={i.id || idx}><td className="px-3 py-2">{i.product_name || '-'}</td><td className="px-3 py-2">{i.quantity || 0}</td><td className="px-3 py-2">{(i.unit_price || 0).toLocaleString()}</td><td className="px-3 py-2">{((i.quantity || 0) * (i.unit_price || 0)).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {canWorkflow && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => handleWorkflow('prepare')}>تجهيز الفاتورة</Button>
          <Button variant="outline" size="sm" onClick={() => handleWorkflow('convert')}>تحويل لفعالة</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 ml-2" /> طباعة</Button>
        {invoice.status !== 'cancelled' && <Button variant="danger" onClick={onCancel}><XCircle className="w-4 h-4 ml-2" /> إلغاء الفاتورة</Button>}
        <Button variant="outline" onClick={onClose}>إغلاق</Button>
      </div>
    </div>
  )
}
