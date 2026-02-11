import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatWidget from '../ai/ChatWidget'
import { ErrorBoundary } from '../common/ErrorBoundary'

export default function Layout() {
  const [paneOpen, setPaneOpen] = useState(null)
  const [stripOpen, setStripOpen] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--darker)' }}>
      <Sidebar
        paneOpen={paneOpen}
        onPaneChange={setPaneOpen}
        stripOpen={stripOpen}
        onStripToggle={setStripOpen}
        onClose={() => { setStripOpen(false); setPaneOpen(null) }}
      />

      <div className={paneOpen ? 'layout-main pane-open' : 'layout-main'}>
        <Header
          onMenuClick={() => setStripOpen((o) => !o)}
          paneOpen={!!paneOpen}
        />

        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <div className="max-w-[1400px] mx-auto w-full animate-fade-in">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <ChatWidget />
    </div>
  )
}
