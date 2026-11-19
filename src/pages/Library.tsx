import { Button, Callout, Card, Checkbox, Flex, IconButton, SegmentedControl, Skeleton, Spinner, Text, Tooltip } from '@radix-ui/themes'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, CircleCheck, FolderOpen, ListChecks } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { useServers } from '../api/admin'
import { useLibrary } from '../api/hooks'
import { useMe } from '../api/useMe'
import type { LibraryItem, SortBy, SortDir } from '../api/types'
import { ConvertDialog } from '../components/admin/ConvertDialog'
import { CopyDialog } from '../components/admin/CopyDialog'
import { CopyQueueDialog } from '../components/admin/CopyQueueDialog'
import { DeleteDialog } from '../components/admin/DeleteDialog'
import { ExtractDialog } from '../components/admin/ExtractDialog'
import { ManageBar, type ManageAction } from '../components/admin/ManageBar'
import { MoveDialog } from '../components/admin/MoveDialog'
import { NewFolderDialog } from '../components/admin/NewFolderDialog'
import { FileInfoDialog } from '../components/FileInfoDialog'
import { FileRow } from '../components/FileRow'
import { PageHeader } from '../components/PageHeader'
import { PlayerDialog } from '../components/PlayerDialog'
import { formatBytes } from '../lib/format'
import { libraryRoute, pathFromSplat } from '../lib/paths'
import { useDelayedFlag } from '../lib/useDelayedFlag'
import { scrollToLetter, useTypeToJump } from '../lib/useTypeToJump'

const RAIL = ['#', ...'abcdefghijklmnopqrstuvwxyz'.split('')]

function summary(items: LibraryItem[]): string {
  const folders = items.filter((i) => i.type === 'folder').length
  const files = items.length - folders
  const bytes = items.reduce((sum, i) => sum + (i.size ?? 0), 0)
  const parts = []
  if (folders) parts.push(`${folders} folder${folders === 1 ? '' : 's'}`)
  if (files) parts.push(`${files} file${files === 1 ? '' : 's'}`)
  if (bytes) parts.push(formatBytes(bytes))
  return parts.join(' · ') || 'Empty folder'
}

/** "S" headings between letters when sorted by name, "Files" before the first file. */
function heading(item: LibraryItem, previous: LibraryItem | undefined, sort: SortBy): string | null {
  const isFile = item.type !== 'folder'
  if (isFile && (!previous || previous.type === 'folder')) return 'Files'
  if (sort !== 'name' || isFile) return null
  return !previous || previous.letter !== item.letter ? item.letter.toUpperCase() : null
}

