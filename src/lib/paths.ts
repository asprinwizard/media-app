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

/** SPA route for a library folder. */
export function libraryRoute(path: string): string {
  const encoded = encodeSegments(path)
  return encoded ? `/library/${encoded}` : '/library'
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
