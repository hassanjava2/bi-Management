import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Minimize2, Maximize2, Bot, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import AISuggestions from './AISuggestions'
import Spinner from '../common/Spinner'
import { aiAPI } from '../../services/api'

export default function ChatWindow({ isOpen, onClose, onMinimize, isMinimized }) {
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const messagesEndRef = useRef(null)
  const queryClient = useQueryClient()

  // Scroll to bottom when new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = {
        id: 'greeting',
        role: 'assistant',
        content: 'مرحباً! أنا مساعدك الذكي Bi. كيف يمكنني مساعدتك اليوم؟',
        timestamp: new Date().toISOString()
      }
      setMessages([greeting])
      setSuggestions(['ما مهامي اليوم؟', 'كيف أسجل حضوري؟', 'لدي مشكلة'])
    }
  }, [isOpen])

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (message) => aiAPI.chat({ message, conversation_id: conversationId }),
    onMutate: (message) => {
      // Optimistic update - add user message
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])
    },
    onSuccess: (response) => {
      const data = response.data.data

      const aiMessage = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }
      if (data.suggested_tasks && data.suggested_tasks.length > 0) {
        aiMessage.suggested_tasks = data.suggested_tasks
      }
      if (data.action_result) {
        aiMessage.action_result = data.action_result
      }
      setMessages(prev => [...prev, aiMessage])

      setConversationId(data.conversation_id)
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      }
    },
    onError: (error) => {
      // Add error message
      const errorMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    }
  })

  const handleSend = (message) => {
    sendMutation.mutate(message)
  }

  const handleClear = () => {
    setMessages([])
    setConversationId(null)
    setSuggestions(['ما مهامي اليوم؟', 'كيف أسجل حضوري؟', 'لدي مشكلة'])
  }

  const confirmTaskMutation = useMutation({
    mutationFn: (taskData) => aiAPI.confirmTaskFromChat(taskData),
    onSuccess: (_, variables) => {
      setMessages(prev => prev.map(m => {
        if (!m.suggested_tasks) return m
        return {
          ...m,
          suggested_tasks: m.suggested_tasks.map(t => (
            t.suggested_task && t.suggested_task.title === variables.title
              ? { ...t, _created: true }
              : t
          ))
        }
      }))
    }
  })

  const handleConfirmTask = useCallback((suggestedTask) => {
    if (!suggestedTask || !suggestedTask.title) return
    confirmTaskMutation.mutate(suggestedTask)
  }, [confirmTaskMutation])

  if (!isOpen) return null

  return (
    <div className={clsx(
      'fixed z-50 transition-all duration-300',
      isMinimized 
        ? 'bottom-4 left-4 w-72 h-14' 
        : 'bottom-4 left-4 w-96 h-[500px] max-h-[80vh]'
    )}>
      <div className={clsx(
        'bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden',
        'border border-neutral-200 dark:border-neutral-700',
        'flex flex-col h-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Bi Assistant</h3>
              {!isMinimized && (
                <p className="text-xs text-primary-200">مساعدك الذكي</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <button
                onClick={handleClear}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="مسح المحادثة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onMinimize}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isUser={msg.role === 'user'}
                  onConfirmTask={handleConfirmTask}
                  confirmTaskPending={confirmTaskMutation.isPending}
                />
              ))}
              
              {sendMutation.isPending && (
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                  <Spinner size="sm" />
                  <span>Bi يكتب...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <AISuggestions
              suggestions={suggestions}
              onSelect={handleSend}
              disabled={sendMutation.isPending}
            />

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              disabled={sendMutation.isPending}
            />
          </>
        )}
      </div>
    </div>
  )
}
