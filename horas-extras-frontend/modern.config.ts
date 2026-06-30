import path from 'node:path';
import { appTools, defineConfig } from '@modern-js/app-tools';
import { tailwindcssPlugin } from '@modern-js/plugin-tailwindcss';

const reactRoot = path.resolve(__dirname, 'node_modules/react');
const reactDomRoot = path.resolve(__dirname, 'node_modules/react-dom');

const PUBLIC_ENV = {
  API_URL: process.env.API_URL || 'http://localhost:4000',
};

const globalVars = Object.fromEntries(
  Object.entries(PUBLIC_ENV).map(([k, v]) => [`process.env.${k}`, v]),
);

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  runtime: {
    router: true,
  },
  source: {
    globalVars,
    alias: {
      react: reactRoot,
      'react-dom': reactDomRoot,
    },
  },
  tools: {
    webpackChain: (chain) => {
      chain.resolve.alias.set('react', reactRoot).set('react-dom', reactDomRoot);
    },
  },
  html: {
    title: 'Betmarketer · Horas Extras',
    meta: {
      description: 'Sistema de gestión de horas extras — Diurnas, Nocturnas, Dominicales y Festivos',
    },
    favicon: './config/icon.png',
  },
  plugins: [
    appTools({
      bundler: 'webpack',
    }),
    tailwindcssPlugin(),
  ],
});
