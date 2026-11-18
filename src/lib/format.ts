import type { MenuItem, Role } from '../api/types'

/** "Morning" / "Afternoon" / "Evening" for the home page greeting. */
export function greeting(hour: number): string {
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

/**
 * The small role chip shown next to restricted menu items.
 * Shows the least-privileged role that grants access (e.g. "ftp" for Upload),
 * or nothing for items everyone can see.
 */
export function roleChip(roles: Role[] | null): string | null {
  if (!roles) return null
  const nonAdmin = roles.filter((r) => r !== 'admin')
  return nonAdmin[0] ?? 'admin'
}

/** Byte counts as the old site showed them: 1 decimal, binary units. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return ''
  const units: [number, string][] = [
    [1024 ** 4, 'TB'],
    [1024 ** 3, 'GB'],
    [1024 ** 2, 'MB'],
    [1024, 'KB'],
  ]
  for (const [size, unit] of units) {
    if (bytes >= size) return `${Math.round((bytes / size) * 10) / 10} ${unit}`
  }
  return `${bytes} bytes`
}

/** Can the user see this menu key? (The API already filtered the menu.) */
export function canSee(menu: MenuItem[], key: string): boolean {
  return menu.some((item) => item.key === key)
}

/** Initials for the avatar, e.g. "richard" -> "RI", "alice smith" -> "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}
