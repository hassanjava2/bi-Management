import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Building2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Alert from '../components/common/Alert'

const REMEMBER_EMAIL_KEY = 'bi-remember-email'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_EMAIL_KEY) || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem(REMEMBER_EMAIL_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (rememberMe && email) localStorage.setItem(REMEMBER_EMAIL_KEY, email)
    else if (!rememberMe) localStorage.removeItem(REMEMBER_EMAIL_KEY)
  }, [rememberMe, email])

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-neutral-950">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-neutral-900" />
        <div className="absolute inset-0">
          <div className="absolute top-[15%] right-[10%] w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-[10%] left-[15%] w-96 h-96 rounded-full bg-primary-400/10 blur-3xl" />
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold text-white">BI</span>
              <span className="text-3xl font-light text-white/60 ms-2">Management</span>
            </div>
          </div>
          <h2 className="text-5xl font-bold text-white leading-tight mb-6">
            نظام إدارة
            <br />
            <span className="text-primary-300">الشركات الذكي</span>
          </h2>
          <p className="text-lg text-white/50 max-w-md leading-relaxed">
            إدارة المبيعات، المخزون، المحاسبة، والموارد البشرية
            <br />من مكان واحد
          </p>

          {/* Stats decoration */}
          <div className="flex gap-8 mt-16">
            {[
              { label: 'المبيعات', value: '+12%' },
              { label: 'الكفاءة', value: '98%' },
              { label: 'الموظفين', value: '+50' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-white/30 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="text-center mb-10 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">BI Management</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">مرحباً</h2>
            <p className="text-neutral-500 mb-8">سجّل دخولك للمتابعة</p>

            {error && (
              <Alert variant="error" className="mb-6">{error}</Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.com"
                    required
                    className="w-full rounded-xl border-0 bg-white/5 py-3 pe-11 ps-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">كلمة المرور</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border-0 bg-white/5 py-3 pe-11 ps-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-neutral-700 bg-white/5 text-primary-500 focus:ring-primary-500/40"
                />
                <span className="text-sm text-neutral-500">تذكرني</span>
              </label>

              <Button
                type="submit"
                loading={loading}
                className="w-full !py-3 !text-base !rounded-xl"
                size="lg"
              >
                دخول
                <ArrowLeft className="w-5 h-5 ms-2" />
              </Button>
            </form>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-8 p-3 bg-white/5 rounded-xl text-center">
              <p className="text-xs text-neutral-500">
                <strong className="text-neutral-400">Dev:</strong>{' '}
                <code className="text-primary-400">admin@bi-company.com / Admin@123</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
