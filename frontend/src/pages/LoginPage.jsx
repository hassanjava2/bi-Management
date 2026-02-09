import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Building2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Alert from '../components/common/Alert'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      console.error('Login error:', err)
      const errorMsg = err.response?.data?.message 
        || err.message 
        || 'فشل تسجيل الدخول - تأكد من البيانات'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-primary-400/30 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">BI</span>
              <span className="text-2xl font-light text-primary-200 mr-2">Management</span>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            نظام إدارة الشركات
            <br />
            <span className="text-primary-200">الذكي</span>
          </h2>
          <p className="text-lg text-primary-200/80 max-w-md leading-relaxed">
            إدارة المبيعات، المخزون، المحاسبة، والموارد البشرية من مكان واحد
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-surface-50 dark:bg-surface-950">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary mb-3 shadow-glow">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">BI Management</h1>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-card border border-surface-200/80 dark:border-surface-800 p-8">
            <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">
              تسجيل الدخول
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
              أدخل بيانات حسابك للمتابعة
            </p>

            {error && (
              <Alert variant="error" className="mb-5">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.com"
                icon={Mail}
                required
              />

              <Input
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
                required
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
                icon={ArrowLeft}
                iconPosition="end"
              >
                دخول
              </Button>
            </form>
          </div>

          {/* Dev credentials */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-3.5 bg-warning-50 dark:bg-warning-600/10 border border-warning-200 dark:border-warning-800 rounded-xl">
              <p className="text-xs text-warning-800 dark:text-warning-300 text-center">
                <strong>بيئة التطوير:</strong>{' '}
                <code className="font-mono bg-warning-100 dark:bg-warning-900/30 px-1.5 py-0.5 rounded text-[11px]">admin@bi-company.com / Admin@123</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
