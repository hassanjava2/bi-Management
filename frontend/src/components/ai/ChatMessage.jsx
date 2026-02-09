import { clsx } from 'clsx'
import { User, Bot } from 'lucide-react'
import { formatTime } from '../../utils/helpers'

export default function ChatMessage({ message, isUser }) {
  return (
    <div className={clsx(
      'flex gap-3 mb-4',
      isUser ? 'flex-row-reverse' : ''
    )}>
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isUser 
          ? 'bg-primary-100 dark:bg-primary-900 text-primary-600' 
          : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className={clsx(
        'max-w-[80%] rounded-2xl px-4 py-2',
        isUser 
          ? 'bg-primary-600 text-white rounded-br-sm' 
          : 'bg-surface-100 dark:bg-surface-700 text-surface-900 dark:text-white rounded-bl-sm'
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={clsx(
          'text-xs mt-1',
          isUser ? 'text-primary-200' : 'text-surface-500 dark:text-surface-400'
        )}>
          {formatTime(message.timestamp || message.created_at)}
        </p>
      </div>
    </div>
  )
}
