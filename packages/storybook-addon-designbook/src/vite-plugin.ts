import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin, ViteDevServer, Connect } from 'vite';

/**
 * Vite plugin that provides a dev-server middleware for loading
 * Designbook workflow outputs from disk.
 */
// function findDesignbookDir(startPath: string): string { ... } - REMOVED

export interface DesignbookPluginOptions {
  fsRoot?: string;
}

export function designbookLoadPlugin(projectRoot: string, options: DesignbookPluginOptions = {}): Plugin {
  // Allow configuring the root directory via options
  const distPath = options.fsRoot || 'designbook';


  const baseDir = resolve(projectRoot, distPath);

  if (!existsSync(baseDir)) {
    console.log(`[Designbook] designbook directory not found at ${baseDir}`);
  } else {
    console.log(`[Designbook] Using designbook directory at: ${baseDir}`);
  }

  return {
    name: 'designbook-load',
    configureServer(server: ViteDevServer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/__designbook/load', (req: Connect.IncomingMessage, res: any) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          // Use 'http://localhost' as base just to parse the path relative to it
          const url = new URL(req.url || '', 'http://localhost');
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
            res.end(JSON.stringify({ exists: false, content: null, searchedPath: fullPath, baseDir }));
            return;
          }

          const content = readFileSync(fullPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ exists: true, content }));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}
