import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'
import './styles/themes.css'
import './styles/layout.css'

const THEME_IDS = ['ocean-dark','slate-light','royal-navy','steel-light','midnight-onyx','quartz-minimal','mocha-executive','arctic-frost','obsidian-red','imperial-purple','emerald-bureau']
const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bi-erp-theme') : null
document.documentElement.setAttribute('data-theme', saved && THEME_IDS.includes(saved) ? saved : 'ocean-dark')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
