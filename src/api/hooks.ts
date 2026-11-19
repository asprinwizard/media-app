import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet, apiSend } from './client'
import type { CastInfo, Dashboard, FileInfo, LibraryListing, PlayInfo, SearchResponse, SortBy, SortDir } from './types'

export function useLibrary(path: string, sort: SortBy, dir: SortDir) {
  return useQuery({
    queryKey: ['library', path, sort, dir],
    queryFn: () => apiGet<LibraryListing>('/library', { path, sort, dir }),
    placeholderData: keepPreviousData,
  })
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => apiGet<SearchResponse>('/search', { q }),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  })
}

export function useFileInfo(path: string | null) {
  return useQuery({
    queryKey: ['file-info', path],
    queryFn: () => apiGet<FileInfo>('/files/info', { path: path! }),
    enabled: path !== null,
    staleTime: 5 * 60_000,
  })
}

/** Also logs a "play" on the server, so it isn't cached between opens. */
export function usePlay(path: string | null) {
  return useQuery({
    queryKey: ['play', path],
    queryFn: () => apiGet<PlayInfo>('/files/play', { path: path! }),
    enabled: path !== null,
    gcTime: 0,
    staleTime: Infinity,
  })
}

export function useCast(path: string | null) {
  return useQuery({
    queryKey: ['cast', path],
    queryFn: () => apiGet<CastInfo>('/files/cast', { path: path! }),
    enabled: path !== null,
  })
}

export function useDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<Dashboard>('/dashboard'),
    enabled,
    staleTime: 60_000,
  })
}

/** Records a click on a file name; never blocks opening the file. */
export async function logFileLink(path: string): Promise<void> {
  try {
    await apiSend('POST', '/files/link', { path })
  } catch {
    // logging failure shouldn't stop the user opening the file
  }
}
