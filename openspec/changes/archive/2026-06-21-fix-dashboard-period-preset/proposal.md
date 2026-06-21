## Why

On the Dashboard page the period preset radio buttons (Месяц, 3 месяца, Всё время, Свой) immediately revert to "Свой" when clicked. The selected preset should remain active so the user gets clear visual feedback, and should only switch to "Свой" when the user manually edits the date inputs.

## What Changes

- Fix `applyDashPeriod()` in `src/web/public/js/app.js` so that selecting a period preset updates `from`/`to` without overwriting the selected `period` back to `custom`.
- Keep the existing behavior for manual date input changes: editing `from` or `to` still switches the preset to "Свой".
- No URL schema changes: the period preset is intentionally not persisted in the URL, and existing date-filter sharing between Dashboard and Transactions remains unchanged.

## Capabilities

### New Capabilities

- `dashboard-period-preset`: Dashboard period preset selection must retain the selected preset (month / 3 months / all time / custom) and only fall back to "custom" when the user manually changes the date range.

### Modified Capabilities

- `url-date-filters`: Clarify that period preset state is a Dashboard-only UI convenience and is not part of the URL-based shared filter state.

## Impact

- Affected file: `src/web/public/js/app.js` (`applyDashPeriod` method).
- No backend, API, or database changes.
- Existing `url-state.js` and `date-range.js` behavior is unchanged.
