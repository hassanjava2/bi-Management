import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Calendar, Target, MessageCircle, Award } from 'lucide-react'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import TrainingProgress from './TrainingProgress'
import TrainingTask from './TrainingTask'
import { trainingAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function TrainingDashboard() {
  const { user } = useAuth()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trainingProgress'],
    queryFn: () => trainingAPI.getMyProgress(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const progress = data?.data?.data

  // Not in training
  if (!progress?.in_training) {
    return (
      <Card className="text-center py-12">
        <GraduationCap className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          لا يوجد تدريب حالي
        </h3>
        <p className="text-neutral-500">
          أنت جاهز للعمل! لا يوجد برنامج تدريب نشط حالياً.
        </p>
      </Card>
    )
  }

  // Get today's tasks
  const todayTasks = progress.tasks?.filter(t => t.day === progress.current_day) || []
  const completedToday = todayTasks.filter(t => t.completed).length
  const upcomingTasks = progress.tasks?.filter(t => t.day > progress.current_day && !t.completed) || []

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">مرحباً {user?.full_name}!</h1>
            <p className="text-primary-100">
              {progress.plan_name} - اليوم {progress.current_day} من {progress.duration_days}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-500" />
            <Card.Title>تقدمك في التدريب</Card.Title>
          </div>
        </Card.Header>
        <Card.Body>
          <TrainingProgress 
            progress={progress.progress}
            currentDay={progress.current_day}
            totalDays={progress.duration_days}
          />

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{progress.completed_tasks}</p>
              <p className="text-sm text-neutral-500">مهام مكتملة</p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <p className="text-2xl font-bold text-orange-600">
                {progress.total_tasks - progress.completed_tasks}
              </p>
              <p className="text-sm text-neutral-500">مهام متبقية</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">
                {progress.duration_days - progress.current_day + 1}
              </p>
              <p className="text-sm text-neutral-500">أيام متبقية</p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Today's Tasks */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <Card.Title>مهام اليوم</Card.Title>
            </div>
            <span className="text-sm text-neutral-500">
              {completedToday}/{todayTasks.length} مكتمل
            </span>
          </div>
        </Card.Header>
        <Card.Body className="space-y-4">
          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Award className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
              <p>أكملت جميع مهام اليوم!</p>
            </div>
          ) : (
            todayTasks.map((task, idx) => (
              <TrainingTask 
                key={task.task_index ?? idx}
                task={task}
                index={task.task_index ?? idx}
                onComplete={refetch}
              />
            ))
          )}
        </Card.Body>
      </Card>

      {/* Upcoming Tasks Preview */}
      {upcomingTasks.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>المهام القادمة</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 3).map((task, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-600 
                                flex items-center justify-center text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    {task.day}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      {task.title}
                    </p>
                    <p className="text-xs text-neutral-500">اليوم {task.day}</p>
                  </div>
                </div>
              ))}
              {upcomingTasks.length > 3 && (
                <p className="text-center text-sm text-neutral-500 pt-2">
                  +{upcomingTasks.length - 3} مهام أخرى
                </p>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* AI Trainer Button */}
      <button className="fixed bottom-24 left-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-500 
                         rounded-full shadow-lg flex items-center justify-center text-white
                         hover:scale-110 transition-transform z-40">
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  )
}
