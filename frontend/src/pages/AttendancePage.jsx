import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import CheckInOutWidget from '../components/attendance/CheckInOutWidget'
import AttendanceCalendar from '../components/attendance/AttendanceCalendar'
import AttendanceReport from '../components/attendance/AttendanceReport'

export default function AttendancePage() {
  const { isAdmin, isHR, isManager } = useAuth()
  const [activeTab, setActiveTab] = useState('my')

  const canViewReport = isAdmin || isHR || isManager

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">الحضور والانصراف</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">سجل حضورك وتابع حالتك</p>
        </div>

        {canViewReport && (
          <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'my'
                  ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              حضوري
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'report'
                  ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              تقرير الحضور
            </button>
          </div>
        )}
      </div>

      {activeTab === 'my' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check In/Out Widget */}
          <div className="lg:col-span-1">
            <CheckInOutWidget />
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2">
            <AttendanceCalendar />
          </div>
        </div>
      ) : (
        <AttendanceReport />
      )}
    </div>
  )
}
