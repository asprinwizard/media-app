import { Avatar, Badge, Flex, IconButton, Text, Tooltip } from '@radix-ui/themes'
import { Monitor, Moon, Play, Sun } from 'lucide-react'
import { NavLink } from 'react-router'
import type { Me, MenuGroup } from '../api/types'
import { initials, roleChip } from '../lib/format'
import { useThemePreference, type ThemePreference } from '../theme/context'
import { navGroupLabels, navIcons } from './navIcons'

const GROUP_ORDER: MenuGroup[] = ['browse', 'get', 'system']

const NEXT_THEME: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon }

export function Sidebar({ me, onNavigate }: { me: Me; onNavigate?: () => void }) {
  const { preference, setPreference } = useThemePreference()
  const ThemeIcon = THEME_ICON[preference]

  return (
    <Flex direction="column" className="sidebar-inner">
      <Flex align="center" gap="3" className="brand">
        <span className="brand-mark" aria-hidden>
          <Play size={16} fill="currentColor" />
        </span>
        <div>
          <Text as="div" weight="bold" size="3">
            {me.siteTitle}
          </Text>
          <Text as="div" size="1" color="gray">
            Home media server
          </Text>
        </div>
      </Flex>
      <div className="filmstrip" aria-hidden />

      <nav className="nav" aria-label="Main">
        {GROUP_ORDER.map((group) => {
          const items = me.menu.filter((item) => item.group === group)
          if (items.length === 0) return null
          const label = navGroupLabels[group]
          return (
            <div key={group} className="nav-group">
              {label && (
                <Text as="div" size="1" weight="bold" color="gray" className="nav-label">
                  {label}
                </Text>
              )}
              {items.map((item) => {
                const Icon = navIcons[item.key]
                const chip = roleChip(item.roles)
                return (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    onClick={onNavigate}
                  >
                    {Icon && <Icon size={16} aria-hidden />}
                    <span>{item.title}</span>
                    {chip && (
                      <Badge size="1" color="gray" variant="soft" radius="full" className="nav-chip">
                        {chip}
                      </Badge>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      <Flex align="center" gap="3" className="sidebar-foot">
        <Avatar size="2" radius="full" fallback={initials(me.user)} color="gray" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text as="div" size="2" weight="bold" truncate>
            {me.user}
          </Text>
          <Text as="div" size="1" color="gray" truncate>
            {me.roles.filter((r) => r !== 'standard').join(' · ') || 'standard'}
          </Text>
        </div>
        <Tooltip content={`Theme: ${preference} (click to change)`}>
          <IconButton
            variant="ghost"
            color="gray"
            aria-label={`Theme: ${preference}. Change theme`}
            onClick={() => setPreference(NEXT_THEME[preference])}
          >
            <ThemeIcon size={16} />
          </IconButton>
        </Tooltip>
      </Flex>
    </Flex>
  )
}
