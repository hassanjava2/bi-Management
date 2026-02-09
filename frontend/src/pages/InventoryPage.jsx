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
import api from '../services/api'
import { inventoryAPI, suppliersAPI } from '../services/api'
import { exportToCSV } from '../utils/helpers'

// حالات الأجهزة
const deviceStatuses = {
  new: { label: 'جديد', color: 'bg-blue-100 text-blue-800', icon: Package },
  inspecting: { label: 'قيد الفحص', color: 'bg-yellow-100 text-yellow-800', icon: Search },
  ready_for_prep: { label: 'جاهز للتجهيز', color: 'bg-indigo-100 text-indigo-800', icon: Clock },
  preparing: { label: 'قيد التجهيز', color: 'bg-purple-100 text-purple-800', icon: Clock },
  ready_to_sell: { label: 'جاهز للبيع', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  reserved: { label: 'محجوز', color: 'bg-orange-100 text-orange-800', icon: Clock },
  sold: { label: 'مباع', color: 'bg-surface-100 text-surface-800', icon: CheckCircle2 },
  returned: { label: 'مرتجع', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  in_repair: { label: 'بالصيانة', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  scrapped: { label: 'تالف', color: 'bg-red-200 text-red-900', icon: Trash2 },
}

// المخازن
const warehouses = [
  { id: 'main', name: 'المخزن الرئيسي', icon: '🏪' },
  { id: 'inspection', name: 'مخزن الفحص', icon: '🔍' },
  { id: 'preparation', name: 'مخزن التجهيز', icon: '⚙️' },
  { id: 'repair', name: 'مخزن الصيانة', icon: '🔧' },
  { id: 'returns', name: 'مخزن المرتجعات', icon: '📦' },
  { id: 'defective', name: 'مخزن التالف', icon: '⚠️' },
  { id: 'accessories', name: 'مخزن الإكسسوارات', icon: '🎧' },
]

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-primary-600" />
            إدارة المخزون
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            تتبع الأجهزة والسيريالات والمواقع
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {}}>
            <Upload className="w-4 h-4 ml-2" />
            استيراد
          </Button>
          <Button variant="outline" onClick={() => exportToCSV(devices, 'inventory-devices.csv')}>
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          {tab === 'devices' && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة جهاز
            </Button>
          )}
        </div>
      </div>

      <Tabs tabs={INVENTORY_TABS} activeId={tab} onChange={setTab} />

      {tab === 'devices' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">إجمالي الأجهزة</p>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Boxes className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">جاهز للبيع</p>
              <p className="text-2xl font-bold text-green-600">{stats.ready_to_sell || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">بالصيانة</p>
              <p className="text-2xl font-bold text-amber-600">{stats.in_repair || 0}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500 dark:text-surface-400">تنبيه نقص</p>
              <p className="text-2xl font-bold text-red-600">{stats.low_stock || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالسيريال، الاسم، أو الموديل..."
              className="w-full pr-10 pl-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          {/* Warehouse Filter */}
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white"
          >
            <option value="all">كل المخازن</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(deviceStatuses).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          {/* View Mode */}
          <div className="flex border border-surface-300 dark:border-surface-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('warehouse')}
              className={`px-3 py-2 ${viewMode === 'warehouse' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300'}`}
            >
              <WarehouseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Scan Button */}
          <Button variant="outline">
            <ScanLine className="w-4 h-4 ml-2" />
            مسح باركود
          </Button>
        </div>
      </div>

      {/* Devices Table */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 dark:bg-surface-700/50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">السيريال</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">المنتج</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">المواصفات</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">المخزن</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">الموقع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">الذمة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-surface-500 dark:text-surface-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-surface-500 dark:text-surface-400">
                      لا توجد أجهزة مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => {
                    const status = deviceStatuses[device.status] || deviceStatuses.new
                    return (
                      <tr key={device.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-surface-400" />
                            <span className="font-mono text-sm font-medium text-surface-900 dark:text-white">
                              {device.serial_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-surface-900 dark:text-white">{device.product_name || 'Dell Latitude'}</p>
                            <p className="text-sm text-surface-500">{device.brand} {device.model}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-300">
                          {device.processor || 'i7-11th'} | {device.ram_size || '16'}GB | {device.storage_size || '512'}GB
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-300">
                          {warehouses.find(w => w.id === device.warehouse_id)?.name || 'المخزن الرئيسي'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-surface-600 dark:text-surface-300">
                            <MapPin className="w-3 h-3" />
                            {device.location_shelf || 'A'}-{device.location_row || '1'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-600 dark:text-surface-300">
                          {device.custody_employee || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDevice(device)}
                              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                              title="عرض"
                            >
                              <Eye className="w-4 h-4 text-surface-500" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditDevice(device); }}
                              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4 text-surface-500" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewDevice(device); }}
                              className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
                              title="السجل"
                            >
                              <History className="w-4 h-4 text-surface-500" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device); }}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device) => {
            const status = deviceStatuses[device.status] || deviceStatuses.new
            return (
              <div 
                key={device.id}
                className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewDevice(device)}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    <status.icon className="w-3 h-3" />
                    {status.label}
                  </span>
                  <button className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded">
                    <MoreVertical className="w-4 h-4 text-surface-400" />
                  </button>
                </div>
                <div className="mb-3">
                  <p className="font-mono text-sm text-primary-600 dark:text-primary-400">{device.serial_number}</p>
                  <p className="font-medium text-surface-900 dark:text-white mt-1">{device.product_name || 'Dell Latitude 7410'}</p>
                </div>
                <div className="text-sm text-surface-600 dark:text-surface-400 space-y-1">
                  <p>🖥️ {device.processor || 'i7-11th'}</p>
                  <p>💾 {device.ram_size || '16'}GB RAM | {device.storage_size || '512'}GB SSD</p>
                  <p>📍 {warehouses.find(w => w.id === device.warehouse_id)?.icon || '🏪'} {device.location_shelf || 'A'}-{device.location_row || '1'}</p>
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
                className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">{warehouse.icon}</span>
                    {warehouse.name}
                  </h3>
                  <span className="bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 px-2 py-1 rounded-full text-sm font-medium">
                    {warehouseDevices.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {warehouseDevices.slice(0, 5).map((device) => {
                    const status = deviceStatuses[device.status] || deviceStatuses.new
                    return (
                      <div 
                        key={device.id}
                        className="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-700/50 rounded-lg text-sm cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700"
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
                    <p className="text-center text-surface-500 dark:text-surface-400 py-4">لا توجد أجهزة</p>
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
        <div className="bg-white dark:bg-surface-800 rounded-card border border-surface-200 dark:border-surface-700 p-8">
          <EmptyState title="الجرد" description="هذا القسم قيد التطوير قريباً." />
        </div>
      )}

      {/* Add Device Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="إضافة جهاز جديد"
        size="lg"
      >
        <AddDeviceForm onClose={() => setShowAddModal(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setShowAddModal(false) }} />
      </Modal>

      {/* Device Details Modal */}
      <Modal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        title={`تفاصيل الجهاز: ${selectedDevice?.serial_number || ''}`}
        size="xl"
      >
        {selectedDevice && (
          <DeviceDetails
            device={selectedDevice}
            onEdit={() => handleEditDevice(selectedDevice)}
            onDelete={() => handleDeleteDevice(selectedDevice)}
            onTransfer={() => handleTransferDevice(selectedDevice)}
            onClose={() => setShowDeviceModal(false)}
          />
        )}
      </Modal>

      {/* Edit Device Modal */}
      <Modal isOpen={showEditModal} onClose={handleCloseEdit} title="تعديل الجهاز" size="md">
        {deviceToEdit && (
          <EditDeviceForm
            device={deviceToEdit}
            onClose={handleCloseEdit}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['inventory'] })
              handleCloseEdit()
            }}
          />
        )}
      </Modal>

      {/* Delete Device Confirm */}
      <Modal isOpen={showDeleteConfirm} onClose={handleCloseDelete} title="تأكيد حذف الجهاز">
        {deviceToDelete && (
          <DeleteDeviceConfirm
            device={deviceToDelete}
            onClose={handleCloseDelete}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['inventory'] })
              handleCloseDelete()
            }}
          />
        )}
      </Modal>

      {/* Transfer Device Modal */}
      <Modal isOpen={showTransferModal} onClose={handleCloseTransfer} title="نقل جهاز" size="md">
        {deviceToTransfer && (
          <TransferDeviceForm
            device={deviceToTransfer}
            onClose={handleCloseTransfer}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['inventory'] })
              handleCloseTransfer()
            }}
          />
        )}
      </Modal>
    </div>
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
    <div className="bg-white dark:bg-surface-800 rounded-card border border-surface-200 dark:border-surface-700 overflow-hidden">
      <DataTable
        columns={columns}
        data={products}
        loading={isLoading}
        emptyTitle="لا توجد منتجات"
        emptyDescription="أضف منتجات من إدارة المخزون."
      />
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
    { key: 'product_name', label: 'المنتج', render: (r) => r.product_name || r.product_id || '—' },
    { key: 'type', label: 'النوع' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'reason', label: 'السبب' },
    { key: 'created_at', label: 'التاريخ', render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString('ar-IQ') : '—' },
  ]
  return (
    <div className="bg-white dark:bg-surface-800 rounded-card border border-surface-200 dark:border-surface-700 overflow-hidden">
      <DataTable
        columns={columns}
        data={movements}
        loading={isLoading}
        emptyTitle="لا توجد حركات"
        emptyDescription="حركات المخزون ستظهر هنا."
      />
    </div>
  )
}

