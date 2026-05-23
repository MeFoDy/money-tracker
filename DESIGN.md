# Design System — Money Tracker

> Документ для всех агентов, которые работают с UI/UX приложения Money Tracker.
> Обновлять при изменении визуальных решений или добавлении новых экранов.

## 1. Общие принципы дизайна

### 1.1. Философия
- **Dark-first**. Приложение работает только в тёмной теме (`data-theme="dark"`). Светлую тему не поддерживаем.
- **Финансовая ясность**. Цифры — главное. Интерфейс не должен отвлекать от данных.
- **Минимализм**. Нет лишних декоративных элементов, иллюстраций, градиентов на текста (кроме фоновых).
- **Консистентность**. Одинаковые паттерны везде: карточки, таблицы, фильтры, кнопки.

### 1.2. Pico.css как foundation
- Базовые стили берутся из `@picocss/pico` (v2).
- Переопределяем CSS-переменные Pico, а не пишем свои с нуля.
- Не добавляем !important без крайней необходимости.

---

## 2. Цветовая палитра

### 2.1. Фоны
| Токен | Значение | Использование |
|-------|----------|---------------|
| `--bg-body` | `#0b0d12` | Фон страницы |
| `--bg-surface` | `#11141c` | Карточки, таблицы, drawer |
| `--bg-surface-2` | `#161a25` | Шапки таблиц, активные состояния |
| `--bg-elevated` | `#1c2130` | Выпадающие списки, фокус полей |

### 2.2. Текст
| Токен | Значение | Контраст | Использование |
|-------|----------|----------|---------------|
| `--text-primary` | `#e8ecf1` | ~13:1 на `--bg-body` | Заголовки, основной текст |
| `--text-secondary` | `#8b95a8` | ~5:1 | Подписи, метки, второстепенный текст |
| `--text-muted` | `#5c6577` | ~3:1 | Placeholder, disabled, хинты |

### 2.3. Акценты и семантические цвета
| Токен | Значение | Смысл |
|-------|----------|-------|
| `--accent-primary` | `#00d4aa` | Основной акцент: доходы, положительная динамика, фокус |
| `--accent-secondary` | `#0ea5e9` | Информация, баланс, вторичный акцент |
| `--income` | `#00d4aa` | Доходы (↑ прибыль, ↑ рост) |
| `--expense` | `#f43f5e` | Расходы (↑ траты — плохо) |
| `--warn` | `#f59e0b` | Предупреждения, внимание |
| `--success` (из Pico) | `#2ecc71` | Редко; для success-состояний |

> **Правило контраста**: любой текст на фоне должен удовлетворять WCAG AA (4.5:1 для обычного, 3:1 для крупного). Проверять через DevTools Lighthouse.

### 2.4. Правило использования цвета
- **Не использовать цвет как единственный индикатор**. Доходы — зелёный + символ ↑. Расходы — красный + символ ↓.
- Не смешивать семантические цвета: зелёный = всегда хорошо, красный = всегда плохо (в финансовом контексте).

---

## 3. Типографика

### 3.1. Шрифты
- **Основной**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (системный стек).
- **Моноширинный** (для цифр, дат, таблиц): `'SF Mono', 'Fira Code', 'Cascadia Code', monospace`.
- **Размер базовый**: `16px`.

### 3.2. Иерархия
| Элемент | Размер | Вес | Цвет | Дополнительно |
|---------|--------|-----|------|---------------|
| `h1` / brand | - | 700 | `--text-primary` | Логотип |
| `h2` / page-title | `1.5rem` | 700 | `--text-primary` | Заголовок страницы |
| `h3` | `1.25rem` | 600 | `--text-primary` | Секции |
| `h4` / card header | `0.85rem` | 600 | `--text-secondary` | `uppercase`, `letter-spacing: 0.06em` |
| `h5` / chart header | `0.85rem` | 600 | `--text-secondary` | `uppercase`, `letter-spacing: 0.06em` |
| body | `1rem` | 400 | `--text-primary` | base |
| `.big` (KPI) | `2rem` | 700 | — | `letter-spacing: -0.02em` |
| `.small` | `0.8rem` | 500 | `--text-secondary` | Пагинация, дельта |
| `.text-muted` | `0.75rem` | 400 | `--text-muted` | Подписи, пустые состояния |
| nav label | `1.1rem` | 700 | — | Логотип |
| data-cell | `0.85rem` | 400 | — | Ячейка таблицы |
| table header | `0.75rem` | 600 | `--text-secondary` | `uppercase`, `letter-spacing: 0.06em` |

