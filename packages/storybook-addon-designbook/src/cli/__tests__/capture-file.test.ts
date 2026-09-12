import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DesignbookConfig } from '../../shared/config.js';
import { assertHttpUrl, runCaptureFile } from '../capture-file.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function serve(body: Buffer, status = 200): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((_req, res) => {
    res.writeHead(status, { 'content-length': body.length });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/asset.bin`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe('assertHttpUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(assertHttpUrl('https://leando.de/media/Sarabun.woff2').href).toContain('leando.de');
    expect(assertHttpUrl('http://127.0.0.1:9/a.svg').protocol).toBe('http:');
  });
  it('rejects relative and non-http URLs', () => {
    expect(() => assertHttpUrl('assets/img/logo.png')).toThrow(/absolute http\(s\) URL/);
    expect(() => assertHttpUrl('/assets/img/logo.png')).toThrow(/absolute http\(s\) URL/);
    expect(() => assertHttpUrl('file:///tmp/logo.png')).toThrow(/absolute http\(s\) URL/);
  });
});

describe('runCaptureFile', () => {
  it('writes the served bytes under the revision path', async () => {
    const payload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const server = await serve(payload);
    const dir = mkdtempSync(join(tmpdir(), 'capture-file-'));
    dirs.push(dir);
    try {
      const outPath = join(dir, 'assets', 'logo.svg');
      const result = await runCaptureFile({ url: server.url, outPath }, {} as DesignbookConfig);
      expect(result.bytes).toBe(payload.length);
      expect(readFileSync(outPath)).toEqual(payload);
    } finally {
      await server.close();
    }
  });

  it('rejects an empty body and an HTTP error', async () => {
    const empty = await serve(Buffer.alloc(0));
    const dir = mkdtempSync(join(tmpdir(), 'capture-file-empty-'));
    dirs.push(dir);
    try {
      await expect(
        runCaptureFile({ url: empty.url, outPath: join(dir, 'empty.bin') }, {} as DesignbookConfig),
      ).rejects.toThrow(/empty file/);
    } finally {
      await empty.close();
    }
    const missing = await serve(Buffer.from('nope'), 404);
    try {
      await expect(
        runCaptureFile({ url: missing.url, outPath: join(dir, 'missing.bin') }, {} as DesignbookConfig),
      ).rejects.toThrow(/HTTP 404/);
      expect(existsSync(join(dir, 'missing.bin'))).toBe(false);
    } finally {
      await missing.close();
    }
  });
});
