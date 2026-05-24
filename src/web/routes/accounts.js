import { getAllAccounts } from '../../domain/accounts/index.js';

export default async function accountRoutes(app) {
  app.get('/', async () => {
    return getAllAccounts();
  });
}
