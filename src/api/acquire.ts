import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiGet, apiSend } from './client'
import type { ItemType } from './types'

// --- Upload ---

export interface UploadFolder {
  chunkBytes: number
  items: { name: string; type: ItemType; size: number | null; mtime: number }[]
}

export function useUploadFolder() {
  return useQuery({
    queryKey: ['uploads'],
    queryFn: () => apiGet<UploadFolder>('/uploads'),
  })
}

/** Waits before each retry of a failed chunk (ms). */
const RETRY_DELAYS = [1000, 2000, 5000, 10_000, 20_000]

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new ApiError(0, 'Upload cancelled.'))
    })
  })

interface ChunkReply {
  received?: number
  expected?: number
  message?: string
}

/** POST one chunk with progress. fetch() can't report upload progress, so XHR. */
function sendChunk(id: string, index: number, blob: Blob, onProgress: (loaded: number) => void, signal: AbortSignal) {
  return new Promise<{ status: number; body: ChunkReply }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/uploads/${id}/chunks?index=${index}`)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    xhr.upload.onprogress = (e) => onProgress(e.loaded)
    xhr.onload = () => {
      let body: ChunkReply = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // not JSON (e.g. a proxy error page)
      }
      resolve({ status: xhr.status, body })
    }
    xhr.onerror = () => resolve({ status: 0, body: {} })
    xhr.onabort = () => reject(new ApiError(0, 'Upload cancelled.'))
    const abort = () => xhr.abort()
    signal.addEventListener('abort', abort)
    xhr.onloadend = () => signal.removeEventListener('abort', abort)

    const form = new FormData()
    form.append('chunk', blob)
    xhr.send(form)
  })
}

/**
 * Upload a file in chunks (media-api's ChunkedUploads). Each chunk is a short
 * request, retried automatically if it fails, so a long upload survives a
 * dropped connection, and there's no size limit from PHP.
 */
export async function uploadFile(
  file: File,
  chunkBytes: number,
  onProgress: (sent: number) => void,
  onRetry: (message: string | null) => void,
  signal: AbortSignal,
): Promise<{ name: string }> {
  const { id } = await apiSend<{ id: string; name: string }>('POST', '/uploads', { name: file.name, size: file.size })
  const total = Math.max(1, Math.ceil(file.size / chunkBytes))

  try {
    let index = 0
    let failures = 0
    while (index < total) {
      const start = index * chunkBytes
      const blob = file.slice(start, Math.min(file.size, start + chunkBytes))
      const { status, body } = await sendChunk(id, index, blob, (loaded) => onProgress(start + loaded), signal)

      if (status >= 200 && status < 300) {
        index++
        failures = 0
        onRetry(null)
        onProgress(Math.min(file.size, index * chunkBytes))
        continue
      }
      if (status === 409 && typeof body.expected === 'number') {
        index = body.expected // the server is ahead or behind: carry on from where it is
        continue
      }
      // Network drop, server error, or a chunk that didn't arrive: wait and retry.
      if (status === 0 || status >= 500 || status === 422 || status === 408 || status === 429) {
        if (failures >= RETRY_DELAYS.length) {
          throw new ApiError(status, body.message ?? 'The connection kept dropping. Please try again later.')
        }
        onRetry(`Connection problem, retrying (${failures + 1} of ${RETRY_DELAYS.length})…`)
        await sleep(RETRY_DELAYS[failures], signal)
        failures++
        continue
      }
      throw new ApiError(status, body.message ?? `Upload failed (${status})`)
    }

    onRetry(null)
    return await apiSend<{ name: string }>('POST', `/uploads/${id}/finish`)
  } catch (error) {
    // Tidy up on the server; ignore failures (abandoned uploads are cleared after a day).
    void apiSend('DELETE', `/uploads/${id}`).catch(() => undefined)
    throw error
  }
}

// --- BBC iPlayer ---

export interface IplayerResult {
  index: string
  label: string
  pid: string
}

export interface IplayerTrack {
  status: 'downloading' | 'audio' | 'converting' | 'finishing' | 'tagging' | 'completed' | 'stalled'
  label: string
  file: string
  size: number | null
  expectedSize: number | null
  updated: number
}

export interface IplayerStatus {
  active: boolean
  queue: { pending: string[]; running: string[] }
  items: { pid: string; title: string; main: IplayerTrack | null; sd: IplayerTrack | null }[]
}

export function useIplayerSearch(q: string) {
  return useQuery({
    queryKey: ['iplayer', 'search', q],
    queryFn: () => apiGet<{ results: IplayerResult[] }>('/iplayer/search', { q }),
    enabled: q.trim().length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Polls quickly while anything is downloading, slowly otherwise (as before). */
export function useIplayerStatus() {
  return useQuery({
    queryKey: ['iplayer', 'status'],
    queryFn: () => apiGet<IplayerStatus>('/iplayer/status'),
    meta: { background: true },
    refetchInterval: (query) => (query.state.data?.active ? 2000 : 15_000),
  })
}

export function useIplayerDownload() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { pids: string[]; force: boolean; sdCopy: boolean; recursive: boolean }) =>
      apiSend<{ queued: number; queue: IplayerStatus['queue'] }>('POST', '/iplayer/downloads', body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['iplayer', 'status'] }),
  })
}

// --- YouTube ---

export interface YoutubeFormat {
  id: string
  extension: string
  resolution: string
  height: number | null
  fps: number | null
  filesize: number | null
  approximate: boolean
  bitrate: number | null
  vcodec: string | null
  acodec: string | null
  note: string
  hasAudio: boolean
}

export interface YoutubeInfo {
  kind: 'video' | 'playlist' | 'invalid'
  url: string | null
  title: string | null
  channel?: string | null
  duration?: number | null
  thumbnail?: string | null
  formats: { video: YoutubeFormat[]; audio: YoutubeFormat[] } | null
}

export interface YoutubeStatus {
  active: boolean
  state: 'idle' | 'downloading' | 'finished' | 'failed'
  line: string | null
  percent: number | null
  item: string | null
  destination: string | null
  error: string | null
}

export function useYoutubeInfo(url: string) {
  return useQuery({
    queryKey: ['youtube', 'info', url],
    queryFn: () => apiGet<YoutubeInfo>('/youtube/info', { url }),
    enabled: url !== '',
    staleTime: 10 * 60_000,
    retry: false,
  })
}

export function useYoutubeStatus() {
  return useQuery({
    queryKey: ['youtube', 'status'],
    queryFn: () => apiGet<YoutubeStatus>('/youtube/status'),
    meta: { background: true },
    refetchInterval: (query) => (query.state.data?.active ? 1000 : 15_000),
  })
}

export function useYoutubeDownload() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { url: string; video?: string; audio?: string }) => apiSend<{ started: boolean }>('POST', '/youtube/downloads', body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['youtube', 'status'] }),
  })
}
