import { Callout, Flex, Spinner, Text } from '@radix-ui/themes'
import { Cast as CastIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useCast } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'

/**
 * Cast player (port of cast.php): a plain <video> on a signed link the
 * Chromecast can fetch without logging in. Chrome's own cast button on the
 * video sends it to the TV. Files browsers can't stream download instead.
 */
export function Cast() {
  const [params] = useSearchParams()
  const path = params.get('path')
  const { data, error } = useCast(path)

  useEffect(() => {
    if (data && !data.streamable) window.location.replace(data.url)
  }, [data])

  if (!path) {
    return (
      <>
        <PageHeader title="Cast" />
        <Text color="gray">Open Cast from a file in the library.</Text>
      </>
    )
  }

  return (
    <>
      <PageHeader title={data?.name ?? 'Cast'} />
      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error.message}</Callout.Text>
        </Callout.Root>
      )}
      {!data && !error && (
        <Flex gap="2" align="center">
          <Spinner /> <Text color="gray">Preparing…</Text>
        </Flex>
      )}
      {data && !data.streamable && (
        <Text color="gray">This file can't stream, so it's downloading instead.</Text>
      )}
      {data?.streamable && (
        <>
          <video className="screen cast-video" src={data.url} controls autoPlay playsInline />
          <Callout.Root mt="3" color="gray">
            <Callout.Icon>
              <CastIcon size={16} />
            </Callout.Icon>
            <Callout.Text>
              In Chrome, use the cast button on the player (or the ⋮ menu → Cast) to send this to your TV. The link works for 24 hours.
            </Callout.Text>
          </Callout.Root>
        </>
      )}
    </>
  )
}
