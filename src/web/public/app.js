import { renderDoughnut, renderLine } from './charts.js';

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    page: 'dashboard',
    summary: { totalTx: 0, totalIncome: 0, totalExpense: 0, uncategorized: 0 },
    periodStats: { income: 0, expense: 0 },
    transactions: { rows: [], total: 0, limit: 50, offset: 0 },
    categories: [],
    categoryMap: {},
    rules: [],
    accounts: [],
    accountMap: {},
    filters: { from: '', to: '', accountId: '', categoryId: '', search: '' },
    selectedIds: [],
    bulkCategoryId: '',
    newCategoryName: '',
    newCategoryColor: '#0d6efd',
    newRuleCategoryId: '',
    newRulePattern: '',
    newRulePriority: 0,
    uploadResult: null,
    chartInstances: {},

    async initApp() {
      await this.loadAccounts();
      await this.loadCategories();
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

    async loadDashboard() {
      this.summary = await this.api('/analytics/summary');
      const spending = await this.api('/analytics/spending-by-category?type=expense');
      const balance = await this.api('/analytics/balance-over-time');
      await this.$nextTick();
      this.renderCharts(spending, balance);
    },

    renderCharts(spending, balance) {
      this.destroyCharts();
      if (spending.length > 0) {
        const labels = spending.map(s => s.name);
        const data = spending.map(s => s.total);
        const colors = spending.map(s => s.color || randomColor());
        this.chartInstances.cat = renderDoughnut('chart-categories', labels, data, colors);
      }
      if (balance.length > 0) {
        const labels = balance.map(b => b.date.slice(0, 7));
        const data = balance.map(b => b.balance);
        this.chartInstances.bal = renderLine('chart-balance', labels, data);
      }
    },

    destroyCharts() {
      Object.values(this.chartInstances).forEach(c => c.destroy());
      this.chartInstances = {};
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
      this.rules = data.rules;
      this.categoryMap = Object.fromEntries(this.categories.map(c => [c.id, c]));
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

    async addRule() {
      if (!this.newRuleCategoryId || !this.newRulePattern.trim()) return;
      await this.api('/categories/rules', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: Number(this.newRuleCategoryId),
          pattern: this.newRulePattern.trim(),
          priority: Number(this.newRulePriority) || 0
        })
      });
      this.newRulePattern = '';
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
