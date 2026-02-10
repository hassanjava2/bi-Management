/**
 * BI Management - Reports Page
 * صفحة التقارير الموحدة مع فلاتر وتصدير
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, Calendar } from 'lucide-react'
import PageShell from '../components/common/PageShell'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import DataTable from '../components/common/DataTable'
import Spinner from '../components/common/Spinner'
import { reportsAPI } from '../services/api'
import api from '../services/api'

const REPORT_TYPES = [
  { id: 'sales', label: 'تقرير المبيعات', exportType: 'sales' },
  { id: 'sales-by-employee', label: 'مبيعات بالموظف', exportType: 'sales-by-employee' },
  { id: 'top-sellers', label: 'أفضل البائعين', exportType: null },
  { id: 'profitability', label: 'الربحية', exportType: null },
  { id: 'cash-flow', label: 'التدفق النقدي', exportType: null },
  { id: 'profit-by-product', label: 'ربح بالمنتج', exportType: null },
  { id: 'aging-report', label: 'أعمار الديون', exportType: null },
  { id: 'employee-performance', label: 'أداء الموظفين', exportType: null },
  { id: 'hr-summary', label: 'أداء HR', exportType: null },
  { id: 'customers', label: 'العملاء', exportType: 'customers' },
  { id: 'inventory', label: 'المخزون', exportType: 'inventory' },
]

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('sales')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const params = { month, start_date: startDate || undefined, end_date: endDate || undefined }

  const { data: profitabilityData, isLoading: loadingProfit } = useQuery({
    queryKey: ['report-profitability', params],
    queryFn: () => reportsAPI.getProfitability(params),
    enabled: selectedReport === 'profitability',
  })

  const { data: cashFlowData, isLoading: loadingCash } = useQuery({
    queryKey: ['report-cashflow', params],
    queryFn: () => reportsAPI.getCashFlow(params),
    enabled: selectedReport === 'cash-flow',
  })

  const { data: hrData, isLoading: loadingHR } = useQuery({
    queryKey: ['report-hr', params],
    queryFn: () => reportsAPI.getHRSummary(params),
    enabled: selectedReport === 'hr-summary',
  })

  const handleExport = async (exportType) => {
    if (!exportType) return
    try {
      const res = await reportsAPI.exportReport(exportType, params)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}-${month || 'report'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  const reportConfig = REPORT_TYPES.find((r) => r.id === selectedReport)
  const isLoading = loadingProfit || loadingCash || loadingHR

  return (
    <PageShell
      title="التقارير"
      description="تقارير المبيعات والربحية والتدفق النقدي وأداء الموظفين مع إمكانية التصدير"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الشهر</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-input bg-white dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-input bg-white dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-input bg-white dark:bg-neutral-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedReport(r.id)}
              className={`px-4 py-3 rounded-card border text-sm font-medium text-right transition-colors ${
                selectedReport === r.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Card padding>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-section-title font-semibold">{reportConfig?.label}</h3>
            {reportConfig?.exportType && (
              <Button variant="outline" size="sm" onClick={() => handleExport(reportConfig.exportType)}>
                <Download className="w-4 h-4 ml-2" />
                تصدير CSV
              </Button>
            )}
          </div>
          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {!isLoading && selectedReport === 'profitability' && profitabilityData?.data?.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">الإيرادات</p>
                <p className="text-xl font-bold">{(profitabilityData.data.data.revenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">التكلفة</p>
                <p className="text-xl font-bold">{(profitabilityData.data.data.cost || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">الربح</p>
                <p className="text-xl font-bold text-green-600">{(profitabilityData.data.data.margin || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">نسبة الربح %</p>
                <p className="text-xl font-bold">{(profitabilityData.data.data.margin_percent || 0).toFixed(1)}%</p>
              </div>
            </div>
          )}
          {!isLoading && selectedReport === 'cash-flow' && cashFlowData?.data?.data && (
            <div className="space-y-2">
              {(cashFlowData.data.data.cash_flow || cashFlowData.data.data || []).map((row, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-700">
                  <span>{row.method || row.payment_method || '—'}</span>
                  <span className="font-medium">{(row.total || row.received || 0).toLocaleString()} د.ع</span>
                </div>
              ))}
            </div>
          )}
          {!isLoading && selectedReport === 'hr-summary' && hrData?.data?.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">غائب</p>
                <p className="text-xl font-bold">{(hrData.data.data.attendance?.absent || 0)}</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">متأخر</p>
                <p className="text-xl font-bold">{(hrData.data.data.attendance?.late || 0)}</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">مهام مكتملة</p>
                <p className="text-xl font-bold">{(hrData.data.data.tasks?.completed || 0)}</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-card">
                <p className="text-sm text-neutral-500">نسبة الإنجاز %</p>
                <p className="text-xl font-bold">{(hrData.data.data.tasks?.completion_rate_percent || 0).toFixed(0)}%</p>
              </div>
            </div>
          )}
          {!isLoading && selectedReport === 'profit-by-product' && <ProfitByProductReport params={params} />}
          {!isLoading && selectedReport === 'aging-report' && <AgingReport />}
          {!isLoading && selectedReport === 'employee-performance' && <EmployeePerformanceReport month={month} />}
          {!isLoading && !['profitability', 'cash-flow', 'hr-summary', 'profit-by-product', 'aging-report', 'employee-performance'].includes(selectedReport) && (
            <p className="text-neutral-500 dark:text-neutral-400 py-4">اختر التقرير والفترة ثم استخدم «تصدير CSV» لتحميل البيانات.</p>
          )}
        </Card>
      </div>
    </PageShell>
  )
}

// تقرير الربح حسب المنتج
function ProfitByProductReport({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-profit-product', params],
    queryFn: () => api.get('/reports/profit-by-product', { params }).then(r => r.data?.data || []),
  })
  const products = Array.isArray(data) ? data : []
  const fmt = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>
  if (products.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-700">
          <tr>
            <th className="px-3 py-2 text-right">المنتج</th>
            <th className="px-3 py-2 text-center">المباع</th>
            <th className="px-3 py-2 text-center">الإيرادات</th>
            <th className="px-3 py-2 text-center">التكلفة</th>
            <th className="px-3 py-2 text-center">الربح</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map((p, i) => (
            <tr key={p.id || i} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
              <td className="px-3 py-2 font-medium">{p.name || '—'}</td>
              <td className="px-3 py-2 text-center">{p.total_sold || 0}</td>
              <td className="px-3 py-2 text-center">{fmt(p.total_revenue)}</td>
              <td className="px-3 py-2 text-center">{fmt(p.total_cost)}</td>
              <td className={`px-3 py-2 text-center font-bold ${(p.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(p.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// تقرير أعمار الديون
function AgingReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-aging'],
    queryFn: () => api.get('/reports/aging-report').then(r => r.data?.data || {}),
  })
  const customers = data?.customers || []
  const totals = data?.totals || {}
  const fmt = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg text-center">
          <p className="text-xs text-neutral-500">إجمالي المستحق</p><p className="font-bold text-lg">{fmt(totals.total_receivable)}</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <p className="text-xs text-red-600">متأخر</p><p className="font-bold text-lg text-red-600">{fmt(totals.total_overdue)}</p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
          <p className="text-xs text-amber-600">يستحق خلال 30 يوم</p><p className="font-bold text-lg text-amber-600">{fmt(totals.total_due_30)}</p>
        </div>
        <div className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg text-center">
          <p className="text-xs text-neutral-500">عدد العملاء</p><p className="font-bold text-lg">{totals.customers_count || 0}</p>
        </div>
      </div>
      {customers.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th className="px-3 py-2 text-right">العميل</th>
              <th className="px-3 py-2 text-center">فواتير</th>
              <th className="px-3 py-2 text-center">المتبقي</th>
              <th className="px-3 py-2 text-center text-red-600">متأخر</th>
              <th className="px-3 py-2 text-center text-amber-600">30 يوم</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c, i) => (
              <tr key={c.id || i}>
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 text-center">{c.pending_invoices}</td>
                <td className="px-3 py-2 text-center font-bold">{fmt(c.total_remaining)}</td>
                <td className="px-3 py-2 text-center text-red-600">{fmt(c.overdue_amount)}</td>
                <td className="px-3 py-2 text-center text-amber-600">{fmt(c.due_30_days)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// تقرير أداء الموظفين
function EmployeePerformanceReport({ month }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-performance', month],
    queryFn: () => api.get(`/reports/employee-performance?month=${month}`).then(r => r.data?.data || {}),
  })
  const employees = data?.employees || []
  const fmt = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>
  if (employees.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>

  return (
    <table className="w-full text-sm">
      <thead className="bg-neutral-50 dark:bg-neutral-700">
        <tr>
          <th className="px-3 py-2 text-right">الموظف</th>
          <th className="px-3 py-2 text-center">مبيعات</th>
          <th className="px-3 py-2 text-center">فواتير</th>
          <th className="px-3 py-2 text-center">مهام مكتملة</th>
          <th className="px-3 py-2 text-center">حضور</th>
          <th className="px-3 py-2 text-center">تأخر</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {employees.map((e, i) => (
          <tr key={e.id || i}>
            <td className="px-3 py-2 font-medium">{e.full_name}</td>
            <td className="px-3 py-2 text-center font-bold text-emerald-600">{fmt(e.sales_total)}</td>
            <td className="px-3 py-2 text-center">{e.invoices_created || 0}</td>
            <td className="px-3 py-2 text-center">{e.tasks_completed || 0}/{e.tasks_total || 0}</td>
            <td className="px-3 py-2 text-center text-emerald-600">{e.present_days || 0}</td>
            <td className="px-3 py-2 text-center text-amber-600">{e.late_days || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
