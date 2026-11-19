import { Checkbox, IconButton, Text, Tooltip } from '@radix-ui/themes'
import { Cast, Download, Info, Play } from 'lucide-react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router'
import { logFileLink } from '../api/hooks'
import type { ItemType } from '../api/types'
import { formatBytes, formatDate } from '../lib/format'
import { castRoute, downloadUrl, libraryRoute, mediaUrl } from '../lib/paths'
import { FileTypeIcon } from './FileTypeIcon'

export interface RowItem {
  name: string
  path: string
  type: ItemType
  size?: number | null
  mtime?: number
  letter?: string
}

interface Props {
  item: RowItem
  /** Text to show instead of the name (search shows the full path). */
  label?: string
  showMeta?: boolean
  onPlay: (path: string) => void
  onInfo: (path: string) => void
  /** Manage mode: show a checkbox */
  selectable?: boolean
  selected?: boolean
  onSelect?: (selected: boolean) => void
  /** Listing from media01 (admin browsing): folders open on media01, files are just names. */
  server?: 'media02' | 'media01'
}

const playable = (type: ItemType) => type === 'video' || type === 'audio'

/**
 * One library entry with its actions (port of the old list-group rows):
 * name opens the folder or the file itself, then Info / Cast / Download / Play.
 */
export function FileRow({ item, label, showMeta = true, onPlay, onInfo, selectable, selected, onSelect, server = 'media02' }: Props) {
  const text = label ?? item.name
  const remote = server === 'media01'

  // Clicking a file name logs "file link", then lets the browser open it
  // directly from Apache, as the old site did.
  const openFile = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    await logFileLink(item.path)
    window.location.href = mediaUrl(item.path)
  }

  return (
    <li
      className={['row', showMeta ? '' : 'row-nometa', selectable ? 'row-selectable' : '', selected ? 'row-selected' : ''].filter(Boolean).join(' ')}
      data-letter={item.letter}
    >
      {selectable && (
        <Checkbox checked={!!selected} onCheckedChange={(c) => onSelect?.(c === true)} aria-label={`Select ${item.name}`} />
      )}
      <FileTypeIcon type={item.type} />

      {item.type === 'folder' ? (
        <Link className="row-name" to={libraryRoute(item.path, server)}>
          {text}
        </Link>
      ) : remote ? (
        <Text className="row-name">{text}</Text>
      ) : item.type === 'broken' ? (
        <Text className="row-name" color="gray" title="The file this points to is missing">
          {text}
        </Text>
      ) : (
        <a className="row-name" href={mediaUrl(item.path)} onClick={openFile}>
          {text}
        </a>
      )}

      {showMeta && (
        <>
          <Text className="row-meta" size="1" color="gray">
            {formatBytes(item.size)}
          </Text>
          <Text className="row-meta row-date" size="1" color="gray">
            {formatDate(item.mtime)}
          </Text>
        </>
      )}

      <span className="row-actions">
        {!remote && playable(item.type) && (
          <>
            <Tooltip content="File info">
              <IconButton size="1" variant="ghost" color="gray" aria-label={`Info for ${item.name}`} onClick={() => onInfo(item.path)}>
                <Info size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip content="Cast (opens a player you can send to a Chromecast)">
              <IconButton size="1" asChild variant="ghost" color="gray" aria-label={`Cast ${item.name}`}>
                <Link to={castRoute(item.path)} target="_blank">
                  <Cast size={16} />
                </Link>
              </IconButton>
            </Tooltip>
          </>
        )}
        {!remote && item.type !== 'folder' && item.type !== 'broken' && (
          <Tooltip content="Download">
            <IconButton size="1" asChild variant="ghost" color="gray" aria-label={`Download ${item.name}`}>
              <a href={downloadUrl(item.path)} download>
                <Download size={16} />
              </a>
            </IconButton>
          </Tooltip>
        )}
        {!remote && playable(item.type) && (
          <Tooltip content="Play">
            <IconButton size="1" variant="soft" aria-label={`Play ${item.name}`} onClick={() => onPlay(item.path)}>
              <Play size={16} />
            </IconButton>
          </Tooltip>
        )}
      </span>
    </li>
  )
}
