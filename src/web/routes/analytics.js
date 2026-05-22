import {
  getSpendingByCategory,
  getMonthlySummary,
  getTopCounterparties,
  getBalanceOverTime,
  getUncategorizedCount,
  getSummaryStats,
  getPeriodSummary
} from '../../core/analytics.js';

export default async function analyticsRoutes(app) {
  app.get('/period-summary', async (request) => {
    const { from, to, accountId } = request.query;
    return getPeriodSummary({ from, to, accountId });
  });

  app.get('/spending-by-category', async (request) => {
    const { from, to, accountId, type } = request.query;
    return getSpendingByCategory({ from, to, accountId, type });
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

  app.get('/summary', async () => {
    return getSummaryStats();
  });
}
