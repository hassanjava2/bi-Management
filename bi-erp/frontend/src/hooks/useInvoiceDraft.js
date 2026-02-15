/**
 * useInvoiceDraft — حفظ تلقائي للفواتير المفتوحة
 * يحفظ بـ localStorage كل 3 ثواني + يستعيد عند الفتح
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const DRAFTS_KEY = 'bi-erp-invoice-drafts'
const SAVE_INTERVAL = 3000

// Generate unique tab ID
export function generateTabId() {
    return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Default empty invoice state
export function createEmptyInvoice(type = 'cash') {
    return {
        invoiceType: type,
        customer: null,
        supplier: null,
        items: [],
        discount: 0,
        discountType: 'amount',
        platform: 'aqsaty',
        notes: '',
        paidAmount: 0,
    }
}

/**
 * Load all saved drafts from localStorage
 */
export function loadDrafts() {
    try {
        const raw = localStorage.getItem(DRAFTS_KEY)
        if (!raw) return {}
        return JSON.parse(raw)
    } catch {
        return {}
    }
}

/**
 * Save all drafts to localStorage
 */
function saveDraftsToStorage(drafts) {
    try {
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
    } catch (e) {
        console.warn('[Draft] Save error:', e.message)
    }
}

/**
 * Remove a specific draft
 */
export function removeDraft(tabId) {
    const drafts = loadDrafts()
    delete drafts[tabId]
    saveDraftsToStorage(drafts)
}

/**
 * Hook for auto-saving a single invoice tab
 */
export function useInvoiceDraft(tabId) {
    const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving' | 'offline'
    const lastSavedRef = useRef(null)

    const saveDraft = useCallback((invoiceState) => {
        if (!tabId) return

        setSaveStatus('saving')
        try {
            const drafts = loadDrafts()
            drafts[tabId] = {
                ...invoiceState,
                _updatedAt: Date.now(),
                _tabId: tabId,
            }
            saveDraftsToStorage(drafts)
            lastSavedRef.current = Date.now()

            setTimeout(() => setSaveStatus('saved'), 300)
        } catch {
            setSaveStatus('offline')
        }
    }, [tabId])

    const loadDraft = useCallback(() => {
        if (!tabId) return null
        const drafts = loadDrafts()
        return drafts[tabId] || null
    }, [tabId])

    const clearDraft = useCallback(() => {
        if (!tabId) return
        removeDraft(tabId)
        setSaveStatus('saved')
    }, [tabId])

    return { saveDraft, loadDraft, clearDraft, saveStatus }
}

/**
 * Hook for managing multiple invoice tabs
 */
export function useInvoiceTabs() {
    const [tabs, setTabs] = useState(() => {
        // Restore tabs from saved drafts
        const drafts = loadDrafts()
        const savedTabs = Object.entries(drafts).map(([id, draft]) => ({
            id,
            type: draft.invoiceType || 'cash',
            label: getTabLabel(draft),
            hasData: draft.items?.length > 0,
        }))

        if (savedTabs.length > 0) return savedTabs

        // Default: one empty tab
        const id = generateTabId()
        return [{ id, type: 'cash', label: 'فاتورة جديدة', hasData: false }]
    })

    const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id)

    const addTab = useCallback((type = 'cash') => {
        const id = generateTabId()
        const newTab = { id, type, label: 'فاتورة جديدة', hasData: false }
        setTabs(prev => [...prev, newTab])
        setActiveTabId(id)
        return id
    }, [])

    const closeTab = useCallback((tabId) => {
        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId)
            // If closing active tab, switch to last remaining
            if (tabId === activeTabId && newTabs.length > 0) {
                setActiveTabId(newTabs[newTabs.length - 1].id)
            }
            // If no tabs left, create a new one
            if (newTabs.length === 0) {
                const id = generateTabId()
                setActiveTabId(id)
                return [{ id, type: 'cash', label: 'فاتورة جديدة', hasData: false }]
            }
            return newTabs
        })
        removeDraft(tabId)
    }, [activeTabId])

    const updateTabLabel = useCallback((tabId, invoiceState) => {
        setTabs(prev => prev.map(t =>
            t.id === tabId ? { ...t, label: getTabLabel(invoiceState), type: invoiceState.invoiceType, hasData: invoiceState.items?.length > 0 } : t
        ))
    }, [])

    return { tabs, activeTabId, setActiveTabId, addTab, closeTab, updateTabLabel }
}

function getTabLabel(draft) {
    if (!draft) return 'فاتورة جديدة'
    const typeNames = { cash: 'نقدي', credit: 'آجل', installment: 'أقساط', exchange: 'استبدال', purchase: 'شراء', quote: 'عرض سعر', scrap: 'تالف' }
    const typeName = typeNames[draft.invoiceType] || 'فاتورة'
    const customerName = draft.customer?.name || draft.supplier?.name || ''
    if (customerName) return `${typeName} — ${customerName}`
    if (draft.items?.length > 0) return `${typeName} (${draft.items.length} بند)`
    return `${typeName} جديد`
}
