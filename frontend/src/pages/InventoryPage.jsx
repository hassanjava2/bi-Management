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
  ChevronDown, MoreVertical, Eye, Edit, Trash2
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
import StatsGrid from '../components/common/StatsGrid'
import { deviceStatuses, warehouses } from '../components/inventory/inventoryConstants'
import { AddDeviceForm, EditDeviceForm, TransferDeviceForm, DeleteDeviceConfirm, DeviceDetails } from '../components/inventory/InventoryForms'
import api from '../services/api'
import { inventoryAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'

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
  const [viewMode, setViewMode] = useState('table')
  const queryClient = useQueryClient()

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

  const inventoryStatsItems = [
    { title: 'إجمالي الأجهزة', value: stats.total ?? 0, icon: Boxes, color: 'primary' },
    { title: 'جاهز للبيع', value: stats.ready_to_sell ?? 0, icon: CheckCircle2, color: 'success' },
    { title: 'بالصيانة', value: stats.in_repair ?? 0, icon: AlertTriangle, color: 'warning' },
    { title: 'تنبيه نقص', value: stats.low_stock ?? 0, icon: AlertTriangle, color: 'danger' },
  ]
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
    { key: 'actions', label: 'إجراءات', render: (d) => (
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => handleViewDevice(d)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="عرض"><Eye className="w-4 h-4 text-neutral-500" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); handleEditDevice(d); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="تعديل"><Edit className="w-4 h-4 text-neutral-500" /></button>
        <button type="button" onClick={() => handleViewDevice(d)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700" title="السجل"><History className="w-4 h-4 text-neutral-500" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteDevice(d); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" title="حذف"><Trash2 className="w-4 h-4" /></button>
      </div>
    ), className: 'max-w-[1%]' },
  ]

  return (
    <PageShell
      title="إدارة المخزون"
      description="تتبع الأجهزة والسيريالات والمواقع"
      actions={
        <>
          <Button variant="outline" onClick={() => {}}><Upload className="w-4 h-4 ml-2" /> استيراد</Button>
          <Button variant="outline" onClick={() => exportToCSV(devices, 'inventory-devices.csv')}><Download className="w-4 h-4 ml-2" /> تصدير CSV</Button>
          {tab === 'devices' && <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 ml-2" /> إضافة جهاز</Button>}
        </>
      }
    >
      <Tabs tabs={INVENTORY_TABS} activeId={tab} onChange={setTab} />

      {tab === 'devices' && (
        <>
          <StatsGrid items={inventoryStatsItems} columns={4} />
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
      {tab === 'count' && (
        <div className="bg-white dark:bg-neutral-800 rounded-card border border-neutral-200 dark:border-neutral-700 p-8">
          <EmptyState title="الجرد" description="هذا القسم قيد التطوير قريبا." />
        </div>
      )}

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
    </PageShell>
  )
}

function InventoryProductsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => api.get('/inventory').then((r) => r.data),
  })
  const products = data?.data || []
  const columns = [
    { key: 'name', label: 'المنتج' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'min_quantity', label: 'الحد الأدنى' },
    { key: 'category_name', label: 'الفئة' },
  ]
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
      <DataTable columns={columns} data={products} loading={isLoading} emptyTitle="لا توجد منتجات" emptyDescription="أضف منتجات من إدارة المخزون." />
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
  const columns = [
    { key: 'product_name', label: 'المنتج', render: (r) => r.product_name || r.product_id || '\u2014' },
    { key: 'type', label: 'النوع' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'reason', label: 'السبب' },
    { key: 'created_at', label: 'التاريخ', render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString('ar-IQ') : '\u2014' },
  ]
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
      <DataTable columns={columns} data={movements} loading={isLoading} emptyTitle="لا توجد حركات" emptyDescription="حركات المخزون ستظهر هنا." />
    </div>
  )
}
