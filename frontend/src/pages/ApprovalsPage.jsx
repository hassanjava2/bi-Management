/**
 * BI Management - Approvals Page
 * صفحة طلبات الموافقة
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileCheck, CheckCircle, XCircle, Filter } from 'lucide-react'
import PageLayout from '../components/common/PageLayout'
import DataTable from '../components/common/DataTable'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { approvalsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

export default function ApprovalsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')
  const [activeTab, setActiveTab] = useState('list') // list | my-requests
  const [rejectModal, setRejectModal] = useState({ open: false, id: null })
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', statusFilter, typeFilter],
    queryFn: () => approvalsAPI.getList({ status: statusFilter, type: typeFilter || undefined }).then((r) => r.data?.data || []),
    enabled: activeTab === 'list',
  })
  const { data: myRequests } = useQuery({
    queryKey: ['approvals-my-requests'],
    queryFn: () => approvalsAPI.getMyRequests().then((r) => r.data?.data || []),
    enabled: activeTab === 'my-requests',
  })
  const { data: metaTypes } = useQuery({
    queryKey: ['approvals-meta-types'],
    queryFn: () => approvalsAPI.getMetaTypes().then((r) => r.data?.data || []),
  })
  const types = Array.isArray(metaTypes) ? metaTypes : []

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => approvalsAPI.approve(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      toast.success('تمت الموافقة')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'فشل'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => approvalsAPI.reject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      setRejectModal({ open: false, id: null })
      setRejectReason('')
      toast.success('تم الرفض')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'فشل'),
  })

  const approvals = Array.isArray(data) ? data : []

  const columns = [
    { key: 'approval_number', label: 'رقم الطلب', render: (r) => r.approval_number || r.id?.slice(0, 8) },
    { key: 'type', label: 'النوع' },
    { key: 'entity_type', label: 'الجهة' },
    { key: 'requester_name', label: 'مقدم الطلب', render: (r) => r.requester_name || '—' },
    { key: 'request_reason', label: 'السبب', render: (r) => (r.request_reason || '').slice(0, 40) },
    { key: 'status', label: 'الحالة', render: (r) => (r.status === 'pending' ? 'معلق' : r.status === 'approved' ? 'موافق' : 'مرفوض') },
    {
      key: 'actions',
      label: 'إجراء',
      render: (r) =>
        r.status === 'pending' ? (
          <div className="flex gap-1">
            <Button size="sm" variant="success" onClick={() => approveMutation.mutate({ id: r.id })} disabled={approveMutation.isPending}>
              <CheckCircle className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="danger" onClick={() => setRejectModal({ open: true, id: r.id })}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        ) : '—',
    },
  ]

  const myRequestsList = Array.isArray(myRequests) ? myRequests : []

  return (
    <PageLayout
      title="الموافقات"
      description="طلبات الموافقة المعلقة والمكتملة"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'list' ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-700'}`}
          >
            قائمة الموافقات
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'my-requests' ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-700'}`}
          >
            طلباتي
          </button>
          {activeTab === 'list' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-input bg-white dark:bg-surface-800"
              >
                <option value="pending">معلقة</option>
                <option value="all">الكل</option>
                <option value="approved">موافق عليها</option>
                <option value="rejected">مرفوضة</option>
              </select>
              {types.length > 0 && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-input bg-white dark:bg-surface-800"
                >
                  <option value="">كل الأنواع</option>
                  {types.map((t) => (
                    <option key={t.id || t.type} value={t.type || t.id}>{t.label || t.type}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
        {activeTab === 'my-requests' ? (
          <DataTable
            columns={columns}
            data={myRequestsList}
            loading={false}
            emptyTitle="لا توجد طلبات"
            emptyDescription="طلباتك ستظهر هنا."
          />
        ) : (
        <DataTable
          columns={columns}
          data={approvals}
          loading={isLoading}
          emptyTitle="لا توجد طلبات موافقة"
          emptyDescription={statusFilter === 'pending' ? 'لا توجد طلبات معلقة حالياً.' : 'لا توجد نتائج.'}
        />
        )}
      </div>

      <Modal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null })}
        title="سبب الرفض"
      >
        <div className="space-y-4">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="سبب الرفض (مطلوب)"
            className="w-full px-3 py-2 border rounded-input min-h-[80px]"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectModal({ open: false, id: null })}>إلغاء</Button>
            <Button variant="danger" onClick={() => rejectModal.id && rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })} disabled={!rejectReason.trim()}>
              رفض
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}
