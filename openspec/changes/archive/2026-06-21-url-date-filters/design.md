## Context

The frontend is an Alpine.js SPA served by Fastify. It uses `URLSearchParams` for navigation (`?page=dashboard`) but ignores the rest of the query string. Date filters are duplicated in two Alpine objects:

- `dashFilters`: used by the Dashboard (has additional `period`, `accountId`, `categoryIds`).
- `filters`: used by Transactions (has additional `accountId`, `categoryId`, `search`).

Both are initialised independently, only partially synced on tab switch, and never written back to the URL. Drawers read from `dashFilters`, so they can drift from the visible filters after refresh or tab switching.

## Goals / Non-Goals

**Goals:**
- `from` and `to` are the single source of truth shared by Dashboard and Transactions.
- The URL always reflects the currently active `from`/`to` when a tab is visible.
- Browser back/forward navigates through filter history.
- Reset restores the default 3-month window and updates the URL.
- Drawers use the same active range.

**Non-Goals:**
- Persisting other filters (`accountId`, `categoryId`, `search`, `categoryIds`, `period`, `groupBy`) in the URL in this change.
- Backend/API changes.
- Server-side rendering of filters.

## Decisions

1. **Shared date range helper.** Introduce small pure helpers for reading/writing/defaulting `from`/`to` in the URL. Tests can exercise them in isolation.
2. **Explicit dates win over period.** `period` remains a UI helper. If the URL contains `from`/`to`, those values are used. If not, the default 3-month window is applied and written back to the URL.
3. **Use `history.pushState` when users change filters.** Back-button history is a requirement, so `pushState` is used for user-initiated date changes and tab switches. Initial defaulting may use `replaceState` to avoid an extra history entry on first load.
4. **Sync on tab switch by shared source.** Both tabs share the same `from`/`to`; `navigateTo` therefore does not need to copy values between `dashFilters` and `filters`, only ensure the URL contains the current page and range.
5. **Drawers read from the same shared values.** Since `dashFilters.from`/`dashFilters.to` will always match the URL after initialisation, existing drawer code continues to work once init/sync is correct.

## Risks / Trade-offs

- [Risk] `pushState` on every keystroke/debounce can create excessive history entries. → Mitigation: write to URL on `change` of the date input, which fires only on blur/commit, not on every keystroke.
- [Risk] `popstate` currently reloads page name but not filter state. → Mitigation: update `loadPageFromUrl` to re-apply the full URL state (page + from/to).
- [Risk] Date inputs are `type="date"` and expect `YYYY-MM-DD`; the URL format is the same so no additional parsing is required.
