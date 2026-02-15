/**
 * InvoiceWorkspace — Multi-Tab Invoice Container
 * يسمح بفتح عدة فواتير بنفس الوقت مع tabs
 */
import { useState, useCallback, useEffect } from 'react'
import { Plus, X, FileText, Wallet, CreditCard, Calculator, ArrowLeftRight, ShoppingCart, Receipt, Package, Save } from 'lucide-react'
import { useInvoiceTabs } from '../../hooks/useInvoiceDraft'
import NewInvoicePage from '../NewInvoicePage'

const typeIcons = {
    cash: Wallet, credit: CreditCard, installment: Calculator,
    exchange: ArrowLeftRight, purchase: ShoppingCart, quote: Receipt, scrap: Package,
}

const typeColors = {
    cash: 'emerald', credit: 'blue', installment: 'purple',
    exchange: 'amber', purchase: 'amber', quote: 'cyan', scrap: 'red',
}

const colorMap = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500', active: 'bg-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500', active: 'bg-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500', active: 'bg-purple-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500', active: 'bg-amber-500/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500', active: 'bg-cyan-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500', active: 'bg-red-500/20' },
}

export default function InvoiceWorkspace() {
    const { tabs, activeTabId, setActiveTabId, addTab, closeTab, updateTabLabel } = useInvoiceTabs()
    const [showNewMenu, setShowNewMenu] = useState(false)

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+T — new tab
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault()
                addTab('cash')
            }
            // Ctrl+W — close current tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault()
                if (tabs.length > 1) closeTab(activeTabId)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [addTab, closeTab, activeTabId, tabs.length])

    const handleCloseTab = useCallback((e, tabId) => {
        e.stopPropagation()
        // If tab has data, confirm
        const tab = tabs.find(t => t.id === tabId)
        if (tab?.hasData) {
            if (!window.confirm('هل تريد إغلاق هذه الفاتورة؟ البيانات غير المحفوظة ستُفقد.')) return
        }
        closeTab(tabId)
    }, [closeTab, tabs])

    const newInvoiceTypes = [
        { type: 'cash', name: 'بيع نقدي', icon: Wallet, color: 'emerald' },
        { type: 'credit', name: 'بيع آجل', icon: CreditCard, color: 'blue' },
        { type: 'installment', name: 'أقساط', icon: Calculator, color: 'purple' },
        { type: 'purchase', name: 'شراء', icon: ShoppingCart, color: 'amber' },
        { type: 'exchange', name: 'استبدال', icon: ArrowLeftRight, color: 'amber' },
        { type: 'quote', name: 'عرض أسعار', icon: Receipt, color: 'cyan' },
    ]

    return (
        <div className="h-full flex flex-col">
            {/* Tab Bar */}
            <div className="bg-neutral-900/50 backdrop-blur-sm border-b border-neutral-700/50 flex items-center gap-0 overflow-x-auto scrollbar-thin px-2 py-1 relative">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId
                    const Icon = typeIcons[tab.type] || FileText
                    const color = typeColors[tab.type] || 'blue'
                    const colors = colorMap[color] || colorMap.blue

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`
                group flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium
                transition-all duration-200 min-w-[140px] max-w-[240px] relative
                ${isActive
                                    ? `${colors.active} ${colors.text} border-b-2 ${colors.border}`
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                                }
              `}
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate text-right flex-1">{tab.label}</span>

                            {/* Save indicator */}
                            {tab.hasData && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="يحتوي بيانات" />
                            )}

                            {/* Close button */}
                            {tabs.length > 1 && (
                                <button
                                    onClick={(e) => handleCloseTab(e, tab.id)}
                                    className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/30 hover:text-red-400 transition-all flex-shrink-0"
                                    title="إغلاق (Ctrl+W)"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </button>
                    )
                })}

                {/* New Tab Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowNewMenu(!showNewMenu)}
                        className="flex items-center gap-1 px-3 py-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all text-sm"
                        title="فاتورة جديدة (Ctrl+T)"
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    {/* New Tab Dropdown */}
                    {showNewMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
                            <div className="absolute top-full right-0 mt-1 z-50 bg-neutral-800 border border-neutral-600 rounded-xl shadow-2xl py-2 w-48">
                                {newInvoiceTypes.map(({ type, name, icon: TypeIcon, color }) => {
                                    const colors = colorMap[color] || colorMap.blue
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => { addTab(type); setShowNewMenu(false) }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-right hover:${colors.active} transition-colors`}
                                        >
                                            <TypeIcon className={`w-4 h-4 ${colors.text}`} />
                                            <span className="text-neutral-200 text-sm">{name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="mr-auto text-xs text-neutral-600 px-2 hidden lg:flex items-center gap-3">
                    <span><kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-500">Ctrl+T</kbd> جديدة</span>
                    <span><kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-500">Ctrl+S</kbd> حفظ</span>
                    <span><kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-500">Ctrl+W</kbd> إغلاق</span>
                </div>
            </div>

            {/* Tab Content — each tab gets its own NewInvoicePage instance */}
            <div className="flex-1 overflow-hidden">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={tab.id === activeTabId ? 'h-full' : 'hidden'}
                    >
                        <NewInvoicePage
                            tabId={tab.id}
                            initialType={tab.type}
                            onStateChange={(state) => updateTabLabel(tab.id, state)}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
