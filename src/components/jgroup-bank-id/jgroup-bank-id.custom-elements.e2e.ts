import { newE2EPage } from '@stencil/core/testing';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';

// The custom-elements build (dist/components), the way a bundling app uses
// it: the class is the element itself, created with document.createElement
// and given its attributes afterwards. The e2e dev server only serves the
// lazy build, so this serves dist/components and the Stencil runtime itself.
const roots: Record<string, string> = {
  '/components/': join(process.cwd(), 'dist/components'),
  '/stencil/client/': join(process.cwd(), 'node_modules/@stencil/core/internal/client'),
  '/stencil/app-data/': join(process.cwd(), 'node_modules/@stencil/core/internal/app-data'),
};

const html = `<!doctype html>
<script type="importmap">
  { "imports": {
    "@stencil/core/internal/client": "/stencil/client/index.js",
    "@stencil/core/internal/app-data": "/stencil/app-data/index.js"
  } }
</script>
<script type="module">
  import { defineCustomElement } from '/components/jgroup-bank-id.js';
  defineCustomElement();
</script>`;

function serve(): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = req.url ?? '/';
      if (url === '/') {
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
        return;
      }

      const prefix = Object.keys(roots).find((p) => url.startsWith(p));
      const file = prefix === undefined ? null : normalize(join(roots[prefix], url.slice(prefix.length)));

      try {
        if (prefix === undefined || file === null || !file.startsWith(roots[prefix])) {
          throw new Error('Not found');
        }
        const body = await readFile(file);
        res.setHeader('Content-Type', 'text/javascript');
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}/` });
    });
  });
}

describe('jgroup-bank-id from the custom-elements build (real browser)', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await serve());
  });

  afterAll(() => {
    server.close();
  });

  it('can be created with document.createElement and reads attributes set afterwards', async () => {
    const page = await newE2EPage();
    // Not page.goto: Stencil's own expects its lazy build to boot.
    await page.mainFrame().goto(base);
    await page.waitForFunction(() => customElements.get('jgroup-bank-id') !== undefined);

    const created = await page.evaluate(() => {
      const errors: string[] = [];
      const onError = (e: ErrorEvent) => errors.push(e.message);
      window.addEventListener('error', onError);

      const el = document.createElement('jgroup-bank-id');
      el.setAttribute('type', 'auth');
      el.setAttribute('auth-url', '/auth');
      el.setAttribute('collect-url', '/collect');
      el.setAttribute('cancel-url', '/cancel');
      el.setAttribute('language', 'en');
      document.body.append(el);

      window.removeEventListener('error', onError);

      return { errors, upgraded: el instanceof customElements.get('jgroup-bank-id')! };
    });

    expect(created).toEqual({ errors: [], upgraded: true });

    await page.waitForFunction(
      () => document.querySelector('jgroup-bank-id')?.shadowRoot?.querySelector('[data-test-id="start-button"]') != null,
    );
    const startButton = await page.find('jgroup-bank-id >>> [data-test-id="start-button"]');
    expect(startButton.textContent).toContain('Mobile BankID');

    await page.close();
  });
});
