# Money Tracker

Легковесный трекер финансов на основе банковских выписок CSV. Поддерживает веб-интерфейс (SPA) и CLI-инструмент для интеграции с внешними ботами (например, Hermes Telegram bot).

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
- **Категоризация** — ручная разметка категорий, bulk-операции, правила авто-категоризации по подстроке в описании.
- **Аналитика** — дашборд с интерактивными графиками (расходы по категориям, баланс во времени), фильтры по датам, счетам и категориям.
- **Два entrypoint** — полноценный веб-сервер для пользователей и автономный CLI для ботов/скриптов.
- **Локальные ассеты** — фронтенд работает полностью офлайн, все зависимости (Alpine.js, Chart.js, Pico CSS) раздаются локально.

---

## Технологический стек

| Компонент | Выбор |
|-----------|-------|
| Runtime | Node.js 20+ (ESM) |
| Сервер | Fastify 4.x |
| База данных | SQLite (`better-sqlite3`) |
| SPA фреймворк | Alpine.js 3.x |
| Графики | Chart.js 4.x |
| CSS | Pico CSS 2.x |
| CLI | Commander.js |
| CSV парсер | `csv-parse` + `iconv-lite` |
| Тесты | Node.js built-in test runner (`node --test`) |

---

## Структура проекта

```
money-tracker/
├── package.json
├── AGENTS.md                   # Инструкции для агентов
├── data/
│   └── finance.db              # SQLite БД (gitignored)
├── reports/
│   └── Vpsk_71487962.csv       # Образец выписки
├── scripts/
│   └── copy-frontend-deps.js   # Копирование vendor-зависимостей
├── src/
│   ├── core/                   # Общее ядро (web + cli)
│   │   ├── db.js               # SQLite, миграции, connection
│   │   ├── parser.js           # Парсинг CSV-выписки (windows-1251)
│   │   ├── importer.js         # Импорт с дедупликацией
│   │   ├── repository.js       # CRUD + фильтрация
│   │   ├── categorizer.js      # Правила авто-категоризации
│   │   ├── analytics.js        # Агрегации и отчёты
│   │   └── utils.js            # Утилиты
│   ├── web/
│   │   ├── server.js           # Fastify: static, multipart, SPA fallback
│   │   ├── routes/
│   │   │   ├── index.js        # Регистрация роутов
│   │   │   ├── upload.js       # POST /api/upload
│   │   │   ├── transactions.js # GET /api/transactions, PATCH /api/transactions/bulk
│   │   │   ├── categories.js   # CRUD категорий + правила
│   │   │   ├── accounts.js     # GET /api/accounts
│   │   │   └── analytics.js    # GET /api/analytics/*
│   │   └── public/             # SPA статика
│   │       ├── index.html
│   │       ├── app.js          # Alpine.js логика
│   │       ├── charts.js       # Chart.js обёртки
│   │       ├── style.css
│   │       └── vendor/         # alpinejs.js, chart.js, pico.css
│   └── cli/
│       └── cli.js              # Entrypoint для CLI
└── tests/
    ├── _helper.js              # Временные БД для тестов
    ├── parser.test.js
    ├── importer.test.js
    ├── analytics.test.js
    └── api.test.js
```

---

## Установка

```bash
# Клонирование
npm install

# Копирование фронтенд-зависимостей в public/vendor
npm run copy-frontend-deps
```

Требования: Node.js >= 20.

---

## Запуск

### Веб-сервер

```bash
npm run web
```

Сервер слушает `0.0.0.0:3000` (или порт из `PORT`).
- API доступно по `/api/*`
- SPA раздаётся из `src/web/public/`
- Fallback на `index.html` для клиентского роутинга

### CLI

```bash
npm run cli -- <команда> [опции]
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
- `POST /api/upload` — multipart/form-data с полем `file`. Возвращает `{ imported, duplicatesSkipped, updatedFromPending, uploadId }`.

### Transactions
- `GET /api/transactions?from=&to=&accountId=&categoryId=&search=&limit=50&offset=0&orderBy=tx_date DESC` — список с пагинацией и фильтрами. `categoryId=null` фильтрует некатегоризированные.
- `PATCH /api/transactions/bulk` — body `{ ids: number[], categoryId: number|null }`. Массовое обновление категории.

### Categories
- `GET /api/categories` — `{ categories, rules }`
- `POST /api/categories` — body `{ name, color? }`
- `PUT /api/categories/:id` — body `{ name, color? }`
- `DELETE /api/categories/:id`
- `POST /api/categories/rules` — body `{ categoryId, pattern, priority? }`

### Accounts
- `GET /api/accounts`

### Analytics
- `GET /api/analytics/summary` — `{ totalTx, totalIncome, totalExpense, uncategorized }`
- `GET /api/analytics/spending-by-category?type=expense` — расходы/доходы по категориям
- `GET /api/analytics/monthly-summary` — помесячная сводка
- `GET /api/analytics/top-counterparties?limit=10` — топ контрагентов
- `GET /api/analytics/balance-over-time` — кумулятивный баланс по дням
- `GET /api/analytics/uncategorized-count` — количество некатегоризированных

---

## Архитектура и ключевые решения

### Модульная система
Проект использует **Node.js ESM** (`"type": "module"`). Все импорты — через `import`/`export`.

### Общее ядро (`src/core/`)
Логика работы с данными вынесена в отдельные модули и используется **и веб-сервером, и CLI**. Это гарантирует единообразие поведения при импорте, дедупликации и аналитике.

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

### База данных
SQLite с WAL-режимом. Схема включает:
- `accounts` — счета (автосоздание при импорте);
- `categories` — пользовательские категории;
- `category_rules` — правила авто-категоризации;
- `transactions` — основные операции;
- `pending_transactions` — заблокированные суммы;
- `uploads` — лог загрузок.

### Фронтенд
Легковесное SPA на Alpine.js без сборщика. Chart.js отрисовывает doughnut (расходы по категориям) и line (баланс во времени). Все стили и скрипты — локальные.

---

## Тестирование

```bash
npm test
```

Запускает встроенный test runner Node.js (`node --test`) для всех `*.test.js`:
- `parser.test.js` — парсинг sample CSV, мультивалютность, pending;
- `importer.test.js` — импорт, дедупликация, pending-флаг;
- `analytics.test.js` — агрегации, сортировка, кумулятивный баланс;
- `api.test.js` — интеграционные тесты через `fastify.inject()`.

Тесты используют изолированные временные БД (`tests/_helper.js`).

---

## Разработка / Для LLM-агентов

- **Source of Truth**: исходный код и этот README.
- **Состояние**: проект полностью реализован и протестирован. Все тесты проходят.
- **Без сборщика**: нет Docker, Webpack, Vite и т.д. Фронтенд — нативные JS/CSS.
- **Не коммитить БД**: `data/finance.db` в `.gitignore`.
- **Переменные окружения**:
  - `PORT` — порт веб-сервера (по умолчанию 3000);
  - `DB_PATH` — путь к SQLite (по умолчанию `data/finance.db`).
- **Добавление фронтенд-зависимостей**: если нужен новый npm-пакет для фронта, добавь его в `dependencies`, затем обнови `scripts/copy-frontend-deps.js` и запусти `npm run copy-frontend-deps`.
- **Расширение CLI**: команды добавляются в `src/cli/cli.js` через `commander`. Успешный вывод — всегда JSON в stdout, ошибки — JSON в stderr + `process.exit(1)`.
