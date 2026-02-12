import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'

const SOCKET_URL = window.location.origin

export function useSocket() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState([])
  const socketRef = useRef(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token')
    if (!token) return

    // Create socket connection
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
    })

    // Notification events
    socket.on('notification', (notification) => {
      console.log('[Socket] New notification:', notification)
      
      // Add to local state for toast
      setNotifications(prev => [notification, ...prev])
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['notifications'])
      queryClient.invalidateQueries(['unreadCount'])
      
      // Show browser notification if permitted
      showBrowserNotification(notification)
    })

    // Task events
    socket.on('task:updated', (task) => {
      console.log('[Socket] Task updated:', task)
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['myTasks'])
      queryClient.invalidateQueries(['taskStats'])
    })

    socket.on('task:created', (task) => {
      console.log('[Socket] Task created:', task)
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['taskStats'])
    })

    // Attendance events
    socket.on('attendance:update', () => {
      queryClient.invalidateQueries(['attendanceStats'])
      queryClient.invalidateQueries(['todayAttendance'])
    })

    // Cleanup
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, queryClient])

  // Remove notification from toast queue
  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all toast notifications
  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    socket: socketRef.current,
    connected,
    notifications,
    dismissNotification,
    clearNotifications,
  }
}

// Request browser notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Show browser notification
function showBrowserNotification(notification) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.body,
      icon: '/favicon.svg',
      tag: notification.id,
    })
  }
}

export default useSocket
