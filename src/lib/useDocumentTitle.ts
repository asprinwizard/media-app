import { useEffect } from 'react'

/** Browser tab title: "Library · Media02", or just "Media02" with no title. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Media02` : 'Media02'
  }, [title])
}
