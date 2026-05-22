import uploadRoutes from './upload.js';
import transactionRoutes from './transactions.js';
import categoryRoutes from './categories.js';
import accountRoutes from './accounts.js';
import analyticsRoutes from './analytics.js';

export async function routes(app) {
  await app.register(uploadRoutes, { prefix: '/upload' });
  await app.register(transactionRoutes, { prefix: '/transactions' });
  await app.register(categoryRoutes, { prefix: '/categories' });
  await app.register(accountRoutes, { prefix: '/accounts' });
  await app.register(analyticsRoutes, { prefix: '/analytics' });
}
