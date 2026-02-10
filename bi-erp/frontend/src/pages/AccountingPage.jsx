/**
 * Bi Management - Accounting Page
 * صفحة المحاسبة والمالية - للمالك فقط 🔒
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard,
  Building2, Users, Receipt, PiggyBank, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download, Plus, Eye, BarChart3, PieChart,
  AlertTriangle, CheckCircle2, Clock, FileText, Calculator
} from 'lucide-react'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import PageShell from '../components/common/PageShell'
import { accountingAPI, customersAPI, suppliersAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'

export default function AccountingPage() {
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  const setTab = (id) => {
    setActiveTab(id)
    setSearchParams(id === 'overview' ? {} : { tab: id })
  }
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [voucherType, setVoucherType] = useState('receipt')

  // جلب البيانات المالية
  const { data: financeData, isLoading } = useQuery({
    queryKey: ['finance', dateRange],
    queryFn: () => accountingAPI.getOverview(dateRange),
  })

  const stats = financeData?.data?.data || {
    today_sales: 0,
    today_expenses: 0,
    today_profit: 0,
    month_sales: 0,
    month_profit: 0,
    receivables: 0,
    payables: 0,
    cash_balance: 0
  }

  // التحقق من الصلاحيات
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">غير مصرح</h2>
        <p className="text-neutral-500 mt-2">هذه الصفحة متاحة للمالك فقط</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const handleNewVoucher = (type) => {
    setVoucherType(type)
    setShowVoucherModal(true)
  }

  return (
    <PageShell
      title="المحاسبة والمالية"
      description="إدارة الحسابات والتقارير المالية"
      actions={
        <>
          <Button variant="outline" onClick={() => handleNewVoucher('receipt')}>
            <ArrowDownRight className="w-4 h-4 ml-2 text-green-500" />
            سند قبض
          </Button>
          <Button variant="outline" onClick={() => handleNewVoucher('payment')}>
            <ArrowUpRight className="w-4 h-4 ml-2 text-red-500" />
            سند دفع
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </>
      }
    >

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today Sales */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">اليوم</span>
          </div>
          <p className="text-2xl font-bold">{(stats.today_sales || 0).toLocaleString()}</p>
          <p className="text-sm opacity-80">مبيعات اليوم</p>
        </div>

        {/* Today Profit */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">صافي</span>
          </div>
          <p className="text-2xl font-bold">{(stats.today_profit || 0).toLocaleString()}</p>
          <p className="text-sm opacity-80">ربح اليوم 🔒</p>
        </div>

        {/* Receivables */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">ذمم</span>
          </div>
          <p className="text-2xl font-bold">{(stats.receivables / 1000000 || 0).toFixed(1)}M</p>
          <p className="text-sm opacity-80">ذمم لنا (عملاء)</p>
        </div>

        {/* Payables */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">ذمم</span>
          </div>
          <p className="text-2xl font-bold">{(stats.payables / 1000000 || 0).toFixed(1)}M</p>
          <p className="text-sm opacity-80">ذمم علينا (موردين)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
            { id: 'cashbox', label: 'الصناديق', icon: Wallet },
            { id: 'receivables', label: 'ذمم العملاء', icon: Users },
            { id: 'payables', label: 'ذمم الموردين', icon: Building2 },
            { id: 'vouchers', label: 'السندات', icon: Receipt },
            { id: 'expenses', label: 'المصاريف', icon: TrendingDown },
            { id: 'statements', label: 'كشوفات', icon: FileText },
            { id: 'reconciliation', label: 'المطابقة', icon: Calculator },
            { id: 'reports', label: 'التقارير', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profit & Loss Summary */}
          <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary-600" />
              ملخص الأرباح والخسائر
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-green-700 dark:text-green-400">إيرادات الشهر</span>
                  <span className="font-bold text-green-600">{(stats.month_sales || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-blue-700 dark:text-blue-400">مبيعات نقدية</span>
                  <span className="font-bold text-blue-600">{(stats.cash_sales || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-purple-700 dark:text-purple-400">مبيعات أقساط</span>
                  <span className="font-bold text-purple-600">{(stats.installment_sales || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-red-700 dark:text-red-400">تكلفة البضاعة</span>
                  <span className="font-bold text-red-600">{(stats.cogs || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-orange-700 dark:text-orange-400">مصاريف تشغيل</span>
                  <span className="font-bold text-orange-600">{(stats.operating_expenses || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg border-2 border-emerald-500">
                  <span className="text-emerald-800 dark:text-emerald-300 font-semibold">صافي الربح 🔒</span>
                  <span className="font-bold text-emerald-600 text-lg">{(stats.month_profit || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Balance */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary-600" />
              الصناديق
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/30 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">الصندوق الرئيسي</p>
                <p className="text-2xl font-bold text-primary-600">{(stats.cash_balance || 0).toLocaleString()}</p>
                <p className="text-xs text-neutral-500">د.ع</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">صندوق حسين</span>
                  <span>500,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">صندوق أحمد</span>
                  <span>350,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Debts Section */}
          <div className="lg:col-span-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              الديون والالتزامات
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Debts We Owe */}
              <div>
                <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  ديون علينا (نحن مدينين)
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <span>شركة الوزير</span>
                    <span className="font-bold text-red-600">7,000,000</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <span>سيد أحمد - العربي</span>
                    <span className="font-bold text-red-600">3,500,000</span>
                  </div>
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex justify-between font-semibold">
                      <span>المجموع</span>
                      <span className="text-red-600">10,500,000</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Debts Owed to Us */}
              <div>
                <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4" />
                  ديون لنا (الزبائن مدينين)
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <span>أحمد محمد</span>
                    <span className="font-bold text-green-600">1,200,000</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <span>شركة الأمل</span>
                    <span className="font-bold text-green-600">2,800,000</span>
                  </div>
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex justify-between font-semibold">
                      <span>المجموع</span>
                      <span className="text-green-600">4,000,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <ExpensesTab />
      )}

      {/* Vouchers Tab */}
      {activeTab === 'vouchers' && (
        <VouchersTab onNewReceipt={() => handleNewVoucher('receipt')} onNewPayment={() => handleNewVoucher('payment')} />
      )}

      {/* Receivables Tab */}
      {activeTab === 'receivables' && (
        <ReceivablesTab />
      )}

      {/* Payables Tab */}
      {activeTab === 'payables' && (
        <PayablesTab />
      )}

      {/* Cashbox Tab */}
      {activeTab === 'cashbox' && (
        <CashboxTab />
      )}

      {/* Statements Tab - كشوفات الحسابات */}
      {activeTab === 'statements' && (
        <AccountStatementsTab />
      )}

      {/* Reconciliation Tab - المطابقة اليومية */}
      {activeTab === 'reconciliation' && (
        <DailyReconciliationTab />
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <AccountingReportsTab />
      )}

      {/* New Voucher Modal */}
      <Modal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        title={voucherType === 'receipt' ? 'سند قبض جديد' : 'سند دفع جديد'}
        size="md"
      >
        <VoucherForm type={voucherType} onClose={() => setShowVoucherModal(false)} onSuccess={() => setShowVoucherModal(false)} />
      </Modal>
    </PageShell>
  )
}

// تبويب السندات - جدول + بحث
function VouchersTab({ onNewReceipt, onNewPayment }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-vouchers', search, typeFilter],
    queryFn: () => accountingAPI.getVouchers({ search, type: typeFilter !== 'all' ? typeFilter : undefined }),
  })
  const vouchers = data?.data?.data || data?.data || []
  const list = Array.isArray(vouchers) ? vouchers : []

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="font-semibold text-lg">سندات القبض والدفع</h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 w-40"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
          >
            <option value="all">الكل</option>
            <option value="receipt">قبض</option>
            <option value="payment">دفع</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => exportToCSV(list, 'vouchers.csv')} disabled={list.length === 0}>
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          <Button size="sm" variant="outline" onClick={onNewReceipt}>
            <ArrowDownRight className="w-4 h-4 ml-2 text-green-500" />
            سند قبض
          </Button>
          <Button size="sm" variant="outline" onClick={onNewPayment}>
            <ArrowUpRight className="w-4 h-4 ml-2 text-red-500" />
            سند دفع
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : list.length === 0 ? (
        <div className="text-center text-neutral-500 py-8">لا توجد سندات</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-700/50">
              <tr>
                <th className="px-3 py-2 text-right">التاريخ</th>
                <th className="px-3 py-2 text-right">النوع</th>
                <th className="px-3 py-2 text-right">المبلغ</th>
                <th className="px-3 py-2 text-right">البيان</th>
                <th className="px-3 py-2 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {list.map((v) => (
                <tr key={v.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <td className="px-3 py-2">{v.created_at ? new Date(v.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.type === 'receipt' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {v.type === 'receipt' ? 'قبض' : 'دفع'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-bold">{(v.amount || 0).toLocaleString()} د.ع</td>
                  <td className="px-3 py-2">{v.description || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => {
                      import('../components/print/VoucherPrintTemplate').then(mod => {
                        const co = localStorage.getItem('bi-print-config') ? JSON.parse(localStorage.getItem('bi-print-config')) : {}
                        mod.printVoucher(v, { name: co.company_name || 'BI Company', address: co.company_address || '', phone: co.company_phone || '' })
                      })
                    }} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-500" title="طباعة">
                      <Receipt className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// تبويب المصاريف - جدول + إضافة مصروف
function ExpensesTab() {
  const [showAdd, setShowAdd] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-expenses'],
    queryFn: () => accountingAPI.getExpenses({}),
  })
  const expenses = data?.data?.data || data?.data || []
  const list = Array.isArray(expenses) ? expenses : []

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">المصاريف</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToCSV(list, 'expenses.csv')} disabled={list.length === 0}>
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مصروف
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : list.length === 0 ? (
        <div className="text-center text-neutral-500 py-8">لا توجد مصاريف مسجلة</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-700/50">
              <tr>
                <th className="px-3 py-2 text-right">التاريخ</th>
                <th className="px-3 py-2 text-right">الفئة</th>
                <th className="px-3 py-2 text-right">المبلغ</th>
                <th className="px-3 py-2 text-right">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2">{e.created_at ? new Date(e.created_at).toLocaleDateString('ar-IQ') : '-'}</td>
                  <td className="px-3 py-2">{e.category || e.type || '-'}</td>
                  <td className="px-3 py-2 font-medium">{(e.amount || 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{e.description || e.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && (
        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة مصروف">
          <AddExpenseForm onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}

function AddExpenseForm({ onClose, onSuccess }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ amount: '', category: 'other', description: '' })
  const createMutation = useMutation({
    mutationFn: (data) => accountingAPI.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      onSuccess?.()
    },
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) return
    createMutation.mutate({ amount: amt, category: form.category, description: form.description.trim() || undefined })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 text-sm">
          {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">المبلغ</label>
        <input type="number" min="1" step="any" className="w-full px-3 py-2 border rounded-lg" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">الفئة</label>
        <select className="w-full px-3 py-2 border rounded-lg" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          <option value="salaries">رواتب</option>
          <option value="rent">إيجار</option>
          <option value="utilities">كهرباء ومياه</option>
          <option value="other">متفرقات</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">البيان</label>
        <input type="text" className="w-full px-3 py-2 border rounded-lg" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="وصف المصروف" />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  )
}

// تبويب ذمم العملاء
function ReceivablesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-receivables'],
    queryFn: () => accountingAPI.getReceivables({}),
  })
  const receivables = data?.data?.data || data?.data || []
  const list = Array.isArray(receivables) ? receivables : []

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="font-semibold text-lg mb-4">ذمم العملاء (مدينة لنا)</h3>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : list.length === 0 ? (
        <div className="text-center text-neutral-500 py-8">لا توجد ذمم مدينة</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-700/50">
              <tr>
                <th className="px-3 py-2 text-right">العميل</th>
                <th className="px-3 py-2 text-right">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {list.map((r) => (
                <tr key={r.customer_id || r.id}>
                  <td className="px-3 py-2">{r.customer_name || r.name || r.customer_id || '-'}</td>
                  <td className="px-3 py-2 font-medium text-green-600">{(r.balance || r.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// تبويب ذمم الموردين
function PayablesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-payables'],
    queryFn: () => accountingAPI.getPayables({}),
  })
  const payables = data?.data?.data || data?.data || []
  const list = Array.isArray(payables) ? payables : []

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="font-semibold text-lg mb-4">ذمم الموردين (دائنة علينا)</h3>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : list.length === 0 ? (
        <div className="text-center text-neutral-500 py-8">لا توجد ذمم دائنة</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-700/50">
              <tr>
                <th className="px-3 py-2 text-right">المورد</th>
                <th className="px-3 py-2 text-right">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {list.map((p) => (
                <tr key={p.supplier_id || p.id}>
                  <td className="px-3 py-2">{p.supplier_name || p.name || p.supplier_id || '-'}</td>
                  <td className="px-3 py-2 font-medium text-red-600">{(p.balance || p.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// تبويب الصناديق + تحويل
function CashboxTab() {
  const queryClient = useQueryClient()
  const [showTransfer, setShowTransfer] = useState(false)
  const { data: boxesRes } = useQuery({
    queryKey: ['accounting-cash-boxes'],
    queryFn: () => accountingAPI.getCashBoxes(),
  })
  const boxes = boxesRes?.data?.data || [{ id: 'main', name: 'الصندوق الرئيسي' }]
  const list = Array.isArray(boxes) ? boxes : []

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">الصناديق</h3>
        <Button size="sm" onClick={() => setShowTransfer(true)}>تحويل بين القاصات</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((box) => (
          <CashBoxBalance key={box.id} boxId={box.id} name={box.name} />
        ))}
      </div>
      {showTransfer && (
        <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="تحويل بين القاصات">
          <TransferCashForm
            cashBoxes={list}
            onClose={() => setShowTransfer(false)}
            onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['accounting-cash-boxes'] }); queryClient.invalidateQueries({ queryKey: ['finance'] }); setShowTransfer(false); }}
          />
        </Modal>
      )}
    </div>
  )
}

function CashBoxBalance({ boxId, name }) {
  const { data } = useQuery({
    queryKey: ['accounting-cash-box', boxId],
    queryFn: () => accountingAPI.getCashBoxBalance(boxId),
  })
  const balance = data?.data?.data?.balance ?? data?.data?.balance ?? 0
  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
      <p className="text-sm text-neutral-500">{name}</p>
      <p className="text-xl font-bold text-neutral-900 dark:text-white">{(balance || 0).toLocaleString()} د.ع</p>
    </div>
  )
}

function TransferCashForm({ cashBoxes, onClose, onSuccess }) {
  const [form, setForm] = useState({ from_id: '', to_id: '', amount: '' })
  const queryClient = useQueryClient()
  const transferMutation = useMutation({
    mutationFn: (data) => accountingAPI.transferCash(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-cash-boxes'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      onSuccess?.()
    },
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (!form.from_id || !form.to_id || !amt || amt <= 0) return
    if (form.from_id === form.to_id) return
    transferMutation.mutate({ from_id: form.from_id, to_id: form.to_id, amount: amt })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {transferMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{transferMutation.error?.response?.data?.error || transferMutation.error?.message}</div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">من صندوق</label>
        <select className="w-full px-3 py-2 border rounded-lg" value={form.from_id} onChange={(e) => setForm((f) => ({ ...f, from_id: e.target.value }))} required>
          <option value="">اختر...</option>
          {cashBoxes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">إلى صندوق</label>
        <select className="w-full px-3 py-2 border rounded-lg" value={form.to_id} onChange={(e) => setForm((f) => ({ ...f, to_id: e.target.value }))} required>
          <option value="">اختر...</option>
          {cashBoxes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">المبلغ</label>
        <input type="number" min="0.01" step="any" className="w-full px-3 py-2 border rounded-lg" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={transferMutation.isPending}>{transferMutation.isPending ? 'جاري...' : 'تحويل'}</Button>
      </div>
    </form>
  )
}

// تبويب كشوفات الحسابات
function AccountStatementsTab() {
  const [entityType, setEntityType] = useState('customer') // customer or supplier
  const [entityId, setEntityId] = useState('')

  const { data: customersRes } = useQuery({ queryKey: ['customers-list'], queryFn: () => customersAPI.getCustomers({ limit: 500 }) })
  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers-list'], queryFn: () => suppliersAPI.getSuppliers({ limit: 500 }) })
  const customers = customersRes?.data?.data || []
  const suppliers = suppliersRes?.data?.data || []
  const entityList = entityType === 'customer' ? customers : suppliers

  const { data: statementData, isLoading } = useQuery({
    queryKey: ['account-statement', entityType, entityId],
    queryFn: () => accountingAPI.getStatement
      ? accountingAPI.getStatement(entityType, entityId)
      : import('../services/api').then(m => m.default.get(`/accounting/statement/${entityType}/${entityId}`)),
    enabled: !!entityId,
  })

  const statement = statementData?.data?.data || {}
  const movements = statement.movements || []
  const formatNum = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">نوع الحساب</label>
          <div className="flex gap-2">
            <button onClick={() => { setEntityType('customer'); setEntityId('') }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${entityType === 'customer' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
              <Users className="w-4 h-4 inline ml-1" /> عميل
            </button>
            <button onClick={() => { setEntityType('supplier'); setEntityId('') }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${entityType === 'supplier' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
              <Building2 className="w-4 h-4 inline ml-1" /> مورد
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">{entityType === 'customer' ? 'اختر العميل' : 'اختر المورد'}</label>
          <select value={entityId} onChange={(e) => setEntityId(e.target.value)}
            className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800">
            <option value="">-- اختر --</option>
            {(Array.isArray(entityList) ? entityList : []).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && entityId && (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      )}

      {!isLoading && entityId && movements.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {/* ملخص */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 dark:bg-neutral-700/50">
            <div className="text-center">
              <p className="text-xs text-neutral-500">مدين</p>
              <p className="text-lg font-bold text-red-600">{formatNum(statement.total_debit)} د.ع</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500">دائن</p>
              <p className="text-lg font-bold text-green-600">{formatNum(statement.total_credit)} د.ع</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500">الرصيد</p>
              <p className={`text-lg font-bold ${statement.final_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatNum(Math.abs(statement.final_balance))} د.ع
                <span className="text-xs mr-1">{statement.final_balance >= 0 ? '(لنا)' : '(علينا)'}</span>
              </p>
            </div>
          </div>
          {/* زر طباعة */}
          <div className="px-4 py-2 flex justify-end border-b border-neutral-200 dark:border-neutral-700">
            <button type="button" onClick={() => {
              import('../components/print/VoucherPrintTemplate').then(mod => {
                mod.printAccountStatement(statement, entityType, {
                  name: localStorage.getItem('bi-print-config') ? JSON.parse(localStorage.getItem('bi-print-config')).company_name || 'BI Company' : 'BI Company',
                  address: localStorage.getItem('bi-print-config') ? JSON.parse(localStorage.getItem('bi-print-config')).company_address || '' : '',
                  phone: localStorage.getItem('bi-print-config') ? JSON.parse(localStorage.getItem('bi-print-config')).company_phone || '' : '',
                })
              })
            }} className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1">
              <FileText className="w-4 h-4" /> طباعة كشف الحساب
            </button>
          </div>
          {/* جدول الحركات */}
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-3 py-2 text-right text-xs text-neutral-500">التاريخ</th>
                <th className="px-3 py-2 text-right text-xs text-neutral-500">البيان</th>
                <th className="px-3 py-2 text-center text-xs text-neutral-500">مدين</th>
                <th className="px-3 py-2 text-center text-xs text-neutral-500">دائن</th>
                <th className="px-3 py-2 text-center text-xs text-neutral-500">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {movements.map((m, i) => (
                <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <td className="px-3 py-2 text-neutral-500 text-xs">{m.date ? new Date(m.date).toLocaleDateString('ar-IQ') : '—'}</td>
                  <td className="px-3 py-2 font-medium">{m.description}</td>
                  <td className="px-3 py-2 text-center text-red-600">{m.debit > 0 ? formatNum(m.debit) : '—'}</td>
                  <td className="px-3 py-2 text-center text-green-600">{m.credit > 0 ? formatNum(m.credit) : '—'}</td>
                  <td className="px-3 py-2 text-center font-medium">{formatNum(Math.abs(m.balance))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && entityId && movements.length === 0 && (
        <div className="text-center py-8 text-neutral-500">لا توجد حركات لهذا الحساب</div>
      )}

      {!entityId && (
        <div className="text-center py-12 text-neutral-400">
          <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p>اختر عميل أو مورد لعرض كشف الحساب</p>
        </div>
      )}
    </div>
  )
}

// تبويب المطابقة اليومية
function DailyReconciliationTab() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const { data: reconData, isLoading } = useQuery({
    queryKey: ['reconciliation', date],
    queryFn: () => accountingAPI.getReconciliation
      ? accountingAPI.getReconciliation(date)
      : import('../services/api').then(m => m.default.get(`/accounting/reconciliation?date=${date}`)),
  })

  const data = reconData?.data?.data || {}
  const formatNum = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

  const sections = [
    { label: 'المبيعات', icon: TrendingUp, count: data.sales?.count || 0, total: data.sales?.total || 0, paid: data.sales?.paid || 0, color: 'emerald' },
    { label: 'المشتريات', icon: TrendingDown, count: data.purchases?.count || 0, total: data.purchases?.total || 0, color: 'amber' },
    { label: 'سندات القبض', icon: ArrowDownRight, count: data.receipts?.count || 0, total: data.receipts?.total || 0, color: 'green' },
    { label: 'سندات الدفع', icon: ArrowUpRight, count: data.payments?.count || 0, total: data.payments?.total || 0, color: 'red' },
    { label: 'المصاريف', icon: CreditCard, count: data.expenses?.count || 0, total: data.expenses?.total || 0, color: 'purple' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">تاريخ المطابقة</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" />
        </div>
        <div className="text-sm text-neutral-500 mt-5">
          {new Date(date).toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="md" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {sections.map((s, i) => (
              <div key={i} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`w-5 h-5 text-${s.color}-600`} />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{s.label}</span>
                </div>
                <p className="text-xl font-bold">{formatNum(s.total)} <span className="text-xs text-neutral-400 font-normal">د.ع</span></p>
                <p className="text-xs text-neutral-500">{s.count} عملية</p>
              </div>
            ))}
          </div>

          {/* صافي اليوم */}
          <div className={`rounded-xl p-6 text-center ${(data.net_cash || 0) >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">صافي الحركة النقدية لليوم</p>
            <p className={`text-4xl font-bold ${(data.net_cash || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {formatNum(data.net_cash || 0)} <span className="text-lg">د.ع</span>
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              المقبوضات: {formatNum((data.sales?.paid || 0) + (data.receipts?.total || 0))} — المدفوعات: {formatNum((data.payments?.total || 0) + (data.expenses?.total || 0))}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// تبويب التقارير المالية
function AccountingReportsTab() {
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [selectedReport, setSelectedReport] = useState(null)
  const { data: profitLoss } = useQuery({
    queryKey: ['accounting-profit-loss', dateRange],
    queryFn: () => accountingAPI.getProfitLoss(dateRange),
    enabled: selectedReport === 'profit-loss',
  })
  const { data: cashFlow } = useQuery({
    queryKey: ['accounting-cash-flow', dateRange],
    queryFn: () => accountingAPI.getCashFlow(dateRange),
    enabled: selectedReport === 'cash-flow',
  })
  const { data: debtReport } = useQuery({
    queryKey: ['accounting-debt-report', dateRange],
    queryFn: () => accountingAPI.getDebtReport(dateRange),
    enabled: selectedReport === 'debt-report',
  })

  const reports = [
    { id: 'profit-loss', title: 'تقرير الأرباح والخسائر', icon: TrendingUp, color: 'green', data: profitLoss?.data?.data || profitLoss?.data },
    { id: 'cash-flow', title: 'تقرير التدفق النقدي', icon: DollarSign, color: 'blue', data: cashFlow?.data?.data || cashFlow?.data },
    { id: 'debt-report', title: 'تقرير الذمم', icon: Users, color: 'amber', data: debtReport?.data?.data || debtReport?.data },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <span className="text-sm text-neutral-500">الفترة:</span>
        <input type="date" value={dateRange.from} onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))} className="px-3 py-2 border rounded-lg" />
        <input type="date" value={dateRange.to} onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))} className="px-3 py-2 border rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedReport(selectedReport === r.id ? null : r.id)}
            className={`p-6 rounded-xl border text-right transition-shadow ${selectedReport === r.id ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700 hover:shadow-lg'}`}
          >
            <r.icon className={`w-10 h-10 mb-3 text-${r.color}-600`} />
            <p className="font-semibold">{r.title}</p>
            <p className="text-sm text-neutral-500 mt-1">اضغط لعرض التقرير</p>
          </button>
        ))}
      </div>
      {selectedReport && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          {reports.find((r) => r.id === selectedReport)?.data ? (
            <pre className="text-sm overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(reports.find((r) => r.id === selectedReport)?.data, null, 2)}
            </pre>
          ) : (
            <p className="text-neutral-500">اختر فترة ثم اضغط على التقرير لتحميل البيانات.</p>
          )}
        </div>
      )}
    </div>
  )
}

// فورم سند
function VoucherForm({ type, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [partyType, setPartyType] = useState('')
  const [partyId, setPartyId] = useState('')
  const [description, setDescription] = useState('')
  const [cashBox, setCashBox] = useState('main')

  const queryClient = useQueryClient()
  const { data: customersRes } = useQuery({ queryKey: ['customers'], queryFn: () => customersAPI.getCustomers() })
  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersAPI.getSuppliers() })
  const { data: cashBoxesRes } = useQuery({ queryKey: ['accounting-cash-boxes'], queryFn: () => accountingAPI.getCashBoxes() })
  const customers = customersRes?.data?.data || []
  const suppliers = suppliersRes?.data?.data || []
  const cashBoxes = cashBoxesRes?.data?.data || [{ id: 'main', name: 'الصندوق الرئيسي' }]

  const createMutation = useMutation({
    mutationFn: (data) => accountingAPI.createVoucher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['accounting-vouchers'] })
      onSuccess?.()
      onClose?.()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    const payload = {
      type: type === 'receipt' ? 'receipt' : 'payment',
      amount: amt,
      description: description.trim() || undefined,
      customer_id: partyType === 'customer' ? partyId || null : null,
      supplier_id: partyType === 'supplier' ? partyId || null : null,
      employee_id: partyType === 'employee' ? partyId || null : null,
    }
    createMutation.mutate(payload)
  }

  const partyList = partyType === 'customer' ? customers : partyType === 'supplier' ? suppliers : []

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {createMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          المبلغ
        </label>
        <input
          type="number"
          placeholder="0"
          min="1"
          step="any"
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-lg font-bold"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {type === 'receipt' ? 'من' : 'إلى'}
        </label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
          value={partyType}
          onChange={(e) => { setPartyType(e.target.value); setPartyId('') }}
        >
          <option value="">اختر...</option>
          <option value="customer">زبون</option>
          <option value="supplier">مورد</option>
          <option value="employee">موظف</option>
          <option value="other">أخرى</option>
        </select>
      </div>
      {partyType && (partyType === 'customer' || partyType === 'supplier') && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {partyType === 'customer' ? 'العميل' : 'المورد'}
          </label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
          >
            <option value="">اختر...</option>
            {partyList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          البيان
        </label>
        <textarea
          rows="2"
          placeholder="وصف السند..."
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          الصندوق
        </label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700"
          value={cashBox}
          onChange={(e) => setCashBox(e.target.value)}
        >
          {cashBoxes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'جاري الحفظ...' : (
            <>
              <CheckCircle2 className="w-4 h-4 ml-2" />
              حفظ السند
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
