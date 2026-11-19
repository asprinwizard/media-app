import { Badge, Button, Callout, Card, Checkbox, Flex, Heading, Progress, Spinner, Text, TextField } from '@radix-ui/themes'
import { CircleCheck, Search as SearchIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useIplayerDownload, useIplayerSearch, useIplayerStatus, type IplayerTrack } from '../api/acquire'
import { useMe } from '../api/useMe'
import { PageHeader } from '../components/PageHeader'
import { formatBytes } from '../lib/format'
import { libraryRoute } from '../lib/paths'

const TRACK_COLOR: Record<IplayerTrack['status'], 'blue' | 'orange' | 'grass' | 'red' | 'gray'> = {
  temp: 'red',
  encoding: 'orange',
  audio: 'blue',
  video: 'blue',
  completed: 'grass',
  stalled: 'gray',
}

function Options({
  value,
  onChange,
  recursive,
}: {
  value: { sdCopy: boolean; force: boolean; recursive: boolean }
  onChange: (next: { sdCopy: boolean; force: boolean; recursive: boolean }) => void
  recursive?: boolean
}) {
  const box = (key: 'sdCopy' | 'force' | 'recursive', label: string, hint: string) => (
    <Text as="label" size="2" title={hint}>
      <Flex gap="2" align="center">
        <Checkbox checked={value[key]} onCheckedChange={(c) => onChange({ ...value, [key]: c === true })} />
        {label}
      </Flex>
    </Text>
  )
  return (
    <Flex gap="4" wrap="wrap">
      {box('sdCopy', 'SD copy', 'Also download a smaller standard-definition copy, named "… (SD)"')}
      {box('force', 'Force', 'Download again even if get-iplayer thinks it already has it')}
      {recursive && box('recursive', 'Whole series (recursive)', 'Treat the PID as a series or brand and download every episode')}
    </Flex>
  )
}

function Track({ title, track }: { title: string; track: IplayerTrack }) {
  const percent = track.size !== null && track.expectedSize ? Math.min(100, (track.size / track.expectedSize) * 100) : null
  const inProgress = track.status !== 'completed' && track.status !== 'stalled'
  return (
    <div className="job">
      <Flex justify="between" align="center" gap="3" wrap="wrap">
        <Text size="2" weight="medium" className="job-title">
          {title}
        </Text>
        <Badge color={TRACK_COLOR[track.status]} variant="soft">
          {track.label}
          {track.status !== 'completed' && track.size !== null && (
            <>
              {' · '}
              {formatBytes(track.size)}
              {track.expectedSize ? ` / ~${formatBytes(track.expectedSize)}` : ''}
            </>
          )}
        </Badge>
      </Flex>
      {inProgress && <Progress mt="2" size="1" value={percent ?? undefined} color={track.status === 'encoding' ? 'orange' : undefined} />}
    </div>
  )
}

/**
 * BBC iPlayer (admin): search and tick programmes, or download by PID/link,
 * then watch the download folder (port of the old iPlayer page).
 */
