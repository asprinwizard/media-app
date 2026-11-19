import { Button, Flex, Separator, Text, Tooltip } from '@radix-ui/themes'
import { ArrowRightLeft, FileArchive, FolderPlus, History, ListChecks, RefreshCw, Server, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

export type ManageAction = 'move' | 'copy' | 'convert' | 'extract' | 'folder' | 'delete' | 'queue' | 'conversions'

interface Props {
  count: number
  can: Record<ManageAction, boolean>
  reasons: Partial<Record<ManageAction, string>>
  onAction: (action: ManageAction) => void
}

/** Sticky action bar shown in Manage mode (replaces the old admin accordion). */
export function ManageBar({ count, can, reasons, onAction }: Props) {
  const button = (action: ManageAction, icon: ReactNode, label: string, danger = false) => {
    const el = (
      <Button
        size="2"
        variant="ghost"
        color={danger ? 'red' : 'gray'}
        highContrast={!danger}
        disabled={!can[action]}
        onClick={() => onAction(action)}
      >
        {icon} {label}
      </Button>
    )
    return !can[action] && reasons[action] ? (
      <Tooltip key={action} content={reasons[action]}>
        <span>{el}</span>
      </Tooltip>
    ) : (
      <span key={action}>{el}</span>
    )
  }

  return (
    <Flex className="manage-bar" align="center" gap="3" wrap="wrap" role="toolbar" aria-label="Actions for selected items">
      <Text size="2" weight="bold" className="manage-count">
        {count === 0 ? 'Nothing selected' : `${count} selected`}
      </Text>
      <Separator orientation="vertical" className="hide-sm" />
      {button('move', <ArrowRightLeft size={15} />, 'Move / rename')}
      {button('copy', <Server size={15} />, 'Copy to media01')}
      {button('convert', <RefreshCw size={15} />, 'Convert')}
      {button('extract', <FileArchive size={15} />, 'Extract')}
      {button('folder', <FolderPlus size={15} />, 'New folder')}
      {button('queue', <ListChecks size={15} />, 'Copy queue')}
      {button('conversions', <History size={15} />, 'Conversions')}
      <span className="manage-spacer" />
      {button('delete', <Trash2 size={15} />, 'Delete', true)}
    </Flex>
  )
}
