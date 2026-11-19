import { Badge, Button, Callout, Dialog, Flex, ScrollArea, Spinner, Text } from '@radix-ui/themes'
import { useCopyQueue } from '../../api/admin'

/** What's waiting for (and running in) the hourly copy-to-media01 queue. */
export function CopyQueueDialog({ onClose }: { onClose: () => void }) {
  const { data, error, isPending } = useCopyQueue(true)

  const section = (title: string, lines: string[], color: 'amber' | 'blue') => (
    <Flex direction="column" gap="2">
      <Flex align="center" gap="2">
        <Text size="2" weight="bold">
          {title}
        </Text>
        <Badge color={color} variant="soft">
          {lines.length}
        </Badge>
      </Flex>
      {lines.length === 0 ? (
        <Text size="2" color="gray">
          Nothing.
        </Text>
      ) : (
        <ScrollArea type="auto" scrollbars="both" style={{ maxHeight: 200 }}>
          <pre className="log-tail">{lines.join('\n')}</pre>
        </ScrollArea>
      )}
    </Flex>
  )

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="760px">
        <Dialog.Title>Copy queue</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          The queue runs at 35 minutes past each hour between 07:00 and 23:00. Output goes to the "File Copy Queue" log.
        </Dialog.Description>
        {isPending && <Spinner />}
        {error && (
          <Callout.Root color="red">
            <Callout.Text>{error.message}</Callout.Text>
          </Callout.Root>
        )}
        {data && (
          <Flex direction="column" gap="4">
            {section('Running now', data.running, 'blue')}
            {section('Waiting for the next run', data.pending, 'amber')}
          </Flex>
        )}
        <Flex mt="5" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
