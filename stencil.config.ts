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
  },
  plugins: [
    tailwind(),
    tailwindHMR()
  ]
};
