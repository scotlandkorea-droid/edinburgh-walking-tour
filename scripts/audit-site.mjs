// Source-only safety checks for the static site. No external packages.
// This file lives under scripts/ (excluded from published site assets).
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(file, 'utf8');
const scanDirs = ['places', 'edinburgh', 'scotland', 'st-andrews', 'travel'];
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const name = path.posix.join(dir, entry.name);
  if (entry.isDirectory()) return walk(name);
  return entry.isFile() && name.endsWith('.html') ? [name] : [];
});
const pages = ['index.html', ...scanDirs.flatMap(walk)];
const existing = new Set(pages.map(p => '/' + p));
function collect(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.posix.join(dir, f.name);
    if (f.isDirectory()) collect(filename);
    else if (f.isFile()) existing.add('/' + filename);
  }
}
for (const dir of ['assets', 'images']) if (fs.existsSync(dir)) collect(dir);
existing.add('/');
existing.add('/st-andrews/');

const redirects = new Set([
  '/st-andrews', '/travel/st-andrews.html', '/travel/st-andrews', '/travel/st-andrews/',
  '/edinburgh/places/adam-smith-grave.html', '/edinburgh/places/city-chambers.html',
  '/edinburgh/places/mercat-cross.html', '/places/canongate-overview.html',
  '/places/royal-mile-overview.html', '/places/canongate-horatius-bonar.html',
  '/places/canongate-scrooge.html', '/places/canongate-holyrood-end.html',
  '/scotland/places/melrose-abbey.html', '/scotland', '/scotland/',
  '/scotland/index.html'
]);

const sitemap = new Set([...read('sitemap.xml').matchAll(/<loc>\s*https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)]
  .map(m => m[1]));
const issues = [];
let linksChecked = 0, noindexPages = 0, indexablePages = 0;

for (const file of pages) {
  const html = read(file);
  const pathname = file === 'index.html' ? '/'
    : file === 'st-andrews/index.html' ? '/st-andrews/' : '/' + file;
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  if (h1Count !== 1) issues.push(file + ': expected exactly one H1, got ' + h1Count);
  const head = html.split(/<\/head>/i)[0];
  const canonical = head.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
  if (!canonical) issues.push(file + ': no canonical link');
  else if (!canonical.endsWith(pathname)) issues.push(file + ': canonical differs from ' + pathname);
  const noindex = /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*content=["'][^"']*noindex/i.test(head);
  if (noindex) noindexPages++;
  else {
    indexablePages++;
    if (!sitemap.has(pathname)) issues.push(file + ': indexable page is missing from sitemap');
  }

  // Only static HTML links: JavaScript-generated URLs are checked by the
  // shared navigation/search data tests, not treated as ordinary anchors.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  for (const match of markup.matchAll(/\b(?:href|src|poster)=["'](\/[^"']+)["']/gi)) {
    let target = match[1].split(/[?#]/)[0];
    if (!target || target.startsWith('//')) continue;
    linksChecked++;
    try { target = decodeURIComponent(target); }
    catch { issues.push(file + ': invalid percent encoding in ' + match[1]); continue; }
    if (!existing.has(target) && !redirects.has(target))
      issues.push(file + ': missing local asset/page ' + target);
  }
}
for (const url of sitemap) {
  if (url !== '/' && !existing.has(url) && url !== '/st-andrews/')
    issues.push('sitemap: non-existent destination ' + url);
}
console.log('Audited ' + pages.length + ' HTML pages, ' + linksChecked
  + ' local references, ' + indexablePages + ' indexable pages, '
  + noindexPages + ' noindex pages');
if (issues.length) {
  console.error('Integrity issues (' + issues.length + '):\n' + issues.slice(0, 50).join('\n'));
  process.exitCode = 1;
} else console.log('Source integrity: PASS');
