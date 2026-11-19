import { Card, Grid, Heading, Kbd, Text } from '@radix-ui/themes'
import {
  Cast,
  CirclePlay,
  Download,
  FileText,
  Film,
  Info,
  ListChecks,
  MonitorPlay,
  Play,
  Search,
  Tv,
  Upload,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Role } from '../api/types'
import { useMe } from '../api/useMe'
import { PageHeader } from '../components/PageHeader'

interface Topic {
  icon: LucideIcon
  title: string
  body: ReactNode
}

const WATCHING: Topic[] = [
  {
    icon: Play,
    title: 'Play',
    body: (
      <>
        Plays in a pop-up player straight away, with a list of the other files in the same folder so you can carry on
        to the next episode. Clicking a file's name instead opens it directly in the browser.
      </>
    ),
  },
  {
    icon: Cast,
    title: 'Cast',
    body: (
      <>
        Opens a player in a new tab. Press <strong>Cast to TV</strong> and pick your Chromecast or smart TV (Chrome
        works best). The TV fetches the film itself, starting where the player was. Files a browser can't stream
        download instead.
      </>
    ),
  },
  {
    icon: Download,
    title: 'Download',
    body: (
      <>
        Keeps your own copy, so it never stutters and you only fetch it once. Big HD files take a while on a home
        connection, so please download one at a time.
      </>
    ),
  },
  {
    icon: Info,
    title: 'File info',
    body: <>Shows a video or audio file's size, format and running time.</>,
  },
]

const GETTING: (Topic & { roles: Role[]; to: string })[] = [
  {
    icon: Upload,
    title: 'Upload',
    to: '/upload',
    roles: ['admin', 'ftp'],
    body: (
      <>
        Drag files onto the page or pick them. Large films are fine: files go up in pieces and a dropped connection is
        retried automatically. To send a folder, zip it first. Uploads land in <em>Uploaded Files</em>.
      </>
    ),
  },
  {
    icon: CirclePlay,
    title: 'BBC iPlayer',
    to: '/iplayer',
    roles: ['admin'],
    body: (
      <>
        Search, tick the programmes you want and press Download. Ticked programmes stay in your <em>Selected</em> list
        while you search for other things, so you can gather several and download them together. <em>SD copy</em> also
        saves a smaller version, handy for casting away from home. Progress shows below.
      </>
    ),
  },
  {
    icon: MonitorPlay,
    title: 'YouTube',
    to: '/youtube',
    roles: ['admin'],
    body: (
      <>
        Paste a video or playlist link and press Find. For a single video you can choose the picture and sound quality;
        leave them blank for the best available. Files are saved by channel under <em>youtube</em>.
      </>
    ),
  },
  {
    icon: Tv,
    title: 'Live TV',
    to: '/live-tv',
    roles: ['admin'],
    body: (
      <>
        Streams from the tuner box. Opening the page wakes the box if it's asleep, which takes a minute or so. Use{' '}
        <strong>Sleep</strong> when you've finished; the page then stops checking on it so it stays asleep.{' '}
        <Kbd>Ctrl</Kbd> <Kbd>Alt</Kbd> <Kbd>F</Kbd> goes full screen.
      </>
    ),
  },
]

const LOOKING_AFTER: (Topic & { to: string })[] = [
  {
    icon: ListChecks,
    title: 'Manage (in the Library)',
    to: '/library',
    body: (
      <>
        Press <strong>Manage</strong> in any folder to tick files and folders, then move or rename them, copy them to
        media01, convert videos to MP4, extract archives, make a folder or delete. <em>Conversions</em> and{' '}
        <em>Copy queue</em> show what's running. Switch to <strong>media01</strong> to tidy the archive server's copy of
        the library the same way.
      </>
    ),
  },
  {
    icon: FileText,
    title: 'Logs',
    to: '/logs',
    body: <>Pick a log to follow its latest lines live, or read the whole file.</>,
  },
  {
    icon: Wrench,
    title: 'Tools',
    to: '/tools',
    body: (
      <>
        <strong>Drives</strong> shows free space and which drives are asleep on each server. <strong>Latest
        files</strong> lists what's arrived most recently anywhere. <strong>Links</strong> has the SSH console and
        Transmission.
      </>
    ),
  },
]

function TopicCard({ icon: Icon, title, body, to }: Topic & { to?: string }) {
  return (
    <Card size="3">
      <span className="tile-icon" aria-hidden>
        <Icon size={20} />
      </span>
      <Heading as="h3" size="3" mt="3" mb="1">
        {to ? <Link to={to}>{title}</Link> : title}
      </Heading>
      <Text as="p" color="gray" size="2">
        {body}
      </Text>
    </Card>
  )
}

