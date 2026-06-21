## Why

Date filters on the Dashboard and Transactions tabs currently live only in Alpine component state. When a user selects a date range, the URL does not update, a refresh loses the selection, switching tabs only partially synchronises the range, and dashboard drill-down drawer relies on in-memory filters rather than the canonical URL state. Persisting `from`/`to` in the URL fixes all of these and makes ranges shareable and back-button friendly.

## What Changes

- Read `from` and `to` query parameters on app init and apply them to both `dashFilters` and `filters`. Explicit dates win over default periods.
- When the user changes `from`/`to` on either tab, write the new values to the URL using `pushState` so browser history tracks filter changes and the back button works.
- Keep Dashboard and Transactions date ranges in sync at all times: they share the same `from`/`to` source of truth.
- Update `resetFilters` and `resetDashFilters` to restore the default 3-month range and reflect it in the URL.
- Ensure all dashboard drawers (period, category, comparison, heatmap day) use the same range that is currently in the URL/component state.
- No backend changes are required; this is purely a frontend routing/state refactor.

## Capabilities

### New Capabilities
- `url-date-filters`: Persist and synchronise `from`/`to` date filters in the URL across Dashboard, Transactions, and drill-down drawers.

### Modified Capabilities
- None.

## Impact

- `src/web/public/index.html` — dashboard and transactions filter inputs remain the same; no structural changes required.
- `src/web/public/js/app.js` — navigation, filter initialisation, sync, reset, drawer opening, and URL read/write logic change.
