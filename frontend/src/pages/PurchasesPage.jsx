/**
 * BI Management - Purchases Page
 * قائمة فواتير الشراء
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Plus, Search, Eye, Package, Building2 } from 'lucide-react'
import PageLayout from '../components/common/PageLayout'
import DataTable from '../components/common/DataTable'
import Button from '../components/common/Button'
import { salesAPI } from '../services/api'

const statusLabels = {
  draft: 'مسودة',
  confirmed: 'مؤكدة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

export default function PurchasesPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', 'purchase', searchTerm, statusFilter],
    queryFn: () =>
      salesAPI.getInvoices({
        type: 'purchase',
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  })

  const raw = data?.data?.data || data?.data || {}
  const invoices = raw.invoices || raw || []
  const pagination = raw.pagination

  const columns = [
    { key: 'invoice_number', label: 'رقم الفاتورة', render: (r) => <span className="font-mono font-medium text-primary-600">{r.invoice_number}</span> },
    { key: 'supplier_name', label: 'المورد', render: (r) => r.supplier_name || '—' },
    { key: 'total', label: 'المبلغ', render: (r) => `${(r.total || 0).toLocaleString('ar-IQ')} د.ع` },
    { key: 'status', label: 'الحالة', render: (r) => statusLabels[r.status] || r.status },
    { key: 'created_at', label: 'التاريخ', render: (r) => new Date(r.created_at).toLocaleDateString('ar-IQ') },
  ]

  return (
    <PageLayout
      title="فواتير الشراء"
      description="عرض وإدارة فواتير الشراء من الموردين"
      actions={
        <Button onClick={() => navigate('/purchases/new')}>
          <Plus className="w-4 h-4 ml-2" />
          فاتورة شراء جديدة
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم الفاتورة أو المورد..."
              className="w-full pr-10 pl-4 py-2 border border-surface-300 dark:border-surface-600 rounded-input bg-white dark:bg-surface-800"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-input bg-white dark:bg-surface-800"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <DataTable
          columns={columns}
          data={invoices}
          loading={isLoading}
          emptyTitle="لا توجد فواتير شراء"
          emptyDescription="أضف فاتورة شراء جديدة من الموردين"
          emptyActionLabel="فاتورة شراء جديدة"
          onEmptyAction={() => navigate('/purchases/new')}
          onRowClick={(row) => navigate(`/sales?invoice=${row.id}`)}
          pagination={
            pagination?.total > (pagination?.limit || 50)
              ? {
                  page: pagination.page || 1,
                  perPage: pagination.limit || 50,
                  total: pagination.total || 0,
                  onPageChange: () => {},
                }
              : undefined
          }
        />
      </div>
    </PageLayout>
  )
}
