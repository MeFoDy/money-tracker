# AGENTS.md — Money Tracker

Compact guidance for OpenCode / LLM agents working in this repo.

## Package Manager

- **Use `pnpm`**, not npm. Lockfile is `pnpm-lock.yaml`.
- `pnpm-workspace.yaml` exists only to allow native builds for `better-sqlite3`.

## Install & Setup

```bash
pnpm install
pnpm run copy-frontend-deps   # required: copies alpinejs, chart.js, pico.css into src/web/public/vendor/
```

## Running

```bash
pnpm run web                  # Fastify on 127.0.0.1:3000 (or PORT env)
pnpm run cli -- <cmd> [opts]  # CLI entrypoint; always outputs JSON
```

## Testing

```bash
pnpm test                     # node --test tests/*.test.js
```

Tests use isolated temp SQLite DBs (`tests/_helper.js`). No external services needed.

## Lint

Always run `lint:fix` first to auto-fix what can be fixed, then run `lint` to check remaining issues:

```bash
pnpm run lint:fix
pnpm run lint
```

## Architecture

- **ESM only** (`"type": "module"`). All imports use `import`/`export`.
- **Two entrypoints**: `src/web/server.js` (Fastify SPA server) and `src/cli/cli.js` (Commander CLI).
- **Config** (`src/config/`): database connection (`database.js`).
- **Migrations** (`src/migrations/`): schema migrations (`schema.js`).
- **Shared utilities** (`src/shared/`): `hash.js`, `dates.js`, `numbers.js`, `sql.js` — pure helpers used by both web and CLI.
- **Domain** (`src/domain/`): business logic grouped by entity:
  - `accounts/` — account CRUD and comments
  - `categories/` — category CRUD
  - `category-rules/` — rule CRUD + pure rule engine (`engine.js`)
  - `transactions/` — transaction CRUD, CSV parser (`parser.js`), importer (`importer.js`) with preview/confirm flow
  - `uploads/` — upload CRUD
  - `analytics/` — analytics queries split by topic: `base.js`, `kpi.js`, `time-series.js`, `categories.js`, `counterparties.js`, `summary.js`, `heatmap.js`, `index.js`
- **No frontend build step**: SPA is static HTML/JS/CSS. Vendor libs live in `src/web/public/vendor/` and are copied from `node_modules` via `scripts/copy-frontend-deps.js`.
- **Database**: SQLite (`better-sqlite3`) with WAL mode. Migrations are in `src/migrations/schema.js`. Default path: `data/finance.db` (gitignored). Override with `DB_PATH`.

## Key Conventions

- **Filenames**: kebab-case (enforced by `unicorn/filename-case`).
- **CLI output**: always JSON to stdout; errors → JSON to stderr + exit code 1.
- **CSV parser**: expects `windows-1251` encoding, `;` delimiter, Russian bank statement format.
- **Deduplication**: transactions hashed as `SHA-256(date|amount|currency|description|account_id)`.
- **Pending transactions**: stored in both `transactions` (`is_pending=1`) and `pending_transactions`; pending records are auto-upgraded to completed when a matching completed tx is imported.
- **Import flow**: web upload uses preview (`POST /api/upload/preview`) then confirm (`POST /api/upload/confirm`); CLI import is direct.
- **ESLint ignores**: `node_modules`, `data/**`, `src/web/public/vendor/**`.

## Env Variables

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | Web server port |
| `DB_PATH` | `data/finance.db` | SQLite database path |

## Adding Frontend Dependencies

1. Add to `dependencies` in `package.json`.
2. Update `scripts/copy-frontend-deps.js` with the source path and destination name.
3. Run `pnpm run copy-frontend-deps`.
