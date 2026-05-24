import { getAllAccounts, updateAccountComment, getDistinctCurrencies } from '../../domain/accounts/index.js';

export default async function accountRoutes(app) {
  app.get('/', async () => {
    return getAllAccounts();
  });

  app.get('/currencies', async () => {
    return { currencies: getDistinctCurrencies() };
  });

  app.patch('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { comment } = request.body ?? {};
    if (Number.isNaN(id)) return reply.code(400).send({ error: 'Invalid id' });
    const account = updateAccountComment(id, comment ?? null);
    if (!account) return reply.code(404).send({ error: 'Account not found' });
    return account;
  });
}
