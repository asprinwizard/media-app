import { Button, Callout, Flex, ScrollArea, Skeleton, Text, TextField } from '@radix-ui/themes'
import { ChevronRight, CornerLeftUp, Folder, Search } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useFolders, type Server } from '../../api/admin'
import { activeRowIndex, letterJump, pickerRows, type PickerRow } from '../../lib/folderPicker'

function isOtherTextInput(target: EventTarget | null, filter: HTMLInputElement | null): boolean {
  if (!(target instanceof HTMLElement) || target === filter) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Browse to a destination folder on a server (replaces the old cascading
 * dropdowns). The chosen folder is the one shown in the path; clicking a
 * sub-folder goes into it. Optional shortcuts jump straight to common roots.
 *
 * Keyboard (while the filter box is focused, or the pointer is over the list):
 * a letter jumps to the next folder starting with it, ↑/↓ move the highlight,
 * Enter opens the highlighted folder, Backspace goes up a level. The filter box
 * narrows the list as you type.
 */
export function FolderPicker({
  server,
  value,
  onChange,
  shortcuts = [],
}: {
  server: Server
  value: string
  onChange: (path: string) => void
  shortcuts?: { label: string; path: string }[]
}) {
  const { data, isPending, error } = useFolders(server, value)
  const segments = value.split('/').filter(Boolean)

  const [filter, setFilter] = useState('')
  // The highlighted row belongs to one folder; opening another starts afresh.
  const [active, setActive] = useState<{ folder: string; key: string | null }>({ folder: value, key: null })
  const rows = pickerRows(value, data?.folders ?? [], filter)
  const activeIndex = activeRowIndex(rows, active.folder === value ? active.key : null)
  const current: PickerRow | undefined = rows[activeIndex]

  const listRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const hovering = useRef(false)

  const open = (path: string) => {
    setFilter('')
    onChange(path)
  }
  const highlight = (index: number) => {
    const row = rows[Math.min(Math.max(index, 0), rows.length - 1)]
    if (row) setActive({ folder: value, key: row.key })
  }

  // Keep the highlighted row in view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.picker-item.is-active')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, value])

  /** Returns true when the key was used. */
  const handleKey = (event: KeyboardEvent | ReactKeyboardEvent, fromFilter: boolean): boolean => {
    if (event.ctrlKey || event.metaKey || event.altKey || rows.length === 0) return false
    switch (event.key) {
      case 'ArrowDown':
        highlight(activeIndex + 1)
        return true
      case 'ArrowUp':
        highlight(activeIndex - 1)
        return true
      case 'PageDown':
        highlight(activeIndex + 8)
        return true
      case 'PageUp':
        highlight(activeIndex - 8)
        return true
      case 'Home':
        if (fromFilter) return false
        highlight(0)
        return true
      case 'End':
        if (fromFilter) return false
        highlight(rows.length - 1)
        return true
      case 'Enter':
        // With a filter that matches nothing, don't fall through to "Up a level".
        if (current && (!current.up || filter.trim() === '')) open(current.path)
        return true
      case 'Backspace':
        if (fromFilter && filter !== '') return false
        if (value !== '') open(rows.find((r) => r.up)?.path ?? '')
        return true
    }
    if (!fromFilter && /^[a-z0-9]$/i.test(event.key)) {
      const index = letterJump(rows, event.key.toLowerCase(), activeIndex)
      if (index >= 0) highlight(index)
      return true
    }
    return false
  }

  // Pointer over the list: keys drive the list without clicking it first
  // (clicking would open a folder). Typing in other text boxes is left alone.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!hovering.current || isOtherTextInput(event.target, filterRef.current)) return
      if (event.target === filterRef.current) return // the filter's own handler deals with it
      if (handleKey(event, false)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <Flex direction="column" gap="2" className="picker">
      {shortcuts.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {shortcuts.map((s) => (
            <Button key={s.label} type="button" size="1" variant={value === s.path ? 'solid' : 'soft'} color="gray" onClick={() => open(s.path)}>
              {s.label}
            </Button>
          ))}
        </Flex>
      )}

      <Flex align="center" gap="1" wrap="wrap" className="picker-path">
        <button type="button" className="picker-crumb" onClick={() => open('')}>
          Video
        </button>
        {segments.map((name, i) => (
          <Fragment key={i}>
            <ChevronRight size={13} aria-hidden />
            <button type="button" className="picker-crumb" onClick={() => open(segments.slice(0, i + 1).join('/'))}>
              {name}
            </button>
          </Fragment>
        ))}
      </Flex>

      {error ? (
        <Callout.Root color="red" size="1">
          <Callout.Text>{error.message}</Callout.Text>
        </Callout.Root>
      ) : (
        <>
          <TextField.Root
            ref={filterRef}
            size="1"
            placeholder="Filter folders (↑ ↓ to pick, Enter to open)"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setActive({ folder: value, key: null })
            }}
            onKeyDown={(e) => {
              if (handleKey(e, true)) e.preventDefault()
            }}
            aria-label="Filter folders"
          >
            <TextField.Slot>
              <Search size={13} />
            </TextField.Slot>
          </TextField.Root>
          <ScrollArea
            type="auto"
            scrollbars="vertical"
            className="picker-list"
            onMouseEnter={() => (hovering.current = true)}
            onMouseLeave={() => (hovering.current = false)}
          >
            <div ref={listRef} role="listbox" aria-label="Folders">
              {isPending
                ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height="28px" my="1" />)
                : rows.map((row, index) => (
                    <button
                      type="button"
                      key={row.key}
                      role="option"
                      aria-selected={index === activeIndex}
                      tabIndex={-1}
                      className={`picker-item${index === activeIndex ? ' is-active' : ''}`}
                      onClick={() => open(row.path)}
                    >
                      {row.up ? <CornerLeftUp size={14} aria-hidden /> : <Folder size={14} aria-hidden />} {row.name}
                    </button>
                  ))}
              {data && rows.filter((r) => !r.up).length === 0 && (
                <Text as="p" size="1" color="gray" m="2">
                  {filter ? `No folders match "${filter}".` : 'No sub-folders.'}
                </Text>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </Flex>
  )
}
