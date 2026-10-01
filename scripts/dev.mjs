// Dev-only orchestrator for `npm start`: runs a zero-dependency mock of the
// auth-url/collect-url/cancel-url backend (see the readme's "The backend
// half") alongside the real Stencil dev server, so the whole widget flow -
// every pending hint code, every failure, completion - can be driven from
// src/index.html's own control panel without a real jgroup/laravel-bank-id
// backend running anywhere. Never built into dist/ - this only ever runs
// via `npm start`.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const MOCK_PORT = 4001;

// What the next collect() poll returns. Mutated by src/index.html's control
// panel via POST /dev/scenario - picked up within ~1s by the widget's own
// 1s poll interval (jgroup-bank-id.tsx's pollCollect).
let scenario = { status: 'pending', hintCode: 'outstandingTransaction' };
let transactionId = null;
// Toggled by the control panel's "Force loading state" checkbox - makes
// /auth and /sign hang instead of resolving, so the widget's own loading
// spinner can be inspected on demand rather than only during the normal
// ~900ms window.
let hangStart = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function send(req, res, status, body) {
  // Stencil's dev server picks whatever port is free (3333, 3347, 3345,
  // ...), so it can't be hardcoded here - reflect the request's own Origin
  // instead. withCredentials + withXSRFToken on the widget's axios instance
  // means this can't be '*' either way - credentialed CORS needs an exact
  // origin.
  const origin = req.headers.origin;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  if (origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? '' : JSON.stringify(body));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

const mockApi = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(req, res, 204);

    if (req.method === 'POST' && (req.url === '/auth' || req.url === '/sign')) {
      // Mirrors a real start-transaction request's own latency, so the
      // start button's loading spinner is actually visible to look at -
      // or, with hangStart on, never resolves at all.
      if (hangStart) await delay(10 * 60 * 1000);
      else await delay(900);
      transactionId = randomUUID();
      scenario = { status: 'pending', hintCode: 'outstandingTransaction' };
      return send(req, res, 200, { autoStartToken: randomUUID(), transactionId });
    }

    if (req.method === 'POST' && req.url === '/dev/hang-start') {
      hangStart = (await readJson(req)).hang === true;
      return send(req, res, 204);
    }

    if (req.method === 'POST' && req.url === '/collect') {
      return send(req, res, 200, {
        transactionId,
        status: scenario.status,
        hintCode: scenario.hintCode,
        // Real BankID QR payloads rotate every second for liveness - the
        // timestamp keeps the rendered QR visibly animating the same way.
        qrCode: `mock.bankid.qr.${transactionId}.${Date.now()}`,
      });
    }

    if (req.method === 'POST' && req.url === '/cancel') {
      return send(req, res, 200, {});
    }

    if (req.method === 'POST' && req.url === '/dev/scenario') {
      scenario = await readJson(req);
      return send(req, res, 204);
    }

    if (req.method === 'GET' && req.url === '/dev/scenario') {
      return send(req, res, 200, scenario);
    }

    send(req, res, 404, { error: 'not found' });
  } catch (error) {
    console.error('[mock-bankid-api]', error);
    send(req, res, 500, { error: 'mock server error' });
  }
});

mockApi.listen(MOCK_PORT, () => {
  console.log(`[mock-bankid-api] listening on http://localhost:${MOCK_PORT}`);
});

const stencil = spawn('npx', ['stencil', 'build', '--dev', '--watch', '--serve'], {
  stdio: 'inherit',
  shell: true,
});

function shutdown() {
  mockApi.close();
  stencil.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
stencil.on('exit', (code) => {
  mockApi.close();
  process.exit(code ?? 0);
});
