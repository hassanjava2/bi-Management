import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Badge from '../common/Badge'
import Spinner from '../common/Spinner'
import Modal from '../common/Modal'
import { attendanceAPI } from '../../services/api'
import { formatTime, formatMinutes, translateStatus, getStatusColor } from '../../utils/helpers'

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function AttendanceCalendar({ userId }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first and last day of month for query
  const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

  // Fetch attendance for the month
  const { data, isLoading } = useQuery({
    queryKey: ['attendanceCalendar', userId, fromDate, toDate],
    queryFn: () => userId 
      ? attendanceAPI.getReport({ user_id: userId, from_date: fromDate, to_date: toDate })
      : attendanceAPI.getMyRecord({ from_date: fromDate, to_date: toDate }),
  })

  const records = data?.data?.data || []

  // Build calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Empty cells for days before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null })
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const record = records.find(r => r.date === dateStr)
      const isToday = dateStr === new Date().toISOString().split('T')[0]
      const isFuture = new Date(dateStr) > new Date()
      const isWeekend = new Date(dateStr).getDay() === 5 || new Date(dateStr).getDay() === 6 // Friday & Saturday

      days.push({
        day,
        date: dateStr,
        record,
        isToday,
        isFuture,
        isWeekend
      })
    }

    return days
  }, [year, month, records])

  const getStatusColor2 = (status) => {
    const colors = {
      present: 'bg-green-500',
      late: 'bg-yellow-500',
      absent: 'bg-red-500',
      vacation: 'bg-blue-500',
      sick: 'bg-pink-500',
    }
    return colors[status] || 'bg-surface-300'
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
          {MONTHS[month]} {year}
        </h3>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span>حاضر</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>متأخر</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>غائب</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span>إجازة</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-surface-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.record && setSelectedDay(item)}
                className={clsx(
                  'aspect-square p-1 rounded-lg text-center relative',
                  'transition-colors cursor-pointer',
                  item.day === null && 'invisible',
                  item.isToday && 'ring-2 ring-primary-500',
                  item.isFuture && 'opacity-50',
                  item.isWeekend && !item.record && 'bg-surface-100 dark:bg-surface-700/50',
                  item.record && 'hover:opacity-80'
                )}
              >
                {item.day && (
                  <>
                    <span className={clsx(
                      'text-sm',
                      item.isToday ? 'font-bold text-primary-600' : 'text-surface-700 dark:text-surface-300'
                    )}>
                      {item.day}
                    </span>
                    
                    {item.record && (
                      <div className={clsx(
                        'w-2 h-2 rounded-full absolute bottom-1 left-1/2 -translate-x-1/2',
                        getStatusColor2(item.record.status)
                      )} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Day detail modal */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `تفاصيل ${selectedDay.date}` : ''}
        size="sm"
      >
        {selectedDay?.record && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Badge size="lg" className={getStatusColor(selectedDay.record.status)}>
                {translateStatus(selectedDay.record.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">وقت الحضور</p>
                <p className="font-semibold">{formatTime(selectedDay.record.check_in) || '-'}</p>
              </div>
              <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">وقت الانصراف</p>
                <p className="font-semibold">{formatTime(selectedDay.record.check_out) || '-'}</p>
              </div>
              <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">ساعات العمل</p>
                <p className="font-semibold">{formatMinutes(selectedDay.record.work_minutes)}</p>
              </div>
              <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">التأخير</p>
                <p className="font-semibold">{selectedDay.record.late_minutes || 0} دقيقة</p>
              </div>
            </div>

            {selectedDay.record.notes && (
              <div className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">ملاحظات</p>
                <p className="text-sm">{selectedDay.record.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  )
}
