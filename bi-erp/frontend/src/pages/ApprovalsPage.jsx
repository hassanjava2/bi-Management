/**
 * BI Management - Approvals Page (Enhanced Sprint 13)
 * صفحة طلبات الموافقة — بطاقات + إحصائيات
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileCheck, CheckCircle, XCircle, Clock, AlertTriangle,
  Eye, User, Calendar, Loader2, Inbox
} from 'lucide-react'
import { clsx } from 'clsx'
import PageShell from '../components/common/PageShell'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'
import Spinner from '../components/common/Spinner'
import { approvalsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const statusConfig = {
  pending: { label: 'معلق', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  approved: { label: 'موافق', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')
  const [activeTab, setActiveTab] = useState('list')
  const [rejectModal, setRejectModal] = useState({ open: false, id: null })
  const [rejectReason, setRejectReason] = useState('')
  const [detailItem, setDetailItem] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', statusFilter, typeFilter],
    queryFn: () => approvalsAPI.getList({ status: statusFilter, type: typeFilter || undefined }).then(r => r.data?.data || []),
    enabled: activeTab === 'list',
  })
  const { data: myRequests } = useQuery({
    queryKey: ['approvals-my-requests'],
    queryFn: () => approvalsAPI.getMyRequests().then(r => r.data?.data || []),
    enabled: activeTab === 'my-requests',
  })
  const { data: metaTypes } = useQuery({
    queryKey: ['approvals-meta-types'],
    queryFn: () => approvalsAPI.getMetaTypes().then(r => r.data?.data || []),
  })
  const types = Array.isArray(metaTypes) ? metaTypes : []

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => approvalsAPI.approve(id, { notes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['approvals'] }); toast.success('تمت الموافقة') },
    onError: (e) => toast.error(e.response?.data?.message || 'فشل'),
  })
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => approvalsAPI.reject(id, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['approvals'] }); setRejectModal({ open: false, id: null }); setRejectReason(''); toast.success('تم الرفض') },
    onError: (e) => toast.error(e.response?.data?.message || 'فشل'),
  })

  const approvals = Array.isArray(data) ? data : []
  const myList = Array.isArray(myRequests) ? myRequests : []
  const currentList = activeTab === 'my-requests' ? myList : approvals

  // Stats
  const pendingCount = approvals.filter(a => a.status === 'pending').length
  const approvedCount = approvals.filter(a => a.status === 'approved').length
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length

  return (
    <PageShell title="الموافقات" description="طلبات الموافقة المعلقة والمكتملة">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="إجمالي الطلبات" value={approvals.length} icon={FileCheck} color="sky" />
        <StatCard label="معلقة" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="موافق عليها" value={approvedCount} icon={CheckCircle} color="emerald" />
        <StatCard label="مرفوضة" value={rejectedCount} icon={XCircle} color="red" />
      </div>

      {/* Tabs + Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 mb-5">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setActiveTab('list')}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'list' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200')}>
            قائمة الموافقات
          </button>
          <button onClick={() => setActiveTab('my-requests')}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'my-requests' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200')}>
            طلباتي
          </button>
          {activeTab === 'list' && (
            <>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm mr-auto">
                <option value="pending">معلقة</option>
                <option value="all">الكل</option>
                <option value="approved">موافق عليها</option>
                <option value="rejected">مرفوضة</option>
              </select>
              {types.length > 0 && (
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-sm">
                  <option value="">كل الأنواع</option>
                  {types.map(t => <option key={t.id || t.type} value={t.type || t.id}>{t.label || t.type}</option>)}
                </select>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : currentList.length === 0 ? (
        <EmptyState icon={Inbox} title="لا توجد طلبات" message={activeTab === 'my-requests' ? 'طلباتك ستظهر هنا.' : statusFilter === 'pending' ? 'لا توجد طلبات معلقة حالياً.' : 'لا توجد نتائج.'} />
      ) : (
        <div className="space-y-3">
          {currentList.map((item) => {
            const sc = statusConfig[item.status] || statusConfig.pending
            const StatusIcon = sc.icon
            return (
              <div key={item.id}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-sm font-bold text-primary-600">{item.approval_number || item.id?.slice(0, 8)}</p>
                        {item.type && <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">{item.type}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-neutral-400">
                        {item.requester_name && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{item.requester_name}</span>}
                        {item.entity_type && <span>{item.entity_type}</span>}
                        {item.created_at && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{new Date(item.created_at).toLocaleDateString('ar-IQ')}</span>}
                      </div>
                      {item.request_reason && <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{item.request_reason}</p>}
                    </div>
                  </div>
                  <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap', sc.color)}>
                    <StatusIcon className="w-3 h-3" /> {sc.label}
                  </span>
                </div>
                {item.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                    <Button size="sm" onClick={() => approveMutation.mutate({ id: item.id })} disabled={approveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                      {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 ml-1" />} موافقة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectModal({ open: true, id: item.id })}
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs">
                      <XCircle className="w-3 h-3 ml-1" /> رفض
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={rejectModal.open} onClose={() => setRejectModal({ open: false, id: null })} title="سبب الرفض">
        <div className="space-y-4">
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="سبب الرفض (مطلوب)"
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 min-h-[80px]" required />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, id: null })}>إلغاء</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => rejectModal.id && rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })} disabled={!rejectReason.trim()}>رفض</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}

// ═══ STAT CARD ═══
function StatCard({ label, value, icon: Icon, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
  }
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
      <div className="flex items-center gap-2.5">
        <div className={clsx('p-2 rounded-lg', colors[color])}><Icon className="w-4 h-4" /></div>
        <div>
          <p className="text-[10px] text-neutral-400">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}
