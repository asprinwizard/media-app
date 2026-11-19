import { Badge, Button, Callout, Card, Flex, SegmentedControl, Select, Spinner, Text } from '@radix-ui/themes'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useLog, useLogList } from '../api/ops'
import { PageHeader } from '../components/PageHeader'
import { formatBytes, formatDate } from '../lib/format'

/**
 * Logs (admin): pick a log, then follow its last lines live or read the whole
 * file (port of the old Logs page, which had the two as separate panels).
 */
export function Logs() {
  const [params, setParams] = useSearchParams()
  const list = useLogList()
  const key = params.get('log')
  const mode = params.get('mode') === 'full' ? 'full' : 'tail'
  const log = useLog(key, mode)
  const consoleRef = useRef<HTMLPreElement>(null)
  const stick = useRef(true)

  const set = (next: { log?: string; mode?: 'tail' | 'full' }) => {
    const merged = { log: key ?? '', mode, ...next }
    const search = new URLSearchParams()
    if (merged.log) search.set('log', merged.log)
    if (merged.mode === 'full') search.set('mode', 'full')
    stick.current = true
    setParams(search, { replace: true })
  }

  // Keep following the end, unless the reader has scrolled up.
  useEffect(() => {
    const el = consoleRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [log.data?.text])

  const current = list.data?.logs.find((l) => l.key === key)

  return (
    <>
      <PageHeader title="Logs" description="Server and site logs. Live view shows the last 100 lines, updated every second." />

      <Flex gap="3" align="center" wrap="wrap" mb="3">
        <Select.Root value={key ?? undefined} onValueChange={(value) => set({ log: value })}>
          <Select.Trigger placeholder={list.isPending ? 'Loading…' : 'Choose a log'} style={{ minWidth: 260 }} />
          <Select.Content position="popper">
            {list.data?.logs.map((l) => (
              <Select.Item key={l.key} value={l.key} disabled={!l.exists}>
                {l.title}
                {!l.exists && ' (not found)'}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <SegmentedControl.Root value={mode} onValueChange={(value) => set({ mode: value as 'tail' | 'full' })} aria-label="View">
          <SegmentedControl.Item value="tail">Live</SegmentedControl.Item>
          <SegmentedControl.Item value="full">Whole file</SegmentedControl.Item>
        </SegmentedControl.Root>
        {key && mode === 'full' && (
          <Button variant="soft" color="gray" onClick={() => void log.refetch()} loading={log.isFetching}>
            <RefreshCw size={14} /> Reload
          </Button>
        )}
        {key && log.data && (
          <Text size="1" color="gray" ml="auto">
            {formatBytes(log.data.size)} · updated {formatDate(log.data.mtime)}
            {mode === 'tail' && (
              <Badge color="grass" ml="2" variant="soft">
                live
              </Badge>
            )}
          </Text>
        )}
      </Flex>

      {list.error && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>{list.error.message}</Callout.Text>
        </Callout.Root>
      )}
      {log.error && (
        <Callout.Root color="red" mb="3">
          <Callout.Text>{log.error.message}</Callout.Text>
        </Callout.Root>
      )}
      {log.data?.truncated && (
        <Callout.Root color="amber" mb="3" size="1">
          <Callout.Text>This log is large, so only its last 2 MB is shown.</Callout.Text>
        </Callout.Root>
      )}

      {!key ? (
        <Card size="3">
          <Text color="gray">Choose a log to view.</Text>
        </Card>
      ) : log.isPending ? (
        <Flex gap="2" align="center">
          <Spinner /> <Text color="gray">Loading {current?.title ?? 'log'}…</Text>
        </Flex>
      ) : (
        <pre
          ref={consoleRef}
          className={`log-console${mode === 'full' ? ' is-full' : ''}`}
          onScroll={(e) => {
            const el = e.currentTarget
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
          }}
          tabIndex={0}
          aria-label={`${current?.title ?? 'Log'} contents`}
        >
          {log.data?.text || '(empty)'}
        </pre>
      )}
    </>
  )
}