function Section({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section className="help-section">
      <Heading as="h2" size="5" mb={intro ? '1' : '3'}>
        {title}
      </Heading>
      {intro && (
        <Text as="p" color="gray" size="2" mb="3">
          {intro}
        </Text>
      )}
      {children}
    </section>
  )
}

export function Help() {
  const roles = useMe().data?.roles ?? []
  const isAdmin = roles.includes('admin')
  const getting = GETTING.filter((t) => t.roles.some((r) => roles.includes(r)))

  return (
    <>
      <PageHeader title="Help" description="How to find things, watch them, and get new things onto the server." />

      <Section title="Finding things">
        <Grid columns={{ initial: '1', sm: '2' }} gap="4">
          <Card size="3">
            <span className="tile-icon" aria-hidden>
              <Film size={20} />
            </span>
            <Heading as="h3" size="3" mt="3" mb="1">
              <Link to="/library">The library</Link>
            </Heading>
            <Text as="p" color="gray" size="2">
              The library is the server's folders: mainly <strong>Movies</strong> and{' '}
              <strong>TV</strong>, with TV split by genre. Some programmes have an <em>HD</em> subfolder, and older
              alternative versions live in <em>Archive</em> folders.
            </Text>
            <Text as="p" color="gray" size="2" mt="2">
              In a long folder, type a letter (or use the A–Z bar on the right) to jump to it. Sort by <strong>Date</strong>{' '}
              to see what's new. A folder can take a few seconds to open if its drive has to wake up.
            </Text>
          </Card>
          <Card size="3">
            <span className="tile-icon" aria-hidden>
              <Search size={20} />
            </span>
            <Heading as="h3" size="3" mt="3" mb="1">
              <Link to="/search">Search</Link>
            </Heading>
            <Text as="p" color="gray" size="2">
              Finds files and folders by name across the whole library. Press <Kbd>/</Kbd> anywhere to jump to the
              search box. The index is rebuilt twice a week, so something added in the last few days may only show up
              in its folder.
            </Text>
          </Card>
        </Grid>
      </Section>

      <Section title="Watching and listening" intro="Each file has these buttons on the right of its row.">
        <Grid columns={{ initial: '1', sm: '2' }} gap="4">
          {WATCHING.map((t) => (
            <TopicCard key={t.title} {...t} />
          ))}
        </Grid>
      </Section>

      {getting.length > 0 && (
        <Section title="Getting new things">
          <Grid columns={{ initial: '1', sm: '2' }} gap="4">
            {getting.map((t) => (
              <TopicCard key={t.title} {...t} />
            ))}
          </Grid>
        </Section>
      )}

      {isAdmin && (
        <Section title="Looking after the servers">
          <Grid columns={{ initial: '1', sm: '2' }} gap="4">
            {LOOKING_AFTER.map((t) => (
              <TopicCard key={t.title} {...t} />
            ))}
          </Grid>
        </Section>
      )}

      <Section title="If something doesn't work">
        <Card size="3">
          <ul className="help-list">
            <li>
              <Text size="2">
                <strong>A video won't play in the browser.</strong>{' '}
                <Text color="gray">Older formats such as AVI can't play in a browser. Download it and play it in VLC.</Text>
              </Text>
            </li>
            <li>
              <Text size="2">
                <strong>Casting or playing stutters.</strong>{' '}
                <Text color="gray">
                  HD files can be too big for the home connection when you're away. Look for an <em>(SD)</em> copy
                  next to it, or download it instead.
                </Text>
              </Text>
            </li>
            <li>
              <Text size="2">
                <strong>The TV doesn't appear when casting.</strong>{' '}
                <Text color="gray">Check the TV is on and your phone or computer is on the same Wi-Fi, and use Chrome.</Text>
              </Text>
            </li>
            <li>
              <Text size="2">
                <strong>A folder or search is slow.</strong>{' '}
                <Text color="gray">A drive is waking up. Give it a few seconds.</Text>
              </Text>
            </li>
            <li>
              <Text size="2">
                <strong>You need to sign in as someone else.</strong>{' '}
                <Text color="gray">Use the sign-out button at the bottom of the menu, next to the theme button.</Text>
              </Text>
            </li>
          </ul>
        </Card>
      </Section>
    </>
  )
}
