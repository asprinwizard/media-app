// Thin fetch wrapper for media-api.
//
// The browser sends the Basic-auth credentials automatically (same origin),
// so there are no tokens here. Writes send JSON, which media-api's
// same-origin middleware requires as CSRF protection.

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const BASE = '/api'

async function handle<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  let message = `Request failed (${response.status})`
  try {
    const body = await response.json()
    if (body && typeof body.message === 'string' && body.message) message = body.message
  } catch {
    // not JSON; keep the generic message
  }
  throw new ApiError(response.status, message)
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : ''

  const response = await fetch(`${BASE}${path}${query}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  return handle<T>(response)
}

export async function apiSend<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return handle<T>(response)
}
