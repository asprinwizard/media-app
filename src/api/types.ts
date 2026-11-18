export type Role = 'admin' | 'ftp' | 'standard'

export type MenuGroup = 'browse' | 'get' | 'system'

export interface MenuItem {
  key: string
  title: string
  path: string
  group: MenuGroup
  /** null = every logged-in user */
  roles: Role[] | null
}

export interface Me {
  user: string
  roles: Role[]
  siteTitle: string
  menu: MenuItem[]
  links: { ssh?: string; transmission?: string }
}
