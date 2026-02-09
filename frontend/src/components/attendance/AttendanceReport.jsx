import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Filter, Search, Users } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Button from '../common/Button'
import Input from '../common/Input'
import Badge from '../common/Badge'
import Spinner from '../common/Spinner'
import { attendanceAPI, usersAPI } from '../../services/api'
import { formatDate, formatTime, formatMinutes, translateStatus, getStatusColor } from '../../utils/helpers'

export default function AttendanceReport() {
  const [filters, setFilters] = useState({
    from_date: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
    to_date: new Date().toISOString().split('T')[0],
    user_id: '',
    department_id: '',
    status: ''
  })

  // Fetch attendance report
  const { data, isLoading } = useQuery({
    queryKey: ['attendanceReport', filters],
    queryFn: () => attendanceAPI.getReport(filters),
  })

  // Fetch departments for filter
  const { data: usersData } = useQuery({
    queryKey: ['usersList'],
    queryFn: () => usersAPI.getAll({ limit: 200 }),
  })

  const records = data?.data?.data || []
  const users = usersData?.data?.data || []

  // Get unique departments
  const departments = [...new Set(users.filter(u => u.department_name).map(u => ({ 
    id: u.department_id, 
    name: u.department_name 
  })))]

  // Calculate summary
  const summary = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    vacation: records.filter(r => r.status === 'vacation').length,
    totalWorkHours: Math.round(records.reduce((sum, r) => sum + (r.work_minutes || 0), 0) / 60),
    totalOvertimeHours: Math.round(records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0) / 60),
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['التاريخ', 'الموظف', 'كود الموظف', 'القسم', 'الحضور', 'الانصراف', 'ساعات العمل', 'الحالة']
    const rows = records.map(r => [
      r.date,
      r.user_name,
      r.employee_code,
      r.department_name || '-',
      r.check_in || '-',
      r.check_out || '-',
      formatMinutes(r.work_minutes),
      translateStatus(r.status)
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-report-${filters.from_date}-${filters.to_date}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              من تاريخ
            </label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-2 dark:bg-surface-700"
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-2 dark:bg-surface-700"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              الموظف
            </label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-2 dark:bg-surface-700"
            >
              <option value="">كل الموظفين</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              الحالة
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-2 dark:bg-surface-700"
            >
              <option value="">الكل</option>
              <option value="present">حاضر</option>
              <option value="late">متأخر</option>
              <option value="absent">غائب</option>
              <option value="vacation">إجازة</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button onClick={exportToCSV} variant="secondary">
              <Download className="w-4 h-4" />
              تصدير
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 text-center border border-surface-200 dark:border-surface-700">
          <p className="text-2xl font-bold text-surface-900 dark:text-white">{summary.total}</p>
          <p className="text-xs text-surface-500">إجمالي السجلات</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-200 dark:border-green-800">
          <p className="text-2xl font-bold text-green-600">{summary.present}</p>
          <p className="text-xs text-green-600">حاضر</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center border border-yellow-200 dark:border-yellow-800">
          <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
          <p className="text-xs text-yellow-600">متأخر</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-200 dark:border-red-800">
          <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
          <p className="text-xs text-red-600">غائب</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800">
          <p className="text-2xl font-bold text-blue-600">{summary.vacation}</p>
          <p className="text-xs text-blue-600">إجازة</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-800">
          <p className="text-2xl font-bold text-purple-600">{summary.totalWorkHours}h</p>
          <p className="text-xs text-purple-600">ساعات العمل</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center border border-orange-200 dark:border-orange-800">
          <p className="text-2xl font-bold text-orange-600">{summary.totalOvertimeHours}h</p>
          <p className="text-xs text-orange-600">إضافي</p>
        </div>
      </div>

      {/* Table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-surface-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد سجلات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 dark:bg-surface-700">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">التاريخ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">الموظف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">القسم</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">الحضور</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">الانصراف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">ساعات العمل</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">التأخير</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                    <td className="px-4 py-3 text-sm text-surface-900 dark:text-white">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">{record.user_name}</p>
                        <p className="text-xs text-surface-500">{record.employee_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                      {record.department_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                      {formatTime(record.check_in) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                      {formatTime(record.check_out) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">
                      {formatMinutes(record.work_minutes)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.late_minutes > 0 ? (
                        <span className="text-orange-600">{record.late_minutes} د</span>
                      ) : (
                        <span className="text-surface-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" className={getStatusColor(record.status)}>
                        {translateStatus(record.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
