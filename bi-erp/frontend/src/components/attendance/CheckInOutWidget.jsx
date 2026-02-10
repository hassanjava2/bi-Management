import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogIn, LogOut, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import Card from '../common/Card'
import Button from '../common/Button'
import Spinner from '../common/Spinner'
import Alert from '../common/Alert'
import { attendanceAPI } from '../../services/api'
import { formatTime, formatMinutes, translateStatus, getStatusColor } from '../../utils/helpers'

export default function CheckInOutWidget() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState(null)
  const [message, setMessage] = useState(null)
  const queryClient = useQueryClient()

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          })
        },
        (err) => console.log('Location error:', err),
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // Get today's attendance
  const { data: myRecord, isLoading } = useQuery({
    queryKey: ['myTodayAttendance'],
    queryFn: () => attendanceAPI.getMyRecord(),
  })

  // Find today's record
  const today = new Date().toISOString().split('T')[0]
  const todayRecord = myRecord?.data?.data?.find(r => r.date === today)

  // Check in mutation
  const checkInMutation = useMutation({
    mutationFn: () => attendanceAPI.checkIn({ location }),
    onSuccess: (res) => {
      const data = res.data.data
      if (data.status === 'late') {
        setMessage({ type: 'warning', text: `تم تسجيل الحضور - متأخر ${data.late_minutes} دقيقة` })
      } else {
        setMessage({ type: 'success', text: 'تم تسجيل الحضور بنجاح! صباح الخير' })
      }
      queryClient.invalidateQueries(['myTodayAttendance'])
      queryClient.invalidateQueries(['attendanceStats'])
      queryClient.invalidateQueries(['dashboard'])
    },
    onError: (err) => {
      setMessage({ type: 'error', text: err.response?.data?.message || 'فشل تسجيل الحضور' })
    },
  })

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: () => attendanceAPI.checkOut({ location }),
    onSuccess: (res) => {
      const data = res.data.data
      setMessage({ 
        type: 'success', 
        text: `تم تسجيل الانصراف - ساعات العمل: ${formatMinutes(data.work_minutes)}` 
      })
      queryClient.invalidateQueries(['myTodayAttendance'])
      queryClient.invalidateQueries(['attendanceStats'])
    },
    onError: (err) => {
      setMessage({ type: 'error', text: err.response?.data?.message || 'فشل تسجيل الانصراف' })
    },
  })

  const hasCheckedIn = !!todayRecord?.check_in
  const hasCheckedOut = !!todayRecord?.check_out

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header with current time */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 -m-6 mb-6 p-6 text-white">
        <div className="text-center">
          <p className="text-primary-100 text-sm mb-1">
            {currentTime.toLocaleDateString('ar-IQ', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-5xl font-bold font-mono">
            {currentTime.toLocaleTimeString('ar-IQ', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert 
          variant={message.type} 
          className="mb-4"
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Status */}
      {todayRecord && (
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">الحضور</p>
            <p className="font-bold text-neutral-900 dark:text-white">
              {formatTime(todayRecord.check_in) || '--:--'}
            </p>
          </div>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">الانصراف</p>
            <p className="font-bold text-neutral-900 dark:text-white">
              {formatTime(todayRecord.check_out) || '--:--'}
            </p>
          </div>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">ساعات العمل</p>
            <p className="font-bold text-neutral-900 dark:text-white">
              {formatMinutes(todayRecord.work_minutes) || '--'}
            </p>
          </div>
        </div>
      )}

      {/* Status Badge */}
      {todayRecord && (
        <div className="flex justify-center mb-6">
          <span className={clsx('px-4 py-2 rounded-full text-sm font-medium', getStatusColor(todayRecord.status))}>
            {todayRecord.status === 'present' && <CheckCircle className="w-4 h-4 inline ml-1" />}
            {todayRecord.status === 'late' && <AlertCircle className="w-4 h-4 inline ml-1" />}
            {translateStatus(todayRecord.status)}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => checkInMutation.mutate()}
          loading={checkInMutation.isPending}
          disabled={hasCheckedIn}
          variant={hasCheckedIn ? 'secondary' : 'success'}
          size="lg"
          className="flex-1"
        >
          <LogIn className="w-5 h-5" />
          {hasCheckedIn ? 'تم التسجيل' : 'تسجيل حضور'}
        </Button>
        
        <Button
          onClick={() => checkOutMutation.mutate()}
          loading={checkOutMutation.isPending}
          disabled={!hasCheckedIn || hasCheckedOut}
          variant={hasCheckedOut ? 'secondary' : 'danger'}
          size="lg"
          className="flex-1"
        >
          <LogOut className="w-5 h-5" />
          {hasCheckedOut ? 'تم الانصراف' : 'تسجيل انصراف'}
        </Button>
      </div>

      {/* Location indicator */}
      {location && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500">
          <MapPin className="w-4 h-4" />
          <span>تم تحديد الموقع</span>
        </div>
      )}
    </Card>
  )
}
