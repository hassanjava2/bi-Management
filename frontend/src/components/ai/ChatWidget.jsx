import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { clsx } from 'clsx'
import ChatWindow from './ChatWindow'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false)
      setIsMinimized(false)
    } else {
      setIsOpen(true)
      setIsMinimized(false)
      setUnreadCount(0)
    }
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  return (
    <>
      {/* Chat Window */}
      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMinimize={handleMinimize}
        isMinimized={isMinimized}
      />

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className={clsx(
            'fixed bottom-6 left-6 z-40',
            'w-14 h-14 rounded-full',
            'bg-gradient-to-br from-primary-600 to-primary-700',
            'text-white shadow-lg',
            'hover:shadow-xl hover:scale-105',
            'transition-all duration-300',
            'flex items-center justify-center',
            'group'
          )}
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          
          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {/* Pulse Animation */}
          <span className="absolute inset-0 rounded-full bg-primary-400 animate-ping opacity-25" />
        </button>
      )}

      {/* Tooltip */}
      {!isOpen && (
        <div className={clsx(
          'fixed bottom-24 left-6 z-40',
          'bg-white dark:bg-neutral-800 rounded-lg shadow-lg',
          'px-3 py-2 text-sm',
          'opacity-0 hover:opacity-100 pointer-events-none',
          'transition-opacity duration-300'
        )}>
          تحدث مع Bi Assistant
        </div>
      )}
    </>
  )
}
