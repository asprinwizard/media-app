export type Role = 'admin' | 'ftp' | 'standard'

export type MenuGroup = 'browse' | 'get' | 'system'

export interface MenuItem {
  key: string
  title: string
  path: string
  group: MenuGroup
  /** null = every logged-in user */
  roles: Role[] | null
}

export interface Me {
  user: string
  roles: Role[]
  siteTitle: string
  menu: MenuItem[]
  links: { ssh?: string; transmission?: string }
}

export type ItemType = 'folder' | 'video' | 'audio' | 'subtitle' | 'compressed' | 'file' | 'broken'

export interface LibraryItem {
  name: string
  /** library-relative, e.g. "TV/Drama/Show/ep1.mp4" */
  path: string
  type: ItemType
  /** bytes; null for folders and broken links */
  size: number | null
  /** unix seconds */
  mtime: number
  /** a–z, 0–9 or "#" (for the A–Z rail and type-to-jump) */
  letter: string
  /** admins only: tidied-up name for files (e.g. "S02E05 - Undertow.mp4") */
  suggestedName?: string
}

export interface Crumb {
  name: string
  path: string
}

export type SortBy = 'name' | 'date'
export type SortDir = 'asc' | 'desc'

export interface LibraryListing {
  server: 'media02' | 'media01'
  path: string
  name: string
  breadcrumbs: Crumb[]
  alpha: boolean
  sort: SortBy
  dir: SortDir
  items: LibraryItem[]
}

export interface PlayInfo {
  path: string
  name: string
  src: string
  mime: string
  streamable: boolean
  siblings: { name: string; path: string }[]
}

export interface CastInfo {
  name: string
  mime: string
  streamable: boolean
  url: string
  expires: number
}

export interface FileInfo {
  general: {
    name: string
    size: number | null
    format: string | null
    mime: string | null
    duration: string | null
  }
  admin?: {
    path: string
    created: number | null
    modified: number | null
    video: Record<string, string | number | boolean>
    audio: Record<string, string | number | boolean>
    comments: Record<string, string>
    raw: unknown
  }
}

export interface SearchResponse {
  query: string
  results: { name: string; path: string; type: ItemType }[]
  truncated: boolean
}

export interface Dashboard {
  logs: { name: string; title: string; modified: number | null; lines: string[] }[]
}
