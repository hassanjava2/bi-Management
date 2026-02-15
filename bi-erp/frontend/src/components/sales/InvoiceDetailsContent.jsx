/**
 * BI Management - Invoice Details Content (Premium)
 * محتوى تفاصيل الفاتورة — تصميم متطور
 */
import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  Printer, XCircle, FileText, Receipt, Copy, Loader2,
  CheckCircle, Clock, Package, User, Calendar, CreditCard,
  ArrowUpDown, Ban, Truck, ChevronRight
} from 'lucide-react'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { salesAPI } from '../../services/api'
import { invoiceTypes, invoiceStatuses } from './salesConstants'
import { printInvoice } from '../print/InvoicePrintTemplate'
import api from '../../services/api'

export default function InvoiceDetailsContent({ invoiceId, onClose, onCancel, onPrinted }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => salesAPI.getInvoice(invoiceId),
    enabled: !!invoiceId,
  })
  const invoice = data?.data?.invoice || data?.data?.data?.invoice || data?.data
  const items = data?.data?.items || data?.data?.data?.items || []
  const type = invoice ? (invoiceTypes[invoice.type] || invoiceTypes.sale) : null
  const status = invoice ? (invoiceStatuses[invoice.status] || invoiceStatuses.draft) : null
  const canWorkflow = invoice && ['draft', 'waiting', 'confirmed'].includes(invoice.status)

  const handleWorkflow = (action) => {
    const fn = action === 'prepare' ? salesAPI.prepareInvoice : action === 'convert' ? salesAPI.convertInvoiceToActive : (id) => salesAPI.transitionInvoice(id, {})
    fn(invoiceId).then(() => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); refetch(); onPrinted?.() }).catch(() => { })
  }

  const copyMutation = useMutation({
    mutationFn: () => api.post('/invoices/copy-items', { source_invoice_id: invoiceId, type: invoice?.type || 'sale' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); onPrinted?.() },
  })

  const handlePrint = (template = 'a4') => {
    salesAPI.printInvoice(invoiceId).then((res) => {
      const { invoice: inv, items: its, company } = res?.data?.data || res?.data || {}
      printInvoice(inv, its, company, template)
      onPrinted?.()
    }).catch(() => { })
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>
  if (error || !invoice) return <p className="text-neutral-500 py-8 text-center">تعذر تحميل الفاتورة.</p>

  const paid = parseFloat(invoice.paid_amount) || 0
  const remaining = parseFloat(invoice.remaining_amount) || 0
  const total = parseFloat(invoice.total) || 0

  return (
    <div className="space-y-5">
      {/* Header — Invoice Number + Type + Status */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <p className="text-xs text-neutral-500 mb-1">رقم الفاتورة</p>
          <p className="font-mono text-xl font-bold text-primary-600 dark:text-primary-400">{invoice.invoice_number}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${type?.color}`}>
            {type?.icon && <type.icon className="w-3.5 h-3.5" />}{type?.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${status?.color}`}>
            {status?.label}
          </span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoCard icon={User} label="الزبون/المورد" value={invoice.customer_name || invoice.supplier_name || '—'} />
        <InfoCard icon={Calendar} label="التاريخ" value={invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
        <InfoCard icon={CreditCard} label="طريقة الدفع" value={invoice.payment_method === 'cash' ? 'نقدي' : invoice.payment_method === 'credit' ? 'آجل' : invoice.payment_method === 'installment' ? 'أقساط' : invoice.payment_method || '—'} />
      </div>

      {/* Items Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/60">
            <tr>
              <th className="px-4 py-2.5 text-right font-semibold text-neutral-500 w-10">#</th>
              <th className="px-4 py-2.5 text-right font-semibold text-neutral-500">المنتج</th>
              <th className="px-4 py-2.5 text-right font-semibold text-neutral-500 w-20">الكمية</th>
              <th className="px-4 py-2.5 text-right font-semibold text-neutral-500 w-28">السعر</th>
              <th className="px-4 py-2.5 text-right font-semibold text-neutral-500 w-28">المجموع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
            {(items || []).map((i, idx) => (
              <tr key={i.id || idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-700/20 transition-colors">
                <td className="px-4 py-2.5 text-center text-neutral-400 font-mono text-xs">{idx + 1}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{i.product_name || '—'}</p>
                  {i.serial_number && <p className="text-[10px] text-neutral-400 font-mono">{i.serial_number}</p>}
                </td>
                <td className="px-4 py-2.5 text-center font-bold">{i.quantity || 0}</td>
                <td className="px-4 py-2.5">{(i.unit_price || 0).toLocaleString()}</td>
                <td className="px-4 py-2.5 font-bold">{((i.quantity || 0) * (i.unit_price || 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Card */}
      <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 p-4 space-y-2">
        {parseFloat(invoice.discount_amount) > 0 && (
          <>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>المجموع الفرعي</span>
              <span>{(parseFloat(invoice.subtotal) || total).toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between text-sm text-red-600">
              <span>الخصم</span>
              <span>- {parseFloat(invoice.discount_amount).toLocaleString()} د.ع</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <span className="font-bold text-lg">الإجمالي</span>
          <span className="text-xl font-black text-primary-600 dark:text-primary-400">{total.toLocaleString()} <span className="text-sm">د.ع</span></span>
        </div>
        {paid > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>المدفوع</span>
            <span className="font-bold">{paid.toLocaleString()} د.ع</span>
          </div>
        )}
        {remaining > 0 && (
          <div className="flex justify-between text-sm font-bold text-red-600">
            <span>المتبقي</span>
            <span>{remaining.toLocaleString()} د.ع</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4 text-sm">
          <p className="text-xs text-neutral-500 mb-1">ملاحظات:</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      {/* Workflow Buttons */}
      {canWorkflow && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="outline" size="sm" onClick={() => handleWorkflow('prepare')}>
            <Package className="w-4 h-4 ml-2" /> تجهيز الفاتورة
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleWorkflow('convert')}>
            <CheckCircle className="w-4 h-4 ml-2" /> تحويل لفعّالة
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <Button variant="outline" onClick={() => handlePrint('a4')}>
          <FileText className="w-4 h-4 ml-2" /> طباعة A4
        </Button>
        <Button variant="outline" onClick={() => handlePrint('thermal')}>
          <Receipt className="w-4 h-4 ml-2" /> طباعة حرارية
        </Button>
        <Button variant="outline" onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending}>
          {copyMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Copy className="w-4 h-4 ml-2" />} نسخ الفاتورة
        </Button>
        {invoice.status !== 'cancelled' && (
          <Button variant="danger" onClick={onCancel}>
            <Ban className="w-4 h-4 ml-2" /> إلغاء الفاتورة
          </Button>
        )}
        <Button variant="outline" onClick={onClose} className="mr-auto">إغلاق</Button>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-neutral-500" />
      </div>
      <div>
        <p className="text-[10px] text-neutral-400">{label}</p>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{value}</p>
      </div>
    </div>
  )
}
