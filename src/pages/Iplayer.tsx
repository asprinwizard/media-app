import { Badge, Button, Callout, Card, Checkbox, Flex, Heading, IconButton, Progress, Spinner, Text, TextField } from '@radix-ui/themes'
import { CircleCheck, ExternalLink, Search as SearchIcon, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useIplayerDownload, useIplayerSearch, useIplayerStatus, type IplayerResult, type IplayerTrack } from '../api/acquire'
import { useMe } from '../api/useMe'
import { PageHeader } from '../components/PageHeader'
import { formatBytes } from '../lib/format'
import { libraryRoute } from '../lib/paths'

const TRACK_COLOR: Record<IplayerTrack['status'], 'blue' | 'orange' | 'amber' | 'grass' | 'gray'> = {
  downloading: 'blue',
  audio: 'blue',
  converting: 'orange',
  finishing: 'orange',
  tagging: 'amber',
  completed: 'grass',
  stalled: 'gray',
}

/** Shown under a track while it's at a stage that looks stuck but isn't. */
const TRACK_HINT: Partial<Record<IplayerTrack['status'], string>> = {
  finishing: 'ffmpeg is rewriting the file to make it stream well. It takes a few minutes and the size doesn’t change.',
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
              {track.expectedSize
                ? ` / ~${formatBytes(track.expectedSize)}`
                : track.status === 'downloading'
                  ? ' / ?' // no programme info (yet): the lookup is running or failed
                  : ''}
            </>
          )}
        </Badge>
      </Flex>
      {inProgress && <Progress mt="2" size="1" value={percent ?? undefined} color={TRACK_COLOR[track.status] === 'blue' ? undefined : TRACK_COLOR[track.status]} />}
      {TRACK_HINT[track.status] && (
        <Text as="p" size="1" color="gray" mt="1">
          {TRACK_HINT[track.status]}
        </Text>
      )}
    </div>
  )
}

interface Picked {
  pid: string
  name: string
  channel: string | null
}

const PICKED_KEY = 'iplayer-picked'

function loadPicked(): Map<string, Picked> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PICKED_KEY) ?? '[]') as Picked[]
    return new Map(saved.filter((p) => p && typeof p.pid === 'string').map((p) => [p.pid, p]))
  } catch {
    return new Map()
  }
}

/** "Name - Episode, Channel, pid" → name and channel. */
function describe(r: IplayerResult): Picked {
  const parts = r.label.split(', ')
  const channel = parts.length >= 3 ? (parts.at(-2) ?? null) : null
  return { pid: r.pid, name: parts.slice(0, channel ? -2 : -1).join(', '), channel }
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
  // Picks persist across searches (and page visits this session), like the
  // old page's "Selected Files" list: search "news", tick one, search
  // "weather", tick one, download both.
  const [picked, setPicked] = useState<Map<string, Picked>>(loadPicked)
  const savePicked = (next: Map<string, Picked>) => {
    setPicked(next)
    try {
      sessionStorage.setItem(PICKED_KEY, JSON.stringify([...next.values()]))
    } catch {
      // storage unavailable: the list just won't survive leaving the page
    }
  }
  const [searchOptions, setSearchOptions] = useState({ sdCopy: false, force: false, recursive: false })

  const [pid, setPid] = useState('')
  const [pidOptions, setPidOptions] = useState({ sdCopy: false, force: false, recursive: false })

  const status = useIplayerStatus()
  const download = useIplayerDownload()
  const [message, setMessage] = useState<string | null>(null)

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
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

  const results = (search.data?.results ?? []).map(describe)
  const toggle = (item: Picked, on: boolean) => {
    const next = new Map(picked)
    if (on) next.set(item.pid, item)
    else next.delete(item.pid)
    savePicked(next)
  }
  const allHerePicked = results.length > 0 && results.every((r) => picked.has(r.pid))
  const pickAllHere = (on: boolean) => {
    const next = new Map(picked)
    for (const r of results) {
      if (on) next.set(r.pid, r)
      else next.delete(r.pid)
    }
    savePicked(next)
  }
  const queueInfo = status.data?.queue
  const waiting = queueInfo?.pending.length ?? 0

  return (
    <>
      <PageHeader
        title="BBC iPlayer"
        description={
          <>
            Find programmes on{' '}
            <a href="https://www.bbc.co.uk/iplayer" target="_blank" rel="noopener noreferrer">
              BBC iPlayer <ExternalLink size={13} aria-label="(opens in a new tab)" className="ext-icon" />
            </a>
            . Downloads land in{' '}
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
                  {results.length} result{results.length === 1 ? '' : 's'} for “{q}”
                </Text>
                <Button size="1" variant="ghost" color="gray" onClick={() => pickAllHere(!allHerePicked)}>
                  {allHerePicked ? 'Untick these' : 'Tick all these'}
                </Button>
              </Flex>
              <div className="pick-list">
                {results.map((r) => (
                  <Text as="label" key={r.pid} className="pick-item">
                    <Checkbox checked={picked.has(r.pid)} onCheckedChange={(c) => toggle(r, c === true)} />
                    <span>
                      <Text size="2" as="span" weight="medium">
                        {r.name}
                      </Text>
                      <Text size="1" as="div" color="gray">
                        {[r.channel, r.pid].filter(Boolean).join(' · ')}
                      </Text>
                    </span>
                  </Text>
                ))}
              </div>
            </>
          )}

          {picked.size > 0 && (
            <div className="picked">
              <Flex justify="between" align="center" mb="2">
                <Text size="2" weight="bold">
                  Selected ({picked.size})
                </Text>
                <Button size="1" variant="ghost" color="gray" onClick={() => savePicked(new Map())}>
                  Clear
                </Button>
              </Flex>
              <ul className="picked-list">
                {[...picked.values()].map((p) => (
                  <li key={p.pid}>
                    <Text size="2" className="picked-name">
                      {p.name}
                      <Text color="gray" size="1">
                        {' '}
                        · {p.pid}
                      </Text>
                    </Text>
                    <IconButton size="1" variant="ghost" color="gray" aria-label={`Remove ${p.name}`} onClick={() => toggle(p, false)}>
                      <X size={14} />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <Flex align="center" gap="3" mt="3" wrap="wrap">
                <Options value={searchOptions} onChange={setSearchOptions} />
                <Button
                  ml="auto"
                  loading={download.isPending}
                  onClick={() => queue([...picked.keys()], searchOptions, () => savePicked(new Map()))}
                >
                  Download {picked.size}
                </Button>
              </Flex>
            </div>
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
