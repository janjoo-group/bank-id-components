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
looks at - only the consuming app's own `completed` handler does).

## Consuming it

Pin a release: every push to `main` that passes the tests becomes the next
`v1.0.x` tag (see [Releases](#releases)). There are two ways to use one.

### In an app with its own build (Vue, Vite, ...)

Install the tag with npm, straight from this repo - there is no registry:

```bash
npm install github:janjoo-group/bank-id-components#v1.0.29
```

Each component is its own module, so a bundler takes only the ones you
define:

```js
import { defineCustomElement as defineBankId } from 'jgroup-bank-id-components/components/jgroup-bank-id';
import { defineCustomElement as defineBankIdButton } from 'jgroup-bank-id-components/components/jgroup-bank-id-button';

defineBankId();
defineBankIdButton();
```

Vue also needs telling that these tags are custom elements, not Vue
components, in `@vitejs/plugin-vue`'s options:

```js
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('jgroup-') } } })
```

To update, change the tag in `package.json` and run `npm install`.

### Served as files

A page that loads it with a `<script type="module">` serves
`dist/jgroup-bank-id-components/` from its own address, one directory per
release:

```html
<script type="module" src="/vendor/jgroup-bank-id-components/v1.0.29/jgroup-bank-id-components.esm.js"></script>

<jgroup-bank-id
  type="auth"
  auth-url="/bankid/start"
  collect-url="/bankid/collect"
  cancel-url="/bankid/cancel"
></jgroup-bank-id>
```

Serve it from your own address rather than a CDN: a page embedded on
someone else's site would otherwise need that site's
Content-Security-Policy to allow the CDN.

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
  show its own "continue in the BankID app..." indicator instead.

### Theming

Out of the box the widget has its own light and dark scheme (`dark-theme`).
To make it look like the app it sits in, set any of these CSS custom
properties on the element or an ancestor - they are inherited, so they
reach inside the shadow root. Each one is optional; whatever is left unset
keeps the built-in color for the current scheme. One value serves both
schemes, so an app with its own dark mode points them at its own theme
variables and the widget follows along:

```css
jgroup-bank-id,
jgroup-bank-id-button {
  --jgroup-bankid-button-background: rgba(var(--v-theme-primary), 0.12);
  --jgroup-bankid-button-text: rgb(var(--v-theme-primary));
  --jgroup-bankid-button-shadow: none;
  --jgroup-bankid-button-radius: 8px;
}
```

| Property | What it colors |
| --- | --- |
| `--jgroup-bankid-button-background`, `-hover`, `-active`, `-focus` | The start button (the one with the BankID badge) |
| `--jgroup-bankid-button-border`, `--jgroup-bankid-button-border-active` | Its border |
| `--jgroup-bankid-button-text` | Its label |
| `--jgroup-bankid-secondary-background`, `-hover`, `-active`, `-focus` | The outlined "on another device" button (mobile) |
| `--jgroup-bankid-secondary-border`, `--jgroup-bankid-secondary-border-active` | Its border |
| `--jgroup-bankid-secondary-text` | Its label |
| `--jgroup-bankid-focus` | Focus rings |
| `--jgroup-bankid-spinner` | The loading spinners |
| `--jgroup-bankid-button-shadow`, `--jgroup-bankid-button-shadow-hover` | The buttons' shadows (`none` for flat) |
| `--jgroup-bankid-button-radius`, `--jgroup-bankid-badge-radius` | Corners, overriding `rounded` |
| `--jgroup-bankid-button-height` | Both buttons' height (54px); the padding follows, so the badge stays centered |
| `--jgroup-bankid-badge-size` | The BankID badge (36px); the logo and spinner scale with it |
| `--jgroup-bankid-font-size` | The button labels (14px) |
| `--jgroup-bankid-cancel-text`, `-hover`, `-active` | The cancel link |
| `--jgroup-bankid-qr-background`, `--jgroup-bankid-qr-border` | The frame around the QR code |
| `--jgroup-bankid-error-background`, `-text`, `-icon-background`, `-icon` | A failure message |
| `--jgroup-bankid-info-background`, `-text`, `-icon-background`, `-icon` | A status message |
| `--jgroup-bankid-retry-background`, `-hover`, `-active`, `-text` | The "try again" button in a failure |
| `--jgroup-bankid-font-family` | The font (`inherit` for the app's own) |
| `--jgroup-bankid-accent` | Older shorthand: the light scheme's text and focus color, when the specific ones above are unset |

`-hover` etc. are suffixes on the property before them, e.g.
`--jgroup-bankid-button-background-hover`. The BankID badge itself (the
logo on white) never changes, per BankID's brand guidelines.

`block` stretches the start buttons to the full width of the container,
for a form whose other buttons are full width too, and centers the label
on the whole button rather than on the space next to the badge.

To match an app's own 44px buttons with 16px labels, for example:

```css
jgroup-bank-id {
  --jgroup-bankid-button-height: 44px;
  --jgroup-bankid-badge-size: 32px;
  --jgroup-bankid-font-size: 1rem;
}
```

## Development

```bash
npm install
npm start          # dev server with live reload + a mock backend, see below
npm run build       # production build -> dist/
npm test            # spec tests (npx stencil test --spec --e2e for e2e too)
npm run lint         # eslint src
npm run lint.fix     # eslint src --fix
```

### Dev harness

`npm start` (`scripts/dev.mjs`) runs the real Stencil dev server alongside a
small zero-dependency mock of the auth-url/collect-url/cancel-url backend
(see "The backend half" above), so the whole widget flow - every pending
hint code, every failure, completion - can be exercised without a real
`jgroup/laravel-bank-id` backend running anywhere. `src/index.html`'s own
control panel drives it: prop toggles (type/language/darkTheme/
autoStartSingleOption) remount the widget, and the state buttons change
what the mock's `/collect` endpoint returns on its next poll (picked up
within ~1s, same as the widget's own real poll interval). Nothing from
`scripts/dev.mjs` or the control panel ships in `dist/` - it only runs via
`npm start`.

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

## Releases

`dist/` is committed, so a release is the build at a tag. Every push to
`main` runs the tests (`.github/workflows/tag-release.yml`), then commits
the next version to `package.json` as `chore: release v1.0.x`, tags that
commit and pushes both back to `main`. Pull before you start on the next
change.

## Local development against a consuming app

Point a consumer at your local build instead of a release while you're
working on both at once, so every `npm run build` here shows up there
immediately with no publish step: symlink a static asset path in the
consuming app to this repo's own `dist/jgroup-bank-id-components`
(wherever you've checked out
[`janjoo-group/bank-id-components`](https://github.com/janjoo-group/bank-id-components)
- if the consuming app runs inside a VM, that path needs to resolve from
the VM's own filesystem, not the host's), then point wherever it loads
its `<script>` tag at that local symlinked path instead. Remember to
revert that swap before merging - it's meant to be temporary.
