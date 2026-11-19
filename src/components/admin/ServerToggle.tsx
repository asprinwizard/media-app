import { Badge, Flex, SegmentedControl, Text } from '@radix-ui/themes'
import type { Server } from '../../api/admin'

/**
 * media02 / media01 switch. media01 is only offered when the current folder
 * and every selected item exist there, and is flagged as the archive server.
 * When browsing media01 the server is fixed (locked).
 */
export function ServerToggle({
  value,
  onChange,
  media01Available,
  media01Reason,
  locked = false,
}: {
  value: Server
  onChange: (server: Server) => void
  media01Available: boolean
  media01Reason?: string | null
  locked?: boolean
}) {
  return (
    <Flex direction="column" gap="1">
      <Text as="div" size="2" weight="bold">
        Server
      </Text>
      {locked ? (
        <Flex align="center" gap="2">
          <Badge color={value === 'media01' ? 'red' : 'gray'} variant="soft">
            {value}
          </Badge>
          <Text size="2" color="gray">
            {value === 'media01' ? "You're browsing media01 (the archive server), so this applies there." : ''}
          </Text>
        </Flex>
      ) : media01Available ? (
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
