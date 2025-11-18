import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourblog.com',
  integrations: [react()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
