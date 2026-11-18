import {
  CircleHelp,
  CirclePlay,
  FileText,
  Film,
  House,
  MonitorPlay,
  Search,
  Tv,
  Upload,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Icon for each menu key from /api/me. */
export const navIcons: Record<string, LucideIcon> = {
  home: House,
  library: Film,
  search: Search,
  help: CircleHelp,
  upload: Upload,
  iplayer: CirclePlay,
  youtube: MonitorPlay,
  'live-tv': Tv,
  logs: FileText,
  tools: Wrench,
}

export const navGroupLabels: Record<string, string | null> = {
  browse: null,
  get: 'Get media',
  system: 'System',
}
