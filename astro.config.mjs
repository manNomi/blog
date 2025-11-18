import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  site: "https://yourblog.com",
  output: "hybrid",
  adapter: vercel({
    runtime: "nodejs20",
  }),
  integrations: [react(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
