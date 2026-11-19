import { Button, Callout, Checkbox, Dialog, Flex, ScrollArea, SegmentedControl, Text, TextField } from '@radix-ui/themes'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useMoveItems, type Server } from '../../api/admin'
import type { LibraryItem } from '../../api/types'
import { FileTypeIcon } from '../FileTypeIcon'
import { FolderPicker } from './FolderPicker'
import { ResultList } from './ResultList'
import { ServerToggle } from './ServerToggle'

interface Props {
  folder: string
  items: LibraryItem[]
  media01Available: boolean
  media01Reason?: string | null
  /** the server whose listing is on screen */
  browsing: Server
  onClose: () => void
  onDone: (message: string) => void
}

/**
 * Move and/or rename the selected files and folders (ports of the old
 * "Move/Rename Files" and "Move/Rename Folders" panels). File names start as
 * the smart suggestions, as before.
 */
export function MoveDialog({ folder, items, media01Available, media01Reason, browsing, onClose, onDone }: Props) {
  const move = useMoveItems()
  const [server, setServer] = useState<Server>(browsing)
  const [where, setWhere] = useState<'same' | 'other'>('same')
  const [destination, setDestination] = useState(folder)
  const [newFolder, setNewFolder] = useState('')
  const [suggest, setSuggest] = useState(true)
  const initial = (item: LibraryItem, useSuggestion: boolean) => (useSuggestion && item.suggestedName) || item.name
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.name, initial(i, true)])),
  )

  const toggleSuggestions = (on: boolean) => {
    setSuggest(on)
    setNames(Object.fromEntries(items.map((i) => [i.name, initial(i, on)])))
  }

  const submit = async () => {
    const result = await move.mutateAsync({
      server,
      path: folder,
      destination: where === 'other' ? destination : null,
      newFolder: newFolder.trim() || undefined,
      items: items.map((i) => ({ name: i.name, newName: names[i.name] })),
    })
    if (result.ok) {
      onDone(`${items.length === 1 ? 'Moved/renamed 1 item' : `Moved/renamed ${items.length} items`} on ${server}.`)
      onClose()
    }
  }

  const hasSuggestions = items.some((i) => i.suggestedName && i.suggestedName !== i.name)

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="620px">
        <Dialog.Title>Move or rename {items.length === 1 ? '1 item' : `${items.length} items`}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Change names below, and pick a different folder if you want to move them.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <ServerToggle value={server} onChange={setServer} media01Available={media01Available} media01Reason={media01Reason} locked={browsing === 'media01'} />

          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              Destination
            </Text>
            <SegmentedControl.Root value={where} onValueChange={(v) => setWhere(v as 'same' | 'other')}>
              <SegmentedControl.Item value="same">Same folder</SegmentedControl.Item>
              <SegmentedControl.Item value="other">Another folder</SegmentedControl.Item>
            </SegmentedControl.Root>
            {where === 'other' && (
              <FolderPicker
                key={server}
                server={server}
                value={destination}
                onChange={setDestination}
                shortcuts={[
                  { label: 'Movies', path: 'Movies' },
                  { label: 'TV', path: 'TV' },
                  ...(server === 'media02'
                    ? [
                        { label: 'Torrent Downloads', path: 'Torrent Downloads' },
                        { label: 'Uploaded Files', path: 'Uploaded Files' },
                      ]
                    : []),
                ]}
              />
            )}
            <TextField.Root placeholder="New sub-folder (optional)" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
          </Flex>

          <Flex direction="column" gap="2">
            <Flex align="center" justify="between">
              <Text size="2" weight="bold">
                Names
              </Text>
              {hasSuggestions && (
                <Text as="label" size="2">
                  <Flex gap="2" align="center">
                    <Checkbox checked={suggest} onCheckedChange={(c) => toggleSuggestions(c === true)} />
                    <Sparkles size={14} aria-hidden /> Smart names
                  </Flex>
                </Text>
              )}
            </Flex>
            <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 260 }}>
              <Flex direction="column" gap="2" pr="3">
                {items.map((item) => (
                  <Flex key={item.name} align="center" gap="2">
                    <FileTypeIcon type={item.type} />
                    <TextField.Root
                      style={{ flex: 1 }}
                      value={names[item.name] ?? ''}
                      onChange={(e) => setNames({ ...names, [item.name]: e.target.value })}
                      aria-label={`New name for ${item.name}`}
                      title={item.name}
                    />
                  </Flex>
                ))}
              </Flex>
            </ScrollArea>
          </Flex>
        </Flex>

        {move.error && (
          <Callout.Root color="red" mt="3">
            <Callout.Text>{move.error.message}</Callout.Text>
          </Callout.Root>
        )}
        {move.data && <ResultList results={move.data.results} verb="moved" />}

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              {move.data && !move.data.ok ? 'Close' : 'Cancel'}
            </Button>
          </Dialog.Close>
          <Button onClick={submit} loading={move.isPending} disabled={items.some((i) => !names[i.name]?.trim())}>
            Move / rename
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
