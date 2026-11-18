import { describe, expect, it } from 'vitest'
import { canSee, formatBytes, greeting, initials, roleChip } from './format'
import type { MenuItem } from '../api/types'

describe('greeting', () => {
  it('follows the time of day', () => {
    expect(greeting(8)).toBe('Morning')
    expect(greeting(12)).toBe('Afternoon')
    expect(greeting(17)).toBe('Afternoon')
    expect(greeting(21)).toBe('Evening')
  })
})

describe('roleChip', () => {
  it('shows nothing for items everyone can see', () => {
    expect(roleChip(null)).toBeNull()
  })
  it('shows the least-privileged granting role', () => {
    expect(roleChip(['admin', 'ftp'])).toBe('ftp')
    expect(roleChip(['admin'])).toBe('admin')
  })
})

describe('formatBytes', () => {
  it('formats like the old site', () => {
    expect(formatBytes(512)).toBe('512 bytes')
    expect(formatBytes(48 * 1024)).toBe('48 KB')
    expect(formatBytes(1.94 * 1024 ** 3)).toBe('1.9 GB')
  })
  it('handles sizes over 2 GB and 4 GB (32-bit server sends them as numbers)', () => {
    expect(formatBytes(4.5 * 1024 ** 3)).toBe('4.5 GB')
  })
  it('returns empty for unknown sizes', () => {
    expect(formatBytes(null)).toBe('')
  })
})

describe('canSee / initials', () => {
  const menu: MenuItem[] = [{ key: 'library', title: 'Library', path: '/library', group: 'browse', roles: null }]
  it('checks the filtered menu', () => {
    expect(canSee(menu, 'library')).toBe(true)
    expect(canSee(menu, 'logs')).toBe(false)
  })
  it('makes initials', () => {
    expect(initials('richard')).toBe('RI')
    expect(initials('alice smith')).toBe('AS')
  })
})
