/**
 * دردشات الموظفين مع الذكاء - للمدير/المالك
 * عرض كل المحادثات المسجلة وإمكانية الاطلاع على التفاصيل
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Eye, RefreshCw, User, Bot } from 'lucide-react'
import api from '../services/api'
import PageShell from '../components/common/PageShell'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Spinner from '../components/common/Spinner'
import Modal from '../components/common/Modal'

export default function AIChatsPage() {
  const [selectedId, setSelectedId] = useState(null)
  const [userFilter, setUserFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['ai-admin-conversations', userFilter, fromDate, toDate],
    queryFn: async () => {
      const params = {}
      if (userFilter) params.user_id = userFilter
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const res = await api.get('/ai/admin/conversations', { params })
      return res.data?.data || []
    },
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['ai-admin-conversation', selectedId],
    queryFn: async () => {
      const res = await api.get(`/ai/admin/conversations/${selectedId}`)
      return res.data?.data
    },
    enabled: !!selectedId,
  })

  const formatDate = (d) => (d ? new Date(d).toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' }) : '-')

  return (
    <PageShell
      title="دردشات الموظفين مع الذكاء"
      description="عرض كل المحادثات المسجلة بين الموظفين ومساعد Bi"
      actions={
        <Button variant="secondary" onClick={() => setSelectedId(null)}>
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      }
    >
      <Card>
        <Card.Header>
          <Card.Title>
            <span className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              قائمة المحادثات
            </span>
          </Card.Title>
        </Card.Header>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="من تاريخ"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="إلى تاريخ"
          />
          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm w-48"
            placeholder="تصفية بـ user_id"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <p className="text-neutral-500 text-center py-12">لا توجد محادثات مسجلة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-right py-2 px-2">الموظف</th>
                  <th className="text-right py-2 px-2">أول رسالة</th>
                  <th className="text-right py-2 px-2">آخر نشاط</th>
                  <th className="text-right py-2 px-2">عدد التبادلات</th>
                  <th className="text-right py-2 px-2">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.conversation_id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2 px-2 font-medium">{row.user_name || row.user_id}</td>
                    <td className="py-2 px-2 text-neutral-500">{formatDate(row.first_at)}</td>
                    <td className="py-2 px-2 text-neutral-500">{formatDate(row.last_at)}</td>
                    <td className="py-2 px-2">{row.turns}</td>
                    <td className="py-2 px-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedId(row.conversation_id)}
                      >
                        <Eye className="w-4 h-4" />
                        عرض
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail ? `محادثة: ${detail.user_name || detail.user_id}` : 'تفاصيل المحادثة'}
        size="xl"
      >
        {selectedId && (
          <div className="max-h-[70vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : detail?.messages?.length ? (
              <div className="space-y-4">
                {detail.messages.map((msg, idx) => (
                  <div key={msg.id || idx} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <User className="w-3.5 h-3.5" />
                      <span>الموظف</span>
                      <span>{formatDate(msg.created_at)}</span>
                      {msg.blocked && <span className="text-amber-600">(محظور)</span>}
                    </div>
                    <p className="rounded-lg bg-neutral-100 dark:bg-neutral-700 p-3 text-sm whitespace-pre-wrap">
                      {msg.user_message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Bi Assistant</span>
                    </div>
                    <p className="rounded-lg bg-primary-50 dark:bg-primary-900/20 p-3 text-sm whitespace-pre-wrap border border-primary-100 dark:border-primary-800">
                      {msg.ai_response || '—'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 py-6">لا توجد رسائل.</p>
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  )
}
