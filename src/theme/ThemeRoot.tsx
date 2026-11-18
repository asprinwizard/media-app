import { Theme } from '@radix-ui/themes'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue, type ThemePreference } from './context'
const STORAGE_KEY = 'media02.theme'

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // storage blocked: fall back to system
  }
  return 'system'
}

function useSystemDark(): boolean {
  const query = '(prefers-color-scheme: dark)'
  const [dark, setDark] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return dark
}

/**
 * Radix Theme with the "projection room" palette (slate + amber),
 * following the OS theme unless the user picks one.
 */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const systemDark = useSystemDark()
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference: (next) => {
        setPreferenceState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // ignore
        }
      },
    }),
    [preference, resolved],
  )

  return (
    <ThemeContext.Provider value={value}>
      <Theme appearance={resolved} accentColor="amber" grayColor="slate" radius="medium" scaling="100%">
        {children}
      </Theme>
    </ThemeContext.Provider>
  )
}
