import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatWidget from '../ai/ChatWidget'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen lg:mr-[260px]">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="max-w-[1400px] mx-auto animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  )
}
