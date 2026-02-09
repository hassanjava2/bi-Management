import { useState } from 'react'
import { GraduationCap, BarChart3 } from 'lucide-react'
import TrainingDashboard from '../components/training/TrainingDashboard'
import TrainingReport from '../components/training/TrainingReport'
import { useAuth } from '../context/AuthContext'

export default function TrainingPage() {
  const { isAdmin, isHR, isManager } = useAuth()
  const canViewReport = isAdmin || isHR || isManager
  const [activeTab, setActiveTab] = useState('my-training')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-primary-500" />
          التدريب
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          برنامج التدريب والتطوير
        </p>
      </div>

      {/* Tabs (for HR/Admin) */}
      {canViewReport && (
        <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('my-training')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all flex-1 justify-center
              ${activeTab === 'my-training'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }
            `}
          >
            <GraduationCap className="w-4 h-4" />
            تدريبي
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all flex-1 justify-center
              ${activeTab === 'report'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }
            `}
          >
            <BarChart3 className="w-4 h-4" />
            تقرير المتدربين
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'my-training' && <TrainingDashboard />}
      {activeTab === 'report' && canViewReport && <TrainingReport />}
    </div>
  )
}
