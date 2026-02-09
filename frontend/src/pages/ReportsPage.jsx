/**
 * BI Management - Reports Page
 * صفحة التقارير الموحدة مع فلاتر وتصدير
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, Calendar } from 'lucide-react'
import PageLayout from '../components/common/PageLayout'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import DataTable from '../components/common/DataTable'
import Spinner from '../components/common/Spinner'
import { reportsAPI } from '../services/api'

const REPORT_TYPES = [
  { id: 'sales', label: 'تقرير المبيعات', exportType: 'sales' },
  { id: 'sales-by-employee', label: 'مبيعات بالموظف', exportType: 'sales-by-employee' },
  { id: 'top-sellers', label: 'أفضل البائعين', exportType: null },
  { id: 'profitability', label: 'الربحية', exportType: null },
  { id: 'cash-flow', label: 'التدفق النقدي', exportType: null },
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
    <PageLayout
      title="التقارير"
      description="تقارير المبيعات والربحية والتدفق النقدي وأداء الموظفين مع إمكانية التصدير"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">الشهر</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-input bg-white dark:bg-surface-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-input bg-white dark:bg-surface-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-input bg-white dark:bg-surface-800"
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
                  : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
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
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">الإيرادات</p>
                <p className="text-xl font-bold">{(profitabilityData.data.data.revenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">التكلفة</p>
                <p className="text-xl font-bold">{(profitabilityData.data.data.cost || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">الربح</p>
                <p className="text-xl font-bold text-green-600">{(profitabilityData.data.data.margin || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">نسبة الربح %</p>
                <p className="text-xl font-bold">{(profitabilityData.data.data.margin_percent || 0).toFixed(1)}%</p>
              </div>
            </div>
          )}
          {!isLoading && selectedReport === 'cash-flow' && cashFlowData?.data?.data && (
            <div className="space-y-2">
              {(cashFlowData.data.data.cash_flow || cashFlowData.data.data || []).map((row, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-700">
                  <span>{row.method || row.payment_method || '—'}</span>
                  <span className="font-medium">{(row.total || row.received || 0).toLocaleString()} د.ع</span>
                </div>
              ))}
            </div>
          )}
          {!isLoading && selectedReport === 'hr-summary' && hrData?.data?.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">غائب</p>
                <p className="text-xl font-bold">{(hrData.data.data.attendance?.absent || 0)}</p>
              </div>
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">متأخر</p>
                <p className="text-xl font-bold">{(hrData.data.data.attendance?.late || 0)}</p>
              </div>
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">مهام مكتملة</p>
                <p className="text-xl font-bold">{(hrData.data.data.tasks?.completed || 0)}</p>
              </div>
              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-card">
                <p className="text-sm text-surface-500">نسبة الإنجاز %</p>
                <p className="text-xl font-bold">{(hrData.data.data.tasks?.completion_rate_percent || 0).toFixed(0)}%</p>
              </div>
            </div>
          )}
          {!isLoading && !['profitability', 'cash-flow', 'hr-summary'].includes(selectedReport) && (
            <p className="text-surface-500 dark:text-surface-400 py-4">اختر التقرير والفترة ثم استخدم «تصدير CSV» لتحميل البيانات.</p>
          )}
        </Card>
      </div>
    </PageLayout>
  )
}
