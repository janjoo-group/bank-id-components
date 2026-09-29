import { newE2EPage } from '@stencil/core/testing';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';

// Real-browser WCAG 2.2 AA scanning (axe-core) across every distinct
// visual state this widget renders - unlike the jsdom-based spec tests,
// this actually paints and lays things out, so it's the only place a
// contrast/ARIA regression could be caught here at all. Found (and this
// suite guards against regressing) three real gaps this session:
// StartButton/CancelButton having no accessible name while their loading
// spinner replaces their own text, and the status Alert/app-in-progress
// message never announcing itself to a screen reader as it updates.
//
// Deliberately not covered: the mobile 'app' flow's actual in-progress
// state (flowType 'app', post-start) - reaching it for real means
// following handleInitComplete()'s real `window.location.href =
// 'https://app.bankid.com/...'` redirect, which would navigate this test
// page away from the widget entirely. Its own markup (a single <p
// aria-live="polite">, no interactive elements) is otherwise identical in
// kind to what the QR in-progress state below already covers.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// A real local HTTP server, not Puppeteer request interception -
// Stencil's own e2e harness (e2eSetContent, called by both newE2EPage()
// and page.setContent()) already installs its own 'request' listener
// that unconditionally .continue()s anything that isn't its bootstrap
// URL, in legacy (non-cooperative) mode - which finalizes the request
// synchronously the moment it runs. A second listener's own respond()
// call then throws "Request is already handled!" regardless of
// registration order or cooperative-intercept priority, since a legacy
// continue() never enters the cooperative queue at all. A real server on
// a real port sidesteps the whole problem - Stencil's own listener just
// continues the request through to it exactly as intended.
function startMockServer(collectResponse: Record<string, unknown>): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const origin = req.headers.origin ?? '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      res.setHeader('Content-Type', 'application/json');

      if (req.url?.endsWith('/auth') || req.url?.endsWith('/sign')) {
        res.end(JSON.stringify({ autoStartToken: 'token', transactionId: 'txn-1' }));
      } else if (req.url?.endsWith('/collect')) {
        res.end(JSON.stringify({ transactionId: 'txn-1', ...collectResponse }));
      } else if (req.url?.endsWith('/cancel')) {
        res.end(JSON.stringify({}));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({ server, port });
    });
  });
}

// Both the Alert and the QR image/app-in-progress message use
// `.animate-fade` (a 0.8s opacity 0->1 CSS animation) - scanning mid-
// animation catches a real-but-transient reduced-contrast moment
// (measured directly: #d47474 is exactly red-700 at ~61% opacity
// blended against white), not the steady state an actual visitor
// settles on. Polling getComputedStyle's own opacity is more reliable
// than a fixed sleep, which would just be guessing at the animation's
// real duration.
async function waitForFadeToSettle(page: Awaited<ReturnType<typeof newE2EPage>>) {
  await page.waitForFunction(() => {
    const host = document.querySelector('jgroup-bank-id') as (Element & { shadowRoot: ShadowRoot }) | null;
    const fading = Array.from(host?.shadowRoot.querySelectorAll('.animate-fade') ?? []);
    return fading.every((el) => getComputedStyle(el).opacity === '1');
  });
}

async function assertNoViolations(page: Awaited<ReturnType<typeof newE2EPage>>) {
  const results = await new AxePuppeteer(page as never)
    .withTags(WCAG_TAGS)
    .include('jgroup-bank-id')
    .analyze();

  expect(results.violations).toEqual([]);
}

describe('jgroup-bank-id accessibility (real browser)', () => {
  it('has no violations in the pristine desktop (QR) state', async () => {
    const page = await newE2EPage({
      html: '<jgroup-bank-id type="auth" auth-url="/auth" collect-url="/collect" cancel-url="/cancel"></jgroup-bank-id>',
    });

    await assertNoViolations(page);
    await page.close();
  });

  it('has no violations in the pristine mobile state (two start buttons)', async () => {
    const page = await newE2EPage();
    // A real UA string, set before navigation, so is-mobile's own
    // sniffing (unreliable under jsdom - see the sibling *.mobile.spec.tsx
    // file's own comment on this) detects it correctly here, in a real
    // browser.
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    await page.setContent(
      '<jgroup-bank-id type="auth" auth-url="/auth" collect-url="/collect" cancel-url="/cancel"></jgroup-bank-id>'
    );
    await page.waitForChanges();

    const secondStartButtonExists = await page.evaluate(() => {
      const host = document.querySelector('jgroup-bank-id') as (Element & { shadowRoot: ShadowRoot }) | null;
      return (host?.shadowRoot.querySelectorAll('[data-test-id="start-button"]').length ?? 0) === 2;
    });
    expect(secondStartButtonExists).toBe(true);

    await assertNoViolations(page);
    await page.close();
  });

  it('has no violations in the QR in-progress state (QR image + cancel button)', async () => {
    const { server, port } = await startMockServer({ status: 'pending', qrCode: 'qr-data', hintCode: null });
    try {
      const page = await newE2EPage({
        html: `<jgroup-bank-id type="auth" auth-url="http://127.0.0.1:${port}/auth" collect-url="http://127.0.0.1:${port}/collect" cancel-url="http://127.0.0.1:${port}/cancel"></jgroup-bank-id>`,
      });

      const startButton = await page.find('jgroup-bank-id >>> [data-test-id="start-button"]');
      await startButton.click();

      await page.waitForFunction(() => {
        const host = document.querySelector('jgroup-bank-id') as (Element & { shadowRoot: ShadowRoot }) | null;
        const img = host?.shadowRoot.querySelector('img');
        return img !== undefined && img !== null;
      });
      await page.waitForChanges();
      await waitForFadeToSettle(page);

      await assertNoViolations(page);
      await page.close();
    } finally {
      server.close();
    }
  });

  it('has no violations in the failed/alert state', async () => {
    const { server, port } = await startMockServer({ status: 'failed', hintCode: 'userCancel' });
    try {
      const page = await newE2EPage({
        html: `<jgroup-bank-id type="auth" auth-url="http://127.0.0.1:${port}/auth" collect-url="http://127.0.0.1:${port}/collect" cancel-url="http://127.0.0.1:${port}/cancel"></jgroup-bank-id>`,
      });

      const startButton = await page.find('jgroup-bank-id >>> [data-test-id="start-button"]');
      await startButton.click();

      await page.waitForFunction(() => {
        const host = document.querySelector('jgroup-bank-id') as (Element & { shadowRoot: ShadowRoot }) | null;
        const alert = host?.shadowRoot.querySelector('[data-test-id="alert"]');
        return alert !== undefined && alert !== null;
      });
      await page.waitForChanges();
      await waitForFadeToSettle(page);

      await assertNoViolations(page);
      await page.close();
    } finally {
      server.close();
    }
  });

  it('has no violations in the props-invalid error state', async () => {
    // Missing the required collect-url - triggers the validation-error
    // fallback (<p role="alert">) that fully replaces the widget's normal
    // content, rather than the flow above.
    const page = await newE2EPage({
      html: '<jgroup-bank-id type="auth" auth-url="/auth" cancel-url="/cancel"></jgroup-bank-id>',
    });

    await assertNoViolations(page);
    await page.close();
  });
});
