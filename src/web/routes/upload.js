import { parseStatement } from '../../core/parser.js';
import { importStatement } from '../../core/importer.js';

export default async function uploadRoutes(app) {
  app.post('/', async (request, reply) => {
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

    const result = importStatement({ ...parsed, originalFilename });
    return result;
  });
}
