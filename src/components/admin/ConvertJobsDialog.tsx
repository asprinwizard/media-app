import { Button, Callout, Dialog, Flex } from '@radix-ui/themes'
import { useConvertPresets } from '../../api/admin'
import { ConvertJobsList } from './ConvertJobsList'

/** Recent conversions, without having to select a file first. */
export function ConvertJobsDialog({ onClose }: { onClose: () => void }) {
  const presets = useConvertPresets(true)
  const configured = presets.data?.configured ?? false

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>Conversions</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Recent CloudConvert jobs. Finished files go to /home/ftp/media/cloudconvert.
        </Dialog.Description>
        {presets.data && !configured ? (
          <Callout.Root color="amber">
            <Callout.Text>Convert isn't set up yet: the CloudConvert API key and SFTP login need adding to media-api's .env.</Callout.Text>
          </Callout.Root>
        ) : (
          configured && <ConvertJobsList limit={20} />
        )}
        <Flex gap="3" mt="5" justify="end">
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
