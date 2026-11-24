import { Button, Callout, Dialog, Flex, Select, Spinner, Text, TextField } from '@radix-ui/themes'
import { CircleCheck, CircleX } from 'lucide-react'
import { useState } from 'react'
import { useExtract, useExtractJob } from '../../api/admin'
import type { LibraryItem } from '../../api/types'
import { FolderPicker } from './FolderPicker'

/** Extract an archive on media02, in the background (port of "Extract Files"). */
export function ExtractDialog({
  folder,
  archives,
  initial,
  onClose,
  onDone,
  onStarted,
}: {
  folder: string
  archives: LibraryItem[]
  initial?: string
  onClose: () => void
  onDone: (message: string) => void
  /** the page watches the job, so the list refreshes even if this is closed */
  onStarted: (id: string, archive: string) => void
}) {
  const start = useExtract()
  const [archive, setArchive] = useState(initial ?? archives[0]?.name ?? '')
  const [destination, setDestination] = useState(folder)
  const [newFolder, setNewFolder] = useState('')
  const job = useExtractJob(start.data?.id ?? null)
  const status = job.data?.status ?? start.data?.status

  const submit = () =>
    start.mutate(
      { path: folder, name: archive, destination, newFolder: newFolder.trim() || undefined },
      { onSuccess: (job) => onStarted(job.id, archive) },
    )

  const finish = () => {
    if (status === 'done') onDone(`Extracted ${archive}.`)
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && finish()}>
      <Dialog.Content maxWidth="560px">
        <Dialog.Title>Extract an archive</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Big archives can take several minutes. You can close this window; extraction carries on.
        </Dialog.Description>

        {!start.data ? (
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text size="2" weight="bold">
                Archive
              </Text>
              <Select.Root value={archive} onValueChange={setArchive}>
                <Select.Trigger />
                <Select.Content position="popper">
                  {archives.map((a) => (
                    <Select.Item key={a.name} value={a.name}>
                      {a.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Extract into
              </Text>
              <FolderPicker
                server="media02"
                value={destination}
                onChange={setDestination}
                shortcuts={[
                  { label: 'This folder', path: folder },
                  { label: 'Movies', path: 'Movies' },
                  { label: 'TV', path: 'TV' },
                ]}
              />
              <TextField.Root placeholder="New sub-folder (optional), e.g. Show/Series 1 (2026)" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
            </Flex>
          </Flex>
        ) : (
          <Callout.Root color={status === 'done' ? 'grass' : status === 'failed' ? 'red' : 'blue'}>
            <Callout.Icon>
              {status === 'done' ? <CircleCheck size={16} /> : status === 'failed' ? <CircleX size={16} /> : <Spinner size="1" />}
            </Callout.Icon>
            <Callout.Text>
              {status === 'done' && (
                <>
                  <strong>{archive}</strong> was extracted into {job.data?.destinationPath || 'the library root'}.
                </>
              )}
              {status === 'failed' && <>Extraction failed: {job.data?.error}</>}
              {(status === 'queued' || status === 'running') && <>Extracting {archive}…</>}
            </Callout.Text>
          </Callout.Root>
        )}

        {start.error && (
          <Callout.Root color="red" mt="3">
            <Callout.Text>{start.error.message}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" mt="5" justify="end">
          <Button variant="soft" color="gray" onClick={finish}>
            {start.data ? 'Close' : 'Cancel'}
          </Button>
          {!start.data && (
            <Button onClick={submit} loading={start.isPending} disabled={!archive}>
              Extract
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
