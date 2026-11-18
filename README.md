# media-app

Frontend for the Media02 home media server: React + TypeScript (Vite), Radix
Themes (slate + amber, light/dark), lucide icons, TanStack Query, React Router.
The API lives in [`media-api`](https://github.com/asprinwizard/media-api).

## How it fits together

- Production: Apache serves `dist/` at `/` (unknown paths fall back to
  `index.html`) and media-api under `/api`. Both are behind the same Basic
  auth, so the browser sends credentials automatically; there are no tokens.
- The menu, and which screens a user can open, come from `GET /api/me`.
  Role rules live in the API only.
- Writes use `apiSend()`, which sends JSON plus `X-Requested-With`; the API
  refuses anything else as a cross-site request.

## Development

```sh
npm install
npm run dev          # http://localhost:5173
```

Run media-api alongside it (`php artisan serve` on port 8000, with the dev
login set up as in its README). Vite proxies `/api/*` to `localhost:8000/*`.

```sh
npm test             # vitest (pure helpers)
npm run lint         # oxlint
npm run build        # typecheck + production build into dist/
```

## Code map

| Path | What |
|---|---|
| `src/api/` | `client.ts` (fetch wrapper, `ApiError`), types, query hooks |
| `src/components/` | App shell, sidebar, page header, nav icons |
| `src/pages/` | Screens (`Home`; placeholders for later phases) |
| `src/theme/` | Radix `<Theme>` with light/dark/system preference |
| `src/styles/app.css` | Shell layout and film-strip motifs, Radix tokens only |

Design reference: `.documentation/media-site/mockup/index.html` in the workspace.
