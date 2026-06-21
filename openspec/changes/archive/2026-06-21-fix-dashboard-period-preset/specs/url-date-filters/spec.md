## ADDED Requirements

### Requirement: Dashboard period preset is not part of URL filter state

The system SHALL NOT persist the Dashboard period preset (`month`, `3months`, `all`, `custom`) in the URL. The preset is a Dashboard-only UI convenience derived from user interaction; only the resolved `from` and `to` date range is shared between the Dashboard and Transactions tabs.

#### Scenario: User selects a preset and reloads the page

- **GIVEN** the user selected "Месяц" on the Dashboard
- **WHEN** the page is reloaded
- **THEN** the URL still contains the resolved `from` and `to` values
- **AND** the Dashboard date inputs show the same range
- **AND** the period preset may revert to "Свой" because it is not stored in the URL
