import { describe, expect, it } from 'vitest'
import { activeRowIndex, letterJump, pickerRows } from './folderPicker'

const folders = [
  { name: 'Ember (2023)', path: 'Movies/Ember (2023)', letter: 'e' },
  { name: 'Gattaca', path: 'Movies/Gattaca', letter: 'g' },
  { name: 'Gravity', path: 'Movies/Gravity', letter: 'g' },
  { name: 'The Office', path: 'Movies/The Office', letter: 'o' },
]

describe('folder picker', () => {
  it('adds "Up a level" below the top and filters by name', () => {
    expect(pickerRows('', folders, '').map((r) => r.name)).toEqual(['Ember (2023)', 'Gattaca', 'Gravity', 'The Office'])
    const rows = pickerRows('Movies', folders, 'gra')
    expect(rows.map((r) => r.name)).toEqual(['Up a level', 'Gravity'])
    expect(rows[0].path).toBe('')
  })

  it('highlights the first folder by default, not "Up a level"', () => {
    const rows = pickerRows('Movies', folders, '')
    expect(activeRowIndex(rows, null)).toBe(1)
    expect(activeRowIndex(rows, 'Movies/Gravity')).toBe(3)
    expect(activeRowIndex(rows, 'gone')).toBe(1)
    expect(activeRowIndex([], null)).toBe(0)
  })

  it('jumps by letter, cycling through matches, using the sort letter', () => {
    const rows = pickerRows('Movies', folders, '')
    expect(letterJump(rows, 'g', 1)).toBe(2)
    expect(letterJump(rows, 'g', 2)).toBe(3)
    expect(letterJump(rows, 'g', 3)).toBe(2)
    expect(letterJump(rows, 'o', 0)).toBe(4)
    expect(letterJump(rows, 't', 0)).toBe(4) // "The Office" by its first letter too
    expect(letterJump(rows, 'z', 0)).toBe(-1)
  })
})
