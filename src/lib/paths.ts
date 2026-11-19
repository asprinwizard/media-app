// Library paths are relative to the library root, e.g. "TV/Drama/Show".
// In URLs each segment is percent-encoded separately so "/" stays a
// separator while "#", "%", "?" and "&" in names survive.

function encodeSegments(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')
}

/** SPA route for a library folder (admins can browse media01 with ?server=media01). */
export function libraryRoute(path: string, server: 'media02' | 'media01' = 'media02'): string {
  const encoded = encodeSegments(path)
  const route = encoded ? `/library/${encoded}` : '/library'
  return server === 'media01' ? `${route}?server=media01` : route
}

/** Library path from the "*" splat of /library/* (React Router decodes it). */
export function pathFromSplat(splat: string | undefined): string {
  return (splat ?? '').split('/').filter(Boolean).join('/')
}

/** Direct file URL served by Apache (the /media alias). */
export function mediaUrl(path: string): string {
  return `/media/Video/${encodeSegments(path)}`
}

/** Forced download through the API (logged). */
export function downloadUrl(path: string): string {
  return `/api/files/download?path=${encodeURIComponent(path)}`
}

/** SPA cast page for a file. */
export function castRoute(path: string): string {
  return `/cast?path=${encodeURIComponent(path)}`
}

/** Folder that holds a file. */
export function parentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

const NO_PREFILL_UNDER = ['Uploaded Files', 'Torrent Downloads']

/**
 * Starting name for "New folder". As before it's the current folder's name
 * (handy for "Show - Series 2"), but only inside a show or film folder:
 * top-level and category folders (Movies, TV/Drama, Uploaded Files, …) start empty.
 */
export function suggestedFolderName(folder: string): string {
  const segments = folder.split('/').filter(Boolean)
  if (segments.length < 3 || NO_PREFILL_UNDER.includes(segments[0])) return ''
  return segments.at(-1) ?? ''
}
