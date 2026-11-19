import { parentPath } from './paths'

export interface PickerRow {
  /** unique per list: ".." for "Up a level", otherwise the folder's path */
  key: string
  name: string
  path: string
  letter: string
  up: boolean
}

/** "Up a level" (when not at the top) followed by the folders matching the filter. */
export function pickerRows(
  value: string,
  folders: { name: string; path: string; letter: string }[],
  filter: string,
): PickerRow[] {
  const needle = filter.trim().toLowerCase()
  const rows: PickerRow[] = value === '' ? [] : [{ key: '..', name: 'Up a level', path: parentPath(value), letter: '', up: true }]
  for (const f of folders) {
    if (needle === '' || f.name.toLowerCase().includes(needle)) rows.push({ key: f.path, ...f, up: false })
  }
  return rows
}

/** Row to highlight: the chosen key, else the first folder (not "Up a level"). */
export function activeRowIndex(rows: PickerRow[], key: string | null): number {
  const chosen = key === null ? -1 : rows.findIndex((r) => r.key === key)
  if (chosen >= 0) return chosen
  const first = rows.findIndex((r) => !r.up)
  return first >= 0 ? first : 0
}

/**
 * Index of the next folder starting with `letter` after `from` (wrapping),
 * so pressing "g" again moves on to the next G. Uses the sort letter, so
 * "The Office" counts as O, matching the list's order. -1 when none.
 */
export function letterJump(rows: PickerRow[], letter: string, from: number): number {
  const matches = (r: PickerRow) => !r.up && (r.letter === letter || r.name.toLowerCase().startsWith(letter))
  const n = rows.length
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n
    if (matches(rows[i])) return i
  }
  return -1
}
