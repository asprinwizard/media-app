import { AlertDialog, Badge, Button, Callout, Card, DropdownMenu, Flex, Progress, Spinner, Text } from '@radix-ui/themes'
import { ChevronDown, Maximize, Power, RotateCcw, Sun, Moon, Tv } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveTvAction, useLiveTvStatus, type LiveTvAction } from '../api/ops'
import { PageHeader } from '../components/PageHeader'

const CONFIRM: Record<Exclude<LiveTvAction, 'wake'>, { title: string; body: string; button: string }> = {
  reboot: { title: 'Reboot the Live TV box?', body: 'The stream stops while it restarts (about a minute or two).', button: 'Reboot' },
  sleep: { title: 'Put the Live TV box to sleep?', body: 'The stream stops. Opening this page again wakes it.', button: 'Sleep' },
  shutdown: {
    title: 'Shut down the Live TV box?',
    body: 'The stream stops. Depending on the BIOS settings, Wake-on-LAN may not be able to start it again: you might need to press its power button.',
    button: 'Shut down',
  },
}

/**
 * Plays the HLS stream: natively where the browser can (Safari, iOS),
 * otherwise with hls.js, loaded only on this page. Retries while the box's
 * stream is still starting up.
 */
function HlsPlayer({ src, containerRef }: { src: string; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let retry: number | undefined
    let destroy: (() => void) | undefined

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return
      if (!Hls.isSupported()) {
        setProblem("This browser can't play the live stream.")
        return
      }
      const hls = new Hls({ liveDurationInfinity: true })
      destroy = () => hls.destroy()
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setProblem(null)
        void video.play().catch(() => undefined) // autoplay may need a click
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
          return
        }
        setProblem("The stream isn't available yet. It can take a little while after the box wakes up; trying again…")
        window.clearTimeout(retry)
        retry = window.setTimeout(() => hls.loadSource(src), 5000)
      })
      hls.loadSource(src)
      hls.attachMedia(video)
    })

    return () => {
      cancelled = true
      window.clearTimeout(retry)
      destroy?.()
    }
  }, [src])

  return (
    <div ref={containerRef} className="tv-frame">
      <video ref={videoRef} controls autoPlay playsInline className="tv-video" />
      {problem && (
        <div className="tv-overlay">
          <Spinner size="2" />
          <Text size="2">{problem}</Text>
        </div>
      )}
    </div>
  )
}

/**
 * Live TV (admin): wakes the media08 box if it's asleep, waits for it, then
 * plays its HLS stream (port of the old Live TV page; the waiting now
 * happens here rather than in a PHP request).
 */
