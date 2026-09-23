// Mapped over the real `axios` module for spec tests via
// stencil.config.ts's testing.moduleNameMapper. A plain jest.mock('axios',
// ...) call inside a spec file isn't reliably hoisted above the component's
// own `import axios from 'axios'` under Stencil's test transform, so the
// real module (which touches document/location at import time) ends up
// evaluating anyway - resolving the module itself sidesteps that entirely.
export const mockPost = jest.fn();

export default {
  create: () => ({ post: (...args: unknown[]) => mockPost(...args) }),
};
