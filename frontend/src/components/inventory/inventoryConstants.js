import { Package, Search, Clock, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react'

export const deviceStatuses = {
  new: { label: 'جديد', color: 'bg-blue-100 text-blue-800', icon: Package },
  inspecting: { label: 'قيد الفحص', color: 'bg-yellow-100 text-yellow-800', icon: Search },
  ready_for_prep: { label: 'جاهز للتجهيز', color: 'bg-indigo-100 text-indigo-800', icon: Clock },
  preparing: { label: 'قيد التجهيز', color: 'bg-purple-100 text-purple-800', icon: Clock },
  ready_to_sell: { label: 'جاهز للبيع', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  reserved: { label: 'محجوز', color: 'bg-orange-100 text-orange-800', icon: Clock },
  sold: { label: 'مباع', color: 'bg-neutral-100 text-neutral-800', icon: CheckCircle2 },
  returned: { label: 'مرتجع', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  in_repair: { label: 'بالصيانة', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  scrapped: { label: 'تالف', color: 'bg-red-200 text-red-900', icon: Trash2 },
}

export const warehouses = [
  { id: 'main', name: 'المخزن الرئيسي', icon: '\uD83C\uDFEA' },
  { id: 'inspection', name: 'مخزن الفحص', icon: '\uD83D\uDD0D' },
  { id: 'preparation', name: 'مخزن التجهيز', icon: '\u2699\uFE0F' },
  { id: 'repair', name: 'مخزن الصيانة', icon: '\uD83D\uDD27' },
  { id: 'returns', name: 'مخزن المرتجعات', icon: '\uD83D\uDCE6' },
  { id: 'defective', name: 'مخزن التالف', icon: '\u26A0\uFE0F' },
  { id: 'accessories', name: 'مخزن الإكسسوارات', icon: '\uD83C\uDFA7' },
]