export function LiveTv() {
  const [waitingSince, setWaitingSince] = useState<number | null>(null)
  const status = useLiveTvStatus(waitingSince !== null)
  const action = useLiveTvAction()
  const [confirm, setConfirm] = useState<Exclude<LiveTvAction, 'wake'> | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // After reboot/sleep/shutdown the box takes a few seconds to go down, so
  // "online" answers are ignored for a short while.
  const [quietUntil, setQuietUntil] = useState(0)
  const autoWoken = useRef(false)
  const frameRef = useRef<HTMLDivElement>(null)

  const online = (status.data?.online ?? false) && now >= quietUntil
  const timeout = (status.data?.bootTimeout ?? 120) * 1000
  const waiting = waitingSince !== null && !online && now - waitingSince < timeout
  const timedOut = waitingSince !== null && !online && now - waitingSince >= timeout

  const startWaiting = useCallback(() => {
    const started = Date.now()
    setNow(started)
    setWaitingSince(started)
  }, [])

  const wake = useCallback(() => {
    setNotice(null)
    action.mutate('wake', { onSuccess: startWaiting })
  }, [action, startWaiting])

  // As before: opening the page wakes the box if it's asleep.
  useEffect(() => {
    if (status.data && !status.data.online && status.data.canWake && !autoWoken.current) {
      autoWoken.current = true
      wake()
    }
  }, [status.data, wake])

  // A clock for the countdown while waiting, and for the quiet period.
  const ticking = (waitingSince !== null && !online) || now < quietUntil
  useEffect(() => {
    if (!ticking) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [ticking])

  const fullscreen = useCallback(() => {
    const el = frameRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.()
  }, [])

  // Ctrl+Alt+F toggles fullscreen, as on the old page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        fullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const run = (a: Exclude<LiveTvAction, 'wake'>) => {
    setConfirm(null)
    setNotice(null)
    action.mutate(a, {
      onSuccess: () => {
        const started = Date.now()
        setNow(started)
        setQuietUntil(started + (a === 'reboot' ? 20_000 : 12_000))
        if (a === 'reboot') {
          startWaiting()
          setNotice('Rebooting: the stream comes back when the box is up again.')
        } else {
          setWaitingSince(null)
          setNotice(a === 'sleep' ? 'The box is going to sleep.' : 'The box is shutting down.')
          window.setTimeout(() => void status.refetch(), 12_500)
        }
      },
    })
  }

  const elapsed = waitingSince ? Math.floor((now - waitingSince) / 1000) : 0
  const badge = status.isPending ? (
    <Badge color="gray">
      <Spinner size="1" /> Checking
    </Badge>
  ) : online ? (
    <Badge color="grass">
      <span className="dot" /> Online
    </Badge>
  ) : waiting ? (
    <Badge color="amber">
      <Spinner size="1" /> Waking up
    </Badge>
  ) : (
    <Badge color="red">Offline</Badge>
  )

  return (
    <>
      <PageHeader
        title="Live TV"
        description="Streams from the media08 tuner box."
        actions={
          <>
            {badge}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="outline" color="gray">
                  <Power size={15} /> Server <ChevronDown size={14} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={wake} disabled={!status.data?.canWake}>
                  <Sun size={14} /> Wake up
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => setConfirm('reboot')} disabled={!online}>
                  <RotateCcw size={14} /> Reboot
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => setConfirm('sleep')} disabled={!online}>
                  <Moon size={14} /> Sleep
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={() => setConfirm('shutdown')} disabled={!online}>
                  <Power size={14} /> Shut down
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </>
        }
      />

      {notice && (
        <Callout.Root color="blue" mb="3" role="status">
          <Callout.Text>{notice}</Callout.Text>
        </Callout.Root>
      )}
      {(action.error || status.error) && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>{(action.error ?? status.error)?.message}</Callout.Text>
        </Callout.Root>
      )}

      {online && status.data ? (
        <>
          <HlsPlayer src={status.data.hls} containerRef={frameRef} />
          <Flex mt="3" align="center" gap="3" wrap="wrap">
            <Button variant="soft" color="gray" onClick={fullscreen}>
              <Maximize size={15} /> Fullscreen
            </Button>
            <Text size="1" color="gray">
              <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd> also toggles fullscreen.
            </Text>
          </Flex>
        </>
      ) : (
        <Card size="3" className="tv-placeholder">
          <Flex direction="column" align="center" gap="3" py="6">
            <Tv size={36} aria-hidden />
            {status.isPending && <Text color="gray">Checking whether the Live TV box is awake…</Text>}
            {waiting && (
              <>
                <Text weight="medium">Waking the Live TV box…</Text>
                <div style={{ width: 'min(320px, 80%)' }}>
                  <Progress value={(elapsed * 1000 * 100) / timeout} />
                </div>
                <Text size="2" color="gray">
                  {elapsed} s (it usually takes under a minute; giving up after {Math.round(timeout / 1000)} s)
                </Text>
              </>
            )}
            {timedOut && (
              <>
                <Text weight="medium">The box didn't wake up.</Text>
                <Text size="2" color="gray">
                  It may be switched off at the wall, or shut down rather than asleep.
                </Text>
                <Button onClick={wake} loading={action.isPending}>
                  Try again
                </Button>
              </>
            )}
            {!status.isPending && !waiting && !timedOut && !online && (
              <>
                <Text weight="medium">The Live TV box is offline.</Text>
                {status.data?.canWake ? (
                  <Button onClick={wake} loading={action.isPending}>
                    <Sun size={15} /> Wake it up
                  </Button>
                ) : (
                  <Text size="2" color="gray">
                    Wake-on-LAN isn't set up (STREAMER_MAC_ADDRESS in media-api's .env).
                  </Text>
                )}
              </>
            )}
          </Flex>
        </Card>
      )}

      <AlertDialog.Root open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialog.Content maxWidth="440px">
          {confirm && (
            <>
              <AlertDialog.Title>{CONFIRM[confirm].title}</AlertDialog.Title>
              <AlertDialog.Description size="2">{CONFIRM[confirm].body}</AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <Button color={confirm === 'shutdown' ? 'red' : undefined} onClick={() => run(confirm)} loading={action.isPending}>
                  {CONFIRM[confirm].button}
                </Button>
              </Flex>
            </>
          )}
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  )
}