> **Правило**: заголовки страниц — `h2` (нет `h1` на странице, кроме brand). Карточки используют `h4`/`h5`.

---

## 4. Компоненты

### 4.1. Карточки (`article`, `.card-glow`)
```css
background: var(--bg-surface);
border: 1px solid var(--border-color);
border-radius: var(--radius-md); /* 12px */
box-shadow: var(--shadow-md); /* 0 4px 16px rgba(0,0,0,0.4) */
```
- **Ховер**: `translateY(-2px)` + `box-shadow: var(--shadow-glow), var(--shadow-md)` + `border-color: var(--border-hover)`.
- Состояния границ:
  - `.income-border` — зелёная рамка, зелёное свечение.
  - `.expense-border` — красная рамка, красное свечение.
  - `.warn-border` — жёлтая рамка, жёлтое свечение.

### 4.2. Кнопки
| Вариант | Фон | Текст | Граница | Ховер |
|---------|-----|-------|---------|-------|
| Primary (default) | `--accent-primary` | `--bg-body` | none | `--primary-hover` |
| Secondary outline | transparent | `--text-secondary` | `var(--border-hover)` | border + text = `--accent-primary`, bg = `--accent-primary-dim` |
| Outline (disabled) | — | `opacity: 0.4` | — | `cursor: not-allowed` |

- **Размеры**: стандартный (Pico), `.small` — `padding: 0.25rem 0.6rem`, `font-size: 0.8rem`.
- **Эффект**: `translateY(-1px)` + тень при ховере; `translateY(0)` при active.

### 4.3. Фильтры и формы
- **Поля**: `background: var(--bg-surface-2)`, `border: 1px solid var(--border-color)`, `border-radius: var(--radius-sm)`.
- **Фокус**: `outline: 2px solid var(--accent-primary)`, `outline-offset: 2px` (стандарт `:focus-visible`).
- **Placeholder**: `color: var(--text-muted)`.

### 4.4. Таблицы
- Контейнер: `figure.data-table-wrap` с `overflow-x: auto` (критично для mobile!).
- Шапка: `background: var(--bg-surface-2)`, `text-transform: uppercase`, `font-size: 0.75rem`.
- Строки: `border-bottom`, ховер `background: rgba(255,255,255,0.03)`.
- Ячейки: `padding: 0.65rem 1rem`.

### 4.5. Drawer (выдвижная панель)
- Ширина: `min(600px, 90vw)`.
- Позиция: `fixed`, `right: 0`, `z-index: 201`.
- Backdrop: `z-index: 200`, `background: rgba(0,0,0,0.6)`.

### 4.6. Чарты
- Canvas занимает 100% родителя.
- Родитель `.chart-wrap` имеет фиксированную высоту:
  - Обычная: `320px`
  - Широкая: `400px`
- Chart.js настройки: `responsive: true`, `maintainAspectRatio: false`.

---

## 5. Сетка и layout

### 5.1. Основная сетка
- `.container` — `max-width: 1200px` (Pico default), центрирование.
- `.grid` (Pico) — автоколонки на основе контента.
- `.charts-row` — 2 колонки на десктопе, 1 на mobile.

### 5.2. Breakpoints (mobile-first через Pico)
| Breakpoint | Изменения |
|------------|-----------|
| `≤ 1200px` | KPI: `repeat(3, 1fr)` |
| `≤ 768px` | KPI: `repeat(2, 1fr)`, charts: `1fr`, drawer: `100vw`, nav: column, таблица scroll |

> **Важно**: таблицы **всегда** в `figure.data-table-wrap` с `overflow-x: auto`. На mobile широкие таблицы должны скроллиться, а не сжимать контент.

---

## 6. Accessibility (обязательно)

- **Контраст**: минимум 4.5:1 для обычного текста, 3:1 для UI-элементов.
- **Фокус**: `:focus-visible` с `outline: 2px solid var(--accent-primary); outline-offset: 2px`.
- **ARIA**:
  - Навигация: `<nav aria-label="Main">`.
  - Таблицы: `role="grid"` + `scope` для заголовков.
  - Группы радио: `role="group"`.
- **Клавиатура**: все интерактивные элементы доступны через Tab. Drawer закрывается по `Escape`.
- **Tap targets**: минимум `44×44px` на touch-устройствах.
- ** prefers-reduced-motion**: `@media (prefers-reduced-motion: reduce)`: отключить `transform`, `transition`.

---