// فورم إضافة جهاز
function AddDeviceForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ product_id: '', serial_number: '', supplier_id: '', purchase_price: '', warehouse_id: 'main' })
  const queryClient = useQueryClient()
  const { data: productsRes } = useQuery({ queryKey: ['inventory-products'], queryFn: () => inventoryAPI.getProducts() })
  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersAPI.getSuppliers() })
  const products = productsRes?.data?.data || []
  const suppliers = suppliersRes?.data?.data || []
  const createMutation = useMutation({
    mutationFn: (data) => inventoryAPI.createDevice(data),
    onSuccess: () => { onSuccess?.() },
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.product_id) return
    createMutation.mutate({
      product_id: form.product_id,
      serial_number: form.serial_number || undefined,
      supplier_id: form.supplier_id || undefined,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
      warehouse_id: form.warehouse_id || 'main',
    })
  }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {createMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {createMutation.error?.response?.data?.error || createMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">المنتج</label>
          <select className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700" value={form.product_id} onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))} required>
            <option value="">اختر المنتج...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name || p.name_ar}</option>)}
            {products.length === 0 && <><option value="1">Dell Latitude 7410</option><option value="2">HP EliteBook 840 G7</option></>}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">السيريال (اختياري)</label>
          <input type="text" placeholder="BI-2025-XXXXXX" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700" value={form.serial_number} onChange={(e) => setForm(f => ({ ...f, serial_number: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">المورد</label>
          <select className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700" value={form.supplier_id} onChange={(e) => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
            <option value="">اختر المورد...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">سعر الشراء</label>
          <input type="number" placeholder="0" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700" value={form.purchase_price} onChange={(e) => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">المخزن</label>
          <select className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700" value={form.warehouse_id} onChange={(e) => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الجهاز'}</Button>
      </div>
    </form>
  )
}

