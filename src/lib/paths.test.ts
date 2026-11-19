import { describe, expect, it } from 'vitest'
import { castRoute, downloadUrl, libraryRoute, mediaUrl, parentPath, pathFromSplat } from './paths'

const odd = 'TV/Drama/Show/Odd #1 & 50% + x?.mp4'

describe('paths', () => {
  it('encodes each segment but keeps slashes', () => {
    expect(libraryRoute('TV/Drama/Harbour Lights')).toBe('/library/TV/Drama/Harbour%20Lights')
    expect(libraryRoute('')).toBe('/library')
    expect(mediaUrl(odd)).toBe('/media/Video/TV/Drama/Show/Odd%20%231%20%26%2050%25%20%2B%20x%3F.mp4')
  })

  it('puts the whole path in one query parameter for API links', () => {
    expect(downloadUrl(odd)).toBe('/api/files/download?path=' + encodeURIComponent(odd))
    expect(new URL(castRoute(odd), 'https://x').searchParams.get('path')).toBe(odd)
  })

  it('normalises the router splat and finds parents', () => {
    expect(pathFromSplat('TV//Drama/')).toBe('TV/Drama')
    expect(pathFromSplat(undefined)).toBe('')
    expect(parentPath(odd)).toBe('TV/Drama/Show')
    expect(parentPath('Movies')).toBe('')
  })
})
