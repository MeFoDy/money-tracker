## Purpose

Define how date filters (`from`/`to`) are persisted in the URL, shared between Dashboard and Transactions tabs, and respected by drill-down drawers.

## Requirements

### Requirement: Date filters initialise from URL
The system SHALL read `from` and `to` query parameters on application initialisation and use them as the active date range for both Dashboard and Transactions tabs.

#### Scenario: URL contains explicit dates
- **WHEN** the user opens `?page=dashboard&from=2026-01-01&to=2026-06-21`
- **THEN** the Dashboard date inputs show `01.01.2026` and `21.06.2026`
- **AND** all Dashboard widgets load data for that range

#### Scenario: URL contains only page
- **WHEN** the user opens `?page=transactions` without `from` or `to`
- **THEN** the system applies the default 3-month range
- **AND** writes the resolved `from` and `to` to the URL without adding a history entry

### Requirement: Date filters write to URL
The system SHALL update the URL query parameters `from` and `to` whenever the active date range changes due to user action.

#### Scenario: User changes date on Dashboard
- **WHEN** the user sets the Dashboard `from` or `to` date
- **THEN** the URL is updated via `pushState` to include the new values
- **AND** Dashboard widgets reload with the new range

#### Scenario: User changes date on Transactions tab
- **WHEN** the user sets the Transactions `from` or `to` date
- **THEN** the URL is updated via `pushState` to include the new values
- **AND** the transaction list reloads with the new range

### Requirement: Dashboard and Transactions share date range
The system SHALL keep `from` and `to` identical for Dashboard and Transactions tabs at all times.

#### Scenario: Switch from Transactions to Dashboard
- **GIVEN** the Transactions tab has `from=2026-04-01&to=2026-06-21`
- **WHEN** the user switches to the Dashboard tab
- **THEN** the Dashboard date inputs show the same range
- **AND** Dashboard widgets load for that range

#### Scenario: Switch from Dashboard to Transactions
- **GIVEN** the Dashboard tab has `from=2026-04-01&to=2026-06-21`
- **WHEN** the user switches to the Transactions tab
- **THEN** the Transactions date inputs show the same range
- **AND** the transaction list loads for that range

### Requirement: Reset restores defaults and updates URL
The system SHALL provide a reset control that restores the default 3-month date range and updates the URL accordingly.

#### Scenario: User resets Dashboard filters
- **GIVEN** the Dashboard has a custom date range in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the date inputs revert to the default 3-month window
- **AND** the URL parameters `from` and `to` are updated to that default

#### Scenario: User resets Transactions filters
- **GIVEN** the Transactions tab has a custom date range in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the date inputs revert to the default 3-month window
- **AND** the URL parameters `from` and `to` are updated to that default

### Requirement: Drill-down drawers use the active date range
The system SHALL use the currently active `from`/`to` range when opening any dashboard drill-down drawer (period, category, comparison, heatmap day).

#### Scenario: Open category drawer
- **GIVEN** the active range is `from=2026-01-01&to=2026-06-21`
- **WHEN** the user clicks a segment of the category doughnut chart
- **THEN** the drawer loads transactions for that category within `2026-01-01` to `2026-06-21`

#### Scenario: Open period drawer
- **GIVEN** the active range is `from=2026-01-01&to=2026-06-21`
- **WHEN** the user clicks a point on the income/expense line chart
- **THEN** the drawer loads transactions for the clicked sub-period within the active range

### Requirement: Browser history navigation applies filter state
The system SHALL re-apply the date range from the URL when the user navigates with the browser back or forward buttons.

#### Scenario: Back button after filter change
- **GIVEN** the user changed the date range twice
- **WHEN** the user clicks the browser back button
- **THEN** the previous date range is restored
- **AND** the current tab reloads data for that range
