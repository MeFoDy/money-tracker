## 1. Refactor date filter state and URL helpers

- [x] 1.1 Add shared helpers to read/write/default `from`/`to` to `URLSearchParams`.
- [x] 1.2 Initialise both `dashFilters` and `filters` from the URL on app startup, falling back to the default 3-month range and using `replaceState` to normalise the URL.
- [x] 1.3 Update `loadPageFromUrl` to also re-apply `from`/`to` to both filter objects.

## 2. Wire user actions to URL updates

- [x] 2.1 Update dashboard date inputs to write `from`/`to` to the URL via `pushState` on change and reload Dashboard.
- [x] 2.2 Update transactions date inputs to write `from`/`to` to the URL via `pushState` on change and reload Transactions.
- [x] 2.3 Update `navigateTo` so tab switching writes both `page` and the current `from`/`to` to the URL without losing the date filters.

## 3. Implement reset behaviour

- [x] 3.1 Update `resetDashFilters` to compute the default 3-month range, apply it to both filter objects, update the URL, and reload Dashboard.
- [x] 3.2 Update `resetFilters` to compute the default 3-month range, apply it to both filter objects, update the URL, and reload Transactions.

## 4. Verify drawer behaviour

- [x] 4.1 Confirm all dashboard drawers (`openDrawerForPeriod`, `openDrawerForCategory`, `openDrawerForComparison`, `openDrawerForDay`) read `dashFilters.from`/`dashFilters.to`, which now always matches the URL state.
- [ ] 4.2 Manually test drill-down from line chart, doughnut, comparison chart, and heatmap for the same active range.

## 5. Test and lint

- [x] 5.1 Run `pnpm test` and fix any regressions.
- [x] 5.2 Run `pnpm run lint:fix && pnpm run lint` and fix remaining issues.
