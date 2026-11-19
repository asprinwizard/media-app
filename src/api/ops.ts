import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { apiGet, apiSend } from './client'
import type { ItemType } from './types'

// --- Live TV ---

export interface LiveTvStatus {
  online: boolean
  canWake: boolean
  hls: string
  bootTimeout: number
}

export type LiveTvAction = 'wake' | 'shutdown' | 'reboot' | 'sleep'

/**
 * Polls every 5 s while `waiting` (the box is booting), otherwise on demand.
 * `enabled: false` stops all checks: after Sleep or Shut down, because the
 * check itself (a connection to the box) can wake it.
 */
export function useLiveTvStatus(waiting: boolean, enabled = true) {
  return useQuery({
    queryKey: ['live-tv', 'status'],
    queryFn: () => apiGet<LiveTvStatus>('/live-tv/status'),
    meta: { background: true },
    enabled,
    refetchInterval: waiting && enabled ? 5000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useLiveTvAction() {
  return useMutation({
    mutationFn: (action: LiveTvAction) => apiSend<{ ok: boolean }>('POST', '/live-tv/actions', { action }),
  })
}

// --- Logs ---

export interface LogSummary {
  key: string
  title: string
  exists: boolean
  size: number | null
  mtime: number | null
}

export interface LogContents {
  key: string
  title: string
  text: string
  size: number | null
  mtime: number | null
  truncated: boolean
}

export function useLogList() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: () => apiGet<{ logs: LogSummary[] }>('/logs'),
  })
}

/** tail: last `lines` lines, re-read every second (as before); full: once, on demand. */
export function useLog(key: string | null, mode: 'tail' | 'full', lines = 100) {
  return useQuery({
    queryKey: ['logs', key, mode],
    queryFn: () => apiGet<LogContents>(`/logs/${encodeURIComponent(key!)}`, mode === 'tail' ? { lines } : undefined),
    enabled: key !== null,
    meta: mode === 'tail' ? { background: true } : undefined,
    refetchInterval: mode === 'tail' ? 1000 : false,
  })
}

// --- Tools ---

export interface DriveSpace {
  filesystem: string
  mount: string
  size: number
  used: number
  available: number
  percent: number
}

export interface DriveReport {
  server: 'media02' | 'media01'
  error: string | null
  space: DriveSpace[]
  drives: { device: string; state: string }[]
  links: { folder: string; kind: 'link' | 'dir' | 'missing'; target: string | null }[]
}

export function useDrives(server: 'media02' | 'media01') {
  return useQuery({
    queryKey: ['tools', 'drives', server],
    queryFn: () => apiGet<DriveReport>('/tools/drives', { server }),
    staleTime: 30_000,
  })
}

export interface LatestPage {
  server: string
  scanned: number
  items: { path: string; name: string; folder: string; size: number; mtime: number; type: ItemType }[]
  page: number
  more: boolean
  total: number
}

export function useLatestFiles(server: 'media02' | 'media01') {
  return useInfiniteQuery({
    queryKey: ['tools', 'latest', server],
    queryFn: ({ pageParam }) => apiGet<LatestPage>('/tools/latest', { server, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.more ? last.page + 1 : undefined),
    staleTime: 5 * 60_000,
  })
}

/** Rescan now (bypassing the server's cached scan); returns page 1. */
export function rescanLatest(server: 'media02' | 'media01') {
  return apiGet<LatestPage>('/tools/latest', { server, page: 1, refresh: 1 })
}
