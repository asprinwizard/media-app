import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiSend } from './client'

export type Server = 'media02' | 'media01'

export interface ItemResult {
  name: string
  ok: boolean
  error?: string
  newPath?: string
  job?: string
}

export interface BatchResult {
  ok: boolean
  failed: number
  results: ItemResult[]
}

export interface FolderList {
  server: Server
  path: string
  folders: { name: string; path: string; letter: string }[]
}

export interface ServersInfo {
  media02: boolean
  media01: boolean
  media01Error: string | null
}

export interface CopyQueueContents {
  pending: string[]
  running: string[]
}

export interface ExtractJob {
  id: string
  status: 'queued' | 'running' | 'done' | 'failed'
  archiveName?: string
  destinationPath?: string
  error?: string
}

export interface ConvertPresets {
  configured: boolean
  presets: { key: string; label: string; input: string | null }[]
}

export interface ConvertJobs {
  jobs: { id: string; tag: string | null; status: string; created: number | null }[]
  active: boolean
}

/** Which servers have this folder (media01 only offered when it does). */
export function useServers(path: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'servers', path],
    queryFn: () => apiGet<ServersInfo>('/admin/servers', { path }),
    enabled,
    staleTime: 60_000,
  })
}

export function useFolders(server: Server, path: string, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'folders', server, path],
    queryFn: () => apiGet<FolderList>('/admin/folders', { server, path }),
    enabled,
    staleTime: 30_000,
  })
}

export function useCopyQueue(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'copy-queue'],
    queryFn: () => apiGet<CopyQueueContents>('/admin/copy-queue'),
    enabled,
  })
}

export function useExtractJob(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'extract', id],
    queryFn: () => apiGet<ExtractJob>(`/admin/extract/${id}`),
    enabled: id !== null,
    meta: { background: true },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'done' || status === 'failed' ? false : 2000
    },
  })
}

export function useConvertPresets(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'convert', 'presets'],
    queryFn: () => apiGet<ConvertPresets>('/admin/convert/presets'),
    enabled,
    staleTime: 5 * 60_000,
  })
}

/** Recent CloudConvert jobs; polls every 2 s while any are running (as before). */
export function useConvertJobs(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'convert', 'jobs'],
    queryFn: () => apiGet<ConvertJobs>('/admin/convert/jobs'),
    enabled,
    meta: { background: true },
    refetchInterval: (query) => (query.state.data?.active ? 2000 : false),
  })
}

/** Mutations that change the library refresh the folder listings afterwards. */
function useLibraryMutation<TBody, TResult>(path: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: TBody) => apiSend<TResult>('POST', path, body),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['library'] })
      client.invalidateQueries({ queryKey: ['admin', 'folders'] })
    },
  })
}

export const useCreateFolder = () =>
  useLibraryMutation<{ server: Server; path: string; name: string }, { path: string }>('/admin/folders')

export const useMoveItems = () =>
  useLibraryMutation<
    { server: Server; path: string; destination?: string | null; newFolder?: string; items: { name: string; newName?: string }[] },
    BatchResult
  >('/admin/items/move')

export const useDeleteItems = () =>
  useLibraryMutation<{ server: Server; path: string; names: string[] }, BatchResult>('/admin/items/delete')

export const useExtract = () =>
  useLibraryMutation<{ path: string; name: string; destination?: string; newFolder?: string }, ExtractJob>('/admin/extract')

export function useQueueCopy() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { path: string; destination: string; newFolder?: string; hd?: boolean; files: { name: string; newName?: string }[] }) =>
      apiSend<{ queued: number; destination: string } & CopyQueueContents>('POST', '/admin/copy-queue', body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'copy-queue'] }),
  })
}

export function useStartConvert() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { path: string; names: string[]; preset: string }) => apiSend<BatchResult>('POST', '/admin/convert', body),
    onSettled: () => client.invalidateQueries({ queryKey: ['admin', 'convert', 'jobs'] }),
  })
}
