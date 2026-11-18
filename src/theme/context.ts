import { createContext, useContext } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useThemePreference must be used inside <ThemeRoot>')
  return context
}
