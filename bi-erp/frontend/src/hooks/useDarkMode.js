import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bi-theme-dark'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === '1'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem(STORAGE_KEY, '1')
    } else {
      root.classList.remove('dark')
      localStorage.setItem(STORAGE_KEY, '0')
    }
  }, [dark])

  const toggle = () => setDark((v) => !v)
  return [dark, toggle]
}
