import { Badge, Flex, SegmentedControl, Text } from '@radix-ui/themes'
import type { Server } from '../../api/admin'

/**
 * media02 / media01 switch. media01 is only offered when the current folder
 * exists there (as on the old site), and is flagged as the archive server.
 */
export function ServerToggle({
  value,
  onChange,
  media01Available,
  media01Reason,
}: {
  value: Server
  onChange: (server: Server) => void
  media01Available: boolean
  media01Reason?: string | null
}) {
  return (
    <Flex direction="column" gap="1">
      <Text as="div" size="2" weight="bold">
        Server
      </Text>
      {media01Available ? (
        <Flex align="center" gap="2" wrap="wrap">
          <SegmentedControl.Root value={value} onValueChange={(v) => onChange(v as Server)} aria-label="Server">
            <SegmentedControl.Item value="media02">media02</SegmentedControl.Item>
            <SegmentedControl.Item value="media01">media01</SegmentedControl.Item>
          </SegmentedControl.Root>
          {value === 'media01' && (
            <Badge color="red" variant="soft">
              Archive server, careful
            </Badge>
          )}
        </Flex>
      ) : (
        <Text size="2" color="gray">
          <Badge color="gray" mr="2">
            media02
          </Badge>
          {media01Reason ?? "This folder isn't on media01, so only media02 is available."}
        </Text>
      )}
    </Flex>
  )
}
