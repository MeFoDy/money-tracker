import { parseStatement } from '../../core/parser.js';
import { previewImport, confirmImport } from '../../core/importer.js';

export default async function uploadRoutes(app) {
  app.post('/preview', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const originalFilename = data.filename || 'upload.csv';

    let parsed;
    try {
      parsed = parseStatement(buffer);
    } catch (error) {
      return reply.code(422).send({ error: 'Parse failed', message: error.message });
    }

    const result = previewImport({ ...parsed, originalFilename });
    return result;
  });

  app.post('/confirm', async (request, reply) => {
    const { transactions, originalFilename } = request.body || {};
    if (!Array.isArray(transactions)) {
      return reply.code(400).send({ error: 'transactions must be an array' });
    }

    try {
      const result = confirmImport({ transactions, originalFilename: originalFilename || 'upload.csv' });
      return result;
    } catch (error) {
      return reply.code(500).send({ error: 'Import failed', message: error.message });
    }
  });
}
