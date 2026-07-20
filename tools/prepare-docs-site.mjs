import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputDir = resolve(repoRoot, 'docs');

mkdirSync(outputDir, { recursive: true });

const baseUrl = (process.env.DOCS_BASE_URL || 'https://mlightcad.github.io/cad-viewer/').trim();
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

const robotsContent = `User-agent: *\nAllow: /\n\nSitemap: ${normalizedBaseUrl}sitemap.xml\n`;
writeFileSync(resolve(outputDir, 'robots.txt'), robotsContent, 'utf8');

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${normalizedBaseUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${normalizedBaseUrl}modules.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${normalizedBaseUrl}classes/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
</urlset>
`;
writeFileSync(resolve(outputDir, 'sitemap.xml'), sitemapContent, 'utf8');

console.log(`Prepared docs site metadata in ${outputDir} for ${normalizedBaseUrl}`);
