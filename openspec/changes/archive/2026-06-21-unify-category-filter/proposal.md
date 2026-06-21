## Why

The Dashboard and Transactions tabs currently use inconsistent category filters: Dashboard has a multi-select, while Transactions has a single-select. Category selections are not persisted in the URL and are not shared across tabs, unlike date and account filters. This makes it hard to link to a specific filtered view or keep context when switching tabs.

## What Changes

- Unify the category filter UI on both Dashboard and Transactions tabs to use the same multi-select component.
- Add a "Без категории" option to the unified multi-select so uncategorized transactions remain discoverable.
- Persist the active category selection in the URL as `categoryIds=<comma-separated-ids>` where `"null"` represents uncategorized transactions.
- Share the category filter state between Dashboard and Transactions tabs, identical to how `from`/`to` and `accountId` are shared.
- Update backend transaction and analytics endpoints to accept `categoryIds` instead of the single `categoryId` parameter.
- Update dashboard drill-down drawers to use `categoryIds` when filtering transactions.
- **BREAKING**: The `/transactions` and `/analytics/period-summary` query parameter `categoryId` is removed and replaced by `categoryIds`.

## Capabilities

### New Capabilities
- `url-category-filter`: Define how category filters are persisted in the URL, shared between Dashboard and Transactions tabs, respected by drill-down drawers, and how "Без категории" is represented.

### Modified Capabilities
- `url-date-filters`: Reset scenarios now also cover clearing `categoryIds` from the URL.
- `url-account-filter`: Reset scenarios now also cover clearing `categoryIds` from the URL.

## Impact

- Frontend: `index.html`, `app.js`, new `category-filter.js`, `url-state.js`, `style.css` (minor).
- Backend: `web/routes/transactions.js`, `web/routes/analytics.js`, `domain/transactions/repository.js`, `domain/analytics/summary.js`, `shared/sql.js`.
- Tests: `url-state.test.js`, new `category-filter.test.js`, `analytics.test.js`, `api.test.js`.
