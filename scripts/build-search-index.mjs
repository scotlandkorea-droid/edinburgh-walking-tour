// Generate the sole browser search index from the actual site pages.
// Human curation is limited to scripts/search-curation.json (aliases and exceptions).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const curation = JSON.parse(read('scripts/search-curation.json'));
const ctx = { window: {} };
vm.runInNewContext(read('assets/navigation-data.js'), ctx, { timeout: 1000 });
const storyPaths = new Set(
  (ctx.window.EW_NAV_DATA.series || [])
    .filter(series => series.kind === '이야기')
    .flatMap(series => (series.items || []).map(item => item.url))
);
const decode = value => String(value || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&(?:nbsp|amp|lt|gt|quot|apos|rsquo|lsquo|ldquo|rdquo|hellip);/gi, entity => ({
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&apos;': "'", '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“',
    '&rdquo;': '”', '&hellip;': '…'
  })[entity.toLowerCase()] || entity)
  .replace(/\s+/g, ' ').trim();
const plain = html => decode(String(html || '')
  .replace(/<(?:script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|header|footer)>/gi, ' ')
  .replace(/<[^>]+>/g, ' '));
const excerpt = (value, size) => {
  const text = plain(value);
  return text.length > size ? text.slice(0, size).trimEnd() + '…' : text;
};
const tagContent = (html, tag) => {
  const match = html.match(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
  return match ? match[1] : '';
};
const meta = (html, key, value) => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = Object.fromEntries(
      [...m[0].matchAll(/([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
        .map(a => [a[1].toLowerCase(), a[2] ?? a[3]])
    );
    if ((attrs[key] || '').toLowerCase() === value.toLowerCase()) return decode(attrs.content);
  }
  return '';
};
const classify = url => {
  if (url === '/') return '홈';
  if (url === '/edinburgh/tour-guide.html') return '투어';
  if (['/edinburgh/places.html', '/edinburgh/themes.html', '/edinburgh/people.html'].includes(url)) return '허브';
  if (url.startsWith('/travel/')) return '여행정보';
  if (url.startsWith('/edinburgh/people/')) return '인물';
  if (url.startsWith('/edinburgh/themes/')) return '테마';
  if (storyPaths.has(url)) return '이야기';
  if (url.startsWith('/scotland/') || url.startsWith('/st-andrews/')) return '스코틀랜드';
  return '장소';
};
const htmlFiles = ['index.html'];
const scan = dir => {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) scan(relative);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(relative);
  }
};
for (const dir of ['places', 'edinburgh', 'scotland', 'st-andrews', 'travel']) scan(dir);
const rows = [];
for (const file of htmlFiles.sort()) {
  const html = read(file);
  const url = file === 'index.html' ? '/'
    : file === 'st-andrews/index.html' ? '/st-andrews/'
    : '/' + file;
  const heading = plain(tagContent(html, 'h1'));
  const title = curation.titleOverrides?.[url]
    || (url === '/' ? '에든버러 워킹투어'
      : heading || plain(tagContent(html, 'title')).split(' | ')[0]);
  if (!title) throw new Error('Missing searchable title: ' + file);
  const firstLead = html.match(/<p\b[^>]*class=["'][^"']*\blead\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  const main = tagContent(html, 'main');
  const firstParagraph = main.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  const description = excerpt(
    meta(html, 'name', 'description') || meta(html, 'property', 'og:description') || firstLead || firstParagraph || title,
    100
  );
  const headings = [...main.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => plain(m[1])).join(' ');
  const firstText = plain(main).slice(0, 135);
  const keywords = excerpt(headings, 180) + ' ' + firstText;
  const entry = {
    title,
    url,
    type: curation.typeOverrides?.[url] || classify(url),
    description,
    keywords: keywords.trim()
  };
  const aliases = [...new Set((curation.aliases?.[url] || [])
    .map(s => s.trim()).filter(s => s && s.toLowerCase() !== title.toLowerCase()))];
  if (aliases.length) entry.aliases = aliases;
  rows.push(entry);
}
for (const virtual of curation.virtual || []) rows.push(virtual);
const urls = new Set();
for (const item of rows) {
  if (urls.has(item.url)) throw new Error('Duplicate search URL: ' + item.url);
  urls.add(item.url);
}
const out = 'window.EW_SEARCH_INDEX=' + JSON.stringify(rows) + ';\n';
const target = path.join(root, 'assets/search-data.js');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== out) {
    console.error('Search index is out of date. Run: node scripts/build-search-index.mjs');
    process.exitCode = 1;
  } else console.log('Search index current:', rows.length, 'records');
} else {
  fs.writeFileSync(target, out);
  console.log('Generated search index:', rows.length, 'pages; bytes:', Buffer.byteLength(out));
}
