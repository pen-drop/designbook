import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Vite plugin that provides a dev-server middleware for saving
 * Designbook workflow outputs to disk.
 *
 * Endpoints:
 *   POST /__designbook/save  — Save a file to the designbook directory
 *     Body: { path: "product/product-overview.md", content: "..." }
 *
 *   GET  /__designbook/load  — Load a file from the designbook directory
 *     Query: ?path=product/product-overview.md
 *
 * All paths are relative to <projectRoot>/designbook/
 */
export default function designbookSavePlugin(projectRoot) {
  const baseDir = resolve(projectRoot, 'designbook');

  return {
    name: 'designbook-save',
    configureServer(server) {
      server.middlewares.use('/__designbook/save', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = await readBody(req);
          const { path: filePath, content } = JSON.parse(body);

          if (!filePath || typeof content !== 'string') {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing path or content' }));
            return;
          }

          // Prevent path traversal
          if (filePath.includes('..')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid path' }));
            return;
          }

          const fullPath = resolve(baseDir, filePath);
          mkdirSync(dirname(fullPath), { recursive: true });
          writeFileSync(fullPath, content, 'utf-8');

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, path: `designbook/${filePath}` }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use('/__designbook/load', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const url = new URL(req.url, 'http://localhost');
          const filePath = url.searchParams.get('path');

          if (!filePath || filePath.includes('..')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid path' }));
            return;
          }

          const fullPath = resolve(baseDir, filePath);

          if (!existsSync(fullPath)) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ exists: false, content: null }));
            return;
          }

          const content = readFileSync(fullPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ exists: true, content }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
