# Ray Thompson website — Wix migration preview

Responsive recreation of the captured raythompson.info website. This directory is independent of the older 2023 HTML files in the repository. The migration branch does not replace or delete that history.

## Local development

Requires Node.js 22 or later. There are no production dependencies.

```sh
npm run build
npm test
npm run dev
```

The development server uses port 4173. Edit `content/pages.json` for page copy and semantic headings, `style.css` for layout, and `build.mjs` for templates. `content/source-pages.json` is the original captured reference, not the rendered source. Media is self-hosted under `assets/`; Wix image hotlinks are not required at runtime.

`build.mjs` creates a small, self-contained Worker module under `dist/`. This approach packages the current site's modest media collection without requiring a separate database, image host, or asset-storage account. All page HTML is server-rendered; the mobile menu works without JavaScript.

## Preview deployment

The preview Worker is `raythompson-preview`. `wrangler.jsonc` contains no production routes or custom-domain bindings. It cannot change live domain DNS when deployed as written. Cloudflare MCP can deploy the built module; alternatively use Wrangler with your own authorized Cloudflare session.

Before connecting automatic GitHub deployments, review the Cloudflare GitHub app's repository permissions. Set the root directory to `website`, build command to `npm run build`, and deploy command to `npx wrangler deploy`. Until launch approval, deploy only the preview Worker. Do not connect the existing legacy root HTML to production hosting.

## Search-engine safeguards

Every non-production hostname is always `noindex, nofollow, noarchive`, with both response headers and HTML meta tags. Preview robots.txt disallows crawling. Canonical URLs point to the existing www.raythompson.info addresses.

After replacement approval and approved domain cutover, configure the production Worker and set `ALLOW_INDEXING=true`. Only raythompson.info and www.raythompson.info can become indexable. Validate robots.txt, response headers, canonical URLs and sitemap.xml on the actual production host before declaring launch complete. Submit the sitemap to the relevant search-engine webmaster tools if authorized; indexability does not guarantee indexing or ranking.

## Launch checklist

- Review copy, typography, images, desktop layout, phone/tablet layout, article pages and contact links.
- The design uses the user's installed Avenir/Avenir Next where available, with system sans-serif fallbacks; Wix-hosted licensed font files have not been copied.
- The captured inventory contains seven main pages and four posts, not a proven exhaustive Wix export. The old sitemap returned a 404.
- Wix likes/comments are not implemented. Confirm whether to omit them or add a replacement before launch. No fake counts or interactive controls are displayed.
- Testimonials preserves the eight endorsements captured on the full page; the source's reference to 24 LinkedIn testimonials is not evidence that 24 were exported.
- Keep Wix and existing DNS live until approval. Back up current DNS before the switch; preserve unrelated email, verification and other records.
- Confirm the primary hostname and redirect its alternate; test existing deep links, 404 behavior and any additional legacy URLs.
- After approved launch, verify indexing settings on production and keep previews excluded. Retain a rollback path and do not cancel Wix until migration is verified.
