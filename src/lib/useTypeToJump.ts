import { useCallback, useEffect } from 'react'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Scroll to the first row whose data-letter is `letter` (a–z, 0–9). */
export function scrollToLetter(container: HTMLElement | null, letter: string): boolean {
  const row = container?.querySelector<HTMLElement>(`[data-letter="${CSS.escape(letter)}"]`)
  if (!row) return false
  row.scrollIntoView({ block: 'start', behavior: 'smooth' })
  row.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true })
  return true
}

/**
 * Typing a letter or digit anywhere on the page (outside inputs and dialogs)
 * jumps to the first entry starting with it, as on the old site.
 */
export function useTypeToJump(getContainer: () => HTMLElement | null, enabled = true) {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return
      if (document.querySelector('[role="dialog"]')) return
      const key = event.key.toLowerCase()
      if (!/^[a-z0-9]$/.test(key)) return
      if (scrollToLetter(getContainer(), key)) event.preventDefault()
    },
    [getContainer],
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler, enabled])
}
