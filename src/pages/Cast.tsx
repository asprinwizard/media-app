import { Button, Callout, Flex, Spinner, Text } from '@radix-ui/themes'
import { Cast as CastIcon, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCast } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'

type CastState = RemotePlaybackState

/**
 * Cast player (port of cast.php).
 *
 * The video plays a /shared/<token>/<file> link that needs no login, so a
 * Chromecast can fetch it itself. "Cast to TV" uses the Remote Playback API
 * (Chrome desktop and Android): Chrome shows its device picker and hands the
 * TV that URL. Files browsers can't stream download instead.
 */
export function Cast() {
  const [params] = useSearchParams()
  const path = params.get('path')
  const { data, error } = useCast(path)
  const video = useRef<HTMLVideoElement>(null)

  // null = unknown (desktop Chrome can't watch availability, but prompt() works)
  const [devicesAvailable, setDevicesAvailable] = useState<boolean | null>(null)
  const [state, setState] = useState<CastState>('disconnected')
  const [castError, setCastError] = useState<string | null>(null)
  const supported = typeof HTMLMediaElement !== 'undefined' && 'remote' in HTMLMediaElement.prototype

  useEffect(() => {
    if (data && !data.streamable) window.location.replace(data.url)
  }, [data])

  useEffect(() => {
    const remote = video.current?.remote
    if (!remote) return
    let watchId: number | undefined
    remote
      .watchAvailability((available) => setDevicesAvailable(available))
      .then((id) => (watchId = id))
      .catch(() => setDevicesAvailable(null))

    const sync = () => setState(remote.state)
    remote.addEventListener('connecting', sync)
    remote.addEventListener('connect', sync)
    remote.addEventListener('disconnect', sync)
    return () => {
      if (watchId !== undefined) remote.cancelWatchAvailability(watchId).catch(() => {})
      remote.removeEventListener('connecting', sync)
      remote.removeEventListener('connect', sync)
      remote.removeEventListener('disconnect', sync)
    }
  }, [data?.url])

  const castToTv = async () => {
    setCastError(null)
    try {
      await video.current?.remote.prompt()
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'NotFoundError') setCastError('No Chromecast or cast-enabled TV was found on this network.')
      else if (name === 'NotAllowedError' || name === 'AbortError') setCastError(null) // picker closed
      else setCastError("This browser can't cast this video. In Chrome, try the ⋮ menu → Cast… instead.")
    }
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
          data?.streamable && (
            <Button
              size="3"
              onClick={castToTv}
              disabled={!supported || devicesAvailable === false}
              loading={state === 'connecting'}
            >
              <CastIcon size={18} />
              {state === 'connected' ? 'Casting — change' : 'Cast to TV'}
            </Button>
          )
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
          {castError && (
            <Callout.Root mt="3" color="amber">
              <Callout.Icon>
                <Info size={16} />
              </Callout.Icon>
              <Callout.Text>{castError}</Callout.Text>
            </Callout.Root>
          )}
          <Callout.Root mt="3" color="gray">
            <Callout.Icon>
              <CastIcon size={16} />
            </Callout.Icon>
            <Callout.Text>
              {!supported
                ? "This browser can't cast. Open this page in Chrome on a computer or Android phone."
                : devicesAvailable === false
                  ? 'No Chromecast found on this network. Check the TV is on and on the same Wi-Fi.'
                  : 'Press Cast to TV and pick your Chromecast. The TV plays the film directly; you can close this tab once it starts. The link works for 24 hours.'}
            </Callout.Text>
          </Callout.Root>
        </>
      )}
    </>
  )
}
