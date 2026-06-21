## MODIFIED Requirements

### Requirement: Reset restores defaults and updates URL
The system SHALL provide a reset control that restores the default 3-month date range, clears the active account filter, clears the active category filter, and updates the URL accordingly.

#### Scenario: User resets Dashboard filters
- **GIVEN** the Dashboard has a custom date range, `accountId`, and/or `categoryIds` in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the date inputs revert to the default 3-month window
- **AND** the account select reverts to "Все счета"
- **AND** the category multi-select reverts to "Все категории"
- **AND** the URL parameters `from`, `to`, `accountId`, and `categoryIds` are updated accordingly

#### Scenario: User resets Transactions filters
- **GIVEN** the Transactions tab has a custom date range, `accountId`, and/or `categoryIds` in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the date inputs revert to the default 3-month window
- **AND** the account select reverts to "Все счета"
- **AND** the category multi-select reverts to "Все категории"
- **AND** the URL parameters `from`, `to`, `accountId`, and `categoryIds` are updated accordingly
