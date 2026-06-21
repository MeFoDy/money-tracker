## ADDED Requirements

### Requirement: Dashboard period preset selection retains the chosen preset

The system SHALL keep the Dashboard period preset radio button (`month`, `3months`, `all`, or `custom`) matching the user's last explicit selection unless the user manually edits the date range.

#### Scenario: User selects "Месяц"

- **GIVEN** the Dashboard period preset is currently "Свой"
- **WHEN** the user clicks the "Месяц" radio button
- **THEN** the "Месяц" radio button remains selected
- **AND** the `from` and `to` date inputs update to the month period range
- **AND** the Dashboard widgets reload with the new range

#### Scenario: User selects "3 месяца"

- **GIVEN** the Dashboard period preset is currently "Свой"
- **WHEN** the user clicks the "3 месяца" radio button
- **THEN** the "3 месяца" radio button remains selected
- **AND** the `from` and `to` date inputs update to the 3-month period range
- **AND** the Dashboard widgets reload with the new range

#### Scenario: User selects "Всё время"

- **GIVEN** the Dashboard period preset is currently "Свой"
- **WHEN** the user clicks the "Всё время" radio button
- **THEN** the "Всё время" radio button remains selected
- **AND** the `from` and `to` date inputs update to the all-time date range
- **AND** the Dashboard widgets reload with the new range

### Requirement: Manual date input switches preset to "Свой"

The system SHALL set the Dashboard period preset to `custom` whenever the user edits the `from` or `to` date input directly.

#### Scenario: User changes date after selecting a preset

- **GIVEN** the Dashboard period preset is currently "Месяц"
- **WHEN** the user changes the `from` date input
- **THEN** the period preset switches to "Свой"
- **AND** the `to` date remains unchanged
- **AND** the Dashboard widgets reload with the new range
