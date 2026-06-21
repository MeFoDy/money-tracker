## MODIFIED Requirements

### Requirement: Reset clears account filter and updates URL
The system SHALL provide a reset control that clears the active account filter, clears the active category filter, and removes `accountId` and `categoryIds` from the URL.

#### Scenario: User resets Dashboard filters
- **GIVEN** the Dashboard has `accountId=42` and/or `categoryIds=1,2` in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the account select reverts to "Все счета"
- **AND** the category multi-select reverts to "Все категории"
- **AND** the URL no longer contains `accountId` or `categoryIds`

#### Scenario: User resets Transactions filters
- **GIVEN** the Transactions tab has `accountId=42` and/or `categoryIds=1,2` in the URL
- **WHEN** the user clicks "Сбросить"
- **THEN** the account select reverts to "Все счета"
- **AND** the category multi-select reverts to "Все категории"
- **AND** the URL no longer contains `accountId` or `categoryIds`
