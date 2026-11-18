import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { Me } from './types'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet<Me>('/me'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}
