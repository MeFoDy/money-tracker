import { renderDoughnut, renderIncomeExpenseLine, renderPeriodComparisonBar } from './charts.js';
import { formatDate as fmtDate } from './utils.js';

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => {
    // Chart.js instances must NOT be stored in Alpine reactive state
    // because Chart.js objects contain cyclic references and complex
    // structures that cause infinite recursion when wrapped in Proxy.
    let chartInstances = {};

    return {
      page: 'dashboard',
      summary: { totalTx: 0, totalIncome: 0, totalExpense: 0, uncategorized: 0 },
      kpi: { balance: 0, income: 0, incomeDelta: 0, incomeDeltaPercent: 0, expense: 0, expenseDelta: 0, expenseDeltaPercent: 0, topCategory: { name: '—', total: 0 }, transactionCount: 0 },
      periodStats: { income: 0, expense: 0 },
      transactions: { rows: [], total: 0, limit: 50, offset: 0 },
      categories: [],
      categoryMap: {},
      accounts: [],
      accountMap: {},
      filters: { from: '', to: '', accountId: '', categoryId: '', search: '' },
      dashFilters: { period: '3months', from: '', to: '', accountId: '', categoryIds: [], txType: 'all' },
      groupBy: 'month',
      selectedIds: [],
      bulkCategoryId: '',
      newCategoryName: '',
      newCategoryColor: '#ef4444',
      categoryColors: [
        { name: 'Красный', value: '#ef4444' },
        { name: 'Оранжевый', value: '#f97316' },
        { name: 'Зелёный', value: '#22c55e' },
        { name: 'Голубой', value: '#06b6d4' },
        { name: 'Синий', value: '#3b82f6' },
        { name: 'Фиолетовый', value: '#8b5cf6' }
      ],
      uploadResult: null,
      uploadPreview: { transactions: [], stats: {} },
      isPreviewMode: false,
      categoryRules: [],
      currencies: [],
      ruleDrawer: { open: false, mode: 'create', rule: { id: null, categoryId: '', descriptionPattern: '', minAmount: '', maxAmount: '', accountId: '', currency: '', priority: 0, isActive: true } },
      txMenuOpen: null,
      drawer: { open: false, title: '', transactions: [] },
      lineHidden: { income: false, expense: false, balance: false },
      categoryDropdownOpen: false,
      drawerSort: { column: 'tx_date', direction: 'desc' },
      drawerSearch: '',
      heatmapMode: 'expense',
      _abortControllers: {},
      formatDate: fmtDate,
      isLoading: false,
      accountEdit: { id: null, comment: '' },

    async initApp() {
      this.loadPageFromUrl();
      await this.loadAccounts();
      await this.loadCategories();
      await this.loadCurrencies();
      this.loadDashFiltersFromUrl();
      if (this.dashFilters.period === 'all') {
        if (!this.dashFilters.from || !this.dashFilters.to) {
          const range = await this.api('/analytics/date-range');
          this.dashFilters.from = range.min || '';
          this.dashFilters.to = range.max || '';
        }
      } else {
        await this.applyDashPeriod(false);
      }
      this.$watch('page', async (value) => {
        switch (value) {
          case 'dashboard': {
            await this.loadDashboard();
            break;
          }
          case 'transactions': {
            await this.loadTransactions();
            break;
          }
          case 'categories': {
            await this.loadCategoryRules();
            break;
          }
        }
      });
      if (this.page === 'dashboard') await this.loadDashboard();
      if (this.page === 'transactions') {
        this.loadFiltersFromUrl();
        await this.loadTransactions();
      }
      if (this.page === 'categories') await this.loadCategoryRules();
      globalThis.addEventListener('popstate', () => {
        this.loadPageFromUrl();
      });
    },

    navigateTo(page) {
      if (this.page === page) return;
      // Sync date range between dashboard and transactions before switching
      if (this.page === 'transactions' && page === 'dashboard' && (this.filters.from || this.filters.to)) {
        this.dashFilters.from = this.filters.from;
        this.dashFilters.to = this.filters.to;
        this.dashFilters.period = 'custom';
      } else if (this.page === 'dashboard' && page === 'transactions' && (this.dashFilters.from || this.dashFilters.to)) {
        this.filters.from = this.dashFilters.from;
        this.filters.to = this.dashFilters.to;
      }
      this.page = page;
      const url = new URL(globalThis.location.href);
      if (page !== 'dashboard') {
        const dashKeys = ['period', 'from', 'to', 'accountId', 'txType', 'categoryIds', 'groupBy'];
        for (const key of dashKeys) {
          url.searchParams.delete(key);
        }
      }
      if (page !== 'transactions') {
        const txKeys = ['from', 'to', 'accountId', 'categoryId', 'search'];
        for (const key of txKeys) {
          url.searchParams.delete(key);
        }
      }
      url.searchParams.set('page', page);
      globalThis.history.pushState({}, '', url);
    },

    loadPageFromUrl() {
      const url = new URL(globalThis.location.href);
      const page = url.searchParams.get('page');
      const allowed = ['dashboard', 'transactions', 'categories', 'accounts', 'upload'];
      if (page && allowed.includes(page)) {
        this.page = page;
      }
    },

    async api(path, opts = {}) {
      const res = await fetch('api' + path, {
        headers: { 'Content-Type': 'application/json' },
        ...opts
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('API error', path, err);
        throw new Error(err.error || 'API error');
      }
      return res.json();
    },

    buildDashQuery() {
      const q = new URLSearchParams();
      if (this.dashFilters.from) q.set('from', this.dashFilters.from);
      if (this.dashFilters.to) q.set('to', this.dashFilters.to);
      if (this.dashFilters.accountId) q.set('accountId', this.dashFilters.accountId);
      if (this.dashFilters.txType && this.dashFilters.txType !== 'all') q.set('type', this.dashFilters.txType);
      if (this.dashFilters.categoryIds?.length > 0) q.set('categoryIds', this.dashFilters.categoryIds.join(','));
      return q;
    },

    syncDashFiltersToUrl() {
      const url = new URL(globalThis.location.href);
      const keys = ['period', 'from', 'to', 'accountId', 'txType'];
      for (const key of keys) {
        if (this.dashFilters[key]) {
          url.searchParams.set(key, this.dashFilters[key]);
        } else {
          url.searchParams.delete(key);
        }
      }
      if (this.dashFilters.categoryIds?.length > 0) {
        url.searchParams.set('categoryIds', this.dashFilters.categoryIds.join(','));
      } else {
        url.searchParams.delete('categoryIds');
      }
      if (this.groupBy === 'month') {
        url.searchParams.delete('groupBy');
      } else {
        url.searchParams.set('groupBy', this.groupBy);
      }
      globalThis.history.replaceState({}, '', url);
    },

    loadDashFiltersFromUrl() {
      const url = new URL(globalThis.location.href);
      const period = url.searchParams.get('period');
      if (period) this.dashFilters.period = period;
      const f = url.searchParams.get('from');
      if (f) this.dashFilters.from = f;
      const t = url.searchParams.get('to');
      if (t) this.dashFilters.to = t;
      const aid = url.searchParams.get('accountId');
      if (aid) this.dashFilters.accountId = aid;
      const txType = url.searchParams.get('txType');
      if (txType) this.dashFilters.txType = txType;
      const cids = url.searchParams.get('categoryIds');
      if (cids) this.dashFilters.categoryIds = cids.split(',').map(Number);
      const gb = url.searchParams.get('groupBy');
      if (gb) this.groupBy = gb;
    },

    loadFiltersFromUrl() {
      const url = new URL(globalThis.location.href);
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const accountId = url.searchParams.get('accountId');
      const categoryId = url.searchParams.get('categoryId');
      const search = url.searchParams.get('search');
      if (from) this.filters.from = from;
      if (to) this.filters.to = to;
      if (accountId !== null) this.filters.accountId = accountId;
      if (categoryId !== null) this.filters.categoryId = categoryId;
      if (search !== null) this.filters.search = search;
    },

    syncFiltersToUrl() {
      const url = new URL(globalThis.location.href);
      const txKeys = ['from', 'to', 'accountId', 'categoryId', 'search'];
      for (const key of txKeys) {
        if (this.filters[key]) {
          url.searchParams.set(key, this.filters[key]);
        } else {
          url.searchParams.delete(key);
        }
      }
      globalThis.history.replaceState({}, '', url);
    },

    onDashDateChange() {
      this.dashFilters.period = 'custom';
      this.loadDashboard();
    },

    async applyDashPeriod(shouldLoad = true) {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      let from;
      switch (this.dashFilters.period) {
        case 'month': {
          from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 10);
          break;
        }
        case 'all': {
          const range = await this.api('/analytics/date-range');
          this.dashFilters.from = range.min || '';
          this.dashFilters.to = range.max || '';
          if (shouldLoad) this.loadDashboard();
          return;
        }
        case 'custom': {
          // keep existing dates
          if (shouldLoad) this.loadDashboard();
          return;
        }
        default: {
          from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().slice(0, 10);
          break;
        }
      }
      this.dashFilters.from = from;
      this.dashFilters.to = this.dashFilters.period === 'all' ? '' : today;
      if (shouldLoad) this.loadDashboard();
    },

    resetDashFilters() {
      this.dashFilters = { period: '3months', from: '', to: '', accountId: '', categoryIds: [], txType: 'all' };
      this.groupBy = 'month';
      this.applyDashPeriod();
    },

    async loadDashboard() {
      this._abortControllers.dashboard?.abort();
      const controller = new AbortController();
      this._abortControllers.dashboard = controller;
      this.isLoading = true;
      const q = this.buildDashQuery();
      try {
        this.kpi = await this.api('/analytics/kpi?' + q.toString(), { signal: controller.signal });
        const ie = await this.api(`/analytics/income-expense-over-time?groupBy=${this.groupBy}&` + q.toString(), { signal: controller.signal });
        const spending = await this.api('/analytics/spending-by-category?type=expense&' + q.toString(), { signal: controller.signal });
        const comparison = await this.api('/analytics/period-comparison?type=expense&' + q.toString(), { signal: controller.signal });
        const heatmap = await this.api('/analytics/heatmap?mode=' + this.heatmapMode + '&' + q.toString(), { signal: controller.signal });
        await this.$nextTick();
        this.renderDashboardCharts(ie, spending, comparison, heatmap);
        this.syncDashFiltersToUrl();
      } catch (error) {
        if (error.name !== 'AbortError') throw error;
      } finally {
        this.isLoading = false;
      }
    },

    renderDashboardCharts(ie, spending, comparison, heatmap) {
      this.destroyCharts();
      if (ie.length > 0) {
        chartInstances.ie = renderIncomeExpenseLine('chart-income-expense', ie, {
          onClick: (index, item) => this.openDrawerForPeriod(item),
          formatLabel: (period) => this.formatPeriodLabel(period, this.groupBy)
        });
        this.applyLineVisibility();
      }
      if (spending.length > 0) {
        const labels = spending.map(s => s.name);
        const data = spending.map(s => s.total);
        const colors = spending.map(s => s.color || randomColor());
        const categoryIds = spending.map(s => s.category_id);
        chartInstances.cat = renderDoughnut('chart-categories', labels, data, colors, categoryIds, {
          onClick: (index, item) => this.openDrawerForCategory(item)
        });
      }
      if (comparison.length > 0) {
        chartInstances.comp = renderPeriodComparisonBar('chart-comparison', comparison, {
          onClick: (index, item) => this.openDrawerForComparison(item)
        });
      }
      if (heatmap.length > 0) {
        this.renderHeatmap(heatmap);
      }
    },

    renderHeatmap(data) {
      const container = document.querySelector('#heatmap-grid');
      if (!container) return;
      this._removeHeatmapTooltip?.();
      const frag = document.createDocumentFragment();
      const maxValue = Math.max(...data.map(d => d.value), 1);
      const mode = this.heatmapMode;
      const colorMap = {
        expense: '244, 63, 94',
        income: '34, 197, 94',
        count: '59, 130, 246',
      };
      const rgb = colorMap[mode] || colorMap.expense;
      const modeLabel = { expense: 'Расходы', income: 'Доходы', count: 'Операций' };
      const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

      // Index by date (normalized to YYYY-MM-DD)
      const byDate = {};
      for (const item of data) {
        const key = item.date.slice(0, 10);
        byDate[key] = item;
      }

      // Group by month (YYYY-MM)
      const months = [...new Set(data.map(d => d.date.slice(0, 7)))].toSorted();

      for (const monthKey of months) {
        const [year, month] = monthKey.split('-').map(Number);
        const monthName = `${monthNames[month - 1]} ${year}`;

        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        const jsDayOfWeek = firstDay.getDay(); // 0=Sun
        const mondayBasedDay = (jsDayOfWeek + 6) % 7; // 0=Mon

        const totalCells = mondayBasedDay + daysInMonth;
        const weeksCount = Math.ceil(totalCells / 7);

        const monthBlock = document.createElement('div');
        monthBlock.className = 'heatmap-month';

        const header = document.createElement('div');
        header.className = 'heatmap-month-header';
        header.textContent = monthName;
        monthBlock.append(header);

        const grid = document.createElement('div');
        grid.className = 'heatmap-month-grid';

        // Rows for each day of week (Mon-Sun)
        for (let d = 0; d < 7; d++) {
          const row = document.createElement('div');
          row.className = 'heatmap-row';
          const dayLabel = document.createElement('div');
          dayLabel.className = 'heatmap-day-label';
          dayLabel.textContent = dayNames[d];
          row.append(dayLabel);

          for (let w = 0; w < weeksCount; w++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            const dayNumber = w * 7 + d - mondayBasedDay + 1;

            if (dayNumber >= 1 && dayNumber <= daysInMonth) {
              const dateStr = `${monthKey}-${String(dayNumber).padStart(2, '0')}`;
              const item = byDate[dateStr];
              cell.textContent = dayNumber;

              if (item) {
                const intensity = item.value / maxValue;
                cell.style.backgroundColor = `rgba(${rgb}, ${0.15 + intensity * 0.7})`;
                cell.dataset.date = dateStr;
                cell.dataset.rawValue = String(item.value);
                cell.dataset.count = String(item.count || 1);
                cell.dataset.profit = String(item.profit || 0);
                cell.dataset.day = dayNames[d];
                cell.dataset.modeLabel = modeLabel[mode] || '';
                cell.addEventListener('click', () => this.openDrawerForDay(dateStr));
              } else {
                cell.style.backgroundColor = 'transparent';
                cell.style.cursor = 'default';
              }
            } else {
              cell.style.backgroundColor = 'transparent';
              cell.style.cursor = 'default';
            }
            row.append(cell);
          }
          grid.append(row);
        }
        monthBlock.append(grid);
        frag.append(monthBlock);
      }

      container.replaceChildren(frag);
      this._attachHeatmapTooltip(container, mode, rgb, maxValue);
    },

    _attachHeatmapTooltip(container, mode, rgb, maxValue) {
      const modeLabel = { expense: 'Расходы', income: 'Доходы', count: 'Операций' };
      let tooltip = document.querySelector('.heatmap-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'heatmap-tooltip';
        document.body.append(tooltip);
      }

      const show = (e) => {
        const cell = e.target.closest('.heatmap-cell');
        if (!cell || !cell.dataset.date) return;
        const date = cell.dataset.date;
        const rawValue = cell.dataset.rawValue;
        const count = cell.dataset.count;
        const profit = cell.dataset.profit;
        const day = cell.dataset.day;
        const formattedValue = this.formatMoney(rawValue);
        const formattedProfit = this.formatMoney(profit);
        const intensity = ((Number.parseFloat(rawValue) / maxValue) * 100).toFixed(0);

        let rows = `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Дата</span><span>${fmtDate(date)} (${day})</span></div>`;

        if (mode === 'count') {
          rows += `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Прибыль</span><span class="heatmap-tooltip-value">${formattedProfit}</span></div>`;
          rows += `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Операций</span><span>${count}</span></div>`;
        } else {
          rows += `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">${modeLabel[mode]}</span><span class="heatmap-tooltip-value" style="color: rgb(${rgb})">${formattedValue}</span></div>`;
          rows += `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Операций</span><span>${count}</span></div>`;
        }

        rows += `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Интенсивность</span><span>${intensity}%</span></div>`;

        tooltip.innerHTML = rows;
        tooltip.classList.add('visible');
        this._positionTooltip(tooltip, e);
      };

      const move = (e) => {
        if (!tooltip.classList.contains('visible')) return;
        this._positionTooltip(tooltip, e);
      };

      const hide = () => {
        tooltip.classList.remove('visible');
      };

      container.addEventListener('mouseover', show);
      container.addEventListener('mousemove', move);
      container.addEventListener('mouseout', hide);

      this._removeHeatmapTooltip = () => {
        hide();
        container.removeEventListener('mouseover', show);
        container.removeEventListener('mousemove', move);
        container.removeEventListener('mouseout', hide);
      };
    },

    _positionTooltip(tooltip, e) {
      const pad = 12;
      let left = e.clientX + pad;
      let top = e.clientY + pad;
      const rect = tooltip.getBoundingClientRect();
      if (left + rect.width > window.innerWidth) left = e.clientX - rect.width - pad;
      if (top + rect.height > window.innerHeight) top = e.clientY - rect.height - pad;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    },

    setGroupBy(val) {
      if (this.groupBy === val) return;
      this.groupBy = val;
      this.loadDashboard();
    },

    setHeatmapMode(mode) {
      if (this.heatmapMode === mode) return;
      this.heatmapMode = mode;
      this.loadDashboard();
    },

    toggleLineDataset(key) {
      this.lineHidden[key] = !this.lineHidden[key];
      this.applyLineVisibility();
    },

    applyLineVisibility() {
      const chart = chartInstances.ie;
      if (!chart) return;
      chart.data.datasets.forEach((ds, i) => {
        chart.setDatasetVisibility(i, !this.lineHidden[ds.labelKey]);
      });
      chart.update();
    },

    highlightTopCategory() {
      // Will be implemented when chart.js programmatic highlighting is needed
    },

    periodToDateRange(period, groupBy) {
      if (groupBy === 'day') {
        const date = String(period).slice(0, 10);
        return { from: date, to: date };
      }
      if (groupBy === 'month') {
        const [year, month] = period.split('-');
        const from = `${year}-${month}-01`;
        const to = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10);
        return { from, to };
      }
      if (groupBy === 'week') {
        const [year, weekStr] = period.split('-');
        const week = Number(weekStr);
        const jan1 = new Date(Number(year), 0, 1);
        const dayOfWeek = jan1.getDay(); // 0=Sun, 1=Mon, ...
        const daysToMonday = (1 - dayOfWeek + 7) % 7;
        const firstMonday = new Date(Number(year), 0, 1 + daysToMonday);
        if (week === 0) {
          const from = `${year}-01-01`;
          const to = new Date(firstMonday.getTime() - 86_400_000).toISOString().slice(0, 10);
          return { from, to };
        }
        const monday = new Date(firstMonday);
        monday.setDate(firstMonday.getDate() + (week - 1) * 7);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
          from: monday.toISOString().slice(0, 10),
          to: sunday.toISOString().slice(0, 10)
        };
      }
      return { from: period, to: period };
    },

    formatPeriodLabel(period, groupBy) {
      if (groupBy === 'day') return fmtDate(period);
      const { from, to } = this.periodToDateRange(period, groupBy);
      return `${fmtDate(from)} — ${fmtDate(to)}`;
    },

    async openDrawerForPeriod(item) {
      const { from, to } = this.periodToDateRange(item.period, this.groupBy);
      const q = new URLSearchParams();
      q.set('from', from);
      q.set('to', to);
      if (this.dashFilters.accountId) q.set('accountId', this.dashFilters.accountId);
      q.set('limit', '100');
      const data = await this.api('/transactions?' + q.toString());
      const periodLabel = this.formatPeriodLabel(item.period, this.groupBy);
      this.drawer = { open: true, title: `Транзакции за ${periodLabel}`, transactions: data.rows };
      this.drawerSort = { column: 'tx_date', direction: 'desc' };
      this.drawerSearch = '';
    },

    async openDrawerForCategory(item) {
      const q = new URLSearchParams();
      if (this.dashFilters.from) q.set('from', this.dashFilters.from);
      if (this.dashFilters.to) q.set('to', this.dashFilters.to);
      if (this.dashFilters.accountId) q.set('accountId', this.dashFilters.accountId);
      if (item.category_id !== undefined && item.category_id !== null) q.set('categoryId', item.category_id);
      else q.set('categoryId', 'null');
      q.set('limit', '100');
      const data = await this.api('/transactions?' + q.toString());
      this.drawer = { open: true, title: `Транзакции: ${item.name}`, transactions: data.rows };
      this.drawerSort = { column: 'tx_date', direction: 'desc' };
      this.drawerSearch = '';
    },

    async openDrawerForComparison(item) {
      const q = new URLSearchParams();
      if (this.dashFilters.from) q.set('from', this.dashFilters.from);
      if (this.dashFilters.to) q.set('to', this.dashFilters.to);
      if (this.dashFilters.accountId) q.set('accountId', this.dashFilters.accountId);
      if (item.category_id !== undefined && item.category_id !== null) q.set('categoryId', item.category_id);
      else q.set('categoryId', 'null');
      q.set('type', 'expense');
      q.set('limit', '100');
      const data = await this.api('/transactions?' + q.toString());
      this.drawer = { open: true, title: `Транзакции: ${item.name}`, transactions: data.rows };
      this.drawerSort = { column: 'tx_date', direction: 'desc' };
      this.drawerSearch = '';
    },

    async openDrawerForDay(date) {
      const q = new URLSearchParams();
      q.set('from', date);
      q.set('to', date);
      if (this.dashFilters.accountId) q.set('accountId', this.dashFilters.accountId);
      q.set('limit', '100');
      const data = await this.api('/transactions?' + q.toString());
      this.drawer = { open: true, title: `Транзакции за ${fmtDate(date)}`, transactions: data.rows };
      this.drawerSort = { column: 'tx_date', direction: 'desc' };
      this.drawerSearch = '';
    },

    closeDrawer() {
      this.drawer.open = false;
    },

    get sortedDrawerTransactions() {
      let rows = [...this.drawer.transactions];
      if (this.drawerSearch.trim()) {
        const s = this.drawerSearch.trim().toLowerCase();
        rows = rows.filter(tx => (tx.description || '').toLowerCase().includes(s));
      }
      const col = this.drawerSort.column;
      const dir = this.drawerSort.direction === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        let av = a[col];
        let bv = b[col];
        if (col === 'amount') {
          av = Number(av || 0);
          bv = Number(bv || 0);
        } else if (col === 'category') {
          av = this.categoryMap[a.category_id]?.name || '';
          bv = this.categoryMap[b.category_id]?.name || '';
        } else {
          av = (av || '').toString().toLowerCase();
          bv = (bv || '').toString().toLowerCase();
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
      return rows;
    },

    sortDrawer(column) {
      if (this.drawerSort.column === column) {
        this.drawerSort.direction = this.drawerSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        this.drawerSort.column = column;
        this.drawerSort.direction = 'desc';
      }
    },

    toggleCategoryDropdown() {
      this.categoryDropdownOpen = !this.categoryDropdownOpen;
    },

    destroyCharts() {
      Object.values(chartInstances).forEach(c => {
        if (c && typeof c.destroy === 'function') {
          c.stop?.();
          c.destroy();
        }
      });
      chartInstances = {};
    },

      get periodLabel() {
        if (this.filters.from && this.filters.to) {
          return `${this.formatDate(this.filters.from)} — ${this.formatDate(this.filters.to)}`;
        }
        return '(период)';
      },

      async loadTransactions() {
        this._abortControllers.transactions?.abort();
        const controller = new AbortController();
        this._abortControllers.transactions = controller;
        this.isLoading = true;

        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        if (!this.filters.from) this.filters.from = threeMonthsAgo.toISOString().slice(0, 10);
        if (!this.filters.to) this.filters.to = now.toISOString().slice(0, 10);

        const from = this.filters.from;
        const to = this.filters.to;

        const q = new URLSearchParams();
        q.set('from', from);
        q.set('to', to);
        if (this.filters.accountId) q.set('accountId', this.filters.accountId);
        if (this.filters.categoryId !== '') q.set('categoryId', this.filters.categoryId);
        if (this.filters.search) q.set('search', this.filters.search);
        q.set('limit', this.transactions.limit);
        q.set('offset', this.transactions.offset);

        const sq = new URLSearchParams();
        sq.set('from', from);
        sq.set('to', to);
        if (this.filters.accountId) sq.set('accountId', this.filters.accountId);
        if (this.filters.categoryId !== '') sq.set('categoryId', this.filters.categoryId);
        if (this.filters.search) sq.set('search', this.filters.search);

        try {
          this.transactions = await this.api('/transactions?' + q.toString(), { signal: controller.signal });
          this.selectedIds = [];
          this.periodStats = await this.api('/analytics/period-summary?' + sq.toString(), { signal: controller.signal });
          this.syncFiltersToUrl();
        } catch (error) {
          if (error.name !== 'AbortError') throw error;
        } finally {
          this.isLoading = false;
        }
      },

    resetFilters() {
      this.filters = { from: '', to: '', accountId: '', categoryId: '', search: '' };
      this.transactions.offset = 0;
      const url = new URL(globalThis.location.href);
      const txKeys = ['from', 'to', 'accountId', 'categoryId', 'search'];
      for (const key of txKeys) {
        url.searchParams.delete(key);
      }
      globalThis.history.replaceState({}, '', url);
      this.loadTransactions();
    },

    nextPage() {
      this.transactions.offset += this.transactions.limit;
      this.loadTransactions();
    },

    prevPage() {
      this.transactions.offset = Math.max(0, this.transactions.offset - this.transactions.limit);
      this.loadTransactions();
    },

    toggleSelectAll(checked) {
      this.selectedIds = checked ? this.transactions.rows.map(r => r.id) : [];
    },

    async applyBulkCategory() {
      if (!this.bulkCategoryId) return;
      const categoryId = Number(this.bulkCategoryId);
      const ids = [...this.selectedIds];
      // Optimistic update
      for (const tx of this.transactions.rows) {
        if (ids.includes(tx.id)) tx.category_id = categoryId;
      }
      this.selectedIds = [];
      this.bulkCategoryId = '';
      try {
        await this.api('/transactions/bulk', {
          method: 'PATCH',
          body: JSON.stringify({ ids, categoryId })
        });
      } catch (error) {
        // Rollback on error
        await this.loadTransactions();
        throw error;
      }
    },

    async updateTxCategory(id, val) {
      const categoryId = val === '' ? null : Number(val);
      const tx = this.transactions.rows.find(t => t.id === id);
      const oldCategoryId = tx?.category_id;
      if (tx) tx.category_id = categoryId;
      try {
        await this.api('/transactions/bulk', {
          method: 'PATCH',
          body: JSON.stringify({ ids: [Number(id)], categoryId })
        });
      } catch (error) {
        if (tx) tx.category_id = oldCategoryId;
        throw error;
      }
    },

    async loadCategories() {
      const data = await this.api('/categories');
      this.categories = data.categories;
      this.categoryMap = Object.fromEntries(this.categories.map(c => [c.id, c]));
    },

    async updateCategoryColor(id, color) {
      const cat = this.categoryMap[id];
      if (!cat || cat.color === color) return;
      await this.api('/categories/' + id, {
        method: 'PUT',
        body: JSON.stringify({ name: cat.name, color })
      });
      await this.loadCategories();
    },

    async loadAccounts() {
      this.accounts = await this.api('/accounts');
      this.accountMap = Object.fromEntries(this.accounts.map(a => [a.id, a]));
    },

    accLabel(acc) {
      const base = acc.name || acc.account_number;
      return acc.comment ? `${base} — ${acc.comment}` : base;
    },

    startEditAccount(acc) {
      this.accountEdit = { id: acc.id, comment: acc.comment || '' };
    },

    cancelEditAccount() {
      this.accountEdit = { id: null, comment: '' };
    },

    async saveAccountComment(acc) {
      const comment = this.accountEdit.comment.trim() || null;
      await this.api('/accounts/' + acc.id, {
        method: 'PATCH',
        body: JSON.stringify({ comment })
      });
      this.accountEdit = { id: null, comment: '' };
      await this.loadAccounts();
    },

    showAccTooltip(event, accountId) {
      const acc = this.accountMap[accountId];
      if (!acc) return;
      const tooltip = this.$refs.accTooltip;
      if (!tooltip) return;
      tooltip.innerHTML =
        `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Счёт</span><span>${acc.account_number}</span></div>` +
        (acc.name ? `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Название</span><span>${acc.name}</span></div>` : '') +
        (acc.comment ? `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Комментарий</span><span class="heatmap-tooltip-value">${acc.comment}</span></div>` : '') +
        `<div class="heatmap-tooltip-row"><span class="heatmap-tooltip-label">Валюта</span><span>${acc.currency}</span></div>`;
      tooltip.classList.add('visible');
      this._positionTooltip(tooltip, event);
    },

    hideAccTooltip() {
      const tooltip = this.$refs.accTooltip;
      if (tooltip) tooltip.classList.remove('visible');
    },

    async addCategory() {
      if (!this.newCategoryName.trim()) return;
      await this.api('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: this.newCategoryName.trim(), color: this.newCategoryColor })
      });
      this.newCategoryName = '';
      await this.loadCategories();
    },

    async deleteCategory(id) {
      if (!confirm('Удалить категорию?')) return;
      await this.api('/categories/' + id, { method: 'DELETE' });
      await this.loadCategories();
    },

    async handleDrop(event) {
      const files = event.dataTransfer.files;
      if (files.length > 0) await this.uploadFile(files[0]);
    },

    async handleFileSelect(event) {
      const files = event.target.files;
      if (files.length > 0) await this.uploadFile(files[0]);
    },

    async uploadFile(file) {
      this.uploadResult = null;
      this.isPreviewMode = false;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('api/upload/preview', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        console.error('Upload preview error', data);
        throw new Error(data.error || 'Upload preview failed');
      }
      this.uploadPreview = data;
      this.isPreviewMode = true;
    },

    async confirmUpload() {
      const res = await fetch('api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: this.uploadPreview.transactions,
          originalFilename: this.uploadPreview.originalFilename
        })
      });
      this.uploadResult = await res.json();
      this.isPreviewMode = false;
      this.uploadPreview = { transactions: [], stats: {} };
      if (this.page === 'dashboard') await this.loadDashboard();
    },

    cancelUpload() {
      this.isPreviewMode = false;
      this.uploadPreview = { transactions: [], stats: {} };
    },

    updatePreviewCategory(index, categoryId) {
      const tx = this.uploadPreview.transactions[index];
      if (tx) tx.finalCategoryId = categoryId === '' ? null : Number(categoryId);
    },

    async loadCurrencies() {
      const data = await this.api('/accounts/currencies');
      this.currencies = data.currencies;
    },

    currencyLabel(code) {
      const symbols = { BYN: 'Br', RUB: '₽', USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥', CHF: '₣', PLN: 'zł', UAH: '₴', KZT: '₸' };
      const symbol = symbols[String(code).toUpperCase()];
      return symbol ? `${code} / ${symbol}` : code;
    },

    async loadCategoryRules() {
      const data = await this.api('/category-rules');
      this.categoryRules = data.rules;
    },

    async saveCategoryRule() {
      const rule = this.ruleDrawer.rule;
      if (!rule.categoryId) return;
      const payload = {
        categoryId: Number(rule.categoryId),
        descriptionPattern: rule.descriptionPattern || null,
        minAmount: rule.minAmount === '' || rule.minAmount === null || rule.minAmount === undefined ? null : Number(rule.minAmount),
        maxAmount: rule.maxAmount === '' || rule.maxAmount === null || rule.maxAmount === undefined ? null : Number(rule.maxAmount),
        accountId: rule.accountId ? Number(rule.accountId) : null,
        currency: rule.currency || null,
        priority: Number(rule.priority) || 0,
        isActive: Boolean(rule.isActive)
      };
      await (this.ruleDrawer.mode === 'edit' && rule.id ? this.api('/category-rules/' + rule.id, {
          method: 'PUT',
          body: JSON.stringify(payload)
        }) : this.api('/category-rules', {
          method: 'POST',
          body: JSON.stringify(payload)
        }));
      this.closeRuleDrawer();
      await this.loadCategoryRules();
    },

    openRuleDrawer(rule = null) {
      if (this.drawer.open) this.closeDrawer();
      this.ruleDrawer = rule ? {
          open: true,
          mode: 'edit',
          rule: {
            id: rule.id,
            categoryId: String(rule.categoryId || ''),
            descriptionPattern: rule.descriptionPattern || '',
            minAmount: rule.minAmount !== null && rule.minAmount !== undefined ? String(rule.minAmount) : '',
            maxAmount: rule.maxAmount !== null && rule.maxAmount !== undefined ? String(rule.maxAmount) : '',
            accountId: String(rule.accountId || ''),
            currency: rule.currency || '',
            priority: rule.priority ?? 0,
            isActive: Boolean(rule.isActive)
          }
        } : {
          open: true,
          mode: 'create',
          rule: { id: null, categoryId: '', descriptionPattern: '', minAmount: '', maxAmount: '', accountId: '', currency: '', priority: 0, isActive: true }
        };
    },

    closeRuleDrawer() {
      this.ruleDrawer.open = false;
    },

    openRuleDrawerFromTransaction(tx) {
      if (this.drawer.open) this.closeDrawer();
      this.ruleDrawer = {
        open: true,
        mode: 'create',
        rule: {
          id: null,
          categoryId: String(tx.category_id || ''),
          descriptionPattern: tx.description || '',
          minAmount: '',
          maxAmount: '',
          accountId: String(tx.account_id || ''),
          currency: tx.currency || '',
          priority: 0,
          isActive: true
        }
      };
    },

    async deleteCategoryRule(id) {
      if (!confirm('Удалить правило?')) return;
      await this.api('/category-rules/' + id, { method: 'DELETE' });
      await this.loadCategoryRules();
    },

    async toggleRuleActive(rule) {
      await this.api('/category-rules/' + rule.id, {
        method: 'PUT',
        body: JSON.stringify({
          categoryId: rule.categoryId,
          descriptionPattern: rule.descriptionPattern,
          minAmount: rule.minAmount,
          maxAmount: rule.maxAmount,
          accountId: rule.accountId,
          currency: rule.currency,
          priority: rule.priority,
          isActive: !rule.isActive
        })
      });
      await this.loadCategoryRules();
    },

    formatMoney(n, currency = 'BYN') {
      return new Intl.NumberFormat('ru-BY', { style: 'currency', currency }).format(Number(n || 0));
    },

    formatNum(n) {
      return new Intl.NumberFormat('ru-BY').format(Number(n || 0));
    }
  };

  });
});

function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}
