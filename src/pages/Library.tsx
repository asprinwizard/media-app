import { Callout, Card, Flex, IconButton, SegmentedControl, Skeleton, Spinner, Text, Tooltip } from '@radix-ui/themes'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, FolderOpen } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { useLibrary } from '../api/hooks'
import type { LibraryItem, SortBy, SortDir } from '../api/types'
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
        <div className="lib">
          <Card size="1" className={`lib-card${isPlaceholderData ? ' is-stale' : ''}`} aria-busy={loading}>
            <Flex className="lib-toolbar" align="center" justify="between" gap="3">
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
                      <FileRow item={item} onPlay={setPlaying} onInfo={setInfo} />
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

      <PlayerDialog path={playing} onChange={setPlaying} />
      <FileInfoDialog path={info} onClose={() => setInfo(null)} />
    </>
  )
}
