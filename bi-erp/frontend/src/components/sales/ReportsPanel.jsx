import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Spinner from '../common/Spinner'
import Button from '../common/Button'
import { salesAPI } from '../../services/api'

export default function ReportsPanel({ onClose }) {
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10))
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1)
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear())
  const { data: dailyData, isLoading: dailyLoading } = useQuery({ queryKey: ['sales-daily-report', dailyDate], queryFn: () => salesAPI.getDailyReport(dailyDate), enabled: !!dailyDate })
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({ queryKey: ['sales-monthly-report', monthlyMonth, monthlyYear], queryFn: () => salesAPI.getMonthlyReport(monthlyMonth, monthlyYear), enabled: !!monthlyMonth && !!monthlyYear })
  const daily = dailyData?.data?.data || dailyData?.data || {}
  const monthly = monthlyData?.data?.data || monthlyData?.data || {}

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-transparent dark:border-neutral-800 shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">التقارير</h3>
        <Button variant="outline" size="sm" onClick={onClose}>إغلاق</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-2">التقرير اليومي</h4>
          <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="mb-3 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700" />
          {dailyLoading ? <Spinner size="sm" /> : (
            <div className="text-sm space-y-1">
              <p>إجمالي المبيعات: <strong>{(daily.total || daily.sales_total || 0).toLocaleString()} د.ع</strong></p>
              <p>عدد الفواتير: <strong>{daily.count || daily.invoices_count || 0}</strong></p>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-2">التقرير الشهري</h4>
          <div className="flex gap-2 mb-3">
            <select value={monthlyMonth} onChange={(e) => setMonthlyMonth(Number(e.target.value))} className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}</select>
            <select value={monthlyYear} onChange={(e) => setMonthlyYear(Number(e.target.value))} className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700">{[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
          {monthlyLoading ? <Spinner size="sm" /> : (
            <div className="text-sm space-y-1">
              <p>إجمالي المبيعات: <strong>{(monthly.total || monthly.sales_total || 0).toLocaleString()} د.ع</strong></p>
              <p>عدد الفواتير: <strong>{monthly.count || monthly.invoices_count || 0}</strong></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
