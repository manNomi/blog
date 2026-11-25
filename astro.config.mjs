import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel/serverless";
import tailwind from "@astrojs/tailwind";
import { rehypePagesLinks } from "./scripts/rehype-pages-links.mjs";

const pages = process.env.DEPLOY_TARGET === "github-pages";
const pagesSite = "https://mannomi.github.io";
const accountSite = process.env.GITHUB_REPOSITORY?.toLowerCase() === "mannomi/mannomi.github.io";
const pagesBase = accountSite ? "" : "/blog";
const legacyPaths = [
  "/about", "/about/[slug]", "/aim", "/game", "/game/compatibility",
  "/game/dice", "/game/fortune", "/game/ladder", "/house", "/notes",
  "/posts", "/privacy", "/tags", "/blog/[...slug]",
];
const legacyRedirects = {
  "/blog": "/",
  ...Object.fromEntries(legacyPaths.map((path) => [`/blog${path}`, path])),
};

function serverApiRoutes() {
  const endpoints = {
    jobs: "jobs/index",
    "jobs/[id]": "jobs/[id]",
    "jobs/process": "jobs/process",
    "saju-requests": "saju-requests/index",
    "saju-requests/[id]": "saju-requests/[id]",
    "saju-requests/process": "saju-requests/process",
    telemetry: "telemetry",
    "views/[slug]": "views/[slug]",
  };

  return {
    name: "blog-server-api",
    hooks: {
      "astro:config:setup": ({ injectRoute }) => {
        for (const [pattern, file] of Object.entries(endpoints)) {
          injectRoute({
            pattern: `/api/${pattern}`,
            entrypoint: `./src/server-api/${file}.ts`,
            prerender: false,
          });
        }
      },
    },
  };
}

const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:4321");

// https://astro.build/config
export default defineConfig({
  site: pages ? pagesSite : site,
  base: pages && pagesBase ? pagesBase : "/",
  redirects: pages && accountSite ? legacyRedirects : {},
  output: pages ? "static" : "hybrid",
  adapter: pages ? undefined : vercel({ runtime: "nodejs20" }),
  vite: {
    define: {
      "import.meta.env.PUBLIC_STATIC_BLOG": JSON.stringify(pages),
    },
  },
  integrations: [
    ...(pages ? [] : [serverApiRoutes()]),
    react(),
    sitemap(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  markdown: {
    rehypePlugins: pages ? [[rehypePagesLinks, { base: pagesBase, site: pagesSite }]] : [],
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