export function Iplayer() {
  const isAdmin = useMe().data?.roles.includes('admin') ?? false
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const search = useIplayerSearch(q)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [searchOptions, setSearchOptions] = useState({ sdCopy: false, force: false, recursive: false })

  const [pid, setPid] = useState('')
  const [pidOptions, setPidOptions] = useState({ sdCopy: false, force: false, recursive: false })

  const status = useIplayerStatus()
  const download = useIplayerDownload()
  const [message, setMessage] = useState<string | null>(null)

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setPicked(new Set())
    setQ(draft.trim())
  }

  const queue = async (pids: string[], options: typeof pidOptions, done: () => void) => {
    setMessage(null)
    try {
      const result = await download.mutateAsync({ pids, ...options })
      setMessage(`Queued ${result.queued === 1 ? '1 programme' : `${result.queued} programmes`}. Progress shows below once get-iplayer starts.`)
      done()
    } catch {
      // shown from download.error
    }
  }

  const results = search.data?.results ?? []
  const toggle = (p: string, on: boolean) => {
    const next = new Set(picked)
    if (on) next.add(p)
    else next.delete(p)
    setPicked(next)
  }
  const queueInfo = status.data?.queue
  const waiting = queueInfo?.pending.length ?? 0

  return (
    <>
      <PageHeader
        title="BBC iPlayer"
        description={
          <>
            Downloads land in{' '}
            {isAdmin ? <Link to={libraryRoute('Uploaded Files/get_iplayer')}>Uploaded Files / get_iplayer</Link> : 'Uploaded Files / get_iplayer'}.
          </>
        }
      />

      {message && (
        <Callout.Root color="grass" mb="3" role="status">
          <Callout.Icon>
            <CircleCheck size={16} />
          </Callout.Icon>
          <Callout.Text>{message}</Callout.Text>
        </Callout.Root>
      )}
      {download.error && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>{download.error.message}</Callout.Text>
        </Callout.Root>
      )}

      <div className="grid-2">
        <Card size="2">
          <Heading as="h2" size="3" mb="3">
            Search programmes
          </Heading>
          <form onSubmit={submitSearch}>
            <Flex gap="2">
              <TextField.Root
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Programme name, e.g. wild isles"
                aria-label="Search iPlayer"
                style={{ flex: 1 }}
              >
                <TextField.Slot>
                  <SearchIcon size={15} />
                </TextField.Slot>
              </TextField.Root>
              <Button type="submit" disabled={draft.trim().length < 2} loading={search.isFetching}>
                Search
              </Button>
            </Flex>
          </form>

          {search.isFetching && (
            <Flex gap="2" align="center" mt="3">
              <Spinner size="1" />
              <Text size="2" color="gray">
                Searching… get-iplayer can take a little while.
              </Text>
            </Flex>
          )}
          {search.error && (
            <Callout.Root color="red" mt="3" size="1">
              <Callout.Text>{search.error.message}</Callout.Text>
            </Callout.Root>
          )}
          {search.data && !search.isFetching && results.length === 0 && (
            <Text as="p" size="2" color="gray" mt="3">
              Nothing matched “{q}”.
            </Text>
          )}

          {results.length > 0 && (
            <>
              <Flex justify="between" align="center" mt="3" mb="1">
                <Text size="1" color="gray">
                  {results.length} result{results.length === 1 ? '' : 's'}
                </Text>
                <Button
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => setPicked(picked.size === results.length ? new Set() : new Set(results.map((r) => r.pid)))}
                >
                  {picked.size === results.length ? 'Select none' : 'Select all'}
                </Button>
              </Flex>
              <div className="pick-list">
                {results.map((r) => {
                  const parts = r.label.split(', ')
                  const channel = parts.length >= 3 ? parts.at(-2) : null
                  const name = parts.slice(0, channel ? -2 : -1).join(', ')
                  return (
                    <Text as="label" key={r.pid} className="pick-item">
                      <Checkbox checked={picked.has(r.pid)} onCheckedChange={(c) => toggle(r.pid, c === true)} />
                      <span>
                        <Text size="2" as="span" weight="medium">
                          {name}
                        </Text>
                        <Text size="1" as="div" color="gray">
                          {[channel, r.pid].filter(Boolean).join(' · ')}
                        </Text>
                      </span>
                    </Text>
                  )
                })}
              </div>
              <Flex align="center" gap="3" mt="3" wrap="wrap">
                <Options value={searchOptions} onChange={setSearchOptions} />
                <Button
                  ml="auto"
                  disabled={picked.size === 0}
                  loading={download.isPending}
                  onClick={() => queue([...picked], searchOptions, () => setPicked(new Set()))}
                >
                  Download {picked.size || ''}
                </Button>
              </Flex>
            </>
          )}
        </Card>

        <Card size="2">
          <Heading as="h2" size="3" mb="3">
            Download by PID
          </Heading>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void queue([pid.trim()], pidOptions, () => setPid(''))
            }}
          >
            <Flex gap="2">
              <TextField.Root
                value={pid}
                onChange={(e) => setPid(e.target.value)}
                placeholder="PID or iPlayer link, e.g. m002x4kq"
                aria-label="PID or iPlayer link"
                style={{ flex: 1 }}
              />
              <Button type="submit" disabled={pid.trim().length < 8} loading={download.isPending}>
                Download
              </Button>
            </Flex>
            <Flex mt="3">
              <Options value={pidOptions} onChange={setPidOptions} recursive />
            </Flex>
          </form>
        </Card>
      </div>

      <Card size="1" mt="4" className="lib-card">
        <Flex className="lib-toolbar" align="center" justify="between" gap="3">
          <Heading as="h2" size="3">
            Downloads
          </Heading>
          <Flex align="center" gap="2">
            {(queueInfo?.running.length ?? 0) > 0 && <Badge color="blue">get-iplayer running</Badge>}
            {waiting > 0 && <Badge color="gray">{waiting === 1 ? '1 batch waiting' : `${waiting} batches waiting`}</Badge>}
            <Text size="1" color="gray">
              {status.data?.active ? 'Updating every 2 s' : 'Checking every 15 s'}
            </Text>
          </Flex>
        </Flex>
        {status.error && (
          <Callout.Root color="red" m="3" size="1">
            <Callout.Text>{status.error.message}</Callout.Text>
          </Callout.Root>
        )}
        {status.isPending && (
          <Flex p="3" gap="2" align="center">
            <Spinner size="1" />
            <Text size="2" color="gray">
              Checking the download folder…
            </Text>
          </Flex>
        )}
        {status.data && status.data.items.length === 0 && (
          <Text as="p" size="2" color="gray" m="3">
            Nothing in the download folder yet.
          </Text>
        )}
        <div className="job-rows">
          {status.data?.items.map((item) => (
            <div key={item.pid}>
              {item.main && <Track title={item.title} track={item.main} />}
              {item.sd && <Track title={`${item.title} (SD)`} track={item.sd} />}
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
