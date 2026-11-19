import { useEffect, useState } from 'react'

/**
 * True once `active` has stayed true for `delayMs`; false as soon as it
 * stops. Used to switch "Loading…" to "Waking up the drives…" only when a
 * request is genuinely slow.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [late, setLate] = useState(false)

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setLate(true), delayMs)
    return () => {
      window.clearTimeout(timer)
      setLate(false)
    }
  }, [active, delayMs])

  return active && late
}
