import { useQuery } from '@tanstack/react-query'
import { Users, AlertTriangle, CheckCircle, Clock, UserPlus } from 'lucide-react'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { trainingAPI } from '../../services/api'
import { clsx } from 'clsx'

export default function TrainingReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['trainingReport'],
    queryFn: () => trainingAPI.getReport(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const report = data?.data?.data

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-4">
            <Users className="w-10 h-10 opacity-80" />
            <div>
              <p className="text-blue-100 text-sm">متدربون نشطون</p>
              <p className="text-3xl font-bold">{report?.active_trainings || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-10 h-10 opacity-80" />
            <div>
              <p className="text-green-100 text-sm">أكملوا هذا الشهر</p>
              <p className="text-3xl font-bold">{report?.completed_this_month || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-10 h-10 opacity-80" />
            <div>
              <p className="text-orange-100 text-sm">متأخرون</p>
              <p className="text-3xl font-bold">{report?.delayed_count || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center gap-4">
            <Clock className="w-10 h-10 opacity-80" />
            <div>
              <p className="text-purple-100 text-sm">متوسط الإنجاز</p>
              <p className="text-3xl font-bold">
                {report?.trainees?.length > 0 
                  ? Math.round(report.trainees.reduce((sum, t) => sum + t.progress, 0) / report.trainees.length)
                  : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Trainees List */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-500" />
            <Card.Title>الموظفون في التدريب</Card.Title>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {!report?.trainees?.length ? (
            <div className="text-center py-12 text-surface-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-surface-400" />
              <p>لا يوجد متدربون حالياً</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-700">
              {report.trainees.map((trainee) => (
                <div key={trainee.id} className="p-4 hover:bg-surface-50 dark:hover:bg-surface-700/50">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-full 
                                  flex items-center justify-center text-primary-600 font-bold">
                      {trainee.full_name?.charAt(0) || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-surface-900 dark:text-white">
                          {trainee.full_name}
                        </h4>
                        {trainee.is_delayed && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            متأخر
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-surface-500">
                        {trainee.position_name || 'غير محدد'} • {trainee.plan_name}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="text-left w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-surface-500">التقدم</span>
                        <span className={clsx(
                          'text-sm font-bold',
                          trainee.progress >= 80 ? 'text-green-600' :
                          trainee.progress >= 50 ? 'text-orange-600' : 'text-red-600'
                        )}>
                          {trainee.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                        <div 
                          className={clsx(
                            'h-full rounded-full transition-all',
                            trainee.progress >= 80 ? 'bg-green-500' :
                            trainee.progress >= 50 ? 'bg-orange-500' : 'bg-red-500'
                          )}
                          style={{ width: `${trainee.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Days */}
                    <div className="text-center">
                      <p className="text-lg font-bold text-surface-900 dark:text-white">
                        {trainee.current_day || 1}
                      </p>
                      <p className="text-xs text-surface-500">
                        من {trainee.duration_days} يوم
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}
