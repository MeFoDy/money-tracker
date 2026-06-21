## 1. Backend: support categoryIds everywhere

- [x] 1.1 Extend `src/shared/sql.js` `buildWhere` to handle `null` inside `categoryIds`, generating `category_id IS NULL OR category_id IN (...)`.
- [x] 1.2 Refactor `src/domain/transactions/repository.js` `getTransactions` to accept `categoryIds` and use `buildWhere`.
- [x] 1.3 Update `src/web/routes/transactions.js` to parse `categoryIds` and remove `categoryId` handling.
- [x] 1.4 Update `src/domain/analytics/summary.js` `getPeriodSummary` to accept `categoryIds` instead of `categoryId`.
- [x] 1.5 Update `src/web/routes/analytics.js` `/period-summary` route to parse and pass `categoryIds`.

## 2. Frontend helpers: URL state and category resolution

- [x] 2.1 Create `src/web/public/js/category-filter.js` with `resolveCategoryIdsFromUrl(url)` returning an array of strings (`['null', '1', ...]` or `[]`).
- [x] 2.2 Add `writeCategoryIdsToUrl`, `pushCategoryIdsToUrl`, `replaceCategoryIdsInUrl` to `src/web/public/js/url-state.js`.
- [x] 2.3 Update `buildPageUrl` in `src/web/public/js/url-state.js` to accept and preserve `categoryIds`.

## 3. Frontend UI: unify category filter

- [x] 3.1 In `src/web/public/index.html` add "Без категории" as the first option in the Dashboard category multi-select dropdown.
- [x] 3.2 In `src/web/public/index.html` replace the Transactions single category `<select>` with the same multi-select component (including "Без категории" first).

## 4. Frontend state: share categoryIds across tabs

- [x] 4.1 In `src/web/public/js/app.js` replace `filters.categoryId` with `filters.categoryIds: []`.
- [x] 4.2 Add `setSharedCategoryIds(categoryIds)` to synchronise `dashFilters.categoryIds` and `filters.categoryIds`.
- [x] 4.3 Add `applyCategoryIdsFromUrl(shouldReplaceUrl)` and call it in `initApp` and `applyPageFromUrl`.
- [x] 4.4 Add `onDashCategoryChange()` and `onTransactionCategoryChange()` handlers that call `pushCategoryIdsToUrl` and reload data.
- [x] 4.5 Update `sharedFilters` getter and `buildPageUrl` usage in `navigateTo` to include `categoryIds`.
- [x] 4.6 Update `loadTransactions` to use `filters.categoryIds` and build the query with comma-separated IDs.
- [x] 4.7 Update `resetDashFilters` and `resetFilters` to clear `categoryIds` and remove the URL parameter.
- [x] 4.8 Update `buildDrawerQuery` and category/comparison drawer openers to use `categoryIds` (single-value arrays).

## 5. Tests

- [x] 5.1 Update `tests/analytics.test.js` to use `getPeriodSummary({ categoryIds: [null] })` instead of `categoryId: null`.
- [x] 5.2 Add tests for `resolveCategoryIdsFromUrl` in a new `tests/category-filter.test.js`.
- [x] 5.3 Add tests for new `categoryIds` URL helpers in `tests/url-state.test.js`.
- [x] 5.4 Add API tests for `/transactions?categoryIds=...` and `/analytics/period-summary?categoryIds=...` in `tests/api.test.js`.
- [x] 5.5 Run `pnpm test` and fix any regressions.

## 6. QA and cleanup

- [x] 6.1 Run `pnpm run lint:fix` and `pnpm run lint`.
- [x] 6.2 Verify category filter state persists across tab switches and browser back/forward.
- [x] 6.3 Verify "Без категории" works in the filter dropdown, doughnut drill-down, and transaction list.
