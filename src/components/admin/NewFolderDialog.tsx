import { Button, Callout, Dialog, Flex, Text, TextField } from '@radix-ui/themes'
import { useState, type FormEvent } from 'react'
import { useCreateFolder, type Server } from '../../api/admin'
import { suggestedFolderName } from '../../lib/paths'
import { ServerToggle } from './ServerToggle'

/** Create a sub-folder here, on media02 or media01. */
export function NewFolderDialog({
  folder,
  media01Available,
  media01Reason,
  browsing,
  onClose,
  onDone,
}: {
  folder: string
  media01Available: boolean
  media01Reason?: string | null
  /** the server whose listing is on screen */
  browsing: Server
  onClose: () => void
  onDone: (message: string) => void
}) {
  const create = useCreateFolder()
  const [server, setServer] = useState<Server>(browsing)
  const [name, setName] = useState(() => suggestedFolderName(folder))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await create.mutateAsync({ server, path: folder, name: name.trim() })
    onDone(`Created "${name.trim()}" on ${server}.`)
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="460px">
        <Dialog.Title>New folder</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Creates a folder inside {folder ? <strong>{folder.split('/').pop()}</strong> : 'the library root'}.
        </Dialog.Description>
        <form onSubmit={submit}>
          <Flex direction="column" gap="4">
            <ServerToggle value={server} onChange={setServer} media01Available={media01Available} media01Reason={media01Reason} locked={browsing === 'media01'} />
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="bold" htmlFor="new-folder-name">
                Name
              </Text>
              <TextField.Root id="new-folder-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Flex>
          </Flex>
          {create.error && (
            <Callout.Root color="red" mt="3">
              <Callout.Text>{create.error.message}</Callout.Text>
            </Callout.Root>
          )}
          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
              Create folder
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}