export function Library() {
  const path = pathFromSplat(useParams()['*'])
  const [params, setParams] = useSearchParams()
  const sort: SortBy = params.get('sort') === 'date' ? 'date' : 'name'
  const dir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const { data, error, isPending, isFetching, isPlaceholderData } = useLibrary(path, sort, dir)
  const loading = isPending || (isFetching && isPlaceholderData)
  const slow = useDelayedFlag(loading, 1200)

  const [playing, setPlaying] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // --- Manage mode (admins) ---
  const isAdmin = useMe().data?.roles.includes('admin') ?? false
  const [manage, setManage] = useState(false)
  // Selection belongs to one folder; moving elsewhere starts afresh.
  const [selection, setSelection] = useState<{ path: string; names: Set<string> }>({ path, names: new Set() })
  const selectedNames = selection.path === path ? selection.names : new Set<string>()
  const [dialog, setDialog] = useState<ManageAction | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const servers = useServers(path, manage && isAdmin)
  const media01Available = servers.data?.media01 ?? false

  const items = data && !isPlaceholderData ? data.items : []
  const selected = items.filter((i) => selectedNames.has(i.name))
  const select = (name: string, on: boolean) => {
    const next = new Set(selectedNames)
    if (on) next.add(name)
    else next.delete(name)
    setSelection({ path, names: next })
  }
  const selectAll = (on: boolean) => setSelection({ path, names: on ? new Set(items.map((i) => i.name)) : new Set() })

  const files = selected.filter((i) => i.type !== 'folder' && i.type !== 'broken')
  const archives = items.filter((i) => i.type === 'compressed')
  const can: Record<ManageAction, boolean> = {
    move: selected.length > 0,
    copy: files.length > 0 && files.length === selected.length,
    convert: selected.some((i) => i.type === 'video'),
    extract: archives.length > 0,
    folder: true,
    delete: selected.length > 0,
    queue: true,
  }
  const reasons: Partial<Record<ManageAction, string>> = {
    move: 'Select files or folders first',
    copy: selected.length === 0 ? 'Select files first' : 'Only files can be copied (not folders)',
    convert: 'Select video files first',
    extract: 'There are no archives in this folder',
    delete: 'Select files or folders first',
  }
  const done = (message: string) => {
    setSelection({ path, names: new Set() })
    setFlash(message)
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 6000)
  }
  const dialogProps = {
    folder: path,
    media01Available,
    media01Reason: servers.data?.media01Error,
    onClose: () => setDialog(null),
    onDone: done,
  }

  const listRef = useRef<HTMLUListElement>(null)
  const getList = useCallback(() => listRef.current, [])
  useTypeToJump(getList, !!data)

  const letters = useMemo(() => new Set(data?.items.map((i) => i.letter)), [data])

  const setSort = (next: Partial<{ sort: SortBy; dir: SortDir }>) => {
    const merged = { sort, dir, ...next }
    const search = new URLSearchParams()
    if (merged.sort !== 'name') search.set('sort', merged.sort)
    if (merged.dir !== 'asc') search.set('dir', merged.dir)
    setParams(search, { replace: true })
  }

  // Jump to the top as soon as another folder is opened, so the loading
  // message is visible while it loads.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [path])

  // Title and breadcrumbs come from the address, so they update immediately.
  const segments = path.split('/').filter(Boolean)
  const title = segments.at(-1) ?? 'Library'
  const crumbs = [
    { name: 'Video', path: '' },
    ...segments.map((name, i) => ({ name, path: segments.slice(0, i + 1).join('/') })),
  ]

  return (
    <>
      <PageHeader
        title={path ? title : 'Library'}
        description={path ? undefined : 'Everything on media02, folder by folder.'}
        actions={
          <>
            <SegmentedControl.Root value={sort} onValueChange={(value) => setSort({ sort: value as SortBy })} aria-label="Sort by">
              <SegmentedControl.Item value="name">Name</SegmentedControl.Item>
              <SegmentedControl.Item value="date">Date</SegmentedControl.Item>
            </SegmentedControl.Root>
            {isAdmin && (
              <Button
                variant={manage ? 'solid' : 'outline'}
                color={manage ? undefined : 'gray'}
                onClick={() => {
                  setManage(!manage)
                  selectAll(false)
                }}
                aria-pressed={manage}
              >
                <ListChecks size={16} /> {manage ? 'Done' : 'Manage'}
              </Button>
            )}
            <Tooltip content={dir === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}>
              <IconButton
                variant="outline"
                color="gray"
                aria-label={dir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                onClick={() => setSort({ dir: dir === 'asc' ? 'desc' : 'asc' })}
              >
                {dir === 'asc' ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
              </IconButton>
            </Tooltip>
          </>
        }
      />

      <nav className="crumbs" aria-label="Folder path">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.path}>
            {index > 0 && <ChevronRight size={14} aria-hidden className="crumb-sep" />}
            {index === crumbs.length - 1 ? (
              <Text weight="bold" size="2" aria-current="page">
                {crumb.name}
              </Text>
            ) : (
              <Link to={libraryRoute(crumb.path)}>{crumb.name}</Link>
            )}
          </Fragment>
        ))}
      </nav>

      {flash && (
        <Callout.Root color="grass" mb="3" role="status">
          <Callout.Icon>
            <CircleCheck size={16} />
          </Callout.Icon>
          <Callout.Text>{flash}</Callout.Text>
        </Callout.Root>
      )}

      {error ? (
        <Callout.Root color={error instanceof ApiError && error.status === 403 ? 'red' : 'amber'}>
          <Callout.Icon>
            <FolderOpen size={16} />
          </Callout.Icon>
          <Callout.Text>
            {error instanceof ApiError && error.status === 404 ? 'This folder no longer exists.' : error.message}{' '}
            <Link to="/library">Back to the library</Link>
          </Callout.Text>
        </Callout.Root>
      ) : (
        <div className={`lib${manage ? ' manage' : ''}`}>
          <Card size="1" className={`lib-card${isPlaceholderData ? ' is-stale' : ''}`} aria-busy={loading}>
            <Flex className="lib-toolbar" align="center" justify="between" gap="3">
              <Flex align="center" gap="3">
              {manage && items.length > 0 && (
                <Checkbox
                  checked={selected.length === 0 ? false : selected.length === items.length ? true : 'indeterminate'}
                  onCheckedChange={(c) => selectAll(c === true)}
                  aria-label="Select all"
                />
              )}
              {loading ? (
                <Flex align="center" gap="2" role="status" aria-live="polite">
                  <Spinner size="1" />
                  <Text size="1" color={slow ? 'amber' : 'gray'} weight={slow ? 'medium' : 'regular'}>
                    {slow ? 'Waking up the drives — this can take a few seconds…' : 'Loading…'}
                  </Text>
                </Flex>
              ) : (
                <Text size="1" color="gray">
                  {data ? summary(data.items) : ''}
                </Text>
              )}
              </Flex>
              <Text size="1" color="gray" className="hide-sm">
                Type a letter to jump
              </Text>
            </Flex>

            {isPending ? (
              <ul className="rows">
                {Array.from({ length: 8 }, (_, i) => (
                  <li key={i} className="row">
                    <Skeleton width="26px" height="26px" />
                    <Skeleton height="16px" width={`${40 + ((i * 17) % 45)}%`} />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="rows" ref={listRef}>
                {data?.items.map((item, index) => {
                  const label = heading(item, data.items[index - 1], sort)
                  return (
                    <Fragment key={item.path}>
                      {label && (
                        <li className="row-heading" aria-hidden>
                          {label}
                        </li>
                      )}
                      <FileRow
                        item={item}
                        onPlay={setPlaying}
                        onInfo={setInfo}
                        selectable={manage}
                        selected={selectedNames.has(item.name)}
                        onSelect={(on) => select(item.name, on)}
                      />
                    </Fragment>
                  )
                })}
              </ul>
            )}
          </Card>

          {data?.alpha && !manage && (
            <nav className="alpha" aria-label="Jump to letter">
              {RAIL.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  disabled={!letters.has(letter)}
                  onClick={() => scrollToLetter(listRef.current, letter)}
                >
                  {letter.toUpperCase()}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}

      {manage && !error && (
        <ManageBar count={selected.length} can={can} reasons={reasons} onAction={setDialog} />
      )}
      {dialog === 'move' && <MoveDialog {...dialogProps} items={selected} />}
      {dialog === 'delete' && <DeleteDialog {...dialogProps} items={selected} />}
      {dialog === 'folder' && <NewFolderDialog {...dialogProps} />}
      {dialog === 'copy' && <CopyDialog folder={path} items={files} onClose={() => setDialog(null)} onShowQueue={() => setDialog('queue')} />}
      {dialog === 'queue' && <CopyQueueDialog onClose={() => setDialog(null)} />}
      {dialog === 'convert' && <ConvertDialog folder={path} items={selected.filter((i) => i.type === 'video')} onClose={() => setDialog(null)} />}
      {dialog === 'extract' && (
        <ExtractDialog
          {...dialogProps}
          archives={archives}
          initial={selected.find((i) => i.type === 'compressed')?.name}
        />
      )}

      <PlayerDialog path={playing} onChange={setPlaying} />
      <FileInfoDialog path={info} onClose={() => setInfo(null)} />
    </>
  )
}
