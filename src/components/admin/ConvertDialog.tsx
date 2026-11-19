import { Badge, Button, Callout, Dialog, Flex, Select, Skeleton, Text } from '@radix-ui/themes'
import { useState } from 'react'
import { useConvertJobs, useConvertPresets, useStartConvert } from '../../api/admin'
import type { LibraryItem } from '../../api/types'
import { formatDate } from '../../lib/format'
import { ResultList } from './ResultList'

const STATUS_COLOR: Record<string, 'grass' | 'orange' | 'red' | 'gray'> = {
  finished: 'grass',
  processing: 'orange',
  waiting: 'gray',
  error: 'red',
}

/** Send files to CloudConvert with a preset, and watch recent jobs. */
export function ConvertDialog({ folder, items, onClose }: { folder: string; items: LibraryItem[]; onClose: () => void }) {
  const presets = useConvertPresets(true)
  const configured = presets.data?.configured ?? false
  const jobs = useConvertJobs(configured)
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

          {configured && (
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Recent jobs {jobs.data?.active && <Badge color="orange">updating</Badge>}
              </Text>
              {jobs.error && (
                <Text size="2" color="red">
                  {jobs.error.message}
                </Text>
              )}
              <Flex direction="column" gap="1" className="job-list">
                {jobs.data?.jobs.length === 0 && (
                  <Text size="2" color="gray">
                    No recent jobs.
                  </Text>
                )}
                {jobs.data?.jobs.slice(0, 8).map((job) => (
                  <Flex key={job.id} align="center" justify="between" gap="3">
                    <Text size="2" truncate>
                      {job.tag ?? job.id}
                    </Text>
                    <Flex gap="2" align="center" flexShrink="0">
                      <Text size="1" color="gray">
                        {formatDate(job.created)}
                      </Text>
                      <Badge color={STATUS_COLOR[job.status] ?? 'gray'}>{job.status}</Badge>
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          )}
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
