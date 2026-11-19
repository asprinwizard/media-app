import { Callout, Code, DataList, Dialog, Flex, Heading, IconButton, ScrollArea, Skeleton, Text } from '@radix-ui/themes'
import { X } from 'lucide-react'
import { useFileInfo } from '../api/hooks'
import { formatBytes, formatDateLong } from '../lib/format'

function Section({ title, values }: { title: string; values: Record<string, string | number | boolean> }) {
  const entries = Object.entries(values)
  if (entries.length === 0) return null
  return (
    <>
      <Heading as="h3" size="2" color="gray" className="section-title">
        {title}
      </Heading>
      <DataList.Root size="2">
        {entries.map(([key, value]) => (
          <DataList.Item key={key}>
            <DataList.Label minWidth="120px">{key.replace(/_/g, ' ')}</DataList.Label>
            <DataList.Value className="break">{String(value)}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>
    </>
  )
}

/**
 * File properties in a side panel (port of xhr_file_info.php). Everyone sees
 * the basics; admins also get path, dates, codec details and the raw dump.
 */
export function FileInfoDialog({ path, onClose }: { path: string | null; onClose: () => void }) {
  const { data, isPending, error } = useFileInfo(path)

  return (
    <Dialog.Root open={path !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content className="sheet" aria-describedby={undefined}>
        <Flex align="center" gap="3" mb="4">
          <Dialog.Title size="4" mb="0" style={{ flex: 1 }}>
            File info
          </Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost" color="gray" aria-label="Close file info">
              <X size={18} />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {error && (
          <Callout.Root color="red">
            <Callout.Text>{error.message}</Callout.Text>
          </Callout.Root>
        )}

        <Skeleton loading={isPending && path !== null}>
          <DataList.Root size="2">
            <DataList.Item>
              <DataList.Label minWidth="120px">File name</DataList.Label>
              <DataList.Value className="break">{data?.general.name ?? 'placeholder name'}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="120px">Size</DataList.Label>
              <DataList.Value>{formatBytes(data?.general.size)}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="120px">Format</DataList.Label>
              <DataList.Value>{[data?.general.format, data?.general.mime].filter(Boolean).join(' · ') || '—'}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label minWidth="120px">Duration</DataList.Label>
              <DataList.Value>{data?.general.duration ?? '—'}</DataList.Value>
            </DataList.Item>
          </DataList.Root>
        </Skeleton>

        {data?.admin && (
          <>
            <Heading as="h3" size="2" color="gray" className="section-title">
              Admin
            </Heading>
            <DataList.Root size="2">
              <DataList.Item>
                <DataList.Label minWidth="120px">Path</DataList.Label>
                <DataList.Value>
                  <Code variant="ghost" className="break">
                    {data.admin.path}
                  </Code>
                </DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="120px">Created</DataList.Label>
                <DataList.Value>{formatDateLong(data.admin.created)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="120px">Modified</DataList.Label>
                <DataList.Value>{formatDateLong(data.admin.modified)}</DataList.Value>
              </DataList.Item>
            </DataList.Root>
            <Section title="Video" values={data.admin.video} />
            <Section title="Audio" values={data.admin.audio} />
            <Section title="Comments" values={data.admin.comments} />
            <details className="raw">
              <summary>
                <Text size="2">Raw getID3 data</Text>
              </summary>
              <ScrollArea type="auto" scrollbars="both" style={{ maxHeight: 360 }}>
                <pre>{JSON.stringify(data.admin.raw, null, 2)}</pre>
              </ScrollArea>
            </details>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
