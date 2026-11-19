import { Callout } from '@radix-ui/themes'
import { CircleAlert } from 'lucide-react'
import type { ItemResult } from '../../api/admin'

/** Lists the items an operation couldn't handle, with the reason for each. */
export function ResultList({ results, verb }: { results: ItemResult[]; verb: string }) {
  const failed = results.filter((r) => !r.ok)
  if (failed.length === 0) return null
  const done = results.length - failed.length

  return (
    <Callout.Root color="red" mt="3">
      <Callout.Icon>
        <CircleAlert size={16} />
      </Callout.Icon>
      <Callout.Text>
        {done > 0 ? `${done} ${verb}, but ` : ''}
        {failed.length === 1 ? 'one item' : `${failed.length} items`} couldn't be {verb}:
        <ul className="result-list">
          {failed.map((r) => (
            <li key={r.name}>
              <strong>{r.name}</strong>: {r.error}
            </li>
          ))}
        </ul>
      </Callout.Text>
    </Callout.Root>
  )
}
