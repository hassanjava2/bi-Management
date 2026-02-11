import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Clean logout without API call (for expired tokens)
  const silentLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      } catch {
        silentLogout()
        setLoading(false)
        return
      }
      
      // Verify token is still valid
      authAPI.me()
        .then(res => {
          if (res.data?.data) {
            setUser(res.data.data)
            localStorage.setItem('user', JSON.stringify(res.data.data))
          }
        })
        .catch((err) => {
          // Only logout if it's a 401 (token expired/invalid)
          if (err.response?.status === 401) {
            silentLogout()
            // Only navigate to login if not already there
            if (location.pathname !== '/login') {
              navigate('/login')
            }
          }
          // For other errors (network, 500, etc), keep the cached user
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password })
    const data = response.data?.data
    
    if (!data) {
      throw new Error('استجابة غير صالحة من الخادم')
    }
    
    // Handle both camelCase and snake_case from API
    const token = data.token
    const refreshToken = data.refreshToken || data.refresh_token
    const userData = data.user

    if (!token || !userData) {
      throw new Error('بيانات تسجيل الدخول غير مكتملة')
    }

    localStorage.setItem('token', token)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    localStorage.setItem('user', JSON.stringify(userData))
    
    setUser(userData)
    navigate('/dashboard')
    
    return userData
  }

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await authAPI.logout()
      }
    } catch (e) {
      // Ignore logout API errors
    }
    
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }, [navigate])

  const isAuthenticated = !!user && !!localStorage.getItem('token')

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    isAdmin: user?.role === 'admin' || user?.role === 'owner',
    isOwner: user?.role === 'owner',
    isManager: ['admin', 'manager', 'owner'].includes(user?.role),
    isHR: ['admin', 'hr', 'owner'].includes(user?.role),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
