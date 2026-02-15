/**
 * BI Management - Reports Page
 * صفحة التقارير الموحدة مع فلاتر وتصدير — Sprint 3 Enhanced
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, Calendar, TrendingUp, Users, Package, CreditCard, UserCheck, Award, ShoppingBag } from 'lucide-react'
import PageShell from '../components/common/PageShell'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Spinner from '../components/common/Spinner'
import { reportsAPI } from '../services/api'
import api from '../services/api'

const fmt = (n) => new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0))

const REPORT_TYPES = [
  { id: 'sales', label: 'تقرير المبيعات', icon: TrendingUp, exportType: 'sales', color: 'emerald' },
  { id: 'sales-by-employee', label: 'مبيعات بالموظف', icon: UserCheck, exportType: 'sales-by-employee', color: 'blue' },
  { id: 'top-sellers', label: 'أفضل البائعين', icon: Award, exportType: null, color: 'amber' },
  { id: 'profitability', label: 'الربحية', icon: TrendingUp, exportType: null, color: 'green' },
  { id: 'cash-flow', label: 'التدفق النقدي', icon: CreditCard, exportType: null, color: 'violet' },
  { id: 'profit-by-product', label: 'ربح بالمنتج', icon: ShoppingBag, exportType: 'profit-by-product', color: 'indigo' },
  { id: 'aging-report', label: 'أعمار الديون', icon: CreditCard, exportType: 'aging-report', color: 'red' },
  { id: 'employee-performance', label: 'أداء الموظفين', icon: UserCheck, exportType: null, color: 'cyan' },
  { id: 'hr-summary', label: 'أداء HR', icon: Users, exportType: null, color: 'fuchsia' },
  { id: 'customers', label: 'العملاء', icon: Users, exportType: 'customers', color: 'orange' },
  { id: 'inventory', label: 'المخزون', icon: Package, exportType: 'inventory', color: 'teal' },
]

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('sales')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const params = { month, start_date: startDate || undefined, end_date: endDate || undefined }

  // Sales
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['report-sales', params],
    queryFn: () => api.get('/reports/sales', { params }).then(r => r.data?.data || []),
    enabled: selectedReport === 'sales',
  })

  // Sales by employee
  const { data: salesByEmpData, isLoading: loadingSalesEmp } = useQuery({
    queryKey: ['report-sales-by-employee', params],
    queryFn: () => api.get('/reports/sales-by-employee', { params }).then(r => r.data?.data || []),
    enabled: selectedReport === 'sales-by-employee',
  })

  // Top sellers
  const { data: topSellersData, isLoading: loadingTopSellers } = useQuery({
    queryKey: ['report-top-sellers'],
    queryFn: () => api.get('/reports/top-customers').then(r => r.data?.data || []),
    enabled: selectedReport === 'top-sellers',
  })

  // Profitability
  const { data: profitabilityData, isLoading: loadingProfit } = useQuery({
    queryKey: ['report-profitability', params],
    queryFn: () => reportsAPI.getProfitability(params),
    enabled: selectedReport === 'profitability',
  })

  // Cash flow
  const { data: cashFlowData, isLoading: loadingCash } = useQuery({
    queryKey: ['report-cashflow', params],
    queryFn: () => reportsAPI.getCashFlow(params),
    enabled: selectedReport === 'cash-flow',
  })

  // Profit by product
  const { data: profitProductData, isLoading: loadingProfitProduct } = useQuery({
    queryKey: ['report-profit-product', params],
    queryFn: () => api.get('/reports/profit-by-product', { params }).then(r => r.data?.data || []),
    enabled: selectedReport === 'profit-by-product',
  })

  // Aging report
  const { data: agingData, isLoading: loadingAging } = useQuery({
    queryKey: ['report-aging'],
    queryFn: () => api.get('/reports/aging-report').then(r => r.data?.data || {}),
    enabled: selectedReport === 'aging-report',
  })

  // Employee performance
  const { data: empPerfData, isLoading: loadingEmpPerf } = useQuery({
    queryKey: ['report-performance', month],
    queryFn: () => api.get(`/reports/employee-performance?month=${month}`).then(r => r.data?.data || {}),
    enabled: selectedReport === 'employee-performance',
  })

  // HR Summary
  const { data: hrData, isLoading: loadingHR } = useQuery({
    queryKey: ['report-hr', params],
    queryFn: () => reportsAPI.getHRSummary(params),
    enabled: selectedReport === 'hr-summary',
  })

  // Customers
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['report-customers'],
    queryFn: () => api.get('/reports/top-customers').then(r => r.data?.data || []),
    enabled: selectedReport === 'customers',
  })

  // Inventory
  const { data: inventoryData, isLoading: loadingInventory } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => api.get('/reports/inventory').then(r => r.data?.data || []),
    enabled: selectedReport === 'inventory',
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
  const isLoading = loadingSales || loadingSalesEmp || loadingTopSellers || loadingProfit || loadingCash || loadingProfitProduct || loadingAging || loadingEmpPerf || loadingHR || loadingCustomers || loadingInventory

  return (
    <PageShell
      title="التقارير"
      description="تقارير شاملة مع عرض مباشر وإمكانية التصدير"
      actions={
        reportConfig?.exportType && (
          <Button variant="outline" onClick={() => handleExport(reportConfig.exportType)}>
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* Date Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">الشهر</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">من تاريخ</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800" />
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {REPORT_TYPES.map((r) => {
            const Icon = r.icon
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReport(r.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium text-right transition-all ${selectedReport === r.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-70" />
                <span>{r.label}</span>
              </button>
            )
          })}
        </div>

        {/* Report Content */}
        <Card padding>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              {reportConfig?.label}
            </h3>
            {reportConfig?.exportType && (
              <Button variant="outline" size="sm" onClick={() => handleExport(reportConfig.exportType)}>
                <Download className="w-4 h-4 ml-2" />
                تصدير CSV
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          )}

          {/* === Sales Report === */}
          {!isLoading && selectedReport === 'sales' && (() => {
            const rows = Array.isArray(salesData) ? salesData : []
            if (rows.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>
            const totalSales = rows.reduce((s, r) => s + Number(r.total || 0), 0)
            const totalCount = rows.reduce((s, r) => s + Number(r.count || 0), 0)
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <p className="text-xs text-emerald-600">إجمالي المبيعات</p>
                    <p className="text-lg font-bold text-emerald-700">{fmt(totalSales)} د.ع</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-xs text-blue-600">عدد الفواتير</p>
                    <p className="text-lg font-bold text-blue-700">{totalCount}</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                    <p className="text-xs text-purple-600">متوسط الفاتورة</p>
                    <p className="text-lg font-bold text-purple-700">{fmt(totalCount > 0 ? totalSales / totalCount : 0)} د.ع</p>
                  </div>
                </div>
                <ReportTable
                  headers={['التاريخ', 'الفواتير', 'المجموع', 'الربح']}
                  rows={rows.map(r => [
                    r.date ? new Date(r.date).toLocaleDateString('ar-IQ') : '-',
                    r.count,
                    { value: fmt(r.total), className: 'font-bold' },
                    { value: fmt(r.profit), className: `font-bold ${Number(r.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}` },
                  ])}
                />
              </div>
            )
          })()}

          {/* === Sales by Employee === */}
          {!isLoading && selectedReport === 'sales-by-employee' && (() => {
            const rows = Array.isArray(salesByEmpData) ? salesByEmpData : []
            if (rows.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>
            return (
              <ReportTable
                headers={['الموظف', 'عدد الفواتير', 'المبيعات', 'الربح']}
                rows={rows.map(r => [
                  { value: r.full_name, className: 'font-medium' },
                  r.invoice_count || 0,
                  { value: fmt(r.total_sales), className: 'font-bold text-emerald-600' },
                  { value: fmt(r.total_profit), className: `font-bold ${Number(r.total_profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}` },
                ])}
              />
            )
          })()}

          {/* === Top Sellers (Customers) === */}
          {!isLoading && selectedReport === 'top-sellers' && (() => {
            const rows = Array.isArray(topSellersData) ? topSellersData : []
            if (rows.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>
            return (
              <ReportTable
                headers={['#', 'العميل', 'الهاتف', 'الفواتير', 'إجمالي المشتريات']}
                rows={rows.map((r, i) => [
                  i + 1,
                  { value: r.name, className: 'font-medium' },
                  r.phone || '-',
                  r.invoice_count || 0,
                  { value: fmt(r.total_spent), className: 'font-bold text-emerald-600' },
                ])}
              />
            )
          })()}

          {/* === Profitability === */}
          {!isLoading && selectedReport === 'profitability' && profitabilityData?.data?.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'الإيرادات', value: profitabilityData.data.data.revenue, color: 'emerald' },
                { label: 'التكلفة', value: profitabilityData.data.data.cost, color: 'red' },
                { label: 'الربح', value: profitabilityData.data.data.margin, color: 'blue' },
                { label: 'نسبة الربح %', value: `${(profitabilityData.data.data.margin_percent || 0).toFixed(1)}%`, isText: true },
              ].map((s, i) => (
                <div key={i} className={`p-4 bg-${s.color || 'neutral'}-50 dark:bg-${s.color || 'neutral'}-900/20 rounded-xl text-center`}>
                  <p className="text-sm text-neutral-500">{s.label}</p>
                  <p className="text-xl font-bold">{s.isText ? s.value : fmt(s.value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* === Cash Flow === */}
          {!isLoading && selectedReport === 'cash-flow' && cashFlowData?.data?.data && (
            <div className="space-y-2">
              {(cashFlowData.data.data.cash_flow || cashFlowData.data.data || []).map((row, i) => (
                <div key={i} className="flex justify-between py-3 px-4 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 rounded-lg">
                  <span className="font-medium">{row.method || row.payment_method || '—'}</span>
                  <span className="font-bold text-emerald-600">{fmt(row.total || row.received)} د.ع</span>
                </div>
              ))}
            </div>
          )}

          {/* === Profit by Product === */}
          {!isLoading && selectedReport === 'profit-by-product' && (() => {
            const products = Array.isArray(profitProductData) ? profitProductData : []
            if (products.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>
            return (
              <ReportTable
                headers={['المنتج', 'المباع', 'الإيرادات', 'التكلفة', 'الربح']}
                rows={products.map(p => [
                  { value: p.name, className: 'font-medium' },
                  p.total_sold || 0,
                  fmt(p.total_revenue),
                  fmt(p.total_cost),
                  { value: fmt(p.profit), className: `font-bold ${Number(p.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}` },
                ])}
              />
            )
          })()}

          {/* === Aging Report === */}
          {!isLoading && selectedReport === 'aging-report' && (() => {
            const customers = agingData?.customers || []
            const totals = agingData?.totals || {}
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
                  <ReportTable
                    headers={['العميل', 'فواتير', 'المتبقي', 'متأخر', '30 يوم']}
                    rows={customers.map(c => [
                      { value: c.name, className: 'font-medium' },
                      c.pending_invoices,
                      { value: fmt(c.total_remaining), className: 'font-bold' },
                      { value: fmt(c.overdue_amount), className: 'text-red-600' },
                      { value: fmt(c.due_30_days), className: 'text-amber-600' },
                    ])}
                  />
                )}
              </div>
            )
          })()}

          {/* === Employee Performance === */}
          {!isLoading && selectedReport === 'employee-performance' && (() => {
            const employees = empPerfData?.employees || []
            if (employees.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>
            return (
              <ReportTable
                headers={['الموظف', 'مبيعات', 'فواتير', 'مهام مكتملة', 'حضور', 'تأخر']}
                rows={employees.map(e => [
                  { value: e.full_name, className: 'font-medium' },
                  { value: fmt(e.sales_total), className: 'font-bold text-emerald-600' },
                  e.invoices_created || 0,
                  `${e.tasks_completed || 0}/${e.tasks_total || 0}`,
                  { value: e.present_days || 0, className: 'text-emerald-600' },
                  { value: e.late_days || 0, className: 'text-amber-600' },
                ])}
              />
            )
          })()}

          {/* === HR Summary === */}
          {!isLoading && selectedReport === 'hr-summary' && hrData?.data?.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'غائب', value: hrData.data.data.attendance?.absent || 0 },
                { label: 'متأخر', value: hrData.data.data.attendance?.late || 0 },
                { label: 'مهام مكتملة', value: hrData.data.data.tasks?.completed || 0 },
                { label: 'نسبة الإنجاز %', value: `${(hrData.data.data.tasks?.completion_rate_percent || 0).toFixed(0)}%` },
              ].map((s, i) => (
                <div key={i} className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl text-center">
                  <p className="text-sm text-neutral-500">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* === Customers Report === */}
          {!isLoading && selectedReport === 'customers' && (() => {
            const rows = Array.isArray(customersData) ? customersData : []
            if (rows.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>
            return (
              <ReportTable
                headers={['#', 'العميل', 'الهاتف', 'الفواتير', 'إجمالي المشتريات']}
                rows={rows.map((r, i) => [
                  i + 1,
                  { value: r.name, className: 'font-medium' },
                  r.phone || '-',
                  r.invoice_count || 0,
                  { value: fmt(r.total_spent), className: 'font-bold text-emerald-600' },
                ])}
              />
            )
          })()}

          {/* === Inventory Report === */}
          {!isLoading && selectedReport === 'inventory' && (() => {
            const rows = Array.isArray(inventoryData) ? inventoryData : []
            if (rows.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>
            return (
              <ReportTable
                headers={['المنتج', 'الكمية', 'الحد الأدنى', 'التكلفة', 'سعر البيع']}
                rows={rows.map(r => [
                  { value: r.name, className: 'font-medium' },
                  { value: r.quantity, className: r.quantity <= (r.min_quantity || 5) ? 'font-bold text-red-600' : '' },
                  r.min_quantity || '-',
                  fmt(r.cost_price),
                  { value: fmt(r.selling_price), className: 'font-bold' },
                ])}
              />
            )
          })()}
        </Card>
      </div>
    </PageShell>
  )
}

// ══════════════════════════════════════
// Reusable Report Table Component
// ══════════════════════════════════════
function ReportTable({ headers, rows }) {
  if (!rows || rows.length === 0) return <p className="text-neutral-500 py-4">لا توجد بيانات</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-700/50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`px-3 py-2.5 ${i === 0 ? 'text-right' : 'text-center'} text-xs font-semibold text-neutral-500 uppercase`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
              {row.map((cell, ci) => {
                const isObj = typeof cell === 'object' && cell !== null && !Array.isArray(cell)
                const value = isObj ? cell.value : cell
                const className = isObj ? cell.className : ''
                return (
                  <td key={ci} className={`px-3 py-2.5 ${ci === 0 ? 'text-right' : 'text-center'} ${className}`}>
                    {value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
