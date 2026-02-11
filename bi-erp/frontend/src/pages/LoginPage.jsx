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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--darker)' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--primary), var(--darker))' }} />
      <div className="absolute inset-0">
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-30" style={{ background: 'var(--primary)' }} />
        <div className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-20" style={{ background: 'var(--primary-light)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Centered glass form */}
      <div className="relative z-10 w-full max-w-[420px] animate-scale-in">
        <div className="rounded-3xl border backdrop-blur-xl shadow-2xl p-8 md:p-10" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(var(--primary-rgb), 0.2)', border: '1px solid var(--border)' }}>
              <Building2 className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--light)' }}>BI Management</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--gray)' }}>نظام إدارة الشركات الذكي</p>
          </div>

          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--light)' }}>مرحباً</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--gray)' }}>سجّل دخولك للمتابعة</p>

            {error && (
              <Alert variant="error" className="mb-6">{error}</Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray)' }}>البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--gray)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.com"
                    required
                    className="w-full rounded-xl border py-3 pe-11 ps-4 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
                    style={{ background: 'var(--darker)', borderColor: 'var(--border)', color: 'var(--light)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray)' }}>كلمة المرور</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                    style={{ color: 'var(--gray)' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border py-3 pe-11 ps-4 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
                    style={{ background: 'var(--darker)', borderColor: 'var(--border)', color: 'var(--light)' }}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border text-primary-500 focus:ring-primary-500/40"
                  style={{ borderColor: 'var(--border)', background: 'var(--darker)' }}
                />
                <span className="text-sm" style={{ color: 'var(--gray)' }}>تذكرني</span>
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

          {import.meta.env.DEV && (
            <div className="mt-6 p-3 rounded-xl text-center" style={{ background: 'var(--darker)' }}>
              <p className="text-xs" style={{ color: 'var(--gray)' }}>
                <strong style={{ color: 'var(--light)' }}>Dev:</strong>{' '}
                <code style={{ color: 'var(--primary)' }}>admin@bi-company.com / Admin@123</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
