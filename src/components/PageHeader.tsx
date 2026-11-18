import { Flex, Heading, Text } from '@radix-ui/themes'
import type { ReactNode } from 'react'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  useDocumentTitle(title)

  return (
    <Flex className="page-head" align="end" gap="4" wrap="wrap">
      <div>
        <Heading as="h1" size="7">
          {title}
        </Heading>
        {description && (
          <Text as="p" color="gray" mt="1">
            {description}
          </Text>
        )}
      </div>
      {actions && (
        <Flex gap="2" ml="auto" wrap="wrap">
          {actions}
        </Flex>
      )}
    </Flex>
  )
}

