/**
 * BI Management - Settings Page
 * صفحة الإعدادات
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, Loader2 } from 'lucide-react'
import PageLayout from '../components/common/PageLayout'
import Button from '../components/common/Button'
import FormField from '../components/common/FormField'
import Card from '../components/common/Card'
import { settingsAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editingKey, setEditingKey] = useState(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then((r) => r.data?.data || {}),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }) => settingsAPI.update(key, value),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries(['settings'])
      setEditingKey(null)
      toast.success('تم حفظ الإعداد')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'فشل الحفظ')
    },
  })

  const settings = data || {}
  const categories = Object.keys(settings)

  const handleSave = (key) => {
    updateMutation.mutate({ key, value: editValue })
  }

  if (isLoading) {
    return (
      <PageLayout title="الإعدادات" description="إعدادات النظام">
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="الإعدادات"
      description="إعدادات النظام حسب الفئة"
    >
      <div className="space-y-6">
        {categories.length === 0 ? (
          <Card>
            <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">لا توجد إعدادات مسجلة</p>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category} padding>
              <Card.Title className="capitalize">{category || 'عام'}</Card.Title>
              <Card.Body>
                <div className="space-y-4">
                  {Object.entries(settings[category] || {}).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-neutral-100 dark:border-neutral-700 pb-4 last:border-0 last:pb-0">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 sm:w-48">{key}</label>
                      {editingKey === key ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-input bg-white dark:bg-neutral-800"
                          />
                          <Button size="sm" onClick={() => handleSave(key)} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingKey(null)}>إلغاء</Button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-neutral-900 dark:text-white">{String(value)}</span>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingKey(key); setEditValue(String(value)) }}>
                            تعديل
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  )
}
