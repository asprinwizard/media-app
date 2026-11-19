import { Button, Callout, Dialog, Flex, IconButton, Select, Spinner, Text } from '@radix-ui/themes'
import { Cast, Download, Info, X } from 'lucide-react'
import { Link } from 'react-router'
import { usePlay } from '../api/hooks'
import { castRoute, downloadUrl } from '../lib/paths'

/**
 * Plays a file in a dialog, with a picker for other media in the same folder
 * (port of the fancybox player and its "Select another file" dropdown).
 */
export function PlayerDialog({ path, onChange }: { path: string | null; onChange: (path: string | null) => void }) {
  const { data, isPending, error } = usePlay(path)

  return (
    <Dialog.Root open={path !== null} onOpenChange={(open) => !open && onChange(null)}>
      <Dialog.Content maxWidth="960px" className="player-dialog" aria-describedby={undefined}>
        <Flex align="center" gap="3" mb="3">
          <Dialog.Title size="3" mb="0" className="truncate" style={{ flex: 1 }}>
            {data?.name ?? 'Loading…'}
          </Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost" color="gray" aria-label="Close player">
              <X size={18} />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {isPending && path !== null && (
          <Flex className="screen" align="center" justify="center">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Callout.Root color="red">
            <Callout.Text>{error.message}</Callout.Text>
          </Callout.Root>
        )}

        {data && !data.streamable && (
          <Callout.Root color="amber" mb="3">
            <Callout.Icon>
              <Info size={16} />
            </Callout.Icon>
            <Callout.Text>
              This file ({data.mime}) usually can't play in a browser. Download it and play it with a media player instead.
            </Callout.Text>
          </Callout.Root>
        )}

        {data && (
          // key: a fresh element per file so the new source starts cleanly
          <video key={data.src} className="screen" src={data.src} controls autoPlay playsInline />
        )}

        {data && (
          <Flex gap="3" align="center" mt="3" wrap="wrap">
            {data.siblings.length > 1 && (
              <Flex gap="2" align="center" className="sibling-picker">
                <Text size="2" color="gray">
                  Also in this folder
                </Text>
                <Select.Root value={data.path} onValueChange={(next) => onChange(next)}>
                  <Select.Trigger variant="surface" className="sibling-trigger" />
                  <Select.Content position="popper">
                    {data.siblings.map((sibling) => (
                      <Select.Item key={sibling.path} value={sibling.path}>
                        {sibling.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            )}
            <Flex gap="2" ml="auto">
              <Button asChild variant="soft" size="2">
                <a href={downloadUrl(data.path)} download>
                  <Download size={15} /> Download
                </a>
              </Button>
              <Button asChild variant="outline" color="gray" size="2">
                <Link to={castRoute(data.path)} target="_blank">
                  <Cast size={15} /> Cast
                </Link>
              </Button>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
