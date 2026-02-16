import { Construction } from 'lucide-react'
import PageShell from '../components/common/PageShell'

export default function PlaceholderPage({ title = 'الصفحة' }) {
  return (
    <PageShell title={title} description="قريباً">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-5">
          <Construction className="w-10 h-10 text-primary-600 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{title}</h2>
        <p className="text-neutral-400 text-sm">هذه الصفحة قيد التطوير وستكون جاهزة قريباً</p>
      </div>
    </PageShell>
  )
}