## 7. Анимации и переходы

- **Длительность**: 150-300ms.
- **Easing**: `ease` или `easeInOutQuart`.
- **Свойства**: `transform`, `box-shadow`, `border-color`, `background`, `opacity`.
- **GPU-friendly**: предпочитать `transform` и `opacity` над `top/left/width/height`.
- **Hover на карточках**: `translateY(-2px)` разрешён, **но** быть внимательным к багам перекрытия (см. баг #1 ниже).

---

## 8. Известные баги и ограничения

### Баг #1: Transform hover на карточках перекрывает выпадающие списки — ✅ FIXED
- **Проблема**: `transform: translateY(-2px)` на `.kpi-card` при hover создаёт новый stacking context, и `.multi-select-dropdown` оказывается «под» соседней карточкой.
- **Решение**: для `.kpi-card:hover` заменён `transform: translateY(-2px)` на `transform: none`, оставлено только усиление тени.
- **Файл**: `style.css` (правило `.kpi-card:hover`).

### Баг #2: Multi-select dropdown не закрывается при клике вне — ✅ FIXED
- **Проблема**: `categoryDropdownOpen` не сбрасывался при клике за пределы dropdown.
- **Решение**: добавлен document click listener в `app.js` (`closeCategoryDropdownOnClickOutside`), который закрывает dropdown при клике вне `.multi-select-wrap`.
- **Файл**: `app.js` (метод `initApp`).

### Баг #3: Нет focus trap в Drawer — ⚠️ NOT FIXED (будущий рефакторинг)
- **Проблема**: Tab-навигация выходит за пределы Drawer.
- **Решение**: полный focus trap требует внедрения `<dialog>` или отдельной JS-библиотеки. В рамках текущего PR это изменение слишком масштабное.
- **Рекомендация**: при рефакторинге перейти на `<dialog>` или использовать `inert` на основном контенте при открытом drawer.

### Баг #4: Таблицы не скроллятся на mobile — ✅ FIXED
- **Проблема**: `figure.data-table-wrap` не имел `overflow-x: auto`, таблица сжимала layout.
- **Решение**: добавлено `overflow-x: auto` и `-webkit-overflow-scrolling: touch` на `.data-table-wrap`.
- **Файл**: `style.css` (правило `.data-table-wrap`).

### Баг #5: Нет `lang` у `<html>` — ✅ FIXED
- **Проблема**: `<html>` не имел атрибута `lang`.
- **Решение**: добавлен `<html lang="ru">`.
- **Файл**: `index.html`.

### Баг #6: Нет `meta description` — ✅ FIXED
- **Проблема**: отсутствовал `<meta name="description">`.
- **Решение**: добавлен.
- **Файл**: `index.html`.

### Баг #7: Нет `<h1>` — ✅ FIXED (частично)
- **Проблема**: на странице не было `<h1>`.
- **Решение**: добавлен `<h1 class="brand-title">` внутри `.brand` в шапке, скрыт визуально через `.visually-hidden` и показан для скринридеров.
- **Файл**: `index.html`, `style.css`.

### Limitation: Нет светлой темы
- Приложение рассчитано только на dark mode. Переключение не предусмотрено.

---

## 9. Asset naming convention
- Файловая структура в `src/web/public/`:
  - `index.html` — единственная HTML-страница (SPA).
  - `style.css` — все кастомные стили.
  - `app.js` — Alpine.js логика.
  - `charts.js` — Chart.js конфигурации.
  - `vendor/` — скопированные зависимости из `node_modules`.

---

## 10. Примеры типичных блоков

### KPI Card
```html
<article class="card-glow kpi-card">
  <header><h5>Доходы</h5></header>
  <p class="big income" x-text="formatMoney(kpi.income)"></p>
  <p class="kpi-delta delta-positive">↑ 12%</p>
</article>
```

### Filter Row
```html
<div class="filters grid">
  <input type="date" x-model="filters.from">
  <select x-model="filters.accountId">
    <option value="">Все счета</option>
  </select>
  <button class="secondary outline" @click="resetFilters()">Сбросить</button>
</div>
```

### Data Table
```html
<figure class="data-table-wrap">
  <table role="grid" class="data-table">
    <thead>
      <tr>
        <th scope="col">Дата</th>
        <th scope="col">Описание</th>
        <th scope="col" class="text-right">Сумма</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>...</td><td>...</td><td class="text-right expense">...</td></tr>
    </tbody>
  </table>
</figure>
```

---

*Последнее обновление: 2026-05-23*
