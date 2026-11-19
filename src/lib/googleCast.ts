// Minimal wrapper around Google's Cast Web Sender SDK (cast_sender.js).
//
// It tells a Chromecast's built-in Default Media Receiver to fetch and play a
// URL itself, which is what we want: the TV downloads /shared/<token>/<file>
// straight from Apache, with no login and no browser in the middle.
// (Chrome's Remote Playback API on desktop instead tries to stream from the
// tab, which fails for these files.)
//
// Only Chrome (desktop and Android) provides the Cast framework.

const SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1'

type CastNamespace = { framework: any }
type ChromeCastNamespace = { media: any; AutoJoinPolicy: any }

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void
    cast?: CastNamespace
    chrome?: { cast?: ChromeCastNamespace }
  }
}

let loading: Promise<boolean> | null = null

/** Loads the SDK once. Resolves false when this browser can't cast. */
export function loadCastSdk(): Promise<boolean> {
  if (loading) return loading
  loading = new Promise<boolean>((resolve) => {
    if (!/Chrome\//.test(navigator.userAgent) || /Edg\//.test(navigator.userAgent)) {
      resolve(false)
      return
    }
    const timeout = window.setTimeout(() => resolve(false), 10_000)
    window.__onGCastApiAvailable = (isAvailable) => {
      window.clearTimeout(timeout)
      if (isAvailable && window.cast?.framework && window.chrome?.cast) {
        window.cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        })
      }
      resolve(isAvailable)
    }
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onerror = () => {
      window.clearTimeout(timeout)
      resolve(false)
    }
    document.head.appendChild(script)
  })
  return loading
}

export interface CastTarget {
  /** Absolute URL the TV will fetch (no login). */
  url: string
  contentType: string
  title: string
  startAt?: number
}

/**
 * Opens Chrome's device picker, then has the chosen Chromecast play the URL.
 * Resolves with the device name. Throws "cancel" if the picker was closed.
 */
export async function castToDevice(target: CastTarget): Promise<string> {
  const framework = window.cast!.framework
  const chromeCast = window.chrome!.cast!
  const context = framework.CastContext.getInstance()

  try {
    await context.requestSession()
  } catch (error) {
    // chrome.cast.ErrorCode.CANCEL when the user closes the picker
    if (error === 'cancel' || (error as { code?: string })?.code === 'cancel') throw new Error('cancel')
    throw new Error(typeof error === 'string' ? error : 'session_error')
  }

  const session = context.getCurrentSession()
  const media = new chromeCast.media.MediaInfo(target.url, target.contentType)
  media.metadata = new chromeCast.media.GenericMediaMetadata()
  media.metadata.title = target.title
  const request = new chromeCast.media.LoadRequest(media)
  request.currentTime = target.startAt ?? 0
  request.autoplay = true

  const failure = await session.loadMedia(request)
  if (failure) throw new Error(String(failure))

  return session.getCastDevice()?.friendlyName ?? 'your TV'
}

export function stopCasting(): void {
  window.cast?.framework.CastContext.getInstance().endCurrentSession(true)
}
