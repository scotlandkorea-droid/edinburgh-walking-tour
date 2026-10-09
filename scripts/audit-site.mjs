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
  const title = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = head.match(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*\bcontent=["']([^"']+)["'][^>]*>/i)?.[1]?.trim();
  const noindex = /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*content=["'][^"']*noindex/i.test(head);
  if (!title) issues.push(file + ': missing document title');
  // Unpublished noindex placeholders do not need a search-snippet description.
  if (!description && !noindex) issues.push(file + ': missing meta description');
  const canonical = head.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
  if (!canonical) issues.push(file + ': no canonical link');
  else if (!canonical.endsWith(pathname)) issues.push(file + ': canonical differs from ' + pathname);
  const ogUrl = head.match(/<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*\bcontent=["']([^"']+)["'][^>]*>/i)?.[1];
  if (ogUrl && canonical && ogUrl !== canonical)
    issues.push(file + ': social sharing URL differs from canonical URL');
  if (noindex) noindexPages++;
  else {
    indexablePages++;
    if (!sitemap.has(pathname)) issues.push(file + ': indexable page is missing from sitemap');
  }

  // Only static HTML links: JavaScript-generated URLs are checked by the
  // shared navigation/search data tests, not treated as ordinary anchors.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  for (const img of markup.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=\s*["'][^"']*["']/i.test(img[0]))
      issues.push(file + ': image is missing alt attribute');
  }
  for (const anchor of markup.matchAll(/<a\b[^>]*>/gi)) {
    if (/\btarget\s*=\s*["']_blank["']/i.test(anchor[0]) &&
        !/\brel\s*=\s*["'][^"']*\b(?:noopener|noreferrer)\b/i.test(anchor[0]))
      issues.push(file + ': external-window link is missing rel=noopener');
  }
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

/* Check JavaScript-generated navigation and search references too.
   These links are not visible to the HTML href/src scan above. */
const vm = await import('node:vm');
const shared = {window:{}};
vm.runInNewContext(read('assets/navigation-data.js'),shared,{timeout:1000});
vm.runInNewContext(read('assets/search-data.js'),shared,{timeout:1000});
const navigation=shared.window.EW_NAV_DATA;
const searchRows=shared.window.EW_SEARCH_INDEX;
const curation=JSON.parse(read('scripts/search-curation.json'));
const navigable=url=>{
  const pathname=String(url||'').split(/[?#]/)[0]||'/';
  return existing.has(pathname)||redirects.has(pathname);
};
let navRefs=0;
const testItems=(group,items,{numbered=false}={})=>{
  const local=new Set();
  (items||[]).forEach((item,index)=>{
    if(!item.name||!String(item.name).trim())issues.push(group+': empty navigation label');
    if(!item.url||!navigable(item.url))issues.push(group+': missing navigation destination '+item.url);
    if(numbered&&item.number!==String(index+1).padStart(2,'0'))
      issues.push(group+': wrong numbered item at '+index);
    if(local.has(item.url))issues.push(group+': duplicate navigation URL '+item.url);
    local.add(item.url);
    navRefs++;
  });
};
for(const series of navigation.series||[]){
  if(!navigable(series.hub))issues.push(series.id+': missing series hub '+series.hub);
  testItems('series '+series.id,series.items,{numbered:true});
  if(series.placeItems)testItems('series '+series.id+' place',series.placeItems);
}
for(const region of navigation.placeRegions||[])testItems('region '+region.id,region.items);
for(const [name,sequence] of Object.entries(navigation.roleSequences||{})){
  if(!navigable(sequence.hub))issues.push('role '+name+': missing hub '+sequence.hub);
  testItems('role '+name,sequence.items);
}
const rowsByUrl=new Map();
for(const row of searchRows||[]){
  if(rowsByUrl.has(row.url))issues.push('search: duplicate URL '+row.url);
  rowsByUrl.set(row.url,row);
  if(!navigable(row.url))issues.push('search: missing page '+row.url);
  if(!row.title||!row.description)issues.push('search: missing title or description '+row.url);
  const aliases=(row.aliases||[]).map(a=>a.trim().toLowerCase());
  if(new Set(aliases).size!==aliases.length)issues.push('search: duplicate alias '+row.url);
}
for(const field of ['aliases','titleOverrides','typeOverrides']){
  for(const url of Object.keys(curation[field]||{}))
    if(!rowsByUrl.has(url))issues.push('curation: orphan '+field+' entry '+url);
}
console.log('Shared data: '+navRefs+' navigation entries, '
  +searchRows.length+' search records; source references checked');


// Every Worker-managed URL must also route through the Worker on Cloudflare.
// Keep the runtime configuration and the shared-asset revalidation list in sync.
const workerSource=read('worker.js');
const workerCacheBlock=workerSource.match(/const revalidateAssets\s*=\s*new Set\(\[([\s\S]*?)\]\)/)?.[1];
if(!workerCacheBlock)issues.push('worker: cannot locate shared asset revalidation list');
else {
  const workerCache=JSON.parse('['+workerCacheBlock+']');
  const wrangler=JSON.parse(read('wrangler.jsonc'));
  const first=new Set(wrangler.assets?.run_worker_first||[]);
  for(const url of ['/', '/st-andrews/', ...redirects, ...workerCache])
    if(!first.has(url))issues.push('wrangler: URL must run Worker first: '+url);
  for(const url of workerCache)
    if(!existing.has(url))issues.push('worker: cached asset is missing: '+url);
  console.log('Worker routing: '+workerCache.length+' shared assets and all known redirects checked');
}

console.log('Audited ' + pages.length + ' HTML pages, ' + linksChecked
  + ' local references, ' + indexablePages + ' indexable pages, '
  + noindexPages + ' noindex pages');
if (issues.length) {
  console.error('Integrity issues (' + issues.length + '):\n' + issues.slice(0, 50).join('\n'));
  process.exitCode = 1;
} else console.log('Source integrity: PASS');
