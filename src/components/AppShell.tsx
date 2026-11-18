import { IconButton, Kbd } from '@radix-ui/themes'
import { Menu, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import type { Me } from '../api/types'
import { Sidebar } from './Sidebar'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function AppShell({ me }: { me: Me }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  // "/" jumps to search from anywhere (except while typing).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !isTyping(event.target)) {
        event.preventDefault()
        navigate('/search')
      }
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="app">
      <aside className={`sidebar${drawerOpen ? ' open' : ''}`}>
        <Sidebar me={me} onNavigate={() => setDrawerOpen(false)} />
      </aside>
      {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} aria-hidden />}

      <div className="main">
        <header className="topbar">
          <IconButton
            variant="ghost"
            color="gray"
            className="menu-btn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={18} />
          </IconButton>
          <button type="button" className="cmdk" onClick={() => navigate('/search')}>
            <Search size={16} aria-hidden />
            <span>Search the library…</span>
            <Kbd className="cmdk-kbd">/</Kbd>
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
