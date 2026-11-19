import { AlertDialog, Button, Callout, Flex, ScrollArea, Text } from '@radix-ui/themes'
import { useState } from 'react'
import { useDeleteItems, type Server } from '../../api/admin'
import type { LibraryItem } from '../../api/types'
import { ResultList } from './ResultList'
import { ServerToggle } from './ServerToggle'

/** Delete the selected files/folders on media02 or media01, after confirming. */
export function DeleteDialog({
  folder,
  items,
  media01Available,
  media01Reason,
  browsing,
  onClose,
  onDone,
}: {
  folder: string
  items: LibraryItem[]
  media01Available: boolean
  media01Reason?: string | null
  /** the server whose listing is on screen */
  browsing: Server
  onClose: () => void
  onDone: (message: string) => void
}) {
  const remove = useDeleteItems()
  const [server, setServer] = useState<Server>(browsing)
  const folders = items.filter((i) => i.type === 'folder').length

  const submit = async () => {
    const result = await remove.mutateAsync({ server, path: folder, names: items.map((i) => i.name) })
    if (result.ok) {
      onDone(`Deleted ${items.length === 1 ? '1 item' : `${items.length} items`} on ${server}.`)
      onClose()
    }
  }

  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Content maxWidth="520px">
        <AlertDialog.Title>Delete {items.length === 1 ? '1 item' : `${items.length} items`}?</AlertDialog.Title>
        <AlertDialog.Description size="2" mb="3">
          This permanently removes {items.length === 1 ? 'it' : 'them'} from <strong>{server}</strong>
          {folders > 0 && ', including everything inside the selected folders'}. It can't be undone.
        </AlertDialog.Description>

        <ServerToggle value={server} onChange={setServer} media01Available={media01Available} media01Reason={media01Reason} locked={browsing === 'media01'} />

        <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 180 }} mt="3">
          <ul className="result-list">
            {items.map((i) => (
              <li key={i.name}>
                <Text size="2">
                  {i.name}
                  {i.type === 'folder' && ' (folder)'}
                </Text>
              </li>
            ))}
          </ul>
        </ScrollArea>

        {remove.error && (
          <Callout.Root color="red" mt="3">
            <Callout.Text>{remove.error.message}</Callout.Text>
          </Callout.Root>
        )}
        {remove.data && <ResultList results={remove.data.results} verb="deleted" />}

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {remove.data && !remove.data.ok ? 'Close' : 'Cancel'}
            </Button>
          </AlertDialog.Cancel>
          <Button color="red" onClick={submit} loading={remove.isPending}>
            Delete {server === 'media01' ? 'on media01' : ''}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}
