import { Button, Callout, Card, Checkbox, Flex, IconButton, SegmentedControl, Skeleton, Spinner, Text, TextField, Tooltip } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, CircleCheck, CircleX, FolderOpen, ListChecks, RefreshCw, Search, X } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { useExtractJob, useServers, type Server } from '../api/admin'
import { useLibrary } from '../api/hooks'
import { useMe } from '../api/useMe'
import type { LibraryItem, SortBy, SortDir } from '../api/types'
import { ConvertDialog } from '../components/admin/ConvertDialog'
import { ConvertJobsDialog } from '../components/admin/ConvertJobsDialog'
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
  const isAdmin = useMe().data?.roles.includes('admin') ?? false
  // Admins can browse media01's copy of the library (?server=media01), in Manage mode.
  const browse: Server = isAdmin && params.get('server') === 'media01' ? 'media01' : 'media02'
  const onMedia01 = browse === 'media01'
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useLibrary(path, sort, dir, browse)
  const loading = isPending || (isFetching && isPlaceholderData)
  const slow = useDelayedFlag(loading, 1200)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [playing, setPlaying] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // --- Manage mode (admins) ---
  const [manageOn, setManage] = useState(false)
  const manage = manageOn || onMedia01
  // Selection belongs to one folder; moving elsewhere starts afresh.
  const [selection, setSelection] = useState<{ path: string; names: Set<string> }>({ path, names: new Set() })
  const selectedNames = selection.path === path ? selection.names : new Set<string>()
  const [dialog, setDialog] = useState<ManageAction | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const servers = useServers(path, manage && isAdmin)
  const folderOnMedia01 = onMedia01 || (servers.data?.media01 ?? false)

  // Text filter for the open folder; like the selection, it starts afresh in another folder.
  const [filterState, setFilterState] = useState({ path, text: '' })
  const filter = filterState.path === path ? filterState.text : ''
  const setFilter = (text: string) => setFilterState({ path, text })
  const needle = filter.trim().toLowerCase()
  const allItems = useMemo(() => (data && !isPlaceholderData ? data.items : []), [data, isPlaceholderData])
  const items = useMemo(
    () => (needle ? allItems.filter((i) => i.name.toLowerCase().includes(needle)) : allItems),
    [allItems, needle],
  )
  // Only what's on screen counts as selected, so hidden items are never acted on.
  const selected = items.filter((i) => selectedNames.has(i.name))

  // Browsing media02: media01 is only offered for items that are also there.
  const twin = useLibrary(path, 'name', 'asc', 'media01', manage && !onMedia01 && folderOnMedia01)
  const twinNames = twin.data && !twin.isPlaceholderData && twin.data.path === path ? new Set(twin.data.items.map((i) => i.name)) : null
  const missing = twinNames ? selected.filter((i) => !twinNames.has(i.name)) : []
  const itemsOnMedia01 = folderOnMedia01 && twinNames !== null && missing.length === 0
  const folderReason = servers.data?.media01Error ?? null
  const itemsReason = !folderOnMedia01
    ? folderReason
    : twin.error
      ? twin.error.message
      : !twinNames
        ? 'Checking what is on media01…'
        : missing.length === 1
          ? `"${missing[0].name}" isn't on media01, so only media02 is available.`
          : missing.length > 1
            ? `${missing.length} of the selected items aren't on media01, so only media02 is available.`
            : null

  // Extractions carry on after their dialog closes; refresh the list when one ends.
  const [extracting, setExtracting] = useState<{ id: string; archive: string } | null>(null)
  const extractJob = useExtractJob(extracting?.id ?? null)
  const extractStatus = extractJob.data?.status
  useEffect(() => {
    if (extractStatus === 'done' || extractStatus === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['library'] })
    }
  }, [extractStatus, queryClient])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'servers'] })
    queryClient.invalidateQueries({ queryKey: ['library', 'media01', path] })
    refetch()
  }
  const select = (name: string, on: boolean) => {
    const next = new Set(selectedNames)
    if (on) next.add(name)
    else next.delete(name)
    setSelection({ path, names: next })
  }
  const selectAll = (on: boolean) => setSelection({ path, names: on ? new Set(items.map((i) => i.name)) : new Set() })

  const files = selected.filter((i) => i.type !== 'folder' && i.type !== 'broken')
  const archives = allItems.filter((i) => i.type === 'compressed')
  const media02Only = 'Only when browsing media02'
  const can: Record<ManageAction, boolean> = {
    move: selected.length > 0,
    copy: !onMedia01 && files.length > 0 && files.length === selected.length,
    convert: !onMedia01 && selected.some((i) => i.type === 'video'),
    extract: !onMedia01 && archives.length > 0,
    folder: true,
    delete: selected.length > 0,
    queue: true,
    conversions: true,
  }
  const reasons: Partial<Record<ManageAction, string>> = {
    move: 'Select files or folders first',
    copy: onMedia01 ? media02Only : selected.length === 0 ? 'Select files first' : 'Only files can be copied (not folders)',
    convert: onMedia01 ? media02Only : 'Select video files first',
    extract: onMedia01 ? media02Only : 'There are no archives in this folder',
    delete: 'Select files or folders first',
  }
  const done = (message: string) => {
    setSelection({ path, names: new Set() })
    setFlash(message)
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 6000)
  }
  const dialogProps = {
    folder: path,
    browsing: browse,
    media01Available: itemsOnMedia01,
    media01Reason: itemsReason,
    onClose: () => setDialog(null),
    onDone: done,
  }

  const listRef = useRef<HTMLUListElement>(null)
  const getList = useCallback(() => listRef.current, [])
  useTypeToJump(getList, !!data)

  const letters = useMemo(() => new Set(items.map((i) => i.letter)), [items])
  const filterRef = useRef<HTMLInputElement>(null)

  // "/" jumps to the filter box, as on many sites.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return
      if (document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      filterRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setSort = (next: Partial<{ sort: SortBy; dir: SortDir }>) => {
    const merged = { sort, dir, ...next }
    const search = new URLSearchParams()
    if (onMedia01) search.set('server', 'media01')
    if (merged.sort !== 'name') search.set('sort', merged.sort)
    if (merged.dir !== 'asc') search.set('dir', merged.dir)
    setParams(search, { replace: true })
  }

  const browseServer = (server: Server) => {
    const search = new URLSearchParams(params)
    if (server === 'media01') search.set('server', 'media01')
    else search.delete('server')
    setManage(true)
    navigate({ search: search.toString() ? `?${search}` : '' })
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
        description={onMedia01 ? 'Browsing media01, the archive server.' : path ? undefined : 'Everything on media02, folder by folder.'}
        actions={
          <>
            <Tooltip content="Refresh this folder">
              <IconButton variant="outline" color="gray" aria-label="Refresh" onClick={refresh} disabled={isFetching}>
                <RefreshCw size={16} className={isFetching && !loading ? 'spin' : undefined} />
              </IconButton>
            </Tooltip>
            {isAdmin && (
              <Button
                variant={manage ? 'solid' : 'outline'}
                color={manage ? undefined : 'gray'}
                onClick={() => {
                  if (onMedia01) browseServer('media02')
                  setManage(!manage)
                  selectAll(false)
                }}
                aria-pressed={manage}
              >
                <ListChecks size={16} /> {manage ? 'Done' : 'Manage'}
              </Button>
            )}
            <Flex gap="2" ml={{ initial: '0', sm: '4' }}>
              <SegmentedControl.Root value={sort} onValueChange={(value) => setSort({ sort: value as SortBy })} aria-label="Sort by">
                <SegmentedControl.Item value="name">Name</SegmentedControl.Item>
                <SegmentedControl.Item value="date">Date</SegmentedControl.Item>
              </SegmentedControl.Root>
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
            </Flex>
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
              <Link to={libraryRoute(crumb.path, browse)}>{crumb.name}</Link>
            )}
          </Fragment>
        ))}
      </nav>

      {manage && (onMedia01 || folderOnMedia01) && (
        <Flex align="center" gap="3" mb="3" wrap="wrap">
          <Text size="2" weight="bold">
            Browsing
          </Text>
          <SegmentedControl.Root value={browse} onValueChange={(v) => browseServer(v as Server)} aria-label="Browse server">
            <SegmentedControl.Item value="media02">media02</SegmentedControl.Item>
            <SegmentedControl.Item value="media01">media01</SegmentedControl.Item>
          </SegmentedControl.Root>
          {onMedia01 && (
            <Text size="2" color="red">
              Archive server: changes here apply to media01.
            </Text>
          )}
        </Flex>
      )}

      {extracting && dialog !== 'extract' && (
        <Callout.Root color={extractStatus === 'done' ? 'grass' : extractStatus === 'failed' ? 'red' : 'blue'} mb="3" role="status">
          <Callout.Icon>
            {extractStatus === 'done' ? <CircleCheck size={16} /> : extractStatus === 'failed' ? <CircleX size={16} /> : <Spinner size="1" />}
          </Callout.Icon>
          <Callout.Text>
            {extractStatus === 'done'
              ? `Extracted ${extracting.archive}.`
              : extractStatus === 'failed'
                ? `Extracting ${extracting.archive} failed: ${extractJob.data?.error ?? 'unknown error'}`
                : `Extracting ${extracting.archive} in the background…`}{' '}
            {(extractStatus === 'done' || extractStatus === 'failed') && (
              <IconButton size="1" variant="ghost" color="gray" aria-label="Dismiss" onClick={() => setExtracting(null)}>
                <X size={14} />
              </IconButton>
            )}
          </Callout.Text>
        </Callout.Root>
      )}

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
            {error instanceof ApiError && error.status === 404 && !onMedia01 ? 'This folder no longer exists.' : error.message}{' '}
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
                  {data ? (needle ? `${items.length} of ${allItems.length} match` : summary(data.items)) : ''}
                </Text>
              )}
              </Flex>
              <TextField.Root
                ref={filterRef}
                size="1"
                className="lib-filter"
                placeholder="Filter  (press /)"
                aria-label="Filter this folder"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFilter('')
                    e.currentTarget.blur()
                  }
                }}
              >
                <TextField.Slot>
                  <Search size={14} />
                </TextField.Slot>
                {filter && (
                  <TextField.Slot>
                    <IconButton size="1" variant="ghost" color="gray" aria-label="Clear filter" onClick={() => setFilter('')}>
                      <X size={12} />
                    </IconButton>
                  </TextField.Slot>
                )}
              </TextField.Root>
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
                {needle && items.length === 0 && (
                  <li className="row-empty">
                    <Text size="2" color="gray">
                      Nothing here matches “{filter.trim()}”.
                    </Text>
                  </li>
                )}
                {(isPlaceholderData ? (data?.items ?? []) : items).map((item, index, list) => {
                  const label = heading(item, list[index - 1], sort)
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
                        server={browse}
                      />
                    </Fragment>
                  )
                })}
              </ul>
            )}
          </Card>

          {data?.alpha && (
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
      {dialog === 'folder' && (
        <NewFolderDialog {...dialogProps} media01Available={folderOnMedia01} media01Reason={folderReason} />
      )}
      {dialog === 'conversions' && <ConvertJobsDialog onClose={() => setDialog(null)} />}
      {dialog === 'copy' && <CopyDialog folder={path} items={files} onClose={() => setDialog(null)} onShowQueue={() => setDialog('queue')} />}
      {dialog === 'queue' && <CopyQueueDialog onClose={() => setDialog(null)} />}
      {dialog === 'convert' && <ConvertDialog folder={path} items={selected.filter((i) => i.type === 'video')} onClose={() => setDialog(null)} />}
      {dialog === 'extract' && (
        <ExtractDialog
          {...dialogProps}
          onDone={() => setSelection({ path, names: new Set() })}
          onStarted={(id, archive) => setExtracting({ id, archive })}
          archives={archives}
          initial={selected.find((i) => i.type === 'compressed')?.name}
        />
      )}

      <PlayerDialog path={playing} onChange={setPlaying} />
      <FileInfoDialog path={info} onClose={() => setInfo(null)} />
    </>
  )
}
