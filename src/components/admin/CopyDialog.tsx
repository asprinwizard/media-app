import { Button, Callout, Checkbox, Dialog, Flex, ScrollArea, Text, TextField } from '@radix-ui/themes'
import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useQueueCopy } from '../../api/admin'
import type { LibraryItem } from '../../api/types'
import { FileTypeIcon } from '../FileTypeIcon'
import { FolderPicker } from './FolderPicker'

/**
 * Queue files for copying to media01 (port of the old "Copy Files" panel).
 * The copy happens in the hourly queue run (:35 past, 07:00–23:00).
 */
export function CopyDialog({
  folder,
  items,
  onClose,
  onShowQueue,
}: {
  folder: string
  items: LibraryItem[]
  onClose: () => void
  onShowQueue: () => void
}) {
  const queue = useQueueCopy()
  const [destination, setDestination] = useState(folder.startsWith('Movies') || folder.startsWith('TV') ? folder : 'TV')
  const [newFolder, setNewFolder] = useState('')
  const [hd, setHd] = useState(false)
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.name, i.suggestedName || i.name])),
  )

  const submit = () =>
    queue.mutate({
      path: folder,
      destination,
      newFolder: newFolder.trim() || undefined,
      hd,
      files: items.map((i) => ({ name: i.name, newName: names[i.name] })),
    })

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="620px">
        <Dialog.Title>Copy to media01</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Files are added to the copy queue, which runs at 35 minutes past each hour between 07:00 and 23:00.
        </Dialog.Description>

        {queue.data ? (
          <Callout.Root color="grass">
            <Callout.Icon>
              <Clock size={16} />
            </Callout.Icon>
            <Callout.Text>
              Queued {queue.data.queued === 1 ? '1 file' : `${queue.data.queued} files`} for <strong>{queue.data.destination}</strong> on
              media01. They'll copy in the next queue run.{' '}
              <button type="button" className="link-button" onClick={onShowQueue}>
                View the queue
              </button>
            </Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Destination on media01
              </Text>
              <FolderPicker
                server="media01"
                value={destination}
                onChange={setDestination}
                shortcuts={[
                  { label: 'Movies', path: 'Movies' },
                  { label: 'TV', path: 'TV' },
                ]}
              />
              <TextField.Root placeholder="New sub-folder (optional), e.g. Show/Series 1 (2026)" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
              <Text as="label" size="2">
                <Flex gap="2" align="center">
                  <Checkbox checked={hd} onCheckedChange={(c) => setHd(c === true)} /> Put them in an HD sub-folder
                </Flex>
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Names on media01
              </Text>
              <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 220 }}>
                <Flex direction="column" gap="2" pr="3">
                  {items.map((item) => (
                    <Flex key={item.name} align="center" gap="2">
                      <FileTypeIcon type={item.type} />
                      <TextField.Root
                        style={{ flex: 1 }}
                        value={names[item.name] ?? ''}
                        onChange={(e) => setNames({ ...names, [item.name]: e.target.value })}
                        aria-label={`Name on media01 for ${item.name}`}
                        title={item.name}
                      />
                    </Flex>
                  ))}
                </Flex>
              </ScrollArea>
              <Text size="1" color="gray">
                " (SD)" is dropped from .mp4 names on media01, as before.
              </Text>
            </Flex>
          </Flex>
        )}

        {queue.error && (
          <Callout.Root color="red" mt="3">
            <Callout.Text>{queue.error.message}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              {queue.data ? 'Done' : 'Cancel'}
            </Button>
          </Dialog.Close>
          {!queue.data && (
            <Button onClick={submit} loading={queue.isPending} disabled={!destination || items.some((i) => !names[i.name]?.trim())}>
              Add to queue
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
