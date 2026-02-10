import { createContext, useContext } from 'react'
import { useSocket, requestNotificationPermission } from '../hooks/useSocket'
import { NotificationToastContainer } from '../components/notifications/NotificationToast'
import { useEffect } from 'react'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const socket = useSocket()

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <SocketContext.Provider value={socket}>
      {children}
      <NotificationToastContainer 
        notifications={socket.notifications}
        onDismiss={socket.dismissNotification}
      />
    </SocketContext.Provider>
  )
}

export function useSocketContext() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider')
  }
  return context
}
