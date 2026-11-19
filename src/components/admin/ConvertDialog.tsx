import { Button, Callout, Dialog, Flex, Select, Skeleton, Text } from '@radix-ui/themes'
import { useState } from 'react'
import { useConvertPresets, useStartConvert } from '../../api/admin'
import type { LibraryItem } from '../../api/types'
import { ConvertJobsList } from './ConvertJobsList'
import { ResultList } from './ResultList'

/** Send files to CloudConvert with a preset, and watch recent jobs. */
export function ConvertDialog({ folder, items, onClose }: { folder: string; items: LibraryItem[]; onClose: () => void }) {
  const presets = useConvertPresets(true)
  const configured = presets.data?.configured ?? false
  const start = useStartConvert()
  const [preset, setPreset] = useState<string>('')
  const chosen = preset || presets.data?.presets[0]?.key || ''
  const input = presets.data?.presets.find((p) => p.key === chosen)?.input

  const eligible = input ? items.filter((i) => i.name.toLowerCase().endsWith(`.${input}`)) : items

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>Convert with CloudConvert</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          CloudConvert fetches each file from media02, converts it, and puts the result in /home/ftp/media/cloudconvert.
        </Dialog.Description>

        {presets.data && !configured && (
          <Callout.Root color="amber" mb="3">
            <Callout.Text>
              Convert isn't set up yet: the CloudConvert API key and SFTP login need adding to media-api's .env on the server.
            </Callout.Text>
          </Callout.Root>
        )}

        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Text size="2" weight="bold">
              Preset
            </Text>
            <Skeleton loading={presets.isPending}>
              <Select.Root value={chosen} onValueChange={setPreset}>
                <Select.Trigger />
                <Select.Content position="popper">
                  {presets.data?.presets.map((p) => (
                    <Select.Item key={p.key} value={p.key}>
                      {p.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Skeleton>
          </Flex>

          <Text size="2">
            {eligible.length === items.length
              ? `${items.length === 1 ? '1 file' : `${items.length} files`} will be converted.`
              : `${eligible.length} of ${items.length} selected files can use this preset (it takes .${input} files).`}
          </Text>

          {start.data && start.data.ok && (
            <Callout.Root color="grass">
              <Callout.Text>Started {start.data.results.length === 1 ? '1 job' : `${start.data.results.length} jobs`}. Progress shows below.</Callout.Text>
            </Callout.Root>
          )}
          {start.data && <ResultList results={start.data.results} verb="started" />}
          {start.error && (
            <Callout.Root color="red">
              <Callout.Text>{start.error.message}</Callout.Text>
            </Callout.Root>
          )}

          {configured && <ConvertJobsList />}
        </Flex>

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
          <Button
            onClick={() => start.mutate({ path: folder, names: eligible.map((i) => i.name), preset: chosen })}
            loading={start.isPending}
            disabled={!configured || !chosen || eligible.length === 0 || !!start.data?.ok}
          >
            Convert {eligible.length === 1 ? '1 file' : `${eligible.length} files`}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
