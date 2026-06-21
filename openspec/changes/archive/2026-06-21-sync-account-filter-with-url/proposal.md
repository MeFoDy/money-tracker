## Why

The Dashboard and Transactions tabs both expose a "Все счета" account filter, but today the selected account is not persisted in the URL and is not synchronised between tabs. This breaks deep-linking and forces users to re-select the account when switching tabs. The existing date-filter implementation already solves the same problem for date ranges, so we should extend that pattern to account selection.

## What Changes

- Add a new `accountId` query parameter that lives alongside `from`/`to` in the URL.
- Share the active account filter between the Dashboard and Transactions tabs, identical to how date ranges are shared.
- Initialise the account filter from the URL on app load and on browser history navigation.
- Update the URL via `pushState` when the user changes the account filter on either tab.
- Clear the account filter from the URL when the user clicks "Сбросить" on either tab.
- Ensure all dashboard drill-down drawers respect the active account filter (they already read `dashFilters.accountId`, so this follows naturally).
- Introduce focused helper modules and tests following the project's existing date-filter pattern.

## Capabilities

### New Capabilities
- `url-account-filter`: Define how the account filter (`accountId`) is persisted in the URL, shared between Dashboard and Transactions tabs, and respected by drill-down drawers.

### Modified Capabilities
- `url-date-filters`: Update the shared-filter contract so page navigation and reset also carry/reset the account filter. Requirements related to URL writing, page switching, reset, and history navigation now cover both date range and account filter.

## Impact

- Frontend: `src/web/public/js/app.js`, `src/web/public/js/url-state.js`, `src/web/public/index.html`.
- New helpers: `src/web/public/js/account-filter.js`.
- Tests: `tests/url-state.test.js` (extended), new `tests/account-filter.test.js`.
- No backend or API changes required.
