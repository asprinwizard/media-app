import { Card, Grid, Heading, Kbd, Text } from '@radix-ui/themes'
import { Cast, Download, Info, Play, Search, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '../components/PageHeader'

const TOPICS: { icon: LucideIcon; title: string; body: ReactNode }[] = [
  {
    icon: Download,
    title: 'Download (recommended)',
    body: (
      <>
        Keeps your own copy, so you only fetch it once. Larger and HD files take a while on a home connection, so please
        download one file at a time.
      </>
    ),
  },
  {
    icon: Play,
    title: 'Play',
    body: (
      <>
        Plays in a pop-up player straight away, with a list to hop to other files in the same folder. Most MP4 files play
        fine; older DivX AVI files can't play in a browser, so download those.
      </>
    ),
  },
  {
    icon: Cast,
    title: 'Cast',
    body: (
      <>
        Opens a stream-friendly player in a new tab. In Chrome, use the player's cast button to send it to a Chromecast or
        smart TV. Files that can't stream download instead.
      </>
    ),
  },
  {
    icon: Info,
    title: 'File info',
    body: <>Shows the size, format and running time of a video or audio file.</>,
  },
  {
    icon: Search,
    title: 'Search',
    body: (
      <>
        Finds files and folders by name. Press <Kbd>/</Kbd> anywhere to jump to it. It can take a moment if a drive has to
        wake up.
      </>
    ),
  },
]

export function Help() {
  return (
    <>
      <PageHeader title="Help" description="How to find, play and download things." />

      <Card size="3" mb="4">
        <Heading as="h2" size="4" mb="2">
          Finding things
        </Heading>
        <Text as="p" color="gray">
          The library has two main areas: <strong>Movies</strong> and <strong>TV</strong>, with TV split by genre. Most
          files are H.264 MP4, which plays or streams directly. Some programmes have an <em>HD</em> subfolder, and older
          alternative versions live in <em>Archive</em> folders.
        </Text>
        <Text as="p" color="gray" mt="2">
          In a long folder, type a letter (or use the A–Z bar on the right) to jump to titles starting with it. Sort by
          date to see what's new.
        </Text>
      </Card>

      <Grid columns={{ initial: '1', sm: '2' }} gap="4">
        {TOPICS.map(({ icon: Icon, title, body }) => (
          <Card key={title} size="3">
            <span className="tile-icon" aria-hidden>
              <Icon size={20} />
            </span>
            <Heading as="h2" size="3" mt="3" mb="1">
              {title}
            </Heading>
            <Text as="p" color="gray" size="2">
              {body}
            </Text>
          </Card>
        ))}
      </Grid>
    </>
  )
}
