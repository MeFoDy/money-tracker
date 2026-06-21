## Context

The Dashboard page (`src/web/public/index.html`) has a row of period preset radio buttons backed by `dashFilters.period` in `src/web/public/js/app.js`. The Alpine.js template binds each radio to a value (`month`, `3months`, `all`, `custom`) and calls `applyDashPeriod()` on change.

Currently `applyDashPeriod()` reuses `setSharedDateRange(from, to)` to update the date range. That helper is used everywhere date changes happen, and it unconditionally sets `dashFilters.period = 'custom'`. As a result, choosing any preset immediately flips the UI back to "Свой".

## Goals / Non-Goals

**Goals:**

- Selecting a period preset on the Dashboard must leave the preset radio button selected.
- Manually editing the date inputs must continue to switch the preset to "Свой".
- Keep the existing shared date-range behavior between Dashboard and Transactions tabs.

**Non-Goals:**

- Persisting the selected preset in the URL or across page reloads.
- Changing the semantics of individual presets (e.g., "Месяц" continues to mean the last ~30 days).
- Altering backend APIs, database schema, or `url-state.js` helpers.

## Decisions

### Use direct date assignment inside `applyDashPeriod()`

Inside `applyDashPeriod()` we will set `dashFilters.from`, `dashFilters.to`, `filters.from`, and `filters.to` directly, then call `pushDateRangeToUrl()`.

**Rationale:** This is the smallest change and preserves the existing `setSharedDateRange()` contract, which correctly resets `period` to `custom` for every other caller (manual date input, URL init, back/forward navigation).

**Alternatives considered:**

- Add a `period` parameter to `setSharedDateRange()`. Rejected because it complicates a helper that is intentionally simple and used in several places.
- Persist `period` in the URL. Rejected based on the scope agreed during exploration: the user only needs the preset to stay selected on click, not across reloads.

## Risks / Trade-offs

- **Navigation edge case**: Switching from Dashboard to Transactions and back will reset the preset to "Свой" because `period` is not in the URL. This is accepted per the non-goals above.
- **Back/forward edge case**: Browser history navigation restores `from`/`to` but resets `period` to `custom`. This matches current URL-based behavior and is accepted.
- **Low regression risk**: The change is localized to one method and does not affect URL helpers, tests, or backend.
