## Context

The Money Tracker SPA already keeps the Dashboard and Transactions date ranges in sync via URL query parameters (`from`/`to`). The implementation lives in three places:

- `src/web/public/js/date-range.js` — pure helpers for resolving defaults and ranges.
- `src/web/public/js/url-state.js` — pure helpers for writing filters to the URL.
- `src/web/public/js/app.js` — Alpine state with `setSharedDateRange()` as the single source of truth for both tabs.

The account filter (`Все счета`) currently exists in both tabs but is stored separately in `dashFilters.accountId` and `filters.accountId`. It is never read from or written to the URL, so switching tabs loses the selection and URLs cannot be shared.

## Goals / Non-Goals

**Goals:**
- Persist the active account filter in the URL as `accountId`.
- Keep the Dashboard and Transactions account filters identical at all times.
- Initialise the filter from the URL on app load and browser history navigation.
- Update the URL when the user changes the filter on either tab.
- Clear the URL parameter when the filter is reset or set to "Все счета".
- Re-use the existing date-filter pattern: pure helpers, separate modules, DRY, tested.

**Non-Goals:**
- No synchronisation with the rule drawer account selector (that is rule-editing state, not a shared view filter).
- No validation that the URL `accountId` still exists in the database.
- No change to how categories are filtered (Dashboard uses multi-select, Transactions uses single-select; they stay independent).
- No backend/API changes.

## Decisions

### 1. URL parameter name: `accountId`

**Decision:** Use `accountId` in the URL.

**Rationale:** It matches the existing API query parameter (`/analytics/kpi?accountId=...`) and the internal state field names. Consistency reduces cognitive load.

**Alternative considered:** `account` for brevity. Rejected because it diverges from the API and state naming without meaningful benefit.

### 2. Flattened shared-filters object for page navigation

**Decision:** Change `buildPageUrl(page, range)` to `buildPageUrl(page, { from, to, accountId })`.

**Rationale:** Dates and account are equal-rank shared view filters. A flat object makes `navigateTo()` clearer and avoids a growing positional argument list if more filters are shared later.

**Alternative considered:** `buildPageUrl(page, range, accountId)` as a third positional argument. Rejected because it does not scale and mixes a composite object with a scalar.

### 3. Keep date and account URL writers separate

**Decision:** Add `writeAccountIdToUrl`, `pushAccountIdToUrl`, and `replaceAccountIdInUrl` alongside the existing date helpers. `buildPageUrl` calls both writers.

**Rationale:** Dates have their own domain logic (`computePeriodRange`, defaults) and are changed independently of the account filter. Separate writers keep that boundary. `buildPageUrl` is the only place that needs to serialise the full shared state.

**Alternative considered:** A single `writeSharedFiltersToUrl(url, { from, to, accountId })`. Rejected because it would force date-only update paths to pass an unused `accountId` or make the existing date helpers obsolete.

### 4. Single source of truth in Alpine state

**Decision:** Introduce `setSharedAccountId(accountId)` that writes to both `dashFilters.accountId` and `filters.accountId`. Add a `sharedFilters` getter returning `{ from, to, accountId }`.

**Rationale:** Mirrors `setSharedDateRange()` and guarantees the two tabs never drift.

### 5. Account select synchronisation with dynamic options

**Decision:** Keep the existing `x-effect="accounts.length; $nextTick(() => { $el.value = ... })"` pattern for both account selects.

**Rationale:** Alpine can render the `<select>` before `accounts` finishes loading. The effect re-applies the bound value once options are available. This is the same pattern already used for the Transactions account select.

**Alternative considered:** Programmatically set select values in `loadAccounts()`. Rejected because it spreads DOM concerns into data-loading code and duplicates the select identifiers.

### 6. No validation of URL accountId against loaded accounts

**Decision:** Accept the URL value as-is. The backend will simply return no data for an unknown account, matching current behaviour for malformed dates.

**Rationale:** Keeps the implementation simple and consistent with date handling. If desired, validation can be added later as a separate improvement.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `buildPageUrl` signature change breaks existing tests and call sites | Update `tests/url-state.test.js` and the single call site in `app.js` as part of the same change. |
| Alpine select desync if accounts load after filter is applied | Apply the filter after `loadAccounts()` in `initApp()` and use the proven `x-effect` pattern on both selects. |
| Users may expect category filters to also sync | Out of scope by design; category filters differ between tabs (multi vs single select). Document in non-goals. |
| Drawer URLs already include accountId; if state is shared, drawer behaviour is correct automatically | Verified by code inspection: all drawer builders read `dashFilters.accountId`. |

## Migration Plan

No migration needed. This is a pure frontend change. Existing URLs without `accountId` continue to work and will simply show "Все счета".

## Open Questions

None at this time.
