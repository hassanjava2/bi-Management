import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatWidget from '../ai/ChatWidget'
import { ErrorBoundary } from '../common/ErrorBoundary'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-smooth">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-h-screen lg:ms-[260px] transition-[margin] duration-300 ease-smooth">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="max-w-[1400px] mx-auto w-full animate-fade-in">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      <ChatWidget />
    </div>
  )
}
