import {
  getAllCategoryRules,
  createCategoryRule,
  updateCategoryRule,
  deleteCategoryRule
} from '../../domain/category-rules/index.js';

export default async function categoryRuleRoutes(app) {
  app.get('/', async () => {
    const rules = getAllCategoryRules();
    return { rules };
  });

  app.post('/', async (request, reply) => {
    const { categoryId, descriptionPattern, minAmount, maxAmount, accountId, currency, priority, isActive } = request.body || {};
    if (!categoryId) {
      return reply.code(400).send({ error: 'categoryId is required' });
    }
    const rule = createCategoryRule({
      categoryId: Number(categoryId),
      descriptionPattern,
      minAmount: minAmount === undefined || minAmount === '' || minAmount === null ? null : Number(minAmount),
      maxAmount: maxAmount === undefined || maxAmount === '' || maxAmount === null ? null : Number(maxAmount),
      accountId: accountId ? Number(accountId) : null,
      currency: currency || null,
      priority: priority === undefined ? 0 : Number(priority),
      isActive: isActive === undefined ? true : Boolean(isActive)
    });
    return rule;
  });

  app.put('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { categoryId, descriptionPattern, minAmount, maxAmount, accountId, currency, priority, isActive } = request.body || {};
    if (!categoryId) {
      return reply.code(400).send({ error: 'categoryId is required' });
    }
    const rule = updateCategoryRule(id, {
      categoryId: Number(categoryId),
      descriptionPattern,
      minAmount: minAmount === undefined || minAmount === '' || minAmount === null ? null : Number(minAmount),
      maxAmount: maxAmount === undefined || maxAmount === '' || maxAmount === null ? null : Number(maxAmount),
      accountId: accountId ? Number(accountId) : null,
      currency: currency || null,
      priority: priority === undefined ? 0 : Number(priority),
      isActive: isActive === undefined ? true : Boolean(isActive)
    });
    if (!rule) {
      return reply.code(404).send({ error: 'Rule not found' });
    }
    return rule;
  });

  app.delete('/:id', async (request, _reply) => {
    const id = Number(request.params.id);
    deleteCategoryRule(id);
    return { deleted: true };
  });
}
