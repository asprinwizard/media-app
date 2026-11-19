import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiGet, apiSend } from './client'
import type { ItemType } from './types'

// --- Upload ---

export interface UploadFolder {
  maxBytes: number | null
  items: { name: string; type: ItemType; size: number | null; mtime: number }[]
}

export function useUploadFolder() {
  return useQuery({
    queryKey: ['uploads'],
    queryFn: () => apiGet<UploadFolder>('/uploads'),
  })
}

/**
 * POST one file with progress. fetch() can't report upload progress, so this
 * uses XMLHttpRequest. X-Requested-With satisfies media-api's CSRF check.
 */
export function uploadFile(
  file: File,
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal,
): Promise<{ name: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total)
    }
    xhr.onload = () => {
      let body: { name?: string; message?: string } = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // not JSON (e.g. a proxy error page)
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve({ name: body.name ?? file.name })
      else
        reject(
          new ApiError(
            xhr.status,
            body.message ?? (xhr.status === 413 ? 'That file is bigger than the server allows.' : `Upload failed (${xhr.status})`),
          ),
        )
    }
    xhr.onerror = () => reject(new ApiError(0, 'The connection dropped during the upload.'))
    xhr.onabort = () => reject(new ApiError(0, 'Upload cancelled.'))
    signal.addEventListener('abort', () => xhr.abort())

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

// --- BBC iPlayer ---

export interface IplayerResult {
  index: string
  label: string
  pid: string
}

export interface IplayerTrack {
  status: 'temp' | 'encoding' | 'audio' | 'video' | 'completed' | 'stalled'
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
