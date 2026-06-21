## 1. Helper modules and tests

- [x] 1.1 Create `src/web/public/js/account-filter.js` with `resolveAccountIdFromUrl(url)`.
- [x] 1.2 Add `writeAccountIdToUrl`, `replaceAccountIdInUrl`, and `pushAccountIdToUrl` to `src/web/public/js/url-state.js`.
- [x] 1.3 Change `buildPageUrl` signature to `buildPageUrl(page, { from, to, accountId })` and update its implementation to serialise both dates and account.
- [x] 1.4 Create `tests/account-filter.test.js` covering URL resolution and defaults.
- [x] 1.5 Extend `tests/url-state.test.js` with account filter and updated `buildPageUrl` cases.
- [x] 1.6 Run `pnpm test` and ensure all new and existing tests pass.

## 2. Application state integration

- [x] 2.1 Import new helpers into `src/web/public/js/app.js`.
- [x] 2.2 Add `sharedFilters` getter returning `{ from, to, accountId }`.
- [x] 2.3 Add `setSharedAccountId(accountId)` that writes to both `dashFilters.accountId` and `filters.accountId`.
- [x] 2.4 Add `applyAccountIdFromUrl(shouldReplaceUrl)` and call it from `applyPageFromUrl` and `initApp` after `loadAccounts`.
- [x] 2.5 Add `onDashAccountChange()` handler and `onTransactionAccountChange()` handler.
- [x] 2.6 Update `navigateTo(page)` to use `buildPageUrl(page, this.sharedFilters)`.
- [x] 2.7 Update `resetDashFilters()` and `resetFilters()` to clear the shared account filter and update the URL.
- [x] 2.8 Ensure `popstate` handler re-applies the account filter.

## 3. Template wiring

- [x] 3.1 Update the Dashboard account `<select>` to use `@change="onDashAccountChange()"` and the same `x-effect` synchronisation pattern used for Transactions.
- [x] 3.2 Update the Transactions account `<select>` to use `@change="onTransactionAccountChange()"` and keep the existing `x-effect` synchronisation.

## 4. Verification

- [x] 4.1 Run `pnpm run lint:fix` and `pnpm run lint`.
- [x] 4.2 Run `pnpm test` and fix any regressions.
- [ ] 4.3 Manually verify: loading URL with `accountId`, switching tabs, reset, back button, drawer drill-down.