// فورم تعديل جهاز
function EditDeviceForm({ device, onClose, onSuccess }) {
  const [form, setForm] = useState({
    serial_number: device?.serial_number ?? '',
    status: device?.status ?? 'available',
    warehouse_id: device?.warehouse_id ?? 'main',
  })
  const updateMutation = useMutation({
    mutationFn: (data) => inventoryAPI.updateDevice(device.id, data),
    onSuccess: () => onSuccess?.(),
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      serial_number: form.serial_number?.trim() || undefined,
      status: form.status,
      warehouse_id: form.warehouse_id,
    })
  }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {updateMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {updateMutation.error?.response?.data?.error || updateMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">السيريال</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            value={form.serial_number}
            onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">الحالة</label>
          <select
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {Object.entries(deviceStatuses).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">المخزن</label>
          <select
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
            value={form.warehouse_id}
            onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </div>
    </form>
  )
}

// فورم نقل جهاز
function TransferDeviceForm({ device, onClose, onSuccess }) {
  const [form, setForm] = useState({ warehouse_id: device?.warehouse_id ?? 'main', reason: '' })
  const transferMutation = useMutation({
    mutationFn: (data) => inventoryAPI.transferDevice(device.id, data),
    onSuccess: () => onSuccess?.(),
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.warehouse_id) return
    transferMutation.mutate({ warehouse_id: form.warehouse_id, reason: form.reason || undefined })
  }
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {transferMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {transferMutation.error?.response?.data?.error || transferMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <p className="text-sm text-surface-600 dark:text-surface-400">
        نقل الجهاز <strong className="text-surface-900 dark:text-white">{device?.serial_number}</strong> إلى مخزن آخر.
      </p>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">المخزن الهدف</label>
        <select
          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
          value={form.warehouse_id}
          onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
          required
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">السبب (اختياري)</label>
        <input
          type="text"
          placeholder="مثال: نقل للتجهيز"
          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        <Button type="submit" disabled={transferMutation.isPending}>
          {transferMutation.isPending ? 'جاري النقل...' : 'نقل'}
        </Button>
      </div>
    </form>
  )
}

// تأكيد حذف جهاز
function DeleteDeviceConfirm({ device, onClose, onSuccess }) {
  const deleteMutation = useMutation({
    mutationFn: () => inventoryAPI.deleteDevice(device.id),
    onSuccess: () => onSuccess?.(),
  })
  const handleConfirm = () => deleteMutation.mutate()
  return (
    <div className="space-y-4">
      <p className="text-surface-600 dark:text-surface-400">
        هل أنت متأكد من حذف الجهاز <strong className="text-surface-900 dark:text-white">{device.serial_number}</strong> ({device.product_name})؟ لا يمكن التراجع.
      </p>
      {deleteMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {deleteMutation.error?.response?.data?.error || deleteMutation.error?.message || 'حدث خطأ'}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>إلغاء</Button>
        <Button variant="danger" onClick={handleConfirm} disabled={deleteMutation.isPending}>
          {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
        </Button>
      </div>
    </div>
  )
}

// تفاصيل الجهاز
function DeviceDetails({ device, onEdit, onDelete, onTransfer, onClose }) {
  const [activeTab, setActiveTab] = useState('info')
  const status = deviceStatuses[device.status] || deviceStatuses.new

  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['device-history', device.id],
    queryFn: () => inventoryAPI.getDeviceHistory(device.id),
    enabled: activeTab === 'history' && !!device.id,
  })
  const historyList = historyRes?.data?.data ?? []

  const tabs = [
    { id: 'info', label: 'المعلومات' },
    { id: 'history', label: 'السجل' },
    { id: 'photos', label: 'الصور' },
    { id: 'maintenance', label: 'الصيانة' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-xl flex items-center justify-center">
            <Package className="w-8 h-8 text-surface-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-surface-900 dark:text-white">{device.product_name || 'Dell Latitude 7410'}</h3>
            <p className="font-mono text-primary-600 dark:text-primary-400">{device.serial_number}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
          <status.icon className="w-4 h-4" />
          {status.label}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200 dark:border-surface-700">
        <nav className="flex gap-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 border-b-2 font-medium ${activeTab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: السجل */}
      {activeTab === 'history' && (
        <div className="min-h-[120px]">
          {historyLoading ? (
            <div className="flex justify-center py-8"><Spinner size="md" /></div>
          ) : historyList.length === 0 ? (
            <p className="text-center text-surface-500 dark:text-surface-400 py-6">لا توجد سجلات لهذا الجهاز.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 dark:bg-surface-700/50">
                  <tr>
                    <th className="px-3 py-2 text-right text-surface-500">التاريخ</th>
                    <th className="px-3 py-2 text-right text-surface-500">الإجراء</th>
                    <th className="px-3 py-2 text-right text-surface-500">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  {historyList.map((h, i) => (
                    <tr key={h.id || i}>
                      <td className="px-3 py-2">{h.created_at ? new Date(h.created_at).toLocaleString('ar-IQ') : '—'}</td>
                      <td className="px-3 py-2">{h.action || h.type || '—'}</td>
                      <td className="px-3 py-2">{h.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: المعلومات */}
      {activeTab === 'info' && (
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-surface-900 dark:text-white">المواصفات</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">المعالج:</span>
              <span className="font-medium">{device.processor || 'i7-1165G7'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">الرام:</span>
              <span className="font-medium">{device.ram_size || '16'} GB {device.ram_type || 'DDR4'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">التخزين:</span>
              <span className="font-medium">{device.storage_size || '512'} GB {device.storage_type || 'SSD'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">الشاشة:</span>
              <span className="font-medium">{device.screen_size || '14'}" {device.screen_type || 'FHD'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-surface-900 dark:text-white">الموقع</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">المخزن:</span>
              <span className="font-medium">{warehouses.find(w => w.id === device.warehouse_id)?.name || 'الرئيسي'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">الرف:</span>
              <span className="font-medium">{device.location_shelf || 'A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">الصف:</span>
              <span className="font-medium">{device.location_row || '1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">الذمة:</span>
              <span className="font-medium">{device.custody_employee || 'لا يوجد'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-surface-900 dark:text-white">المالية</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">سعر الشراء:</span>
              <span className="font-medium">{(device.purchase_cost || 0).toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">تكاليف إضافية:</span>
              <span className="font-medium">{(device.additional_costs || 0).toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">سعر البيع:</span>
              <span className="font-medium text-green-600">{(device.selling_price || 0).toLocaleString()} د.ع</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-surface-900 dark:text-white">المصدر</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">المورد:</span>
              <span className="font-medium">{device.supplier_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">تاريخ الشراء:</span>
              <span className="font-medium">{device.purchase_date || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">رقم الفاتورة:</span>
              <span className="font-medium">{device.purchase_invoice_id || '-'}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'photos' && (
        <p className="text-center text-surface-500 dark:text-surface-400 py-6">قسم الصور قيد التطوير.</p>
      )}
      {activeTab === 'maintenance' && (
        <p className="text-center text-surface-500 dark:text-surface-400 py-6">قسم الصيانة قيد التطوير.</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onEdit}>
          <Edit className="w-4 h-4 ml-2" />
          تعديل
        </Button>
        <Button variant="outline" onClick={onTransfer}>
          <ScanLine className="w-4 h-4 ml-2" />
          نقل
        </Button>
        <Button variant="danger" onClick={onDelete}>
          <Trash2 className="w-4 h-4 ml-2" />
          حذف
        </Button>
      </div>
    </div>
  )
}
