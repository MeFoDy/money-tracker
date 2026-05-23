import { renderDoughnut, renderIncomeExpenseLine, renderPeriodComparisonBar } from './charts.js';

let chartInstances = {};

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
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
    drawer: { open: false, title: '', transactions: [] },
    lineHidden: { income: false, expense: false, balance: false },
    categoryDropdownOpen: false,
    drawerSort: { column: 'tx_date', direction: 'desc' },
    drawerSearch: '',
    heatmapMode: 'expense',

    async initApp() {
      await this.loadAccounts();
      await this.loadCategories();
      this.loadDashFiltersFromUrl();
      this.applyDashPeriod(false);
      this.$watch('page', async (value) => {
        if (value === 'dashboard') {
          await this.loadDashboard();
        } else if (value === 'transactions') {
          await this.loadTransactions();
        }
      });
      if (this.page === 'dashboard') await this.loadDashboard();
      if (this.page === 'transactions') await this.loadTransactions();
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

    async loadDashboard() {
      const q = this.buildDashQuery();
      this.kpi = await this.api('/analytics/kpi?' + q.toString());
      const ie = await this.api(`/analytics/income-expense-over-time?groupBy=${this.groupBy}&` + q.toString());
      const spending = await this.api('/analytics/spending-by-category?type=expense&' + q.toString());
      const comparison = await this.api('/analytics/period-comparison?type=expense&' + q.toString());
      const heatmap = await this.api('/analytics/heatmap?mode=' + this.heatmapMode + '&' + q.toString());
      await this.$nextTick();
      this.renderDashboardCharts(ie, spending, comparison, heatmap);
      this.syncDashFiltersToUrl();
    },

    renderDashboardCharts(ie, spending, comparison, heatmap) {
      this.destroyCharts();
      if (ie.length > 0) {
        chartInstances.ie = renderIncomeExpenseLine('chart-income-expense', ie, {
          onClick: (index, item) => this.openDrawerForPeriod(item)
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
        chartInstances.comp = renderPeriodComparisonBar('chart-comparison', comparison);
      }
      if (heatmap.length > 0) {
        this.renderHeatmap(heatmap);
      }
    },

    renderHeatmap(data) {
      const container = document.querySelector('#heatmap-grid');
      if (!container) return;
      container.innerHTML = '';
      const maxValue = Math.max(...data.map(d => d.value), 1);
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const headerRow = document.createElement('div');
      headerRow.className = 'heatmap-row heatmap-header';
      for (const d of dayNames) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.textContent = d;
        headerRow.append(cell);
      }
      container.append(headerRow);
      const weeks = {};
      for (const item of data) {
        if (!weeks[item.week]) weeks[item.week] = {};
        weeks[item.week][item.dayOfWeek] = item;
      }
      for (const week of Object.keys(weeks).toSorted()) {
        const row = document.createElement('div');
        row.className = 'heatmap-row';
        for (let d = 0; d < 7; d++) {
          const cell = document.createElement('div');
          cell.className = 'heatmap-cell';
          const item = weeks[week][d];
          if (item) {
            const intensity = item.value / maxValue;
            cell.style.backgroundColor = `rgba(244, 63, 94, ${0.15 + intensity * 0.7})`;
            cell.title = `${item.date}: ${this.formatMoney(item.value)}`;
            cell.addEventListener('click', () => this.openDrawerForDay(item.date));
          }
          row.append(cell);
        }
        container.append(row);
      }
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

    async openDrawerForPeriod(item) {
      const q = new URLSearchParams();
      q.set('from', item.period);
      q.set('to', item.period);
      if (this.dashFilters.accountId) q.set('accountId', this.dashFilters.accountId);
      q.set('limit', '100');
      const data = await this.api('/transactions?' + q.toString());
      this.drawer = { open: true, title: `Транзакции за ${item.period}`, transactions: data.rows };
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

    async openDrawerForDay(date) {
      const q = new URLSearchParams();
      q.set('from', date);
      q.set('to', date);
      if (this.dashFilters.accountId) q.set('accountId', this.dashFilters.accountId);
      q.set('limit', '100');
      const data = await this.api('/transactions?' + q.toString());
      this.drawer = { open: true, title: `Транзакции за ${date}`, transactions: data.rows };
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

    applyDashPeriod(shouldLoad = true) {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      let from;
      switch (this.dashFilters.period) {
        case 'year': {
          from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
          break;
        }
        case 'month': {
          from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 10);
          break;
        }
        case 'week': {
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().slice(0, 10);
          break;
        }
        default: {
          from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().slice(0, 10);
          break;
        }
      }
      this.dashFilters.from = from;
      this.dashFilters.to = today;
      if (shouldLoad) this.loadDashboard();
    },

    resetDashFilters() {
      this.dashFilters = { period: '3months', from: '', to: '', accountId: '', categoryIds: [], txType: 'all' };
      this.groupBy = 'month';
      this.applyDashPeriod();
    },

    toggleCategoryDropdown() {
      this.categoryDropdownOpen = !this.categoryDropdownOpen;
    },

    destroyCharts() {
      Object.values(chartInstances).forEach(c => {
        if (c && typeof c.destroy === 'function') c.destroy();
      });
      chartInstances = {};
    },

    async loadTransactions() {
      // default to last 3 months if no date range set
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const from = this.filters.from || threeMonthsAgo.toISOString().slice(0, 10);
      const to = this.filters.to || now.toISOString().slice(0, 10);

      const q = new URLSearchParams();
      q.set('from', from);
      q.set('to', to);
      if (this.filters.accountId) q.set('accountId', this.filters.accountId);
      if (this.filters.categoryId !== '') q.set('categoryId', this.filters.categoryId);
      if (this.filters.search) q.set('search', this.filters.search);
      q.set('limit', this.transactions.limit);
      q.set('offset', this.transactions.offset);
      this.transactions = await this.api('/transactions?' + q.toString());
      this.selectedIds = [];
      this.periodStats = await this.api(`/analytics/period-summary?from=${from}&to=${to}`);
    },

    resetFilters() {
      this.filters = { from: '', to: '', accountId: '', categoryId: '', search: '' };
      this.transactions.offset = 0;
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
      await this.api('/transactions/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ ids: this.selectedIds, categoryId: Number(this.bulkCategoryId) })
      });
      this.selectedIds = [];
      this.bulkCategoryId = '';
      await this.loadTransactions();
    },

    async updateTxCategory(id, val) {
      const categoryId = val === '' ? null : Number(val);
      await this.api('/transactions/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ ids: [Number(id)], categoryId })
      });
      await this.loadTransactions();
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
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('api/upload', { method: 'POST', body: form });
      this.uploadResult = await res.json();
      if (this.page === 'dashboard') await this.loadDashboard();
    },

    formatMoney(n) {
      return new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(Number(n || 0));
    },

    formatNum(n) {
      return new Intl.NumberFormat('ru-BY').format(Number(n || 0));
    }
  }));
});

function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}
