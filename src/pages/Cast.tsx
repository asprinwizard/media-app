import { Button, Callout, Flex, Spinner, Text } from '@radix-ui/themes'
import { Cast as CastIcon, Info, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCast } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { castToDevice, loadCastSdk, stopCasting } from '../lib/googleCast'

type Status = { kind: 'idle' } | { kind: 'connecting' } | { kind: 'casting'; device: string } | { kind: 'error'; message: string }

/**
 * Cast player (port of cast.php).
 *
 * The page gets a /shared/<token>/<file> link that needs no login. "Cast to
 * TV" uses Google's Cast SDK to tell the Chromecast's built-in player to
 * fetch and play that URL itself. Files browsers can't stream download
 * instead.
 */
export function Cast() {
  const [params] = useSearchParams()
  const path = params.get('path')
  const { data, error } = useCast(path)
  const video = useRef<HTMLVideoElement>(null)

  const [sdk, setSdk] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    loadCastSdk().then((ok) => !cancelled && setSdk(ok ? 'ready' : 'unavailable'))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (data && !data.streamable) window.location.replace(data.url)
  }, [data])

  const castToTv = async () => {
    if (!data) return
    setStatus({ kind: 'connecting' })
    try {
      const device = await castToDevice({
        url: new URL(data.url, window.location.origin).href,
        // The old site always said video/mp4, which the Chromecast relies on
        contentType: data.mime.startsWith('audio/') ? data.mime : 'video/mp4',
        title: data.name,
        startAt: video.current?.currentTime ?? 0,
      })
      video.current?.pause()
      setStatus({ kind: 'casting', device })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      setStatus(
        reason === 'cancel'
          ? { kind: 'idle' }
          : { kind: 'error', message: `The TV couldn't start playing (${reason}). Check it's on, then try again.` },
      )
    }
  }

  const stop = () => {
    stopCasting()
    setStatus({ kind: 'idle' })
  }

  if (!path) {
    return (
      <>
        <PageHeader title="Cast" />
        <Text color="gray">Open Cast from a file in the library.</Text>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={data?.name ?? 'Cast'}
        actions={
          data?.streamable &&
          (status.kind === 'casting' ? (
            <Button size="3" color="gray" variant="soft" onClick={stop}>
              <Square size={16} /> Stop casting
            </Button>
          ) : (
            <Button size="3" onClick={castToTv} disabled={sdk !== 'ready'} loading={status.kind === 'connecting' || sdk === 'loading'}>
              <CastIcon size={18} /> Cast to TV
            </Button>
          ))
        }
      />
      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error.message}</Callout.Text>
        </Callout.Root>
      )}
      {!data && !error && (
        <Flex gap="2" align="center">
          <Spinner /> <Text color="gray">Preparing…</Text>
        </Flex>
      )}
      {data && !data.streamable && <Text color="gray">This file can't stream, so it's downloading instead.</Text>}
      {data?.streamable && (
        <>
          <video ref={video} className="screen cast-video" src={data.url} controls playsInline />

          {status.kind === 'casting' && (
            <Callout.Root mt="3" color="grass">
              <Callout.Icon>
                <CastIcon size={16} />
              </Callout.Icon>
              <Callout.Text>
                Playing on <strong>{status.device}</strong>. Use the TV remote or the Google Home app to pause or skip; you can
                close this tab.
              </Callout.Text>
            </Callout.Root>
          )}
          {status.kind === 'error' && (
            <Callout.Root mt="3" color="amber">
              <Callout.Icon>
                <Info size={16} />
              </Callout.Icon>
              <Callout.Text>{status.message}</Callout.Text>
            </Callout.Root>
          )}
          {status.kind !== 'casting' && (
            <Callout.Root mt="3" color="gray">
              <Callout.Icon>
                <CastIcon size={16} />
              </Callout.Icon>
              <Callout.Text>
                {sdk === 'unavailable'
                  ? "Casting needs Google Chrome (on a computer or Android phone). Open this page in Chrome to send it to a TV."
                  : 'Press Cast to TV and pick your Chromecast. The TV fetches the film itself, starting from where this player is. The link works for 24 hours.'}
              </Callout.Text>
            </Callout.Root>
          )}
        </>
      )}
    </>
  )
}
