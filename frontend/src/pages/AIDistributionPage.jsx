/**
 * لوحة تحكم التوزيع الذكي - AI Task Distribution
 * عرض حمل الموظفين، الموافقات المعلقة، وإطلاق أحداث
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Loader2,
  AlertCircle,
  BarChart3,
  UserX,
  History,
  Settings,
  Award,
} from 'lucide-react'
import api from '../services/api'
import PageShell from '../components/common/PageShell'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Spinner from '../components/common/Spinner'

function useWorkload() {
  return useQuery({
    queryKey: ['ai-distribution', 'workload'],
    queryFn: async () => {
      const res = await api.get('/ai-distribution/workload')
      return res.data?.data || []
    },
  })
}

function useApprovals() {
  return useQuery({
    queryKey: ['ai-distribution', 'approvals'],
    queryFn: async () => {
      const res = await api.get('/ai-distribution/approvals')
      return res.data?.data || []
    },
  })
}

function useAbsentToday() {
  return useQuery({
    queryKey: ['ai-distribution', 'absent-today'],
    queryFn: async () => {
      const res = await api.get('/ai-distribution/absent-today')
      return res.data?.data || []
    },
  })
}

function useDistributionLog() {
  return useQuery({
    queryKey: ['ai-distribution', 'log'],
    queryFn: async () => {
      const res = await api.get('/ai-distribution/log?limit=30')
      return res.data?.data || []
    },
  })
}

function useUsers() {
  return useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const res = await api.get('/users?limit=200')
      const data = res.data?.data ?? res.data
      return Array.isArray(data) ? data : data?.users ?? []
    },
  })
}

function useDistConfig() {
  return useQuery({
    queryKey: ['ai-distribution', 'config'],
    queryFn: async () => {
      const res = await api.get('/ai-distribution/config')
      return res.data?.data || {}
    },
  })
}

function useSkills() {
  return useQuery({
    queryKey: ['ai-distribution', 'skills'],
    queryFn: async () => {
      const res = await api.get('/ai-distribution/skills')
      return res.data?.data || []
    },
  })
}

const METHOD_LABELS = { auto: 'تلقائي', approval: 'موافقة مدير', reassign: 'إعادة توزيع' }
const SKILL_LABELS = {
  inspection: 'فحص',
  preparation: 'تجهيز',
  sales: 'مبيعات',
  delivery: 'توصيل',
  cleaning: 'تنظيف',
  maintenance: 'صيانة',
  accounting: 'محاسبة',
}

export default function AIDistributionPage() {
  const queryClient = useQueryClient()
  const [emitKind, setEmitKind] = useState('daily_tasks')
  const [emitPayload, setEmitPayload] = useState('{}')
  const [assignOverride, setAssignOverride] = useState({})

  const { data: workloads = [], isLoading: loadWork } = useWorkload()
  const { data: approvals = [], isLoading: loadApprovals } = useApprovals()
  const { data: absentToday = [], isLoading: loadAbsent } = useAbsentToday()
  const { data: distLog = [], isLoading: loadLog } = useDistributionLog()
  const { data: users = [] } = useUsers()
  const { data: distConfig = {}, isLoading: loadConfig } = useDistConfig()
  const { data: skillsList = [], isLoading: loadSkills } = useSkills()

  const [configForm, setConfigForm] = useState({
    skill: 40,
    workload: 25,
    history: 20,
    availability: 15,
    max_utilization: 85,
  })
  useEffect(() => {
    if (distConfig?.weights) {
      setConfigForm({
        skill: Math.round((distConfig.weights.skill ?? 0.4) * 100),
        workload: Math.round((distConfig.weights.workload ?? 0.25) * 100),
        history: Math.round((distConfig.weights.history ?? 0.2) * 100),
        availability: Math.round((distConfig.weights.availability ?? 0.15) * 100),
        max_utilization: Math.round((distConfig.max_utilization ?? 0.85) * 100),
      })
    }
  }, [distConfig])

  const reassignMutation = useMutation({
    mutationFn: (userId) => api.post(`/ai-distribution/reassign/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-distribution'] }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, assign_to }) =>
      api.post(`/ai-distribution/approvals/${id}/approve`, assign_to ? { assign_to } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-distribution'] }),
  })
  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/ai-distribution/approvals/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-distribution'] }),
  })

  const configMutation = useMutation({
    mutationFn: (body) => api.put('/ai-distribution/config', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-distribution'] }),
  })

  const emitMutation = useMutation({
    mutationFn: (body) => api.post('/ai-distribution/emit', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-distribution'] }),
  })

  const handleApprove = (approvalId, overrideUserId) => {
    approveMutation.mutate({ id: approvalId, assign_to: overrideUserId || undefined })
    setAssignOverride((prev) => ({ ...prev, [approvalId]: undefined }))
  }
  const handleReject = (approvalId) => {
    rejectMutation.mutate(approvalId)
  }

  const handleEmit = () => {
    let payload = {}
    try {
      payload = JSON.parse(emitPayload || '{}')
    } catch (_) {}
    emitMutation.mutate({ eventType: emitKind, payload })
  }

  const handleSaveConfig = () => {
    const s = configForm.skill + configForm.workload + configForm.history + configForm.availability
    configMutation.mutate({
      weights: {
        skill: s ? configForm.skill / s : 0.4,
        workload: s ? configForm.workload / s : 0.25,
        history: s ? configForm.history / s : 0.2,
        availability: s ? configForm.availability / s : 0.15,
      },
      max_utilization: Math.max(0.1, Math.min(1, configForm.max_utilization / 100)),
    })
  }

  const utilizationPercent = (w) => Math.round((w.utilization || 0) * 100)
  const utilizationColor = (pct) =>
    pct >= 85 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-primary-500'

  return (
    <PageShell
      title="التوزيع الذكي للمهام"
      description="عرض حمل العمل والموافقات المعلقة لتوزيع المهام"
      actions={
        <Button
          variant="secondary"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['ai-distribution'] })}
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      }
    >
      <div className="space-y-6">
        {/* إعدادات التوزيع */}
        <Card>
          <Card.Header>
            <Card.Title>
              <span className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                إعدادات التوزيع
              </span>
            </Card.Title>
          </Card.Header>
          {loadConfig ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">المهارات %</label>
                <input type="number" min="0" max="100" value={configForm.skill} onChange={(e) => setConfigForm((f) => ({ ...f, skill: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">حمل العمل %</label>
                <input type="number" min="0" max="100" value={configForm.workload} onChange={(e) => setConfigForm((f) => ({ ...f, workload: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">التاريخ %</label>
                <input type="number" min="0" max="100" value={configForm.history} onChange={(e) => setConfigForm((f) => ({ ...f, history: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">التوفر %</label>
                <input type="number" min="0" max="100" value={configForm.availability} onChange={(e) => setConfigForm((f) => ({ ...f, availability: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">حد الحمل %</label>
                <input type="number" min="10" max="100" value={configForm.max_utilization} onChange={(e) => setConfigForm((f) => ({ ...f, max_utilization: Number(e.target.value) || 85 }))} className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" />
              </div>
            </div>
          )}
          {!loadConfig && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={handleSaveConfig} disabled={configMutation.isPending}>
                {configMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                حفظ الإعدادات
              </Button>
              {configMutation.isSuccess && <span className="text-sm text-green-600">تم الحفظ</span>}
            </div>
          )}
        </Card>

        {/* Workload - حمل الموظفين */}
        <Card>
          <Card.Header>
            <Card.Title>
              <span className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                حمل العمل
              </span>
            </Card.Title>
          </Card.Header>
          {loadWork ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : workloads.length === 0 ? (
            <p className="text-neutral-500 text-center py-6">لا يوجد موظفون أو بيانات حمل.</p>
          ) : (
            <div className="space-y-4">
              {workloads.map((w) => {
                const pct = utilizationPercent(w)
                return (
                  <div key={w.userId} className="flex items-center gap-4">
                    <div className="w-40 shrink-0 truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {w.full_name || w.userId}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all ${utilizationColor(pct)}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-end text-xs text-neutral-500">
                      {w.taskCount} مهام · {pct}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Reassign from absent */}
        <Card>
          <Card.Header>
            <Card.Title>
              <span className="flex items-center gap-2">
                <UserX className="w-5 h-5" />
                إعادة توزيع مهام الغائبين
              </span>
            </Card.Title>
          </Card.Header>
          {loadAbsent ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : absentToday.length === 0 ? (
            <p className="text-neutral-500 text-center py-6">لا يوجد موظفون غائبون اليوم.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {absentToday.map((a) => (
                <li key={a.user_id} className="py-3 flex items-center justify-between gap-4">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {a.full_name || a.user_id}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => reassignMutation.mutate(a.user_id)}
                    disabled={reassignMutation.isPending}
                  >
                    {reassignMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    إعادة توزيع المهام
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {reassignMutation.isSuccess && reassignMutation.data?.data?.reassigned?.length > 0 && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              تم إعادة توزيع {reassignMutation.data.data.reassigned.length} مهمة.
            </p>
          )}
        </Card>

        {/* Pending approvals */}
        <Card>
          <Card.Header>
            <Card.Title>
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                موافقات معلقة
              </span>
            </Card.Title>
          </Card.Header>
          {loadApprovals ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : approvals.length === 0 ? (
            <p className="text-neutral-500 text-center py-6">لا توجد موافقات معلقة.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {approvals.map((a) => (
                <li key={a.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {a.task_title_ar || a.task_title}
                      </p>
                      <p className="text-sm text-neutral-500">
                        المقترح: {a.suggested_user_name || a.suggested_user_id} — نقاط:{' '}
                        {a.suggested_score != null ? Number(a.suggested_score).toFixed(2) : '-'}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-neutral-500">تعيين لـ:</label>
                        <select
                          value={assignOverride[a.id] ?? a.suggested_user_id ?? ''}
                          onChange={(e) => setAssignOverride((prev) => ({ ...prev, [a.id]: e.target.value || null }))}
                          className="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-sm min-w-[140px]"
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name || u.username || u.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(a.id, assignOverride[a.id] || a.suggested_user_id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReject(a.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        رفض
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Distribution log */}
        <Card>
          <Card.Header>
            <Card.Title>
              <span className="flex items-center gap-2">
                <History className="w-5 h-5" />
                سجل التوزيع
              </span>
            </Card.Title>
          </Card.Header>
          {loadLog ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : distLog.length === 0 ? (
            <p className="text-neutral-500 text-center py-6">لا يوجد سجل بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-right py-2 px-2">المهمة</th>
                    <th className="text-right py-2 px-2">المعيّن</th>
                    <th className="text-right py-2 px-2">النوع</th>
                    <th className="text-right py-2 px-2">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {distLog.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 px-2 truncate max-w-[200px]" title={row.task_title}>
                        {row.task_title || '-'}
                      </td>
                      <td className="py-2 px-2">{row.assigned_to_name || row.assigned_to || '-'}</td>
                      <td className="py-2 px-2">{METHOD_LABELS[row.method] || row.method}</td>
                      <td className="py-2 px-2 text-neutral-500">{row.created_at ? new Date(row.created_at).toLocaleString('ar-IQ') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* مهارات الموظفين */}
        <Card>
          <Card.Header>
            <Card.Title>
              <span className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                مهارات الموظفين
              </span>
            </Card.Title>
          </Card.Header>
          {loadSkills ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : skillsList.length === 0 ? (
            <p className="text-neutral-500 text-center py-6">لا يوجد بيانات مهارات.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-right py-2 px-2">الموظف</th>
                    {Object.entries(SKILL_LABELS).map(([key]) => (
                      <th key={key} className="text-right py-2 px-2">{SKILL_LABELS[key]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {skillsList.map((row) => (
                    <tr key={row.user_id} className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 px-2 font-medium">{row.full_name || row.user_id}</td>
                      {Object.entries(SKILL_LABELS).map(([key]) => (
                        <td key={key} className="py-2 px-2">
                          <span className={row.skills?.[key] >= 70 ? 'text-green-600' : row.skills?.[key] >= 50 ? 'text-neutral-700' : 'text-amber-600'}>
                            {row.skills?.[key] ?? '-'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Emit event (daily_tasks, etc.) */}
        <Card>
          <Card.Header>
            <Card.Title>
              <span className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                إطلاق حدث
              </span>
            </Card.Title>
          </Card.Header>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                نوع الحدث
              </label>
              <select
                value={emitKind}
                onChange={(e) => setEmitKind(e.target.value)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              >
                <option value="daily_tasks">مهام يومية (daily_tasks)</option>
                <option value="stock_low">مخزون منخفض (stock_low)</option>
                <option value="purchase_confirmed">شراء مؤكد (purchase_confirmed)</option>
                <option value="inspection_complete">فحص مكتمل (inspection_complete)</option>
                <option value="invoice_completed">فاتورة مكتملة (invoice_completed)</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                البيانات (JSON)
              </label>
              <input
                type="text"
                value={emitPayload}
                onChange={(e) => setEmitPayload(e.target.value)}
                placeholder='{"kind":"cleaning","date":"2026-02-09"}'
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-mono"
              />
            </div>
            <Button
              onClick={handleEmit}
              disabled={emitMutation.isPending}
            >
              {emitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              إطلاق
            </Button>
          </div>
          {emitMutation.isSuccess && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">تم إطلاق الحدث.</p>
          )}
          {emitMutation.isError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {emitMutation.error?.response?.data?.error || emitMutation.error?.message}
            </p>
          )}
        </Card>
      </div>
    </PageShell>
  )
}
