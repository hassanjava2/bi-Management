import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { currencyAPI, unitAPI, customerTypeAPI } from '../services/api'

export default function CurrencySettingsPage() {
    const qc = useQueryClient()
    const [tab, setTab] = useState('currencies')

    return (
        <div style={{ padding: '30px', direction: 'rtl' }}>
            <h1 style={{ marginBottom: 8, fontSize: 26 }}>⚙️ البنية التحتية</h1>
            <p style={{ color: '#888', marginBottom: 24 }}>العملات · الوحدات · أصناف الزبائن</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[
                    { key: 'currencies', label: '💱 العملات' },
                    { key: 'exchange', label: '📊 أسعار الصرف' },
                    { key: 'units', label: '📏 الوحدات' },
                    { key: 'customerTypes', label: '👥 أصناف الزبائن' },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: tab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#1e1e2e',
                            color: tab === t.key ? '#fff' : '#aaa', fontWeight: 600, fontSize: 14, transition: 'all .2s'
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'currencies' && <CurrenciesTab qc={qc} />}
            {tab === 'exchange' && <ExchangeRateTab qc={qc} />}
            {tab === 'units' && <UnitsTab qc={qc} />}
            {tab === 'customerTypes' && <CustomerTypesTab qc={qc} />}
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━ CURRENCIES TAB ━━━━━━━━━━━━━━━━━━━━━━ */
function CurrenciesTab({ qc }) {
    const { data } = useQuery({ queryKey: ['currencies'], queryFn: () => currencyAPI.list().then(r => r.data.data) })
    const [form, setForm] = useState({ code: '', name_ar: '', name_en: '', symbol: '', exchange_rate: '', decimal_places: 0 })
    const [editing, setEditing] = useState(null)

    const createM = useMutation({
        mutationFn: (d) => currencyAPI.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['currencies'] }); setForm({ code: '', name_ar: '', name_en: '', symbol: '', exchange_rate: '', decimal_places: 0 }) }
    })
    const updateM = useMutation({
        mutationFn: ({ id, data }) => currencyAPI.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['currencies'] }); setEditing(null) }
    })
    const deleteM = useMutation({
        mutationFn: (id) => currencyAPI.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] })
    })
    const defaultM = useMutation({
        mutationFn: (id) => currencyAPI.setDefault(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] })
    })

    const currencies = data || []

    return (
        <div>
            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>إضافة عملة جديدة</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    <input placeholder="الرمز (USD)" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} style={inputStyle} />
                    <input placeholder="الاسم عربي" value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} style={inputStyle} />
                    <input placeholder="الاسم إنجليزي" value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} style={inputStyle} />
                    <input placeholder="الرمز $" value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} style={inputStyle} />
                    <input placeholder="سعر الصرف" type="number" value={form.exchange_rate} onChange={e => setForm(p => ({ ...p, exchange_rate: e.target.value }))} style={inputStyle} />
                    <input placeholder="خانات عشرية" type="number" value={form.decimal_places} onChange={e => setForm(p => ({ ...p, decimal_places: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <button onClick={() => createM.mutate(form)} disabled={!form.code || !form.name_ar} style={{ ...btnStyle, marginTop: 12 }}>
                    {createM.isPending ? '...' : '➕ إضافة'}
                </button>
            </div>

            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>العملات الحالية ({currencies.length})</h3>
                <table style={tableStyle}>
                    <thead>
                        <tr><th>الرمز</th><th>الاسم</th><th>الرمز</th><th>سعر الصرف</th><th>افتراضي</th><th>إجراءات</th></tr>
                    </thead>
                    <tbody>
                        {currencies.map(c => (
                            <tr key={c.id}>
                                <td><strong>{c.code}</strong></td>
                                <td>{c.name_ar}</td>
                                <td>{c.symbol}</td>
                                <td>
                                    {editing === c.id ? (
                                        <input type="number" defaultValue={c.exchange_rate} style={{ ...inputStyle, width: 120 }}
                                            onBlur={e => updateM.mutate({ id: c.id, data: { exchange_rate: parseFloat(e.target.value) } })} />
                                    ) : (
                                        <span onClick={() => setEditing(c.id)} style={{ cursor: 'pointer' }}>{Number(c.exchange_rate).toLocaleString()}</span>
                                    )}
                                </td>
                                <td>{c.is_default ? '⭐' : <button onClick={() => defaultM.mutate(c.id)} style={smallBtn}>تعيين</button>}</td>
                                <td>
                                    {!c.is_default && <button onClick={() => { if (confirm('حذف؟')) deleteM.mutate(c.id) }} style={{ ...smallBtn, color: '#ef4444' }}>حذف</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━ EXCHANGE RATE TAB ━━━━━━━━━━━━━━━━━━━━━━ */
function ExchangeRateTab({ qc }) {
    const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => currencyAPI.list().then(r => r.data.data) })
    const [form, setForm] = useState({ from_currency: 'USD', to_currency: 'IQD', rate: '' })
    const [convert, setConvert] = useState({ amount: 1000, from: 'USD', to: 'IQD', result: null })

    const setRateM = useMutation({
        mutationFn: (d) => currencyAPI.setExchangeRate(d),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['currencies'] }); setForm(p => ({ ...p, rate: '' })); alert('تم تحديث سعر الصرف') }
    })

    return (
        <div>
            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>تحديث سعر الصرف</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={form.from_currency} onChange={e => setForm(p => ({ ...p, from_currency: e.target.value }))} style={inputStyle}>
                        {(currencies || []).map(c => <option key={c.code} value={c.code}>{c.name_ar} ({c.code})</option>)}
                    </select>
                    <span style={{ fontSize: 24 }}>→</span>
                    <select value={form.to_currency} onChange={e => setForm(p => ({ ...p, to_currency: e.target.value }))} style={inputStyle}>
                        {(currencies || []).map(c => <option key={c.code} value={c.code}>{c.name_ar} ({c.code})</option>)}
                    </select>
                    <input placeholder="السعر" type="number" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} style={{ ...inputStyle, width: 150 }} />
                    <button onClick={() => setRateM.mutate(form)} disabled={!form.rate} style={btnStyle}>
                        {setRateM.isPending ? '...' : '💾 حفظ'}
                    </button>
                </div>
            </div>

            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>محول العملات</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="number" placeholder="المبلغ" value={convert.amount} onChange={e => setConvert(p => ({ ...p, amount: e.target.value }))} style={{ ...inputStyle, width: 150 }} />
                    <select value={convert.from} onChange={e => setConvert(p => ({ ...p, from: e.target.value }))} style={inputStyle}>
                        {(currencies || []).map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <span style={{ fontSize: 20 }}>⇄</span>
                    <select value={convert.to} onChange={e => setConvert(p => ({ ...p, to: e.target.value }))} style={inputStyle}>
                        {(currencies || []).map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <button onClick={async () => {
                        const r = await currencyAPI.convert(convert.amount, convert.from, convert.to)
                        setConvert(p => ({ ...p, result: r.data.data.result }))
                    }} style={btnStyle}>حساب</button>
                </div>
                {convert.result != null && (
                    <div style={{ marginTop: 16, padding: 16, background: '#1a1a2e', borderRadius: 12, textAlign: 'center' }}>
                        <span style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>
                            {Number(convert.result).toLocaleString()} {convert.to}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━ UNITS TAB ━━━━━━━━━━━━━━━━━━━━━━ */
function UnitsTab({ qc }) {
    const { data } = useQuery({ queryKey: ['units'], queryFn: () => unitAPI.list().then(r => r.data.data) })
    const [form, setForm] = useState({ name: '', name_en: '', abbreviation: '', type: 'quantity' })

    const createM = useMutation({
        mutationFn: (d) => unitAPI.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); setForm({ name: '', name_en: '', abbreviation: '', type: 'quantity' }) }
    })
    const deleteM = useMutation({
        mutationFn: (id) => unitAPI.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] })
    })

    const units = data || []

    return (
        <div>
            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>إضافة وحدة قياس</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input placeholder="الاسم عربي" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
                    <input placeholder="الاسم إنجليزي" value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} style={inputStyle} />
                    <input placeholder="الاختصار" value={form.abbreviation} onChange={e => setForm(p => ({ ...p, abbreviation: e.target.value }))} style={inputStyle} />
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                        <option value="quantity">عدد</option>
                        <option value="weight">وزن</option>
                        <option value="volume">حجم</option>
                        <option value="length">طول</option>
                    </select>
                    <button onClick={() => createM.mutate(form)} disabled={!form.name} style={btnStyle}>➕ إضافة</button>
                </div>
            </div>

            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>الوحدات ({units.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {units.map(u => (
                        <div key={u.id} style={{ padding: 16, background: '#1a1a2e', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>{u.name}</strong>
                                <span style={{ color: '#888', marginRight: 8, fontSize: 13 }}>({u.abbreviation || u.name_en})</span>
                                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                    {u.type === 'quantity' ? '📦 عدد' : u.type === 'weight' ? '⚖️ وزن' : u.type === 'volume' ? '🫙 حجم' : '📐 طول'}
                                </div>
                            </div>
                            <button onClick={() => deleteM.mutate(u.id)} style={{ ...smallBtn, color: '#ef4444' }}>✕</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━ CUSTOMER TYPES TAB ━━━━━━━━━━━━━━━━━━━━━━ */
function CustomerTypesTab({ qc }) {
    const { data } = useQuery({ queryKey: ['customerTypes'], queryFn: () => customerTypeAPI.list().then(r => r.data.data) })
    const [form, setForm] = useState({ name: '', name_en: '', discount_percent: 0 })

    const createM = useMutation({
        mutationFn: (d) => customerTypeAPI.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['customerTypes'] }); setForm({ name: '', name_en: '', discount_percent: 0 }) }
    })

    const types = data || []

    return (
        <div>
            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>إضافة صنف زبائن</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input placeholder="الاسم عربي" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
                    <input placeholder="الاسم إنجليزي" value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} style={inputStyle} />
                    <input placeholder="نسبة الخصم %" type="number" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: parseFloat(e.target.value) || 0 }))} style={{ ...inputStyle, width: 130 }} />
                    <button onClick={() => createM.mutate(form)} disabled={!form.name} style={btnStyle}>➕ إضافة</button>
                </div>
            </div>

            <div style={cardStyle}>
                <h3 style={{ marginBottom: 16 }}>أصناف الزبائن ({types.length})</h3>
                <table style={tableStyle}>
                    <thead>
                        <tr><th>#</th><th>الاسم</th><th>إنجليزي</th><th>خصم %</th></tr>
                    </thead>
                    <tbody>
                        {types.map((t, i) => (
                            <tr key={t.id}>
                                <td>{i + 1}</td>
                                <td><strong>{t.name}</strong></td>
                                <td>{t.name_en}</td>
                                <td>{t.discount_percent}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━ STYLES ━━━━━━━━━━━━━━━━━━━━━━ */
const cardStyle = {
    background: '#131324', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid #2a2a3e'
}
const inputStyle = {
    padding: '10px 14px', borderRadius: 10, border: '1px solid #333', background: '#1a1a2e', color: '#fff', fontSize: 14, outline: 'none', minWidth: 140
}
const btnStyle = {
    padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14
}
const smallBtn = {
    padding: '4px 12px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 12
}
const tableStyle = {
    width: '100%', borderCollapse: 'collapse', fontSize: 14,
}
