import { Badge, Button, Callout, Flex, Skeleton, Text } from '@radix-ui/themes'
import { RefreshCw } from 'lucide-react'
import { useConvertJobs } from '../../api/admin'
import { formatDate } from '../../lib/format'

const STATUS_COLOR: Record<string, 'grass' | 'orange' | 'red' | 'gray'> = {
  finished: 'grass',
  processing: 'orange',
  waiting: 'gray',
  error: 'red',
}

/**
 * Recent CloudConvert jobs. Updates every few seconds while any job is
 * waiting or processing; the refresh button checks again on demand.
 */
export function ConvertJobsList({ limit = 8 }: { limit?: number }) {
  const jobs = useConvertJobs(true)

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between">
        <Text size="2" weight="bold">
          Recent jobs {jobs.data?.active && <Badge color="orange">updating</Badge>}
        </Text>
        <Button size="1" variant="ghost" color="gray" onClick={() => jobs.refetch()} loading={jobs.isFetching}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </Flex>
      {jobs.error && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{jobs.error.message}</Callout.Text>
        </Callout.Root>
      )}
      <Flex direction="column" gap="1" className="job-list">
        {jobs.isPending &&
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height="20px" />)}
        {jobs.data?.jobs.length === 0 && (
          <Text size="2" color="gray">
            No recent jobs.
          </Text>
        )}
        {jobs.data?.jobs.slice(0, limit).map((job) => (
          <Flex key={job.id} align="center" justify="between" gap="3">
            <Text size="2" truncate>
              {job.tag ?? job.id}
            </Text>
            <Flex gap="2" align="center" flexShrink="0">
              <Text size="1" color="gray">
                {formatDate(job.created)}
              </Text>
              <Badge color={STATUS_COLOR[job.status] ?? 'gray'}>{job.status}</Badge>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Flex>
  )
}
