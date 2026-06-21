## Purpose

Define how category filters (`categoryIds`) are persisted in the URL, shared between the Dashboard and Transactions tabs, respected by dashboard drill-down drawers, and how the "Без категории" pseudo-category is represented.

## ADDED Requirements

### Requirement: Category filter initialises from URL
The system SHALL read the `categoryIds` query parameter on application initialisation and use it as the active category filter for both Dashboard and Transactions tabs. The absence of the parameter SHALL mean that all categories are selected, including uncategorized transactions.

#### Scenario: URL contains explicit categoryIds
- **WHEN** the user opens `?page=dashboard&categoryIds=1,2`
- **THEN** the Dashboard category multi-select shows categories `1` and `2` as selected
- **AND** all Dashboard widgets load data for those categories

#### Scenario: URL contains only page
- **WHEN** the user opens `?page=transactions` without `categoryIds`
- **THEN** the category multi-select shows "Все категории"
- **AND** the transaction list loads transactions for all categories

#### Scenario: URL contains uncategorized pseudo-category
- **WHEN** the user opens `?page=dashboard&categoryIds=null`
- **THEN** the category multi-select shows "Без категории" as selected
- **AND** Dashboard widgets load data only for uncategorized transactions

### Requirement: Category filter writes to URL
The system SHALL update the URL query parameter `categoryIds` whenever the active category filter changes due to user action.

#### Scenario: User selects categories on Dashboard
- **WHEN** the user checks categories `1` and `2` in the Dashboard category filter
- **THEN** the URL is updated via `pushState` to include `categoryIds=1,2`
- **AND** Dashboard widgets reload for those categories

#### Scenario: User selects categories on Transactions tab
- **WHEN** the user checks categories `1` and `2` in the Transactions category filter
- **THEN** the URL is updated via `pushState` to include `categoryIds=1,2`
- **AND** the transaction list reloads for those categories

#### Scenario: User selects only uncategorized
- **WHEN** the user checks only "Без категории" in the category filter
- **THEN** the URL is updated via `pushState` to include `categoryIds=null`

#### Scenario: User clears all category selections
- **WHEN** the user unchecks all categories including "Без категории"
- **THEN** the URL no longer contains `categoryIds`
- **AND** the filter displays "Все категории"

### Requirement: Dashboard and Transactions share category filter
The system SHALL keep the active category filter identical for Dashboard and Transactions tabs at all times.

#### Scenario: Switch from Transactions to Dashboard
- **GIVEN** the Transactions tab has `categoryIds=1,2` in the URL
- **WHEN** the user switches to the Dashboard tab
- **THEN** the Dashboard category multi-select shows categories `1` and `2` as selected
- **AND** Dashboard widgets load for those categories

#### Scenario: Switch from Dashboard to Transactions
- **GIVEN** the Dashboard tab has `categoryIds=1,2` in the URL
- **WHEN** the user switches to the Transactions tab
- **THEN** the Transactions category multi-select shows categories `1` and `2` as selected
- **AND** the transaction list loads for those categories

### Requirement: Unified multi-select component
The system SHALL use the same multi-select component for category filtering on both Dashboard and Transactions tabs. The component SHALL include a "Без категории" option listed first.

#### Scenario: Dashboard category filter
- **WHEN** the user views the Dashboard tab
- **THEN** the category filter is rendered as a multi-select dropdown
- **AND** the first option is "Без категории"
- **AND** real categories follow alphabetically or by existing order

#### Scenario: Transactions category filter
- **WHEN** the user views the Transactions tab
- **THEN** the category filter is rendered as the same multi-select dropdown as on Dashboard
- **AND** the first option is "Без категории"

### Requirement: Drill-down drawers use the active category filter
The system SHALL use the currently active `categoryIds` when opening any dashboard drill-down drawer that filters by category.

#### Scenario: Open category drawer with category filter
- **GIVEN** the active category filter is `categoryIds=1,2`
- **WHEN** the user clicks a segment of the category doughnut chart
- **THEN** the drawer loads transactions for the clicked category within the active category filter
- **AND** the drawer URL includes `categoryIds` containing the clicked category

#### Scenario: Open category drawer for uncategorized segment
- **GIVEN** the active category filter includes uncategorized transactions
- **WHEN** the user clicks the "Без категории" segment of the doughnut chart
- **THEN** the drawer loads only uncategorized transactions
- **AND** the drawer URL includes `categoryIds=null`

### Requirement: Browser history navigation applies category filter state
The system SHALL re-apply the category filter from the URL when the user navigates with the browser back or forward buttons.

#### Scenario: Back button after category filter change
- **GIVEN** the user changed the category filter twice
- **WHEN** the user clicks the browser back button
- **THEN** the previous category filter is restored
- **AND** the current tab reloads data for that category filter

## MODIFIED Requirements

No modifications to existing `url-category-filter` requirements.

## REMOVED Requirements

No removed requirements.
