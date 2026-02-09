import { useQuery } from '@tanstack/react-query'
import { Users, UserCheck, UserX, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { attendanceAPI } from '../../services/api'

export default function AttendanceOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendanceStats'],
    queryFn: () => attendanceAPI.getStats(),
  })

  const stats = data?.data?.data

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </Card>
    )
  }

  const total = stats?.total_employees || 0
  const present = (stats?.present || 0) + (stats?.late || 0)
  const absent = stats?.absent || 0
  const late = stats?.late || 0

  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0

  return (
    <Card>
      <Card.Header>
        <Card.Title>حضور اليوم</Card.Title>
      </Card.Header>
      <Card.Body>
        {/* Attendance Rate Circle */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-surface-200 dark:text-surface-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${attendanceRate * 3.52} 352`}
                className="text-green-500 transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-surface-900 dark:text-white">
                {attendanceRate}%
              </span>
              <span className="text-xs text-surface-500">نسبة الحضور</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <Users className="w-5 h-5 text-surface-500" />
            <div>
              <p className="text-lg font-semibold text-surface-900 dark:text-white">{total}</p>
              <p className="text-xs text-surface-500">إجمالي</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <UserCheck className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-lg font-semibold text-green-600">{present}</p>
              <p className="text-xs text-green-600">حاضر</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <UserX className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-lg font-semibold text-red-600">{absent}</p>
              <p className="text-xs text-red-600">غائب</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-lg font-semibold text-orange-600">{late}</p>
              <p className="text-xs text-orange-600">متأخر</p>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
