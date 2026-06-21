## Purpose

Define how the account filter (`accountId`) is persisted in the URL, shared between the Dashboard and Transactions tabs, and respected by dashboard drill-down drawers.

## Requirements

### Requirement: Account filter initialises from URL
The system SHALL read the `accountId` query parameter on application initialisation and use it as the active account filter for both Dashboard and Transactions tabs.

#### Scenario: URL contains explicit accountId
- **WHEN** the user opens `?page=dashboard&accountId=42`
- **THEN** the Dashboard account select shows the account with id `42`
- **AND** all Dashboard widgets load data for that account

#### Scenario: URL contains only page
- **WHEN** the user opens `?page=transactions` without `accountId`
- **THEN** the system selects "Все счета" in both tabs
- **AND** the URL remains without an `accountId` parameter

### Requirement: Account filter writes to URL
The system SHALL update the URL query parameter `accountId` whenever the active account filter changes due to user action.

#### Scenario: User changes account on Dashboard
- **WHEN** the user selects a specific account in the Dashboard account filter
- **THEN** the URL is updated via `pushState` to include `accountId=<selected-id>`
- **AND** Dashboard widgets reload for that account

#### Scenario: User changes account on Transactions tab
- **WHEN** the user selects a specific account in the Transactions account filter
- **THEN** the URL is updated via `pushState` to include `accountId=<selected-id>`
- **AND** the transaction list reloads for that account

### Requirement: Dashboard and Transactions share account filter
The system SHALL keep the active account filter identical for Dashboard and Transactions tabs at all times.

#### Scenario: Switch from Transactions to Dashboard
- **GIVEN** the Transactions tab has `accountId=42` in the URL
- **WHEN** the user switches to the Dashboard tab
- **THEN** the Dashboard account select shows the account with id `42`
- **AND** Dashboard widgets load for that account

#### Scenario: Switch from Dashboard to Transactions
- **GIVEN** the Dashboard tab has `accountId=42` in the URL
- **WHEN** the user switches to the Transactions tab
- **THEN** the Transactions account select shows the account with id `42`
- **AND** the transaction list loads for that account

### Requirement: Reset clears account filter and updates URL
The system SHALL provide a reset control that clears the active account filter and removes `accountId` from the URL.

#### Scenario: User resets Dashboard filters
- **GIVEN** the Dashboard has `accountId=42` in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the account select reverts to "Все счета"
- **AND** the URL no longer contains `accountId`

#### Scenario: User resets Transactions filters
- **GIVEN** the Transactions tab has `accountId=42` in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the account select reverts to "Все счета"
- **AND** the URL no longer contains `accountId`

### Requirement: Drill-down drawers use the active account filter
The system SHALL use the currently active `accountId` when opening any dashboard drill-down drawer (period, category, comparison, heatmap day).

#### Scenario: Open category drawer with account filter
- **GIVEN** the active account filter is `accountId=42`
- **WHEN** the user clicks a segment of the category doughnut chart
- **THEN** the drawer loads transactions for that category and account `42`

#### Scenario: Open period drawer with account filter
- **GIVEN** the active account filter is `accountId=42`
- **WHEN** the user clicks a point on the income/expense line chart
- **THEN** the drawer loads transactions for the clicked sub-period and account `42`

### Requirement: Browser history navigation applies account filter state
The system SHALL re-apply the account filter from the URL when the user navigates with the browser back or forward buttons.

#### Scenario: Back button after account filter change
- **GIVEN** the user changed the account filter twice
- **WHEN** the user clicks the browser back button
- **THEN** the previous account filter is restored
- **AND** the current tab reloads data for that account
