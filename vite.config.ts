import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react(), {
    name: 'development-csp',
    transformIndexHtml(html) {
      // Dev-only HMR needs a socket and inline refresh preamble. Production keeps the strict policy.
      return command === 'serve' ? html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/>/, '') : html;
    },
  }],
  base: './',
  build: { sourcemap: false },
}));
