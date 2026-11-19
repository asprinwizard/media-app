import { Button, Callout, Card, Flex, Heading, IconButton, Progress, Skeleton, Text, Tooltip } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX, RefreshCw, Upload as UploadIcon, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router'
import { uploadFile, useUploadFolder } from '../api/acquire'
import { ApiError } from '../api/client'
import { useMe } from '../api/useMe'
import { FileTypeIcon } from '../components/FileTypeIcon'
import { PageHeader } from '../components/PageHeader'
import { formatBytes, formatDate } from '../lib/format'
import { libraryRoute } from '../lib/paths'

interface Job {
  id: number
  file: File
  state: 'waiting' | 'uploading' | 'done' | 'failed'
  loaded: number
  error?: string
  retrying?: string | null
}

let nextId = 1

/**
 * Upload (admin, ftp): drop or pick files; they go up one at a time into the
 * upload folder (port of the old single-file form, with a queue on top).
 */
export function Upload() {
  const folder = useUploadFolder()
  const queryClient = useQueryClient()
  const isAdmin = useMe().data?.roles.includes('admin') ?? false
  const chunkBytes = folder.data?.chunkBytes ?? 32 * 1024 * 1024

  const [jobs, setJobs] = useState<Job[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const running = useRef(false)
  const abort = useRef<AbortController | null>(null)
  const queue = useRef<Job[]>([])

  const update = (id: number, patch: Partial<Job>) => setJobs((all) => all.map((j) => (j.id === id ? { ...j, ...patch } : j)))

  const pump = async () => {
    if (running.current) return
    running.current = true
    while (queue.current.length > 0) {
      const job = queue.current.shift()!
      const controller = new AbortController()
      abort.current = controller
      update(job.id, { state: 'uploading' })
      try {
        await uploadFile(
          job.file,
          chunkBytes,
          (loaded) => update(job.id, { loaded }),
          (retrying) => update(job.id, { retrying }),
          controller.signal,
        )
        update(job.id, { state: 'done', loaded: job.file.size, retrying: null })
        queryClient.invalidateQueries({ queryKey: ['uploads'] })
      } catch (error) {
        update(job.id, { state: 'failed', retrying: null, error: error instanceof ApiError ? error.message : 'Upload failed.' })
      }
    }
    abort.current = null
    running.current = false
  }

  const add = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const added: Job[] = []
    for (const file of Array.from(files)) {
      const job: Job = { id: nextId++, file, state: 'waiting', loaded: 0 }
      added.push(job)
      queue.current.push(job)
    }
    setJobs((all) => [...added, ...all])
    void pump()
  }

  const cancel = (job: Job) => {
    if (job.state === 'uploading') abort.current?.abort()
    else if (job.state === 'waiting') {
      queue.current = queue.current.filter((j) => j.id !== job.id)
      update(job.id, { state: 'failed', error: 'Cancelled.' })
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    add(event.dataTransfer.files)
  }

  return (
    <>
      <PageHeader
        title="Upload"
        description={
          <>
            Files go to the upload folder{isAdmin && <> (<Link to={libraryRoute('Uploaded Files')}>Uploaded Files</Link> in the library)</>}. To upload a
            whole folder, zip it first and upload the zip.
          </>
        }
      />

      <div className="grid-2">
        <Card size="2">
          <div
            className={`drop${dragging ? ' is-dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            aria-label="Choose files to upload"
          >
            <div className="drop-icon">
              <UploadIcon size={22} aria-hidden />
            </div>
            <Text weight="bold">Drop files here</Text>
            <Text size="2" color="gray">
              or click to choose · any size, and big files carry on if the connection drops
            </Text>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                add(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {jobs.length > 0 && (
            <Flex direction="column" gap="3" mt="4">
              {jobs.map((job) => (
                <div key={job.id}>
                  <Flex justify="between" align="center" gap="3">
                    <Text size="2" truncate>
                      {job.file.name} <Text color="gray">· {formatBytes(job.file.size)}</Text>
                    </Text>
                    <Flex align="center" gap="2" flexShrink="0">
                      {job.state === 'uploading' && (
                        <Text size="1" color="gray">
                          {Math.floor((job.loaded / Math.max(job.file.size, 1)) * 100)}%
                        </Text>
                      )}
                      {job.state === 'waiting' && (
                        <Text size="1" color="gray">
                          Waiting
                        </Text>
                      )}
                      {job.state === 'done' && <CircleCheck size={16} color="var(--grass-11)" aria-label="Uploaded" />}
                      {job.state === 'failed' && <CircleX size={16} color="var(--red-11)" aria-label="Failed" />}
                      {(job.state === 'uploading' || job.state === 'waiting') && (
                        <Tooltip content="Cancel">
                          <IconButton size="1" variant="ghost" color="gray" aria-label={`Cancel ${job.file.name}`} onClick={() => cancel(job)}>
                            <X size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Flex>
                  </Flex>
                  {job.state === 'uploading' && <Progress mt="2" value={(job.loaded / Math.max(job.file.size, 1)) * 100} />}
                  {job.retrying && (
                    <Text as="p" size="1" color="amber" mt="1">
                      {job.retrying}
                    </Text>
                  )}
                  {job.error && (
                    <Text as="p" size="1" color="red" mt="1">
                      {job.error}
                    </Text>
                  )}
                </div>
              ))}
              {jobs.every((j) => j.state === 'done' || j.state === 'failed') && (
                <Button variant="ghost" color="gray" size="1" onClick={() => setJobs([])} style={{ alignSelf: 'flex-start' }}>
                  Clear list
                </Button>
              )}
            </Flex>
          )}
        </Card>

        <Card size="1" className="lib-card">
          <Flex className="lib-toolbar" align="center" justify="between" gap="3">
            <Heading as="h2" size="3">
              Upload folder
            </Heading>
            <Tooltip content="Refresh">
              <IconButton size="1" variant="ghost" color="gray" aria-label="Refresh" onClick={() => folder.refetch()} loading={folder.isFetching}>
                <RefreshCw size={14} />
              </IconButton>
            </Tooltip>
          </Flex>
          {folder.error ? (
            <Callout.Root color="red" m="3">
              <Callout.Text>{folder.error.message}</Callout.Text>
            </Callout.Root>
          ) : (
            <ul className="rows">
              {folder.isPending &&
                Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className="row">
                    <Skeleton width="26px" height="26px" />
                    <Skeleton height="16px" width={`${40 + ((i * 17) % 45)}%`} />
                  </li>
                ))}
              {folder.data?.items.length === 0 && (
                <li className="row">
                  <Text size="2" color="gray">
                    The upload folder is empty.
                  </Text>
                </li>
              )}
              {folder.data?.items.map((item) => (
                <li key={item.name} className="row">
                  <FileTypeIcon type={item.type} />
                  <Text className="row-name" size="2">
                    {item.name}
                  </Text>
                  <Text className="row-meta" size="1" color="gray">
                    {formatBytes(item.size)}
                  </Text>
                  <Text className="row-meta row-date" size="1" color="gray">
                    {formatDate(item.mtime)}
                  </Text>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
