import { getAllAccounts } from '../../core/repository.js';

export default async function accountRoutes(app) {
  app.get('/', async () => {
    return getAllAccounts();
  });
}
