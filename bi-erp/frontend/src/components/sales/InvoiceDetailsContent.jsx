/**
 * BI Management - Invoice Details Content (Premium Enhanced)
 * Sprint 4 — Payment tracking, multi-currency, workflow actions
 */
import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  Printer, XCircle, FileText, Receipt, Copy, Loader2,
  CheckCircle, Clock, Package, User, Calendar, CreditCard,
  ArrowUpDown, Ban, Truck, ChevronRight, DollarSign, Banknote,
  MapPin, Hash, AlertTriangle, Send, Wallet
} from 'lucide-react'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { salesAPI } from '../../services/api'
import { invoiceTypes, invoiceStatuses } from './salesConstants'
import { printInvoice } from '../print/InvoicePrintTemplate'
import api from '../../services/api'

const fmt = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

export default function InvoiceDetailsContent({ invoiceId, onClose, onCancel, onPrinted }) {
  const queryClient = useQueryClient()
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => salesAPI.getInvoice(invoiceId),
    enabled: !!invoiceId,
  })
  const invoice = data?.data?.invoice || data?.data?.data?.invoice || data?.data
  const items = data?.data?.items || data?.data?.data?.items || []
  const type = invoice ? (invoiceTypes[invoice.type] || invoiceTypes.sale) : null
  const status = invoice ? (invoiceStatuses[invoice.status] || invoiceStatuses.draft) : null

  // Workflow
  const canWorkflow = invoice && ['draft', 'waiting', 'confirmed', 'processing'].includes(invoice.status)

  const workflowActions = [
    { key: 'confirm', label: 'تأكيد', icon: CheckCircle, condition: ['draft', 'waiting'].includes(invoice?.status), color: 'text-blue-600' },
    { key: 'prepare', label: 'تجهيز', icon: Package, condition: invoice?.status === 'confirmed', color: 'text-amber-600' },
    { key: 'ship', label: 'شحن', icon: Truck, condition: invoice?.status === 'processing', color: 'text-indigo-600' },
    { key: 'deliver', label: 'تم التوصيل', icon: CheckCircle, condition: invoice?.status === 'shipped', color: 'text-emerald-600' },
  ]

  const handleWorkflow = (action) => {
    let fn
    if (action === 'prepare') fn = salesAPI.prepareInvoice
    else if (action === 'confirm') fn = salesAPI.convertInvoiceToActive
    else fn = (id) => salesAPI.transitionInvoice(id, { status: action === 'ship' ? 'shipped' : action === 'deliver' ? 'delivered' : 'completed' })

    fn(invoiceId)
      .then(() => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); refetch(); onPrinted?.() })
      .catch(() => { })
  }

  // Payment recording
  const paymentMutation = useMutation({
    mutationFn: (data) => api.post(`/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      setPaymentAmount('')
      setShowPaymentForm(false)
      refetch()
    },
  })

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    paymentMutation.mutate({ amount, payment_method: paymentMethod })
  }

  // Copy invoice
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
  const remaining = parseFloat(invoice.remaining_amount) || (parseFloat(invoice.total) - paid)
  const total = parseFloat(invoice.total) || 0
  const subtotal = parseFloat(invoice.subtotal) || total
  const discountAmt = parseFloat(invoice.discount_amount) || 0
  const paymentPercent = total > 0 ? Math.min((paid / total) * 100, 100) : 0
  const isPaid = paid >= total || invoice.payment_status === 'paid'
  const isCredit = invoice.payment_type === 'credit' || invoice.payment_type === 'installment'
  const currencyLabel = invoice.currency === 'USD' ? '$' : 'د.ع'

  return (
    <div className="space-y-5">
      {/* Header — Invoice Number + Type + Status */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <p className="text-xs text-neutral-500 mb-1">رقم الفاتورة</p>
          <p className="font-mono text-xl font-bold text-primary-600 dark:text-primary-400">{invoice.invoice_number}</p>
          {invoice.created_by_name && (
            <p className="text-xs text-neutral-400 mt-1">بواسطة: {invoice.created_by_name}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${type?.color}`}>
            {type?.icon && <type.icon className="w-3.5 h-3.5" />}{type?.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${status?.color}`}>
            {status?.label}
          </span>
          {invoice.currency === 'USD' && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-100 text-green-800">
              <DollarSign className="w-3.5 h-3.5" /> USD
            </span>
          )}
        </div>
      </div>

      {/* Info Grid — Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard icon={User} label="الزبون/المورد" value={invoice.customer_name || invoice.supplier_name || '—'} />
        <InfoCard icon={Calendar} label="التاريخ" value={invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'} />
        <InfoCard icon={Wallet} label="طريقة الدفع" value={
          invoice.payment_type === 'cash' ? 'نقدي'
            : invoice.payment_type === 'credit' ? 'آجل'
              : invoice.payment_type === 'installment' ? 'أقساط'
                : invoice.payment_method || '—'
        } />
        <InfoCard icon={Hash} label="حالة الدفع" value={
          isPaid ? '✅ مدفوع بالكامل'
            : paid > 0 ? `⏳ مدفوع جزئياً (${Math.round(paymentPercent)}%)`
              : isCredit ? '🔴 غير مدفوع' : '✅ نقدي'
        } />
      </div>

      {/* Payment Progress Bar — for credit/installment invoices */}
      {isCredit && total > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" /> تتبع الدفعات
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isPaid ? 'مكتمل' : `${Math.round(paymentPercent)}%`}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isPaid ? 'bg-emerald-500' : paymentPercent > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${paymentPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>المدفوع: <b className="text-emerald-600">{fmt(paid)}</b> {currencyLabel}</span>
            <span>المتبقي: <b className="text-red-600">{fmt(remaining > 0 ? remaining : 0)}</b> {currencyLabel}</span>
          </div>

          {/* Quick Payment Form */}
          {!isPaid && (
            <div>
              {!showPaymentForm ? (
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full py-2 text-sm font-semibold text-primary-600 border border-dashed border-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  + تسجيل دفعة جديدة
                </button>
              ) : (
                <div className="flex gap-2 items-end pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 mb-1">المبلغ</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`الحد الأقصى: ${fmt(remaining)}`}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">طريقة</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
                    >
                      <option value="cash">نقدي</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="card">بطاقة</option>
                    </select>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRecordPayment}
                    disabled={paymentMutation.isPending || !paymentAmount}
                  >
                    {paymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600"
                  >✕</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
                <td className="px-4 py-2.5">{fmt(i.unit_price)} {currencyLabel}</td>
                <td className="px-4 py-2.5 font-bold">{fmt((i.quantity || 0) * (i.unit_price || 0))} {currencyLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Card — Enhanced */}
      <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 p-4 space-y-2">
        {discountAmt > 0 && (
          <>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>المجموع الفرعي</span>
              <span>{fmt(subtotal)} {currencyLabel}</span>
            </div>
            <div className="flex justify-between text-sm text-red-600">
              <span>الخصم</span>
              <span>- {fmt(discountAmt)} {currencyLabel}</span>
            </div>
          </>
        )}
        {invoice.platform_fee && parseFloat(invoice.platform_fee) > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>رسوم المنصة ({invoice.platform || 'أقساطي'})</span>
            <span>+ {fmt(invoice.platform_fee)} {currencyLabel}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <span className="font-bold text-lg">الإجمالي</span>
          <span className="text-xl font-black text-primary-600 dark:text-primary-400">
            {fmt(total)} <span className="text-sm">{currencyLabel}</span>
          </span>
        </div>
        {invoice.currency === 'USD' && invoice.exchange_rate && (
          <div className="flex justify-between text-xs text-neutral-400">
            <span>سعر الصرف: {invoice.exchange_rate} IQD/USD</span>
            <span>≈ {fmt(total * invoice.exchange_rate)} د.ع</span>
          </div>
        )}
        {paid > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>المدفوع</span>
            <span className="font-bold">{fmt(paid)} {currencyLabel}</span>
          </div>
        )}
        {remaining > 0 && !isPaid && (
          <div className="flex justify-between text-sm font-bold text-red-600">
            <span>المتبقي</span>
            <span>{fmt(remaining)} {currencyLabel}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {(invoice.notes || invoice.internal_notes) && (
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4 text-sm space-y-2">
          {invoice.notes && (
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">ملاحظات:</p>
              <p>{invoice.notes}</p>
            </div>
          )}
          {invoice.internal_notes && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
              <p className="text-xs text-amber-600 mb-0.5">🔒 ملاحظات داخلية:</p>
              <p className="text-neutral-600 dark:text-neutral-400">{invoice.internal_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Workflow Buttons — Enhanced */}
      {canWorkflow && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          {workflowActions.filter(a => a.condition).map(action => (
            <Button key={action.key} variant="outline" size="sm" onClick={() => handleWorkflow(action.key)}>
              <action.icon className={`w-4 h-4 ml-2 ${action.color}`} />
              {action.label}
            </Button>
          ))}
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
