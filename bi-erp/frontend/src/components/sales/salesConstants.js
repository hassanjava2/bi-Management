import {
  Wallet, Clock, CreditCard, Building2, RefreshCw,
  ShoppingCart, ArrowLeftRight,
} from 'lucide-react'

export const invoiceTypes = {
  sale: { label: 'بيع نقدي', color: 'bg-green-100 text-green-800', icon: Wallet },
  sale_credit: { label: 'بيع آجل', color: 'bg-blue-100 text-blue-800', icon: Clock },
  sale_installment: { label: 'بيع أقساط', color: 'bg-purple-100 text-purple-800', icon: CreditCard },
  sale_wholesale: { label: 'بيع جملة', color: 'bg-indigo-100 text-indigo-800', icon: Building2 },
  sale_return: { label: 'مرتجع بيع', color: 'bg-red-100 text-red-800', icon: RefreshCw },
  purchase: { label: 'شراء', color: 'bg-amber-100 text-amber-800', icon: ShoppingCart },
  purchase_return: { label: 'مرتجع شراء', color: 'bg-orange-100 text-orange-800', icon: RefreshCw },
  exchange_same: { label: 'استبدال (نفس الموديل)', color: 'bg-cyan-100 text-cyan-800', icon: ArrowLeftRight },
  exchange_different: { label: 'استبدال (موديل مختلف)', color: 'bg-teal-100 text-teal-800', icon: ArrowLeftRight },
  trade_in: { label: 'شراء + بيع', color: 'bg-pink-100 text-pink-800', icon: ArrowLeftRight },
}

export const invoiceStatuses = {
  draft: { label: 'مسودة', color: 'bg-neutral-100 text-neutral-800' },
  confirmed: { label: 'مؤكدة', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'قيد التجهيز', color: 'bg-yellow-100 text-yellow-800' },
  shipped: { label: 'تم الشحن', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-800' },
  completed: { label: 'مكتملة', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ملغية', color: 'bg-red-100 text-red-800' },
  returned: { label: 'مرتجعة', color: 'bg-orange-100 text-orange-800' },
}

export const installmentPlatforms = {
  aqsaty: { name: 'أقساطي', fee: '15%', downPayment: '11.5%', logo: '💳' },
  jenny: { name: 'جني (SuperKey)', fee: '11.5%', downPayment: '0%', logo: '🏦' },
}
