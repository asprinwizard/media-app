import { Button, Callout, Card, Flex, Heading, Spinner, Text } from '@radix-ui/themes'
import { Construction, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { ApiError } from '../api/client'
import { PageHeader } from '../components/PageHeader'

/** Placeholder for screens built in later phases. */
export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <PageHeader title={title} />
      <Card size="3">
        <Flex gap="3" align="center">
          <Construction size={20} aria-hidden />
          <Text>
            This screen arrives in <strong>Phase {phase}</strong> of the rebuild.
          </Text>
        </Flex>
      </Card>
    </>
  )
}

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Text as="p" color="gray" mb="4">
        There's nothing at this address.
      </Text>
      <Button asChild variant="soft">
        <Link to="/">Go to Home</Link>
      </Button>
    </>
  )
}

export function NoAccess() {
  return (
    <>
      <PageHeader title="No access" />
      <Callout.Root color="red">
        <Callout.Icon>
          <ShieldAlert size={16} />
        </Callout.Icon>
        <Callout.Text>Your account doesn't have access to this area.</Callout.Text>
      </Callout.Root>
    </>
  )
}

export function FullPageLoading() {
  return (
    <Flex className="fullpage" align="center" justify="center" gap="3">
      <Spinner size="3" />
      <Text color="gray">Loading…</Text>
    </Flex>
  )
}

/** Shown when /api/me fails: not logged in, no role, or the API is down. */
export function FullPageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : 0
  const message =
    status === 401
      ? 'You are not logged in. Reload the page to get the login prompt.'
      : status === 403
        ? "Your account doesn't have access to this site."
        : "The media server isn't responding. Check it's running, then try again."

  return (
    <Flex className="fullpage" align="center" justify="center" p="4">
      <Card size="4" style={{ maxWidth: 440 }}>
        <Heading size="5" mb="2">
          {status === 401 ? 'Login needed' : status === 403 ? 'No access' : "Can't reach the server"}
        </Heading>
        <Text as="p" color="gray" mb="4">
          {message}
        </Text>
        <Button onClick={() => (status === 401 ? window.location.reload() : onRetry())}>
          {status === 401 ? 'Reload' : 'Try again'}
        </Button>
      </Card>
    </Flex>
  )
}
