/**
 * Bi Management - Inventory Page
 * صفحة إدارة المخزون والأجهزة بالسيريالات
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package, Search, Plus, Filter, Download, Upload,
  QrCode, MapPin, AlertTriangle, CheckCircle2, Clock,
  Boxes, Warehouse as WarehouseIcon, ScanLine, History,
  ChevronDown, MoreVertical, Eye, Edit, Trash2,
  ClipboardCheck, UserCheck
} from 'lucide-react'
import Spinner from '../components/common/Spinner'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import Tabs from '../components/common/Tabs'
import EmptyState from '../components/common/EmptyState'
import DataTable from '../components/common/DataTable'
import PageShell from '../components/common/PageShell'
import SearchInput from '../components/common/SearchInput'
import FilterSelect from '../components/common/FilterSelect'
import { clsx } from 'clsx'
import { deviceStatuses, warehouses } from '../components/inventory/inventoryConstants'
import { AddDeviceForm, EditDeviceForm, TransferDeviceForm, DeleteDeviceConfirm, DeviceDetails } from '../components/inventory/InventoryForms'
import InspectionForm from '../components/inventory/InspectionForm'
import api from '../services/api'
import { inventoryAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'
import { printSerialSticker } from '../components/print/SerialSticker'

const INVENTORY_TABS = [
  { id: 'devices', label: 'الأجهزة' },
  { id: 'products', label: 'المنتجات' },
  { id: 'movements', label: 'حركة المخزون' },
  { id: 'count', label: 'الجرد' },
]

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'devices'
  const setTab = (id) => setSearchParams({ tab: id })

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [deviceToEdit, setDeviceToEdit] = useState(null)
  const [deviceToDelete, setDeviceToDelete] = useState(null)
  const [deviceToTransfer, setDeviceToTransfer] = useState(null)
  const [showInspectModal, setShowInspectModal] = useState(false)
  const [deviceToInspect, setDeviceToInspect] = useState(null)
  const [viewMode, setViewMode] = useState('table')
  const queryClient = useQueryClient()

  // Custody mutation
  const custodyMutation = useMutation({
    mutationFn: ({ id, action, reason }) => inventoryAPI.updateCustody(id, { action, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  })

  // جلب بيانات المخزون
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', searchTerm, selectedWarehouse, selectedStatus],
    queryFn: () => inventoryAPI.getDevices({
      search: searchTerm,
      warehouse: selectedWarehouse,
      status: selectedStatus
    }),
  })

  // جلب إحصائيات المخزون
  const { data: statsData } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => inventoryAPI.getStats(),
  })

  const devices = inventoryData?.data?.data || []
  const stats = statsData?.data?.data || {
    total: 0,
    ready_to_sell: 0,
    in_repair: 0,
    low_stock: 0
  }

  const handleViewDevice = (device) => {
    setSelectedDevice(device)
    setShowDeviceModal(true)
  }

  const handleEditDevice = (device) => {
    setDeviceToEdit(device)
    setShowEditModal(true)
    setShowDeviceModal(false)
  }

  const handleDeleteDevice = (device) => {
    setDeviceToDelete(device)
    setShowDeleteConfirm(true)
    setShowDeviceModal(false)
  }

  const handleTransferDevice = (device) => {
    setDeviceToTransfer(device)
    setShowTransferModal(true)
    setShowDeviceModal(false)
  }

  const handleCloseEdit = () => { setShowEditModal(false); setDeviceToEdit(null) }
  const handleCloseDelete = () => { setShowDeleteConfirm(false); setDeviceToDelete(null) }
  const handleCloseTransfer = () => { setShowTransferModal(false); setDeviceToTransfer(null) }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: `${w.icon} ${w.name}` }))
  const statusOptions = Object.entries(deviceStatuses).map(([k, v]) => ({ value: k, label: v.label }))
  const deviceColumns = [
    { key: 'serial_number', label: 'السيريال', render: (d) => <span className="font-mono font-medium">{d.serial_number}</span> },
    { key: 'product_name', label: 'المنتج', render: (d) => <><p className="font-medium">{d.product_name || 'Dell Latitude'}</p><p className="text-sm text-neutral-500">{d.brand} {d.model}</p></> },
    { key: 'specs', label: 'المواصفات', render: (d) => `${d.processor || 'i7-11th'} | ${d.ram_size || '16'}GB | ${d.storage_size || '512'}GB` },
    { key: 'warehouse_id', label: 'المخزن', render: (d) => warehouses.find((w) => w.id === d.warehouse_id)?.name || 'المخزن الرئيسي' },
    { key: 'location', label: 'الموقع', render: (d) => <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{d.location_shelf || 'A'}-{d.location_row || '1'}</span> },
    { key: 'status', label: 'الحالة', render: (d) => { const s = deviceStatuses[d.status] || deviceStatuses.new; return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.color}`}><s.icon className="w-3 h-3" />{s.label}</span> } },
    { key: 'custody_employee', label: 'الذمة', render: (d) => d.custody_employee || '\u2014' },
    {
      key: 'actions', label: 'إجراءات', render: (d) => (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => handleViewDevice(d)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="عرض"><Eye className="w-4 h-4 text-neutral-500" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setDeviceToInspect(d); setShowInspectModal(true); }} className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600" title="فحص"><ClipboardCheck className="w-4 h-4" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); custodyMutation.mutate({ id: d.id, action: d.custody_employee_id ? 'release' : 'take', reason: 'manual' }); }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600" title={d.custody_employee_id ? 'تحرير ذمة' : 'استلام بذمة'}><UserCheck className="w-4 h-4" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); printSerialSticker(d); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="طباعة ستيكر"><QrCode className="w-4 h-4 text-neutral-500" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleEditDevice(d); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="تعديل"><Edit className="w-4 h-4 text-neutral-500" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteDevice(d); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" title="حذف"><Trash2 className="w-4 h-4" /></button>
        </div>
      ), className: 'max-w-[1%]'
    },
  ]

  return (
    <PageShell
      title="إدارة المخزون"
      description="تتبع الأجهزة والسيريالات والمواقع"
      actions={
        <>
          <Button variant="outline" onClick={() => { }}><Upload className="w-4 h-4 ml-2" /> استيراد</Button>
          <Button variant="outline" onClick={() => exportToCSV(devices, 'inventory-devices.csv')}><Download className="w-4 h-4 ml-2" /> تصدير CSV</Button>
          {tab === 'devices' && <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 ml-2" /> إضافة جهاز</Button>}
        </>
      }
    >
      <Tabs tabs={INVENTORY_TABS} activeId={tab} onChange={setTab} />

      {tab === 'devices' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InvStatCard label="إجمالي الأجهزة" value={stats.total ?? 0} icon={Boxes} color="sky" />
            <InvStatCard label="جاهز للبيع" value={stats.ready_to_sell ?? 0} icon={CheckCircle2} color="emerald" />
            <InvStatCard label="بالصيانة" value={stats.in_repair ?? 0} icon={AlertTriangle} color="amber" />
            <InvStatCard label="تنبيه نقص" value={stats.low_stock ?? 0} icon={AlertTriangle} color="red" />
          </div>
          <PageShell.Toolbar>
            <SearchInput placeholder="بحث بالسيريال، الاسم، أو الموديل..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <FilterSelect options={warehouseOptions} value={selectedWarehouse === 'all' ? null : selectedWarehouse} onChange={(v) => setSelectedWarehouse(v ?? 'all')} placeholder="كل المخازن" />
            <FilterSelect options={statusOptions} value={selectedStatus === 'all' ? null : selectedStatus} onChange={(v) => setSelectedStatus(v ?? 'all')} placeholder="كل الحالات" />
            <div className="flex border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
              {['table', 'cards', 'warehouse'].map((mode) => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)} className={`px-3 py-2 ${viewMode === mode ? 'bg-primary-600 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`} title={mode === 'table' ? 'جدول' : mode === 'cards' ? 'بطاقات' : 'مخازن'}>
                  {mode === 'table' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
                  {mode === 'cards' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                  {mode === 'warehouse' && <WarehouseIcon className="w-5 h-5" />}
                </button>
              ))}
            </div>
            <Button variant="outline"><ScanLine className="w-4 h-4 ml-2" /> مسح باركود</Button>
          </PageShell.Toolbar>
          {viewMode === 'table' && (
            <PageShell.Content>
              <DataTable columns={deviceColumns} data={devices} loading={isLoading} onRowClick={(row) => handleViewDevice(row)} emptyTitle="لا توجد أجهزة مطابقة للبحث" />
            </PageShell.Content>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {devices.map((device) => {
                const status = deviceStatuses[device.status] || deviceStatuses.new
                return (
                  <div
                    key={device.id}
                    className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleViewDevice(device)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <status.icon className="w-3 h-3" />
                        {status.label}
                      </span>
                      <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded">
                        <MoreVertical className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>
                    <div className="mb-3">
                      <p className="font-mono text-sm text-primary-600 dark:text-primary-400">{device.serial_number}</p>
                      <p className="font-medium text-neutral-900 dark:text-white mt-1">{device.product_name || 'Dell Latitude 7410'}</p>
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <p>{device.processor || 'i7-11th'}</p>
                      <p>{device.ram_size || '16'}GB RAM | {device.storage_size || '512'}GB SSD</p>
                      <p>{warehouses.find(w => w.id === device.warehouse_id)?.icon || ''} {device.location_shelf || 'A'}-{device.location_row || '1'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Warehouse View */}
          {viewMode === 'warehouse' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => {
                const warehouseDevices = devices.filter(d => d.warehouse_id === warehouse.id)
                return (
                  <div
                    key={warehouse.id}
                    className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">{warehouse.icon}</span>
                        {warehouse.name}
                      </h3>
                      <span className="bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded-full text-sm font-medium">
                        {warehouseDevices.length}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {warehouseDevices.slice(0, 5).map((device) => {
                        const status = deviceStatuses[device.status] || deviceStatuses.new
                        return (
                          <div
                            key={device.id}
                            className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            onClick={() => handleViewDevice(device)}
                          >
                            <span className="font-mono text-primary-600 dark:text-primary-400">{device.serial_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>{status.label}</span>
                          </div>
                        )
                      })}
                      {warehouseDevices.length > 5 && (
                        <button className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:underline">
                          عرض الكل ({warehouseDevices.length})
                        </button>
                      )}
                      {warehouseDevices.length === 0 && (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">لا توجد أجهزة</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </>
      )}

      {tab === 'products' && <InventoryProductsTab />}
      {tab === 'movements' && <InventoryMovementsTab />}
      {tab === 'count' && <StockCountTab />}

      {/* Add Device Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة جهاز جديد" size="lg">
        <AddDeviceForm onClose={() => setShowAddModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setShowAddModal(false) }} />
      </Modal>

      {/* Device Details Modal */}
      <Modal isOpen={showDeviceModal} onClose={() => setShowDeviceModal(false)} title={`تفاصيل الجهاز: ${selectedDevice?.serial_number || ''}`} size="xl">
        {selectedDevice && (
          <DeviceDetails device={selectedDevice} onEdit={() => handleEditDevice(selectedDevice)} onDelete={() => handleDeleteDevice(selectedDevice)} onTransfer={() => handleTransferDevice(selectedDevice)} onClose={() => setShowDeviceModal(false)} />
        )}
      </Modal>

      {/* Edit Device Modal */}
      <Modal isOpen={showEditModal} onClose={handleCloseEdit} title="تعديل الجهاز" size="md">
        {deviceToEdit && <EditDeviceForm device={deviceToEdit} onClose={handleCloseEdit} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); handleCloseEdit() }} />}
      </Modal>

      {/* Delete Device Confirm */}
      <Modal isOpen={showDeleteConfirm} onClose={handleCloseDelete} title="تأكيد حذف الجهاز">
        {deviceToDelete && <DeleteDeviceConfirm device={deviceToDelete} onClose={handleCloseDelete} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); handleCloseDelete() }} />}
      </Modal>

      {/* Transfer Device Modal */}
      <Modal isOpen={showTransferModal} onClose={handleCloseTransfer} title="نقل جهاز" size="md">
        {deviceToTransfer && <TransferDeviceForm device={deviceToTransfer} onClose={handleCloseTransfer} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); handleCloseTransfer() }} />}
      </Modal>

      <Modal isOpen={showInspectModal} onClose={() => { setShowInspectModal(false); setDeviceToInspect(null) }} title="فحص الجهاز" size="lg">
        {deviceToInspect && <InspectionForm device={deviceToInspect} onClose={() => { setShowInspectModal(false); setDeviceToInspect(null) }} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })} />}
      </Modal>
    </PageShell>
  )
}

function InventoryProductsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => api.get('/inventory').then((r) => r.data),
  })
  const products = data?.data || []

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (products.length === 0) return <EmptyState icon={Package} title="لا توجد منتجات" description="أضف منتجات من إدارة المخزون." />

  return (
    <div className="space-y-2">
      {products.map((p, i) => {
        const isLow = p.quantity != null && p.min_quantity != null && p.quantity <= p.min_quantity
        return (
          <div key={p.id || i} className={clsx(
            'bg-white dark:bg-neutral-800 rounded-xl border p-4 hover:shadow-md transition-shadow',
            isLow ? 'border-red-200 dark:border-red-800' : 'border-neutral-200 dark:border-neutral-700'
          )}>
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                isLow ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
              )}>
                <Package className={clsx('w-5 h-5', isLow ? 'text-red-600' : 'text-primary-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-neutral-400">{p.category_name || 'عام'}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-center">
                  <p className="text-[10px] text-neutral-400">الكمية</p>
                  <p className={clsx('text-sm font-bold', isLow ? 'text-red-600' : '')}>{p.quantity ?? 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-neutral-400">الحد الأدنى</p>
                  <p className="text-sm font-bold text-neutral-500">{p.min_quantity ?? 0}</p>
                </div>
                {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InventoryMovementsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: async () => {
      const r = await inventoryAPI.getMovements()
      return r.data?.data || []
    },
  })
  const movements = Array.isArray(data) ? data : []
  const typeColors = { in: 'bg-emerald-100 text-emerald-700', out: 'bg-red-100 text-red-700', transfer: 'bg-blue-100 text-blue-700', adjustment: 'bg-amber-100 text-amber-700' }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (movements.length === 0) return <EmptyState icon={History} title="لا توجد حركات" description="حركات المخزون ستظهر هنا." />

  return (
    <div className="space-y-2">
      {movements.map((m, i) => (
        <div key={m.id || i} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{m.product_name || m.product_id || '—'}</p>
              <p className="text-xs text-neutral-400">{m.reason || '—'} • {m.created_at ? new Date(m.created_at).toLocaleDateString('ar-IQ') : '—'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-bold">{m.quantity}</span>
              <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', typeColors[m.type] || 'bg-neutral-100 text-neutral-600')}>{m.type}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StockCountTab() {
  const queryClient = useQueryClient()
  const [selectedCountId, setSelectedCountId] = useState(null)
  const [showNewCount, setShowNewCount] = useState(false)
  const [newCountWarehouse, setNewCountWarehouse] = useState('main')
  const [newCountNotes, setNewCountNotes] = useState('')

  const { data: countsData, isLoading } = useQuery({
    queryKey: ['stock-counts'],
    queryFn: () => api.get('/inventory/stock-counts').then(r => r.data),
  })
  const counts = countsData?.data || []

  const { data: countDetail } = useQuery({
    queryKey: ['stock-count', selectedCountId],
    queryFn: () => api.get(`/inventory/stock-counts/${selectedCountId}`).then(r => r.data),
    enabled: !!selectedCountId,
  })
  const detail = countDetail?.data

  const startMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/stock-counts', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] })
      setSelectedCountId(res.data?.data?.id)
      setShowNewCount(false)
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ countId, itemId, actual_quantity }) =>
      api.put(`/inventory/stock-counts/${countId}/items/${itemId}`, { actual_quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-count', selectedCountId] }),
  })

  const completeMutation = useMutation({
    mutationFn: (id) => api.put(`/inventory/stock-counts/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setSelectedCountId(null)
    },
  })

  // Detail view
  if (selectedCountId && detail) {
    const items = detail.items || []
    const counted = items.filter(i => i.actual_quantity !== null).length
    const total = items.length
    const pct = total > 0 ? Math.round((counted / total) * 100) : 0
    const discrepancies = items.filter(i => i.actual_quantity !== null && i.actual_quantity !== i.expected_quantity)

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div>
            <button onClick={() => setSelectedCountId(null)} className="text-sm text-primary-600 hover:underline mb-2 flex items-center gap-1">
              &#8594; العودة للقائمة
            </button>
            <h3 className="text-lg font-bold">
              جلسة جرد &mdash; {warehouses.find(w => w.id === detail.warehouse_id)?.name || 'المخزن الرئيسي'}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              {detail.created_at ? new Date(detail.created_at).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              {detail.status === 'completed' && <span className="mr-2 text-emerald-600 font-bold">&#10003; مكتمل</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-primary-600">{pct}%</p>
              <p className="text-xs text-neutral-500">{counted}/{total} منتج</p>
            </div>
            {detail.status !== 'completed' && counted > 0 && (
              <Button onClick={() => completeMutation.mutate(selectedCountId)} disabled={completeMutation.isPending}>
                <CheckCircle2 className="w-4 h-4 ml-2" />
                إكمال الجرد
              </Button>
            )}
          </div>
        </div>

        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
          <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
        </div>

        {discrepancies.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <b>{discrepancies.length}</b> منتج بفروقات &mdash; سيتم تحديث الكميات عند إكمال الجرد
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/80">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400 w-10">#</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400">المنتج</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400 w-24">المتوقع</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400 w-28">الفعلي</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-400 w-20">الفرق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
              {items.map((item, idx) => {
                const diff = item.actual_quantity !== null ? item.actual_quantity - item.expected_quantity : null
                const isDone = item.actual_quantity !== null
                return (
                  <tr key={item.id} className={`${isDone ? (diff === 0 ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-red-50/30 dark:bg-red-900/10') : ''} hover:bg-neutral-50/50 dark:hover:bg-neutral-700/20`}>
                    <td className="px-4 py-2.5 text-center text-neutral-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.product_name || '\u2014'}</p>
                      {item.barcode && <p className="text-[10px] font-mono text-neutral-400">{item.barcode}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">{item.expected_quantity}</td>
                    <td className="px-4 py-2.5">
                      {detail.status === 'completed' ? (
                        <span className="text-center block font-bold">{item.actual_quantity ?? '\u2014'}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          defaultValue={item.actual_quantity ?? ''}
                          placeholder="\u2014"
                          onBlur={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val)) {
                              updateItemMutation.mutate({ countId: selectedCountId, itemId: item.id, actual_quantity: val })
                            }
                          }}
                          className="w-full px-2 py-1.5 text-center text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 font-mono font-bold focus:ring-2 focus:ring-primary-500"
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {diff !== null ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${diff === 0 ? 'bg-emerald-100 text-emerald-700' : diff > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {diff === 0 ? '\u2713' : diff > 0 ? `+${diff}` : diff}
                        </span>
                      ) : (
                        <span className="text-neutral-300">{'\u2014'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">جلسات الجرد</h3>
        <Button onClick={() => setShowNewCount(true)}>
          <Plus className="w-4 h-4 ml-2" /> بدء جرد جديد
        </Button>
      </div>

      {showNewCount && (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
          <h4 className="font-semibold">بدء جلسة جرد جديدة</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">المخزن</label>
              <select
                value={newCountWarehouse}
                onChange={(e) => setNewCountWarehouse(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
              >
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">ملاحظات</label>
              <input type="text" value={newCountNotes} onChange={(e) => setNewCountNotes(e.target.value)}
                placeholder="ملاحظات اختيارية..."
                className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => startMutation.mutate({ warehouse_id: newCountWarehouse, notes: newCountNotes })} disabled={startMutation.isPending}>
              {startMutation.isPending ? 'جاري...' : 'بدء الجرد'}
            </Button>
            <Button variant="outline" onClick={() => setShowNewCount(false)}>إلغاء</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="md" /></div>
      ) : counts.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8">
          <EmptyState title="لا توجد جلسات جرد" description="ابدأ جلسة جرد جديدة لمطابقة المخزون الفعلي مع النظام" />
        </div>
      ) : (
        <div className="space-y-3">
          {counts.map((c) => {
            const pct = c.item_count > 0 ? Math.round((c.counted_items / c.item_count) * 100) : 0
            return (
              <div key={c.id} onClick={() => setSelectedCountId(c.id)}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-primary-500" />
                      جرد &mdash; {warehouses.find(w => w.id === c.warehouse_id)?.name || 'غير محدد'}
                      {c.status === 'completed' && <span className="text-emerald-600 text-xs">&#10003; مكتمل</span>}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                      {c.created_by_name && ` \u2014 ${c.created_by_name}`}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-primary-600">{pct}%</p>
                    <p className="text-[10px] text-neutral-400">{c.counted_items}/{c.item_count}</p>
                  </div>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                  <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══ STAT CARD ═══
function InvStatCard({ label, value, icon: Icon, color = 'sky' }) {
  const colors = {
    sky: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
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
