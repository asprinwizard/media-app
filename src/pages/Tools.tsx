import { Badge, Button, Callout, Card, Flex, Heading, IconButton, Progress, SegmentedControl, Skeleton, Spinner, TabNav, Text, Tooltip } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FolderOpen, HardDrive, RefreshCw, Server, SquareTerminal } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { rescanLatest, useDrives, useLatestFiles, type DriveReport } from '../api/ops'
import { useMe } from '../api/useMe'
import { FileTypeIcon } from '../components/FileTypeIcon'
import { PageHeader } from '../components/PageHeader'
import { formatBytes, formatDate } from '../lib/format'
import { libraryRoute } from '../lib/paths'

const STATE_COLOR: Record<string, 'grass' | 'amber' | 'gray'> = {
  'active/idle': 'grass',
  active: 'grass',
  idle: 'grass',
  standby: 'amber',
  sleeping: 'gray',
}

function ServerDrives({ server }: { server: 'media02' | 'media01' }) {
  const drives = useDrives(server)
  const data: DriveReport | undefined = drives.data

  return (
    <Card size="2">
      <Flex justify="between" align="center" mb="3">
        <Heading as="h2" size="4">
          {server}
        </Heading>
        <Tooltip content="Refresh">
          <IconButton size="1" variant="ghost" color="gray" aria-label={`Refresh ${server}`} onClick={() => void drives.refetch()} loading={drives.isFetching}>
            <RefreshCw size={14} />
          </IconButton>
        </Tooltip>
      </Flex>

      {drives.isPending && (
        <Flex direction="column" gap="2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height="22px" />
          ))}
        </Flex>
      )}
      {(drives.error || data?.error) && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{drives.error?.message ?? data?.error}</Callout.Text>
        </Callout.Root>
      )}

      {data && !data.error && (
        <Flex direction="column" gap="4">
          <div>
            <Text as="div" size="2" weight="bold" mb="2">
              Space
            </Text>
            <Flex direction="column" gap="2">
              {data.space.map((d) => (
                <div key={d.mount}>
                  <Flex justify="between" gap="3">
                    <Text size="2" truncate title={`${d.filesystem} on ${d.mount}`}>
                      {d.mount}
                    </Text>
                    <Text size="1" color={d.percent >= 95 ? 'red' : 'gray'} style={{ flexShrink: 0 }}>
                      {formatBytes(d.available)} free of {formatBytes(d.size)}
                    </Text>
                  </Flex>
                  <Progress size="1" mt="1" value={d.percent} color={d.percent >= 95 ? 'red' : d.percent >= 90 ? 'amber' : undefined} />
                </div>
              ))}
            </Flex>
          </div>

          <div>
            <Text as="div" size="2" weight="bold" mb="2">
              Drives
            </Text>
            <Flex gap="2" wrap="wrap">
              {data.drives.length === 0 && (
                <Text size="2" color="gray">
                  None found.
                </Text>
              )}
              {data.drives.map((d) => (
                <Badge key={d.device} color={STATE_COLOR[d.state] ?? 'gray'} variant="soft" size="2">
                  <HardDrive size={12} /> {d.device.replace('/dev/', '')}: {d.state}
                </Badge>
              ))}
            </Flex>
            <Text as="p" size="1" color="gray" mt="1">
              Standby and sleeping drives spin up the next time they're read.
            </Text>
          </div>

          <div>
            <Text as="div" size="2" weight="bold" mb="2">
              Folder links
            </Text>
            <ul className="plain-list">
              {data.links.map((l) => (
                <li key={l.folder}>
                  <Text size="2">{l.folder}</Text>
                  <Text size="1" color={l.kind === 'missing' ? 'red' : 'gray'} className="mono">
                    {l.kind === 'link' ? `→ ${l.target}` : l.kind === 'dir' ? 'a folder (not a link)' : 'missing'}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        </Flex>
      )}
    </Card>
  )
}

function Drives() {
  return (
    <div className="grid-2">
      <ServerDrives server="media02" />
      <ServerDrives server="media01" />
    </div>
  )
}

function Latest() {
  const [server, setServer] = useState<'media02' | 'media01'>('media02')
  const latest = useLatestFiles(server)
  const client = useQueryClient()
  const [rescanning, setRescanning] = useState(false)
  const [rescanError, setRescanError] = useState<string | null>(null)
  const items = latest.data?.pages.flatMap((p) => p.items) ?? []
  const first = latest.data?.pages[0]

  const rescan = async () => {
    setRescanning(true)
    setRescanError(null)
    try {
      const page = await rescanLatest(server)
      client.setQueryData(['tools', 'latest', server], { pages: [page], pageParams: [1] })
    } catch (error) {
      setRescanError(error instanceof Error ? error.message : 'The scan failed.')
    } finally {
      setRescanning(false)
    }
  }

  return (
    <>
      <Flex gap="3" align="center" wrap="wrap" mb="3">
        <SegmentedControl.Root value={server} onValueChange={(v) => setServer(v as 'media02' | 'media01')} aria-label="Server">
          <SegmentedControl.Item value="media02">media02</SegmentedControl.Item>
          <SegmentedControl.Item value="media01">media01</SegmentedControl.Item>
        </SegmentedControl.Root>
        {first && (
          <Text size="1" color="gray">
            Scanned {formatDate(first.scanned)} · newest {first.total} files
          </Text>
        )}
        <Button variant="soft" color="gray" ml="auto" onClick={rescan} loading={rescanning} disabled={latest.isPending}>
          <RefreshCw size={14} /> Scan again
        </Button>
      </Flex>

      {(latest.isPending || rescanning) && (
        <Callout.Root color="blue" mb="3">
          <Callout.Icon>
            <Spinner size="1" />
          </Callout.Icon>
          <Callout.Text>Scanning every drive on {server}. This wakes them all and can take a few minutes.</Callout.Text>
        </Callout.Root>
      )}
      {(latest.error || rescanError) && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>{rescanError ?? latest.error?.message}</Callout.Text>
        </Callout.Root>
      )}

      {items.length > 0 && (
        <Card size="1" className="lib-card">
          <ul className="rows">
            {items.map((item) => (
              <li key={item.path} className="row">
                <FileTypeIcon type={item.type} />
                <span className="row-name latest-name">
                  <Text size="2">{item.name}</Text>
                  <Link to={libraryRoute(item.folder, server)} className="latest-folder">
                    <FolderOpen size={12} aria-hidden /> {item.folder || 'Video'}
                  </Link>
                </span>
                <Text className="row-meta" size="1" color="gray">
                  {formatBytes(item.size)}
                </Text>
                <Text className="row-meta row-date" size="1" color="gray">
                  {formatDate(item.mtime)}
                </Text>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {latest.hasNextPage && (
        <Flex justify="center" mt="3">
          <Button variant="soft" onClick={() => void latest.fetchNextPage()} loading={latest.isFetchingNextPage}>
            Load more
          </Button>
        </Flex>
      )}
    </>
  )
}

function Links() {
  const links = useMe().data?.links ?? {}
  const external = [
    links.ssh && { href: links.ssh, title: 'SSH console', text: 'A terminal on media02 in the browser.', icon: <SquareTerminal size={20} /> },
    links.transmission && { href: links.transmission, title: 'Transmission', text: 'The torrent client’s web interface.', icon: <ExternalLink size={20} /> },
  ].filter(Boolean) as { href: string; title: string; text: string; icon: React.ReactNode }[]

  return (
    <div className="grid-2">
      <Card asChild size="2">
        <Link to={libraryRoute('', 'media01')} className="tool-link">
          <Flex gap="3" align="center">
            <Server size={20} />
            <div>
              <Text as="div" weight="bold">
                Browse media01
              </Text>
              <Text as="div" size="2" color="gray">
                The archive server's library, with move, rename, new folder and delete.
              </Text>
            </div>
          </Flex>
        </Link>
      </Card>
      {external.map((l) => (
        <Card asChild size="2" key={l.href}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" className="tool-link">
            <Flex gap="3" align="center">
              {l.icon}
              <div>
                <Text as="div" weight="bold">
                  {l.title} <ExternalLink size={12} className="ext-icon" aria-label="(opens in a new tab)" />
                </Text>
                <Text as="div" size="2" color="gray">
                  {l.text}
                </Text>
              </div>
            </Flex>
          </a>
        </Card>
      ))}
      {external.length === 0 && (
        <Card size="2">
          <Text size="2" color="gray">
            The SSH console and Transmission links appear here once MEDIA_LINK_SSH and MEDIA_LINK_TRANSMISSION are set in media-api's .env.
          </Text>
        </Card>
      )}
    </div>
  )
}

const TABS = [
  { key: 'drives', title: 'Drives' },
  { key: 'latest', title: 'Latest files' },
  { key: 'links', title: 'Links' },
] as const

/** Tools (admin): drives, latest files, links (port of the old Tools pages). */
export function Tools() {
  const splat = useParams()['*'] ?? ''
  const tab = TABS.find((t) => t.key === splat)?.key ?? 'drives'
  const { pathname } = useLocation()

  return (
    <>
      <PageHeader title="Tools" description="Keep an eye on the servers." />
      <TabNav.Root mb="4">
        {TABS.map((t) => (
          <TabNav.Link key={t.key} asChild active={tab === t.key || (t.key === 'drives' && pathname === '/tools')}>
            <Link to={`/tools/${t.key}`}>{t.title}</Link>
          </TabNav.Link>
        ))}
      </TabNav.Root>
      {tab === 'drives' && <Drives />}
      {tab === 'latest' && <Latest />}
      {tab === 'links' && <Links />}
    </>
  )
}
