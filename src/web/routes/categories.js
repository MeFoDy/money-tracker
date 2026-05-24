import { getAllCategories, createCategory, updateCategory, deleteCategory, getCategoryByName } from '../../domain/categories/index.js';

export default async function categoryRoutes(app) {
  app.get('/', async () => {
    const categories = getAllCategories();
    return { categories };
  });

  app.post('/', async (request, reply) => {
    const { name, color } = request.body || {};
    if (!name?.trim()) {
      return reply.code(400).send({ error: 'name is required' });
    }
    const existing = getCategoryByName(name.trim());
    if (existing) {
      return reply.code(409).send({ error: 'Category already exists' });
    }
    const category = createCategory({ name: name.trim(), color });
    return category;
  });

  app.put('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const { name, color } = request.body || {};
    if (!name?.trim()) {
      return reply.code(400).send({ error: 'name is required' });
    }
    const category = updateCategory(id, { name: name.trim(), color });
    if (!category) {
      return reply.code(404).send({ error: 'Category not found' });
    }
    return category;
  });

  app.delete('/:id', async (request, _reply) => {
    const id = Number(request.params.id);
    deleteCategory(id);
    return { deleted: true };
  });
}
