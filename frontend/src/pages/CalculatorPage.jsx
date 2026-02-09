/**
 * أونلاين حاسبة - Phase 9
 * محادثة علنية ومسار دوري للمندوبين
 */
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calculator, Send, Plus } from 'lucide-react'
import Button from '../components/common/Button'
import PageShell from '../components/common/PageShell'
import Tabs from '../components/common/Tabs'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function CalculatorPage() {
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('chat')
  const [routeForm, setRouteForm] = useState({ schedule_date: '', customer_id: '', notes: '' })
  const [showRouteForm, setShowRouteForm] = useState(false)
  const messagesEndRef = useRef(null)
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()

  const { data: chatMessages = [], refetch: refetchChat } = useQuery({
    queryKey: ['calculator-chat'],
    queryFn: async () => {
      const res = await api.get('/calculator/chat', { params: { limit: 80 } })
      return res.data?.data ?? []
    },
    refetchInterval: 5000
  })

  const { data: routes = [], refetch: refetchRoutes } = useQuery({
    queryKey: ['calculator-routes'],
    queryFn: async () => {
      const res = await api.get('/calculator/routes')
      return res.data?.data ?? []
    },
    enabled: activeTab === 'routes'
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await api.get('/customers', { params: { limit: 200 } })
      return res.data?.data ?? res.data ?? []
    },
    enabled: activeTab === 'routes' && showRouteForm
  })

  const addRouteMutation = useMutation({
    mutationFn: (body) => api.post('/calculator/routes', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculator-routes'] })
      setRouteForm({ schedule_date: '', customer_id: '', notes: '' })
      setShowRouteForm(false)
      showToast('تمت إضافة الزيارة', 'success')
    },
    onError: (err) => showToast(err.response?.data?.error || 'فشل الحفظ', 'error')
  })

  const sendMutation = useMutation({
    mutationFn: (msg) => api.post('/calculator/chat', { message: msg }),
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['calculator-chat'] })
    },
    onError: (err) => showToast(err.response?.data?.error || 'فشل الإرسال', 'error')
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const tabs = [
    { id: 'chat', label: 'المحادثة' },
    { id: 'routes', label: 'المسار الدوري' }
  ]

  return (
    <PageShell title="أونلاين حاسبة" icon={<Calculator className="w-6 h-6" />}>
      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'chat' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-[420px] mt-4">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {Array.isArray(chatMessages) && chatMessages.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">لا توجد رسائل بعد. ابدأ المحادثة.</p>
            )}
            {Array.isArray(chatMessages) && chatMessages.map((m) => (
              <div key={m.id} className="flex gap-2">
                <span className="text-primary-600 dark:text-primary-400 font-medium shrink-0">{m.full_name || 'مستخدم'}:</span>
                <span className="text-slate-700 dark:text-slate-300">{m.message}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (message.trim()) sendMutation.mutate(message.trim()) } }}
              placeholder="اكتب رسالة..."
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <Button onClick={() => message.trim() && sendMutation.mutate(message.trim())} disabled={sendMutation.isPending || !message.trim()}>
              <Send className="w-4 h-4 ml-1" />
              إرسال
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mt-4">
          {!showRouteForm ? (
            <Button className="mb-4" onClick={() => setShowRouteForm(true)}>
              <Plus className="w-4 h-4 ml-1" />
              إضافة زيارة
            </Button>
          ) : (
            <form
              className="mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (!routeForm.schedule_date?.trim()) {
                  showToast('تاريخ الزيارة مطلوب', 'error')
                  return
                }
                if (!user?.id) {
                  showToast('يجب تسجيل الدخول', 'error')
                  return
                }
                addRouteMutation.mutate({
                  rep_id: user.id,
                  schedule_date: routeForm.schedule_date.trim(),
                  customer_id: routeForm.customer_id?.trim() || undefined,
                  notes: routeForm.notes?.trim() || undefined
                })
              }}
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الزيارة *</label>
                <input
                  type="date"
                  value={routeForm.schedule_date}
                  onChange={(e) => setRouteForm((f) => ({ ...f, schedule_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العميل (اختياري)</label>
                <select
                  value={routeForm.customer_id}
                  onChange={(e) => setRouteForm((f) => ({ ...f, customer_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">— اختر عميل —</option>
                  {Array.isArray(customers) && customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={routeForm.notes}
                  onChange={(e) => setRouteForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="ملاحظات الزيارة"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRouteForm(false)}>إلغاء</Button>
                <Button type="submit" disabled={addRouteMutation.isPending}>حفظ</Button>
              </div>
            </form>
          )}
          {routes.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">لا توجد زيارات مسجلة.</p>
          ) : (
            <ul className="space-y-2">
              {routes.map((r) => (
                <li key={r.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span>{r.customer_name || '—'}</span>
                  <span className="text-slate-500 text-sm">{r.schedule_date}</span>
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" className="mt-4" onClick={() => refetchRoutes()}>تحديث</Button>
        </div>
      )}
    </PageShell>
  )
}
