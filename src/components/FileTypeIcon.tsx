import { Ban, Captions, File, FileArchive, Film, Folder, Music, type LucideIcon } from 'lucide-react'
import type { ItemType } from '../api/types'

const ICONS: Record<ItemType, LucideIcon> = {
  folder: Folder,
  video: Film,
  audio: Music,
  subtitle: Captions,
  compressed: FileArchive,
  file: File,
  broken: Ban,
}

const LABELS: Record<ItemType, string> = {
  folder: 'Folder',
  video: 'Video',
  audio: 'Audio',
  subtitle: 'Subtitles',
  compressed: 'Archive',
  file: 'File',
  broken: 'Missing file (broken link)',
}

/** Coloured square with the icon for a library entry type. */
export function FileTypeIcon({ type }: { type: ItemType }) {
  const Icon = ICONS[type]
  return (
    <span className={`ftype ftype-${type}`} title={LABELS[type]} aria-label={LABELS[type]} role="img">
      <Icon size={15} aria-hidden />
    </span>
  )
}
