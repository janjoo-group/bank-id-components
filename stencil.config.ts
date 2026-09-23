import { Config } from '@stencil/core';
import tailwindConf from './tailwind.config';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwind, { tailwindHMR, setPluginConfigurationDefaults } from 'stencil-tailwind-plugin';

setPluginConfigurationDefaults({
  tailwindConf,
  tailwindCssPath: './src/styles/tailwind.css',
  postcss: {
    plugins: [
      tailwindcss(),
      autoprefixer()
    ]
  }
});

export const config: Config = {
  namespace: 'jgroup-bank-id-components',
  hashFileNames: true,
  // Keeps spec/e2e files (and their test-only helpers under src/testing)
  // out of the dist/collection output - the main tsconfig.json still
  // includes them for ESLint's type-aware parsing and the IDE.
  tsconfig: './tsconfig.build.json',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
    },
  ],
  testing: {
    browserHeadless: 'new',
    // components.tsx imports the tailwind config via a `.js`-suffixed
    // relative path that Stencil's own build resolves to the real
    // tailwind.config.ts, but Jest's default resolver doesn't do that
    // extension mapping - point it at the real file directly.
    moduleNameMapper: {
      'tailwind\\.config\\.js$': '<rootDir>/tailwind.config.ts',
      // real axios touches document/location at import time (it isn't
      // hoisted out by a spec file's own jest.mock('axios', ...) under
      // Stencil's test transform) - resolve it to a lightweight test
      // double instead. See src/testing/axios-mock.ts.
      '^axios$': '<rootDir>/src/testing/axios-mock.ts',
    },
  },
  plugins: [
    tailwind(),
    tailwindHMR()
  ]
};
