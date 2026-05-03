export function GET({ site }: { site?: URL }) {
  const siteURL = site || new URL('http://localhost:4321');
  const sitemapURL = new URL('/sitemap-index.xml', siteURL).href;

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapURL}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
