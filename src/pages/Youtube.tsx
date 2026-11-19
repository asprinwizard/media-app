import { Badge, Button, Callout, Card, Flex, Heading, Progress, Spinner, Table, Text, TextField } from '@radix-ui/themes'
import { CircleCheck, CircleX, Download, ListVideo, Link as LinkIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useYoutubeDownload, useYoutubeInfo, useYoutubeStatus, type YoutubeFormat } from '../api/acquire'
import { PageHeader } from '../components/PageHeader'
import { formatBytes } from '../lib/format'
import { libraryRoute } from '../lib/paths'

function duration(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function bitrate(kbps: number | null): string {
  if (!kbps) return ''
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} kbps`
}

/**
 * One table of formats with radio-style picking that can be cleared by
 * clicking the chosen row again (as the old page allowed).
 */
function FormatTable({
  kind,
  formats,
  value,
  onChange,
}: {
  kind: 'video' | 'audio'
  formats: YoutubeFormat[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <Table.Root size="1" variant="ghost" className="format-table">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="32px" />
          <Table.ColumnHeaderCell>{kind === 'video' ? 'Video' : 'Audio'}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Format</Table.ColumnHeaderCell>
          {kind === 'video' && <Table.ColumnHeaderCell>Resolution</Table.ColumnHeaderCell>}
          {kind === 'video' && <Table.ColumnHeaderCell className="hide-sm">FPS</Table.ColumnHeaderCell>}
          <Table.ColumnHeaderCell>Size</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell className="hide-sm">Bitrate</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell className="hide-sm">Codec</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {formats.map((f) => {
          const chosen = value === f.id
          return (
            <Table.Row key={f.id} className={`format-row${chosen ? ' is-chosen' : ''}`} onClick={() => onChange(chosen ? null : f.id)}>
              <Table.Cell>
                <input
                  type="radio"
                  name={kind}
                  checked={chosen}
                  onChange={() => undefined}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(chosen ? null : f.id)
                  }}
                  aria-label={`${kind} format ${f.id}`}
                />
              </Table.Cell>
              <Table.Cell>
                {f.id}
                {kind === 'video' && f.hasAudio && (
                  <Badge ml="2" size="1" color="gray">
                    + audio
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell>{f.extension}</Table.Cell>
              {kind === 'video' && <Table.Cell>{f.note || f.resolution}</Table.Cell>}
              {kind === 'video' && <Table.Cell className="hide-sm">{f.fps ?? ''}</Table.Cell>}
              <Table.Cell>
                {f.filesize ? `${f.approximate ? '~' : ''}${formatBytes(f.filesize)}` : ''}
              </Table.Cell>
              <Table.Cell className="hide-sm">{bitrate(f.bitrate)}</Table.Cell>
              <Table.Cell className="hide-sm">{kind === 'video' ? f.vcodec : f.acodec}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function StatusCallout() {
  const status = useYoutubeStatus()
  const s = status.data
  if (!s || s.state === 'idle') return null

  const color = s.state === 'finished' ? 'grass' : s.state === 'failed' ? 'red' : 'blue'
  return (
    <Callout.Root color={color} mt="4" role="status">
      <Callout.Icon>
        {s.state === 'finished' ? <CircleCheck size={16} /> : s.state === 'failed' ? <CircleX size={16} /> : <Spinner size="1" />}
      </Callout.Icon>
      <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
        <Callout.Text>
          {s.state === 'downloading' && (
            <>
              <strong>Downloading{s.item ? ` item ${s.item}` : ''}</strong>
              {s.destination && <> · {s.destination}</>}
            </>
          )}
          {s.state === 'finished' && (
            <>
              <strong>Last download finished</strong>
              {s.destination && <> · {s.destination}</>}
            </>
          )}
          {s.state === 'failed' && (
            <>
              <strong>Last download failed:</strong> {s.error}
            </>
          )}
        </Callout.Text>
        {s.state === 'downloading' && (
          <>
            <Progress value={s.percent ?? undefined} />
            {s.line && (
              <Text size="1" color="gray" className="mono" truncate>
                {s.line}
              </Text>
            )}
          </>
        )}
      </Flex>
    </Callout.Root>
  )
}

/**
 * YouTube (admin): paste a link, pick formats (optional), download in the
 * background (port of the old YouTube page).
 */
export function Youtube() {
  const [draft, setDraft] = useState('')
  const [url, setUrl] = useState('')
  const info = useYoutubeInfo(url)
  const status = useYoutubeStatus()
  const download = useYoutubeDownload()
  const [video, setVideo] = useState<string | null>(null)
  const [audio, setAudio] = useState<string | null>(null)
  const busy = status.data?.active ?? false

  const find = (event: FormEvent) => {
    event.preventDefault()
    setVideo(null)
    setAudio(null)
    download.reset()
    setUrl(draft.trim())
  }

  const data = info.data
  const formatLabel = [video, audio].filter(Boolean).join('+')
  const start = () => {
    if (!data?.url) return
    download.mutate({ url: data.url, video: video ?? undefined, audio: audio ?? undefined })
  }

  return (
    <>
      <PageHeader
        title="YouTube"
        description={
          <>
            Downloads land in <Link to={libraryRoute('Uploaded Files/youtube')}>Uploaded Files / youtube</Link> / &lt;channel&gt;.
          </>
        }
      />

      <Card size="2">
        <form onSubmit={find}>
          <Flex gap="2" style={{ maxWidth: 720 }}>
            <TextField.Root
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  or a playlist link"
              aria-label="YouTube link"
              style={{ flex: 1 }}
            >
              <TextField.Slot>
                <LinkIcon size={15} />
              </TextField.Slot>
            </TextField.Root>
            <Button type="submit" disabled={draft.trim() === ''} loading={info.isFetching}>
              Find
            </Button>
          </Flex>
        </form>

        {info.isFetching && (
          <Flex gap="2" align="center" mt="3">
            <Spinner size="1" />
            <Text size="2" color="gray">
              Asking YouTube for the formats…
            </Text>
          </Flex>
        )}
        {info.error && (
          <Callout.Root color="red" mt="3">
            <Callout.Text>{info.error.message}</Callout.Text>
          </Callout.Root>
        )}
        {data?.kind === 'invalid' && (
          <Callout.Root color="amber" mt="3">
            <Callout.Text>That isn't a YouTube video or playlist link.</Callout.Text>
          </Callout.Root>
        )}

        {data?.kind === 'playlist' && (
          <Flex direction="column" gap="3" mt="4">
            <Flex gap="2" align="center">
              <ListVideo size={18} aria-hidden />
              <Text>
                <strong>Playlist.</strong> Every video in it downloads at the best quality available (no format choice), skipping any that fail.
              </Text>
            </Flex>
            <Flex>
              <Button onClick={start} disabled={busy} loading={download.isPending}>
                <Download size={15} /> Download playlist
              </Button>
            </Flex>
          </Flex>
        )}

        {data?.kind === 'video' && data.formats && (
          <>
            <Flex gap="3" align="center" mt="4" mb="2">
              {data.thumbnail && <img src={data.thumbnail} alt="" className="yt-thumb" />}
              <div style={{ minWidth: 0 }}>
                <Heading as="h2" size="3" truncate>
                  {data.title}
                </Heading>
                <Text size="2" color="gray">
                  {[data.channel, duration(data.duration)].filter(Boolean).join(' · ')}
                </Text>
              </div>
            </Flex>
            <div className="table-scroll">
              {data.formats.video.length > 0 && <FormatTable kind="video" formats={data.formats.video} value={video} onChange={setVideo} />}
              {data.formats.audio.length > 0 && <FormatTable kind="audio" formats={data.formats.audio} value={audio} onChange={setAudio} />}
            </div>
            <Flex align="center" gap="3" mt="3" wrap="wrap">
              <Text size="1" color="gray" style={{ flex: 1, minWidth: 200 }}>
                Pick a video and/or an audio format, or neither for the best available. Click a chosen row again to clear it. Video-only formats
                need an audio format to have sound.
              </Text>
              <Button onClick={start} disabled={busy} loading={download.isPending}>
                <Download size={15} /> {formatLabel ? `Download ${formatLabel}` : 'Download best quality'}
              </Button>
            </Flex>
          </>
        )}

        {busy && data && data.kind !== 'invalid' && (
          <Text as="p" size="1" color="gray" mt="2">
            One download at a time: wait for the current one to finish.
          </Text>
        )}
        {download.error && (
          <Callout.Root color="red" mt="3">
            <Callout.Text>{download.error.message}</Callout.Text>
          </Callout.Root>
        )}
      </Card>

      <StatusCallout />
    </>
  )
}
