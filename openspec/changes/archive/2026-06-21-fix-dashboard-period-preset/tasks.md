## 1. Fix Dashboard period preset behavior

- [x] 1.1 Update `applyDashPeriod()` in `src/web/public/js/app.js` to set `dashFilters.from`, `dashFilters.to`, `filters.from`, and `filters.to` directly instead of calling `setSharedDateRange()`.
- [x] 1.2 Keep `pushDateRangeToUrl(range)` call after updating the dates.
- [x] 1.3 Verify that `setSharedDateRange()` is still called by `onDashDateChange()` and URL init paths so manual date edits still switch the preset to `custom`.

## 2. Verify behavior manually

- [x] 2.1 Start the web server and open the Dashboard.
- [x] 2.2 Click "Месяц", "3 месяца", and "Всё время" presets and confirm the corresponding radio button stays selected and widgets reload.
- [x] 2.3 Edit the `from` or `to` date input and confirm the preset switches to "Свой".
- [x] 2.4 Click "Сбросить" and confirm filters return to the default 3-month range and preset becomes "Свой".

## 3. Run tests and lint

- [x] 3.1 Run `pnpm test` to ensure existing tests still pass.
- [x] 3.2 Run `pnpm run lint:fix` and `pnpm run lint` to ensure no new lint issues.
