import { Button, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import { Film, Search } from 'lucide-react'
import { Link } from 'react-router'
import type { Me } from '../api/types'
import { navIcons } from '../components/navIcons'
import { useState } from 'react'
import { greeting } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const TILE_TEXT: Record<string, string> = {
  library: 'Browse films and TV, folder by folder',
  search: 'Find a file or folder by name',
  help: 'How to play, download and cast',
  upload: 'Send files to the server',
  iplayer: 'Download programmes from BBC iPlayer',
  youtube: 'Download videos and playlists',
  'live-tv': 'Watch live TV from the tuner box',
  logs: 'Server logs and job output',
  tools: 'Drives, media01 and recent files',
}

export function Home({ me }: { me: Me }) {
  const tiles = me.menu.filter((item) => item.key !== 'home')
  const [hello] = useState(() => greeting(new Date().getHours()))
  useDocumentTitle()

  return (
    <>
      <section className="hero">
        <Heading as="h2" size={{ initial: '7', sm: '8' }}>
          {hello}, {me.user}.
        </Heading>
        <Text as="p" color="gray" size="3" className="hero-text">
          Browse the library, pick something up from iPlayer or YouTube, or keep an eye on what the servers are doing.
        </Text>
        <Flex gap="2" wrap="wrap">
          <Button asChild size="3">
            <Link to="/library">
              <Film size={16} /> Browse library
            </Link>
          </Button>
          <Button asChild size="3" variant="outline" color="gray">
            <Link to="/search">
              <Search size={16} /> Search
            </Link>
          </Button>
        </Flex>
      </section>

      <Grid columns={{ initial: '1', xs: '2', md: '3' }} gap="4">
        {tiles.map((item) => {
          const Icon = navIcons[item.key]
          return (
            <Card key={item.key} asChild size="2" className="tile">
              <Link to={item.path}>
                <Flex gap="3" align="start">
                  <span className="tile-icon" aria-hidden>
                    {Icon && <Icon size={20} />}
                  </span>
                  <div>
                    <Text as="div" weight="bold" size="3">
                      {item.title}
                    </Text>
                    <Text as="div" color="gray" size="2">
                      {TILE_TEXT[item.key]}
                    </Text>
                  </div>
                </Flex>
              </Link>
            </Card>
          )
        })}
      </Grid>
    </>
  )
}
