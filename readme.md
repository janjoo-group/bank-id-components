# bank-id-components

A single Stencil web component, `<jgroup-bank-id>`, that drives a Swedish
BankID authentication or signing flow: the QR-code same-device flow on
desktop, and the app-switch flow on mobile. It's framework-agnostic and
gets embedded directly as a custom element in whatever's consuming it -
Vue/Inertia SPAs, plain Blade pages, anything that can load a `<script
type="module">` and listen for DOM events.

## The backend half

This component only talks to whatever three endpoints you point
`auth-url`/`sign-url`, `collect-url` and `cancel-url` at - it has no
opinion on the backend beyond the JSON shape those responses need. Every
current consumer builds that backend on
[`jgroup/laravel-bank-id`](https://github.com/janjoo-group/laravel-bank-id),
which wraps BankID's own API behind a `BankID` facade
(`BankID::auth()`/`collect()`/`cancel()`). Its
`collect()` response already carries the `status`/`hintCode`/
`transactionId`/`qrCode` fields this widget expects; a consuming app
layers its own business-logic outcome on top via that response's
`withData(['error' => ...])` (still `status: 'complete'`, just with an
extra key the widget's own success/error branching neither needs nor
looks at - only the consuming app's `completed` handler does, e.g.
`CollectBankIdLogin.php` in `forms`).

## Consuming it

Load the built ESM bundle directly (no npm dependency involved for
consumers):

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/janjoo-group/bank-id-components@latest/dist/jgroup-bank-id-components/jgroup-bank-id-components.esm.js"></script>

<jgroup-bank-id
  type="auth"
  auth-url="/bankid/start"
  collect-url="/bankid/collect"
  cancel-url="/bankid/cancel"
></jgroup-bank-id>
```

jsdelivr serves straight from this repo's `dist/` at the `@latest` tag
(i.e. the `main` branch HEAD) - there's no separate publish/release step,
just commit and push. jsdelivr's own CDN cache can take up to ~24h to pick
up a new push; use `https://purge.jsdelivr.net/gh/janjoo-group/bank-id-components@latest/...`
to force it sooner if you need a fix live immediately.

Full prop/event reference (kept in sync automatically from the component's
own doc comments on every build): [`src/components/jgroup-bank-id/readme.md`](src/components/jgroup-bank-id/readme.md).

### `type="auth"` vs `type="sign"`

Same component, same two device flows, different pair of endpoints:
`auth-url`/`sign-url` starts the transaction depending on `type`.
`collect-url` is polled for status either way.

### The two device flows

- **Desktop (`qr`)**: after starting, the widget polls `collect-url`
  directly and shows a live QR code + status hint the whole time.
- **Mobile (`app`)**: the widget redirects the same tab to
  `https://app.bankid.com/...`, which hands off to the native BankID app.
  It does **not** poll during this time - there's nothing to poll yet, the
  visitor is off in a different app. When the visitor returns, a
  `visibilitychange` listener resumes polling automatically (see
  `handleVisibilityChange`/`pollCollect` in
  `jgroup-bank-id.tsx`). Because nothing polls during the hand-off, the
  widget has no live status of its own for that whole stretch - the
  `started` event's `detail.flowType` tells a consumer when it should
  show its own "continue in the BankID app..." indicator instead
  (`ShowLogin.vue` in the `forms` repo does exactly this).

## Development

```bash
npm install
npm start          # dev server with live reload
npm run build       # production build -> dist/
npm test            # spec tests (npx stencil test --spec --e2e for e2e too)
npm run lint         # eslint src
npm run lint.fix     # eslint src --fix
```

Two tsconfigs exist on purpose: `tsconfig.json` (used by ESLint's
type-aware parsing and your editor) includes spec/test files;
`tsconfig.build.json` (used only by the Stencil build itself, via
`stencil.config.ts`'s `tsconfig` option) excludes them, so compiled spec
files and test-only helpers (`src/testing/`) never end up shipped in
`dist/`.

### Testing gotchas worth knowing

- `@stencil/core/mock-doc`'s `MockHistory.pushState()`/`replaceState()`
  are hard no-ops - `history.state` will never actually update in a spec
  test. Drive anything that depends on it (like the mobile flow's resume
  check) via `location.hash` instead, which does work.
- The real `axios` module touches `document`/`location` at import time,
  which doesn't play well with Stencil's mock DOM. Tests get a lightweight
  stand-in via `stencil.config.ts`'s `testing.moduleNameMapper`, mapped to
  `src/testing/axios-mock.ts` - a plain `jest.mock('axios', ...)` inside a
  spec file isn't reliably hoisted above the component's own import under
  Stencil's test transform, so module-level resolution is what actually
  works here.
- `newSpecPage()` resets `navigator`/`location` as part of its own setup,
  so mocking them *before* calling it doesn't stick - set them up after.

## Local development against a consuming app

Point a consumer at your local build instead of the CDN while you're
working on both at once, so every `npm run build` here shows up there
immediately with no publish step. In `forms`, for example: symlink
`public/bank-id-components` to this repo's own `dist/jgroup-bank-id-components`
(wherever you've checked out
[`janjoo-group/bank-id-components`](https://github.com/janjoo-group/bank-id-components)
- if `forms` runs inside a VM, that path needs to resolve from the VM's
own filesystem, not the host's), then point
`resources/views/templates/bank-id-components.blade.php` at
`{{ asset('bank-id-components/jgroup-bank-id-components.esm.js') }}`
instead of the CDN URL. Remember to revert that template change before
merging - it's meant to be temporary.
