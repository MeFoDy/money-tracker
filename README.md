# Priorbank Money Tracker

Легковесный трекер финансов на основе банковских CSV-выписок от Приорбанка. Поддерживает веб-интерфейс (SPA) и CLI-инструмент для интеграции с внешними ботами (например, Hermes Telegram bot).

**Дисклеймер:**
1. Банк может в любой момент изменить формат выписки, из-за чего загрузка новых выписок начнёт вести себя непредсказуемо.
2. В приложении нет авторизации. Каждый инстанс приложения — персональный.

**Как пользоваться:**
1. Склонируй себе этот репозиторий.
2. `pnpm i`
3. `pnpm run copy-frontend-deps`
4. `pnpm run web`, после открой http://127.0.0.1:3000 (по умолчанию)
5. Открой веб-версию онлайн-кабинета банка, выбери нужную карту и сгенерируй выписку по карте.
6. Скачай выписку в формате CSV.
7. Перейди во вкладку «Загрузить».
8. Дальше — кликай везде, изучай, пользуйся.

---

## Содержание

- [Особенности](#особенности)
- [Технологический стек](#технологический-стек)
- [Структура проекта](#структура-проекта)
- [Установка](#установка)
- [Запуск](#запуск)
  - [Веб-сервер](#веб-сервер)
  - [CLI](#cli)
- [API](#api)
- [Архитектура и ключевые решения](#архитектура-и-ключевые-решения)
- [Тестирование](#тестирование)
- [Разработка / Для LLM-агентов](#разработка--для-llm-агентов)

---

## Особенности

- **Импорт выписок** — загрузка CSV банковской выписки в кодировке `windows-1251` через веб-интерфейс (drag & drop) или CLI.
- **Дедупликация** — одинаковые операции из разных загрузок не дублируются в базе (SHA-256 хеш по составному ключу).
- **Pending-транзакции** — поддержка заблокированных (pending) и завершённых (completed) операций; pending автоматически обновляются при появлении completed-дубликата.
- **Категоризация** — ручная разметка категорий, bulk-операции назначения категорий и правила авто-категоризации.
- **Аналитика** — дашборд с KPI-карточками, интерактивными графиками (расходы по категориям, доходы/расходы по времени, тепловая карта активности, сравнение периодов), фильтры по датам, счетам и категориям.
- **Два entrypoint** — полноценный веб-сервер для пользователей и автономный CLI для ботов/скриптов.
- **Локальные ассеты** — фронтенд работает полностью офлайн, все зависимости (Alpine.js, Chart.js, Pico CSS) раздаются локально.

---

## Технологический стек

| Компонент | Выбор |
|-----------|-------|
| Runtime | Node.js 20+ (ESM) |
| Пакетный менеджер | pnpm |
| Сервер | Fastify 4.x |
| База данных | SQLite (`better-sqlite3`) |
| SPA фреймворк | Alpine.js 3.x (+ `@alpinejs/focus`) |
| Графики | Chart.js 4.x + chartjs-plugin-datalabels |
| CSS | Pico CSS 2.x |
| CLI | Commander.js |
| CSV парсер | `csv-parse` + `iconv-lite` |
| Тесты | Node.js built-in test runner (`node --test`) |
| Линтер | ESLint + eslint-plugin-unicorn |

---

## Структура проекта

```
money-tracker/
├── package.json
├── pnpm-workspace.yaml          # Workspace для native builds (better-sqlite3)
├── AGENTS.md                    # Инструкции для агентов
├── data/
│   └── finance.db               # SQLite БД (gitignored)
├── reports/
│   └── Vpsk_71487962.csv        # Образец выписки
├── scripts/
│   └── copy-frontend-deps.js    # Копирование vendor-зависимостей
├── src/
│   ├── config/                  # Конфигурация
│   │   └── database.js          # Подключение к SQLite, WAL
│   ├── migrations/
│   │   └── schema.js            # Схема и миграции БД
│   ├── shared/                  # Чистые утилиты (web + cli)
│   │   ├── hash.js              # SHA-256 хеширование
│   │   ├── dates.js             # Работа с датами
│   │   ├── numbers.js           # Форматирование чисел
│   │   └── sql.js               # SQL-хелперы (buildWhere и др.)
│   ├── domain/                  # Бизнес-логика по сущностям
│   │   ├── accounts/            # CRUD счетов + комментарии
│   │   ├── categories/          # CRUD категорий
│   │   ├── category-rules/      # Правила авто-категоризации + движок
│   │   ├── transactions/        # CRUD, парсер CSV, импортёр
│   │   ├── uploads/             # CRUD загрузок
│   │   └── analytics/           # Аналитические запросы
│   │       ├── base.js
│   │       ├── kpi.js
│   │       ├── time-series.js
│   │       ├── categories.js
│   │       ├── counterparties.js
│   │       ├── summary.js
│   │       ├── heatmap.js
│   │       └── index.js
│   ├── web/
│   │   ├── server.js            # Fastify: static, multipart, SPA fallback, security headers
│   │   ├── routes/
│   │   │   ├── index.js         # Регистрация роутов
│   │   │   ├── upload.js        # POST /api/upload/preview, POST /api/upload/confirm
│   │   │   ├── transactions.js  # GET /api/transactions, DELETE /api/transactions/:id, PATCH /api/transactions/bulk
│   │   │   ├── categories.js    # CRUD категорий
│   │   │   ├── category-rules.js# CRUD правил авто-категоризации
│   │   │   ├── accounts.js      # GET /api/accounts, GET /api/accounts/currencies, PATCH /api/accounts/:id
│   │   │   └── analytics.js     # GET /api/analytics/*
│   │   └── public/              # SPA статика
│   │       ├── index.html
│   │       ├── css/style.css
│   │       ├── js/app.js        # Alpine.js логика
│   │       ├── js/charts.js     # Chart.js обёртки
│   │       ├── js/utils.js      # Фронтенд утилиты
│   │       ├── js/date-range.js # Фильтры дат и пресеты
│   │       ├── js/url-state.js  # Синхронизация фильтров с URL
│   │       ├── js/account-filter.js # Компонент фильтра по счетам
│   │       ├── js/category-filter.js # Компонент фильтра по категориям
│   │       └── vendor/          # alpinejs.js, alpine-focus.js, chart.js, chartjs-plugin-datalabels.js, pico.css
│   └── cli/
│       └── cli.js               # Entrypoint для CLI
└── tests/
    ├── _helper.js               # Временные БД для тестов
    ├── parser.test.js
    ├── importer.test.js
    ├── rule-engine.test.js
    ├── api.test.js
    ├── analytics.test.js
    ├── utils.test.js
    ├── account-filter.test.js
    ├── category-filter.test.js
    ├── date-range.test.js
    └── url-state.test.js
```

---

## Установка

Требования: Node.js >= 20, pnpm.

```bash
# Установка зависимостей
pnpm install

# Копирование фронтенд-зависимостей в public/vendor
pnpm run copy-frontend-deps
```

---

## Запуск

### Веб-сервер

```bash
pnpm run web
```

Сервер слушает `127.0.0.1:3000` (или порт из `PORT`).
- API доступно по `/api/*`
- SPA раздаётся из `src/web/public/`
- Fallback на `index.html` для клиентского роутинга
- Все ответы содержат security headers (CSP, HSTS, X-Frame-Options и др.)

### CLI

```bash
pnpm run cli -- <команда> [опции]
# или напрямую
node src/cli/cli.js <команда> [опции]
```

**Команды:**

| Команда | Описание |
|---------|----------|
| `import <file>` | Импортировать банковскую выписку CSV |
| `stats [--from <date>] [--to <date>] [--account <id>]` | Краткая аналитика в JSON |
| `categorize <id> <categoryId>` | Назначить категорию транзакции по ID |
| `bulk-categorize <query> <categoryId>` | Назначить категорию по паттерну описания |

CLI всегда выводит машиночитаемый JSON в `stdout` и завершается с ненулевым кодом при ошибках.

---

## API

Все эндпоинты возвращают JSON.

### Upload
- `POST /api/upload/preview` — multipart/form-data с полем `file`. Возвращает preview транзакций для подтверждения.
- `POST /api/upload/confirm` — body `{ transactions, originalFilename? }`. Подтверждает импорт и возвращает `{ imported, duplicatesSkipped, updatedFromPending, uploadId }`.

### Transactions
- `GET /api/transactions?from=&to=&accountId=&categoryIds=&search=&limit=50&offset=0&orderBy=tx_date DESC` — список с пагинацией и фильтрами. `categoryIds=null` или `categoryId=null` фильтрует некатегоризированные.
- `DELETE /api/transactions/:id` — удалить транзакцию по ID.
- `PATCH /api/transactions/bulk` — body `{ ids: number[], categoryId: number|null }`. Массовое обновление категории.

### Categories
- `GET /api/categories` — `{ categories }`
- `POST /api/categories` — body `{ name, color? }`
- `PUT /api/categories/:id` — body `{ name, color? }`
- `DELETE /api/categories/:id`

### Category Rules
- `GET /api/category-rules` — `{ rules }`
- `POST /api/category-rules` — body `{ categoryId, descriptionPattern?, minAmount?, maxAmount?, accountId?, currency?, priority?, isActive? }`
- `PUT /api/category-rules/:id` — body `{ categoryId, descriptionPattern?, minAmount?, maxAmount?, accountId?, currency?, priority?, isActive? }`
- `DELETE /api/category-rules/:id`

### Accounts
- `GET /api/accounts` — список счетов
- `GET /api/accounts/currencies` — список уникальных валют
- `PATCH /api/accounts/:id` — body `{ comment? }`, обновить комментарий счёта

### Analytics

Аналитические эндпоинты поддерживают общие фильтры: `from`, `to`, `accountId`, `categoryIds` (через запятую). Денежные значения используют `amount_byn` при наличии, иначе `amount`.

- `GET /api/analytics/summary` — `{ totalTx, totalIncome, totalExpense, uncategorized }`
- `GET /api/analytics/kpi` — KPI текущего периода + дельта к предыдущему равному периоду: `{ balance, income, incomeDelta, expense, expenseDelta, topCategory, transactionCount, prevPeriod }`
- `GET /api/analytics/income-expense-over-time?groupBy=day|week|month` — `[{ period, income, expense, cumulative_balance }]`
- `GET /api/analytics/period-summary` — `{ income, expense }` за указанный период
- `GET /api/analytics/spending-by-category?type=expense|income` — `[{ category_id, name, color, total }]`
- `GET /api/analytics/period-comparison` — сравнение текущего и предыдущего периода по категориям с `delta` и `deltaPercent`
- `GET /api/analytics/heatmap?mode=expense|income|count` — календарная тепловая карта активности по дням
- `GET /api/analytics/monthly-summary` — `[{ month, income, expense }]`
- `GET /api/analytics/top-counterparties?limit=10` — `[{ description, count, total }]`
- `GET /api/analytics/balance-over-time` — кумулятивный баланс по дням: `[{ date, balance }]`
- `GET /api/analytics/uncategorized-count` — количество некатегоризированных транзакций
- `GET /api/analytics/date-range` — `{ minDate, maxDate }` диапазон дат всех транзакций

---

## Архитектура и ключевые решения

### Модульная система
Проект использует **Node.js ESM** (`"type": "module"`). Все импорты — через `import`/`export`. Файлы именуются в `kebab-case`.

### Domain-driven структура (`src/domain/`)
Бизнес-логика сгруппирована по сущностям (`accounts/`, `categories/`, `transactions/`, `analytics/` и т.д.) и используется **и веб-сервером, и CLI**. Это гарантирует единообразие поведения при импорте, дедупликации и аналитике.

### Дедупликация
Каждая транзакция получает уникальный хеш:
```
SHA-256(date|amount|currency|description|account_id)
```
При повторной загрузке:
- если запись уже существует и не pending — пропускается (`duplicatesSkipped`);
- если существует как pending — обновляется до completed (`updatedFromPending`).

### Парсинг CSV
- Кодировка: **windows-1251** (через `iconv-lite`).
- Разделитель: `;`.
- Поддерживаются секции:
  - `Операции по ...` — завершённые транзакции (9 колонок);
  - `Заблокированные суммы по ...` — pending-транзакции (8 колонок).
- Служебные строки (заголовки, итоги) пропускаются автоматически.

### Правила авто-категоризации (`category_rules`)
Правила позволяют автоматически назначать категории при импорте на основе:
- паттерна в описании (`description_pattern`);
- диапазона суммы (`min_amount`, `max_amount`);
- счёта (`account_id`);
- валюты (`currency`).

Поддерживается приоритет (`priority`) и активация/деактивация (`is_active`).

### База данных
SQLite с WAL-режимом. Схема включает:
- `accounts` — счета (автосоздание при импорте), с полем `comment`;
- `categories` — пользовательские категории;
- `transactions` — основные операции (`is_pending=1` для заблокированных);
- `pending_transactions` — дополнительная таблица для pending-записей;
- `category_rules` — правила авто-категоризации;
- `uploads` — лог загрузок.

### Фронтенд
Легковесное SPA на Alpine.js без сборщика. Страницы: дашборд, транзакции, категории, загрузка, правила категоризации, счета. Chart.js отрисовывает doughnut (расходы по категориям), line (доходы/расходы по времени), bar (сравнение периодов). Тепловая карта реализована через чистый DOM. Состояние фильтров (даты, счёт, категории) синхронизируется с URL query-параметрами между дашбордом и страницей транзакций. Все стили и скрипты — локальные.

### Безопасность
Сервер добавляет security headers ко всем ответам:
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Resource-Policy`

---

## Тестирование

```bash
pnpm test
```

Запускает встроенный test runner Node.js (`node --test`) для всех `*.test.js`:
- `parser.test.js` — парсинг sample CSV, мультивалютность, pending;
- `importer.test.js` — импорт, дедупликация, pending-флаг, авто-категоризация;
- `rule-engine.test.js` — движок правил авто-категоризации;
- `analytics.test.js` — агрегации, сортировка, кумулятивный баланс;
- `api.test.js` — интеграционные тесты через `fastify.inject()`;
- `utils.test.js` — юнит-тесты вспомогательных функций;
- `account-filter.test.js`, `category-filter.test.js`, `date-range.test.js`, `url-state.test.js` — тесты фронтенд-логики фильтров и синхронизации URL.

Тесты используют изолированные временные БД (`tests/_helper.js`).

---

## Разработка / Для LLM-агентов

- **Source of Truth**: исходный код, `README.md` и `AGENTS.md`.
- **Состояние**: проект полностью реализован и протестирован. Все тесты проходят.
- **Без сборщика**: нет Docker, Webpack, Vite и т.д. Фронтенд — нативные JS/CSS.
- **Не коммитить БД**: `data/finance.db` в `.gitignore`.
- **Переменные окружения**:
  - `PORT` — порт веб-сервера (по умолчанию 3000);
  - `DB_PATH` — путь к SQLite (по умолчанию `data/finance.db`).
- **Добавление фронтенд-зависимостей**: если нужен новый npm-пакет для фронта, добавь его в `dependencies`, затем обнови `scripts/copy-frontend-deps.js` и запусти `pnpm run copy-frontend-deps`.
- **Расширение CLI**: команды добавляются в `src/cli/cli.js` через `commander`. Успешный вывод — всегда JSON в stdout, ошибки — JSON в stderr + `process.exit(1)`.
- **Линтинг**: перед коммитом запускай `pnpm run lint:fix`, затем `pnpm run lint`.
