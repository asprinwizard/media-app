import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import type { Me } from './api/types'
import { useMe } from './api/useMe'
import { AppShell } from './components/AppShell'
import { canSee } from './lib/format'
import { Cast } from './pages/Cast'
import { Help } from './pages/Help'
import { Home } from './pages/Home'
import { Iplayer } from './pages/Iplayer'
import { Library } from './pages/Library'
import { Search } from './pages/Search'
import { Upload } from './pages/Upload'
import { Youtube } from './pages/Youtube'
import { ComingSoon, FullPageError, FullPageLoading, NoAccess, NotFound } from './pages/StatusPages'

/** Hide a route from users whose menu (from the API) doesn't include it. */
function Guard({ me, menuKey, children }: { me: Me; menuKey: string; children: ReactNode }) {
  return canSee(me.menu, menuKey) ? children : <NoAccess />
}

export default function App() {
  const { data: me, error, isPending, refetch } = useMe()

  if (isPending) return <FullPageLoading />
  if (error || !me) return <FullPageError error={error} onRetry={() => refetch()} />

  const guarded = (key: string, title: string, phase: number) => (
    <Guard me={me} menuKey={key}>
      <ComingSoon title={title} phase={phase} />
    </Guard>
  )

  return (
    <Routes>
      <Route element={<AppShell me={me} />}>
        <Route index element={<Home me={me} />} />
        <Route path="library/*" element={<Library />} />
        <Route path="search" element={<Search />} />
        <Route path="help" element={<Help />} />
        <Route path="cast" element={<Cast />} />
        <Route path="upload" element={<Guard me={me} menuKey="upload"><Upload /></Guard>} />
        <Route path="iplayer" element={<Guard me={me} menuKey="iplayer"><Iplayer /></Guard>} />
        <Route path="youtube" element={<Guard me={me} menuKey="youtube"><Youtube /></Guard>} />
        <Route path="live-tv" element={guarded('live-tv', 'Live TV', 5)} />
        <Route path="logs" element={guarded('logs', 'Logs', 5)} />
        <Route path="tools/*" element={guarded('tools', 'Tools', 5)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
