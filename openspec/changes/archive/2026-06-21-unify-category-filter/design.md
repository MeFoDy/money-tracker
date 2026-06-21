## Context

The Money Tracker SPA uses Alpine.js with shared filter state for the Dashboard and Transactions tabs. Date (`from`/`to`) and account (`accountId`) filters are already persisted in the URL, shared across tabs, and backed by dedicated helper modules (`date-range.js`, `account-filter.js`, `url-state.js`).

Currently the Dashboard uses `dashFilters.categoryIds` with a custom multi-select, while the Transactions tab uses `filters.categoryId` with a native `<select>`. The backend transaction endpoint accepts a single `categoryId`, while analytics endpoints already accept `categoryIds`. This asymmetry complicates URL sharing and feature parity.

## Goals / Non-Goals

**Goals:**
- Use the same multi-select category filter component on both Dashboard and Transactions tabs.
- Represent "Без категории" inside the same multi-select as a first-class option.
- Persist the active category selection in the URL as `categoryIds=<comma-separated-values>` where `"null"` means uncategorized.
- Share the category filter between Dashboard and Transactions exactly like dates and account.
- Update drill-down drawers and backend routes to use `categoryIds` consistently.
- Keep the helper-module pattern already established in the codebase (DRY, single-responsibility files).

**Non-Goals:**
- Changing the transaction type filter (`txType`) on the Dashboard or adding it to Transactions.
- Altering category colors, category rules, or import behavior.
- Supporting multi-select for any other filter (e.g., currencies, accounts).

## Decisions

### 1. Single URL parameter `categoryIds`
- **Choice**: Use one comma-separated query parameter `categoryIds` for all selected categories, with `"null"` as the sentinel for uncategorized transactions.
- **Rationale**: Mirrors the existing `categoryIds` analytics API and avoids inventing a second parameter. Empty selection means "all categories" and removes the parameter from the URL.
- **Alternatives considered**: Separate `categoryId` for backwards compatibility — rejected because it perpetuates the dual model and complicates URL sharing.

### 2. Unified shared state `filters.categoryIds` + `dashFilters.categoryIds`
- **Choice**: Replace `filters.categoryId` with `filters.categoryIds` (array of strings) and keep `dashFilters.categoryIds`. Both are synchronised via a `setSharedCategoryIds` setter, identical to the existing `setSharedDateRange` and `setSharedAccountId` approach.
- **Rationale**: Minimal disruption to the existing Alpine state shape; keeps dashboard-specific fields in `dashFilters` and transaction-specific fields in `filters` while still sharing the selection.

### 3. Reuse `buildWhere` for transaction queries
- **Choice**: Refactor `getTransactions` in `domain/transactions/repository.js` to use the shared `buildWhere` helper, extending it to handle `null` inside `categoryIds`.
- **Rationale**: Eliminates duplicated filter logic. All analytics queries already use `buildWhere`; unifying transaction filtering reduces future maintenance and ensures `categoryIds` behaviour is identical everywhere.

### 4. "Без категории" as a checkbox item in the same dropdown
- **Choice**: Render "Без категории" as the first checkbox in the multi-select dropdown with `value="null"`.
- **Rationale**: One UI control, one state shape, one URL parameter. Users already understand checkboxes from the Dashboard multi-select.
- **Alternatives considered**: Separate checkbox next to the dropdown — rejected because it adds visual clutter and splits state management.

### 5. Drawer drill-down uses `categoryIds=[id]`
- **Choice**: Convert drawer category filters to use `categoryIds` containing a single value (e.g. `categoryIds=null` for uncategorized).
- **Rationale**: Keeps the `/transactions` route simple with a single filtering model and ensures drawers respect the same SQL path.

### 6. New helper module `category-filter.js`
- **Choice**: Add `src/web/public/js/category-filter.js` with `resolveCategoryIdsFromUrl`, following the pattern of `account-filter.js` and `date-range.js`.
- **Rationale**: Consistent project convention; keeps URL parsing logic testable and isolated from Alpine state.

## Risks / Trade-offs

- **[Risk]** Removing the single `categoryId` query parameter is a breaking change for any external bookmarks or scripts.
  - **Mitigation**: Document the change in the proposal and update tests. No public API is documented, so impact is limited to saved URLs.
- **[Risk]** Refactoring `getTransactions` to use `buildWhere` may subtly change date boundary handling if the helpers differ.
  - **Mitigation**: Both already slice dates to `YYYY-MM-DD` and use `nextDay` for the upper bound; verify with existing API tests after implementation.
- **[Risk]** `categoryIds=null` in the URL could be confused with "no filter".
  - **Mitigation**: "No filter" is represented by the absence of `categoryIds`; `categoryIds=null` explicitly means "only uncategorized".
- **[Risk]** The doughnut chart already groups uncategorized transactions as "Без категории"; adding the pseudo-category to the filter dropdown may lead users to expect colour/styling parity.
  - **Mitigation**: Keep the existing grey styling for the pseudo-category in the dropdown; do not attempt to assign a colour.

## Migration Plan

No database or deployment migration is required. This is a purely code-level change. After deployment, old URLs containing `categoryId=...` will be treated as "all categories" (no filter) because the new code reads `categoryIds`. Users with old bookmarks can re-apply filters.

## Open Questions

None at this time.
