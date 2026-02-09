import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export default function ChatInput({ onSend, disabled, placeholder = 'اكتب رسالتك...' }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [message])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 border-t border-neutral-200 dark:border-neutral-700">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={clsx(
          'flex-1 resize-none rounded-xl border border-neutral-300 dark:border-neutral-600',
          'px-4 py-2 text-sm bg-white dark:bg-neutral-700',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          'placeholder-neutral-400 dark:placeholder-neutral-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className={clsx(
          'p-2 rounded-xl transition-colors',
          message.trim() && !disabled
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
        )}
      >
        {disabled ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </form>
  )
}
