import { getTransactions, bulkUpdateCategory, deleteTransaction } from '../../domain/transactions/index.js';

function parseCategoryIds(queryValue) {
  if (!queryValue) return undefined;
  if (Array.isArray(queryValue)) return queryValue.map(v => (v === 'null' ? null : Number(v))).filter(v => v === null || Number.isFinite(v));
  return String(queryValue).split(',').map(v => (v === 'null' ? null : Number(v))).filter(v => v === null || Number.isFinite(v));
}

export default async function transactionRoutes(app) {
  app.get('/', async (request) => {
    const { from, to, accountId, categoryIds, search, limit, offset, orderBy } = request.query;
    return getTransactions({
      from,
      to,
      accountId: accountId ? Number(accountId) : undefined,
      categoryIds: parseCategoryIds(categoryIds),
      search,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      orderBy: orderBy || 'tx_date DESC'
    });
  });

  app.delete('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(400).send({ error: 'Invalid transaction id' });
    }
    const deleted = deleteTransaction(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Transaction not found' });
    }
    return { deleted: true, id };
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
