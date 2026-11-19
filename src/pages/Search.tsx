import { Button, Callout, Card, Flex, Spinner, Text, TextField } from '@radix-ui/themes'
import { Search as SearchIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useSearch } from '../api/hooks'
import { FileInfoDialog } from '../components/FileInfoDialog'
import { FileRow } from '../components/FileRow'
import { PageHeader } from '../components/PageHeader'
import { PlayerDialog } from '../components/PlayerDialog'

export function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const { data, error, isFetching } = useSearch(q)

  const [playing, setPlaying] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const term = draft.trim()
    setParams(term ? { q: term } : {})
  }

  return (
    <>
      <PageHeader title="Search" description="Searches file and folder names across the whole library." />

      <form onSubmit={submit} className="search-form">
        <Flex gap="2">
          <TextField.Root
            size="3"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Title, programme or file name"
            aria-label="Search the library"
            autoFocus
            style={{ flex: 1 }}
          >
            <TextField.Slot>
              <SearchIcon size={16} />
            </TextField.Slot>
          </TextField.Root>
          <Button size="3" type="submit" disabled={draft.trim().length < 2}>
            Search
          </Button>
        </Flex>
      </form>

      {q && q.length < 2 && (
        <Text as="p" color="gray">
          Enter at least two characters.
        </Text>
      )}

      {isFetching && (
        <Flex gap="2" align="center">
          <Spinner />
          <Text color="gray">Searching… this can take a moment if a drive has to wake up.</Text>
        </Flex>
      )}

      {error && (
        <Callout.Root color="red">
          <Callout.Text>{error.message}</Callout.Text>
        </Callout.Root>
      )}

      {data && !isFetching && (
        <Card size="1">
          <Flex className="lib-toolbar" align="center" justify="between">
            <Text size="2" weight="bold">
              Results for “{data.query}”
            </Text>
            <Text size="1" color="gray">
              {data.results.length === 0
                ? 'No matches'
                : `${data.results.length}${data.truncated ? '+' : ''} match${data.results.length === 1 ? '' : 'es'}`}
            </Text>
          </Flex>
          {data.truncated && (
            <Callout.Root color="amber" size="1" m="2">
              <Callout.Text>Showing the first {data.results.length}. Add more words to narrow it down.</Callout.Text>
            </Callout.Root>
          )}
          <ul className="rows">
            {data.results.map((result) => (
              <FileRow
                key={result.path}
                item={result}
                label={result.path}
                showMeta={false}
                onPlay={setPlaying}
                onInfo={setInfo}
              />
            ))}
          </ul>
        </Card>
      )}

      <PlayerDialog path={playing} onChange={setPlaying} />
      <FileInfoDialog path={info} onClose={() => setInfo(null)} />
    </>
  )
}
