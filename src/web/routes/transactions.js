import { getTransactions, bulkUpdateCategory } from '../../domain/transactions/index.js';

function getCategoryIdParam(categoryId) {
  if (categoryId === 'null') return null;
  if (categoryId === undefined) return undefined;
  return Number(categoryId);
}

export default async function transactionRoutes(app) {
  app.get('/', async (request) => {
    const { from, to, accountId, categoryId, search, limit, offset, orderBy } = request.query;
    return getTransactions({
      from,
      to,
      accountId: accountId ? Number(accountId) : undefined,
      categoryId: getCategoryIdParam(categoryId),
      search,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      orderBy: orderBy || 'tx_date DESC'
    });
  });

  app.patch('/bulk', async (request, reply) => {
    const { ids, categoryId } = request.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: 'ids must be a non-empty array' });
    }
    if (categoryId === undefined) {
      return reply.code(400).send({ error: 'categoryId is required' });
    }
    const catId = categoryId === null ? null : Number(categoryId);
    bulkUpdateCategory(ids.map(Number), catId);
    return { updated: ids.length };
  });
}
