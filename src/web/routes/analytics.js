import {
  getSpendingByCategory,
  getMonthlySummary,
  getTopCounterparties,
  getBalanceOverTime,
  getUncategorizedCount,
  getSummaryStats,
  getPeriodSummary,
  getKpiMetrics,
  getIncomeExpenseOverTime,
  getPeriodComparison,
  getHeatmapData,
  getTransactionDateRange
} from '../../domain/analytics/index.js';

function parseCategoryIds(queryValue) {
  if (!queryValue) return undefined;
  const items = Array.isArray(queryValue) ? queryValue : String(queryValue).split(',');
  return items.map(v => (v === 'null' ? null : Number(v))).filter(v => v === null || Number.isFinite(v));
}

export default async function analyticsRoutes(app) {
  app.get('/kpi', async (request) => {
    const { from, to, accountId, type } = request.query;
    return getKpiMetrics({ from, to, accountId, type, categoryIds: parseCategoryIds(request.query.categoryIds) });
  });

  app.get('/income-expense-over-time', async (request) => {
    const { from, to, accountId, groupBy, type } = request.query;
    return getIncomeExpenseOverTime({ from, to, accountId, groupBy, type, categoryIds: parseCategoryIds(request.query.categoryIds) });
  });

  app.get('/period-summary', async (request) => {
    const { from, to, accountId, search } = request.query;
    return getPeriodSummary({ from, to, accountId, categoryIds: parseCategoryIds(request.query.categoryIds), search });
  });

  app.get('/spending-by-category', async (request) => {
    const { from, to, accountId, type } = request.query;
    return getSpendingByCategory({ from, to, accountId, type, categoryIds: parseCategoryIds(request.query.categoryIds) });
  });

  app.get('/period-comparison', async (request) => {
    const { from, to, accountId, type } = request.query;
    return getPeriodComparison({ from, to, accountId, type, categoryIds: parseCategoryIds(request.query.categoryIds) });
  });

  app.get('/heatmap', async (request) => {
    const { from, to, accountId, mode } = request.query;
    return getHeatmapData({ from, to, accountId, mode, categoryIds: parseCategoryIds(request.query.categoryIds) });
  });

  app.get('/monthly-summary', async (request) => {
    const { from, to, accountId } = request.query;
    return getMonthlySummary({ from, to, accountId });
  });

  app.get('/top-counterparties', async (request) => {
    const { from, to, accountId, type, limit } = request.query;
    return getTopCounterparties({ from, to, accountId, type, limit: limit ? Number(limit) : 10 });
  });

  app.get('/balance-over-time', async (request) => {
    const { from, to, accountId } = request.query;
    return getBalanceOverTime({ from, to, accountId });
  });

  app.get('/uncategorized-count', async () => {
    return { count: getUncategorizedCount() };
  });

  app.get('/date-range', async () => {
    return getTransactionDateRange();
  });

  app.get('/summary', async () => {
    return getSummaryStats();
  });
}
