import { Button, Callout, Flex, ScrollArea, Skeleton, Text } from '@radix-ui/themes'
import { ChevronRight, CornerLeftUp, Folder } from 'lucide-react'
import { Fragment } from 'react'
import { useFolders, type Server } from '../../api/admin'
import { parentPath } from '../../lib/paths'

/**
 * Browse to a destination folder on a server (replaces the old cascading
 * dropdowns). The chosen folder is the one shown in the path; clicking a
 * sub-folder goes into it. Optional shortcuts jump straight to common roots.
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

  return (
    <Flex direction="column" gap="2" className="picker">
      {shortcuts.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {shortcuts.map((s) => (
            <Button key={s.label} type="button" size="1" variant={value === s.path ? 'solid' : 'soft'} color="gray" onClick={() => onChange(s.path)}>
              {s.label}
            </Button>
          ))}
        </Flex>
      )}

      <Flex align="center" gap="1" wrap="wrap" className="picker-path">
        <button type="button" className="picker-crumb" onClick={() => onChange('')}>
          Video
        </button>
        {segments.map((name, i) => (
          <Fragment key={i}>
            <ChevronRight size={13} aria-hidden />
            <button type="button" className="picker-crumb" onClick={() => onChange(segments.slice(0, i + 1).join('/'))}>
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
        <ScrollArea type="auto" scrollbars="vertical" className="picker-list">
          {value !== '' && (
            <button type="button" className="picker-item" onClick={() => onChange(parentPath(value))}>
              <CornerLeftUp size={14} aria-hidden /> Up a level
            </button>
          )}
          {isPending
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height="28px" my="1" />)
            : data?.folders.map((folder) => (
                <button type="button" key={folder.path} className="picker-item" onClick={() => onChange(folder.path)}>
                  <Folder size={14} aria-hidden /> {folder.name}
                </button>
              ))}
          {data && data.folders.length === 0 && (
            <Text as="p" size="1" color="gray" m="2">
              No sub-folders.
            </Text>
          )}
        </ScrollArea>
      )}
    </Flex>
  )
}
