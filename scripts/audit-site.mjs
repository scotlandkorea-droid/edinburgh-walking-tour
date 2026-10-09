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
  '/scotland/index.html',
  '/assets/city-chambers-courtyard-18363.png',
  '/assets/city-chambers-front-18362.png',
  '/assets/new-college/john-knox-statue-final.png',
  '/assets/new-college/new-college-courtyard.png'
]);

const sitemap = new Set([...read('sitemap.xml').matchAll(/<loc>\s*https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)]
  .map(m => m[1]));
const issues = [];
let linksChecked = 0, noindexPages = 0, indexablePages = 0;


// Resolve real scroll targets from the site's existing HTML. The navigation
// context hashes #tour-nav and #place-nav are intentionally handled by JS.
let fragmentLinksChecked = 0;
const siteOrigin = 'https://edinburgh-walking-tour.scotlandkorea.workers.dev';
const htmlFilesByPath = new Map(pages.map(file => [
  file === 'index.html' ? '/' :
    file === 'st-andrews/index.html' ? '/st-andrews/' : '/' + file,
  file
]));
const anchorIdsByFile = new Map();
const anchorsIn = file => {
  if (!anchorIdsByFile.has(file)) {
    const target = read(file);
    const ids = new Set([...target.matchAll(/\bid=["']([^"']+)["']/gi)].map(m => m[1]));
    for (const match of target.matchAll(/<a\b[^>]*\bname=["']([^"']+)["']/gi))
      ids.add(match[1]);
    anchorIdsByFile.set(file, ids);
  }
  return anchorIdsByFile.get(file);
};

for (const file of pages) {
  const html = read(file);
  const pathname = file === 'index.html' ? '/'
    : file === 'st-andrews/index.html' ? '/st-andrews/' : '/' + file;
  // Shared header/search/CSS must be present on every page. Otherwise a new
  // article could exist in search data without offering the search UI itself.
  if(!/<header\b[^>]*class=["'][^"']*\bsite-header\b/i.test(html))
    issues.push(file+': missing shared site header');
  if(!/<script\b[^>]*src=["']\/assets\/site-header\.js(?:\?[^"']*)?["']/i.test(html))
    issues.push(file+': missing shared header/search script');
  if(!/<link\b[^>]*href=["']\/assets\/site\.css(?:\?[^"']*)?["']/i.test(html))
    issues.push(file+': missing shared site CSS');
  // Guard against old/new HTML snippets accidentally loading shared UI twice.
  // A second header script executes the menu/search event setup a second time.
  for(const [label,pattern] of [
    ['shared site CSS',/<link\b[^>]*href=["']\/assets\/site\.css(?:\?[^"']*)?["'][^>]*>/gi],
    ['shared header/search script',/<script\b[^>]*src=["']\/assets\/site-header\.js(?:\?[^"']*)?["'][^>]*>/gi]
  ]){
    const count=[...html.matchAll(pattern)].length;
    if(count>1)issues.push(file+': duplicate '+label+' ('+count+' loads)');
  }
  // A numbered tour/place page can intentionally keep two context variants
  // (one for tour, one for place). A second generic .page-nav is never needed:
  // it doubles the visible previous/next card before shared JS replaces it.
  const pageNavTags=[...html.matchAll(/<nav\b[^>]*>/gi)]
    .map(match=>match[0])
    .filter(tag=>{
      const value=tag.match(/\bclass=["']([^"']+)["']/i)?.[1]||'';
      return value.split(/\s+/).includes('page-nav');
    });
  if(pageNavTags.length>1){
    const contexts=pageNavTags.map(tag=>
      tag.match(/\bdata-nav-system=["']([^"']+)["']/i)?.[1]||'');
    const allowedContexts=pageNavTags.length===2 &&
      new Set(contexts).size===2 &&
      contexts.includes('tour') && contexts.includes('place');
    if(!allowedContexts)
      issues.push(file+': duplicate static page-nav outside intentional tour/place pair');
  }
  // Deep-dive articles are one shared role, with the actual source story in
  // breadcrumbs and one fixed return link. Never duplicate the article or
  // introduce page-specific style shims when a new explainer is published.
  const deepDiveOrigins=new Map([
    ['/travel/explainers/honours-and-orders.html','/places/st-giles-thistle-chapel.html'],
    ['/edinburgh/themes/execution-sites.html','/places/grassmarket-executions-covenanters.html']
  ]);
  if(deepDiveOrigins.has(pathname)||/\bdeep-dive-detail\b/.test(html.match(/<body\b[^>]*>/i)?.[0]||'')){
    const origin=deepDiveOrigins.get(pathname);
    const bodyTag=html.match(/<body\b[^>]*>/i)?.[0]||'';
    const intro=html.match(/<section\b[^>]*class=["'][^"']*theme-detail-intro[^"']*["'][^>]*>[\s\S]*?<\/section>/i)?.[0]||'';
    const crumbs=intro.match(/<div\b[^>]*class=["']breadcrumbs["'][^>]*>[\s\S]*?<\/div>/i)?.[0]||'';
    if(!/\bdeep-dive-detail\b/.test(bodyTag))
      issues.push(file+': missing shared deep-dive detail role');
    if(origin&&!crumbs.includes('href="'+origin+'"'))
      issues.push(file+': breadcrumb must link to originating story '+origin);
    if(!/class=["']breadcrumb-current["'][^>]*aria-current=["']page["']/.test(crumbs))
      issues.push(file+': missing current-page breadcrumb');
    if(!/<p\b[^>]*class=["']eyebrow["'][^>]*lang=["']en["'][^>]*>DEEP DIVE · [A-Z ]+<\/p>/.test(intro))
      issues.push(file+': missing shared English deep-dive eyebrow');
    if(!/<p\b[^>]*class=["']course-title-en["'][^>]*lang=["']en["'][^>]*>[^<]+<\/p>/.test(intro))
      issues.push(file+': missing English article title');
    const returns=[...html.matchAll(/<a\b[^>]*class=["'][^"']*\bdeep-dive-return\b[^"']*["'][^>]*href=["']([^"']+)["']/gi)];
    if(returns.length!==1||(origin&&returns[0]?.[1]!==origin))
      issues.push(file+': must have exactly one return link to originating story');
  }
  // Entire "더 자세히 보기" panel is one keyboard-focusable link.
  // No page-level click handlers, nested anchors or legacy div-only panels.
  const readingBoxes=[...html.matchAll(/<([a-z][\w:-]*)\b[^>]*\bclass=["'][^"']*\bfurther-reading-box\b[^"']*["'][^>]*>/gi)];
  for(const box of readingBoxes){
    const tag=box[0];
    if(box[1].toLowerCase()!=='a'||!/\bhref=["']\/[^"']+["']/.test(tag))
      issues.push(file+': full further-reading box must be one internal anchor');
    const end=html.indexOf('</a>',box.index+tag.length);
    if(end<0||/<a\b/i.test(html.slice(box.index+tag.length,end)))
      issues.push(file+': nested link or missing closing anchor in further-reading box');
  }
  const expectedDeepDive=[...deepDiveOrigins.entries()].find(([,origin])=>origin===pathname)?.[0];
  if(expectedDeepDive&&(readingBoxes.length!==1||!readingBoxes[0][0].includes('href="'+expectedDeepDive+'"')))
    issues.push(file+': originating story must contain exactly one full-card link to its deep dive');
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  if (h1Count !== 1) issues.push(file + ': expected exactly one H1, got ' + h1Count);
  const head = html.split(/<\/head>/i)[0];
  // Multiple canonical/robots/OG URL tags are ambiguous for crawlers
  // and are a common leftover when a complete article replaces a draft.
  const headTags=[...head.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map(m=>m[0]);
  const attributes=tag=>{
    const entries=[...tag.matchAll(/([a-zA-Z-]+)\s*=\s*["']([^"']*)["']/g)];
    return Object.fromEntries(entries.map(m=>[m[1].toLowerCase(),m[2].toLowerCase()]));
  };
  const descriptions=[
    ['canonical',tag=>/^<link\b/i.test(tag)&&attributes(tag).rel==='canonical'],
    ['robots',tag=>/^<meta\b/i.test(tag)&&attributes(tag).name==='robots'],
    ['description',tag=>/^<meta\b/i.test(tag)&&attributes(tag).name==='description'],
    ['og:url',tag=>/^<meta\b/i.test(tag)&&attributes(tag).property==='og:url']
  ];
  for(const [label,detect] of descriptions){
    const matches=headTags.filter(detect);
    if(matches.length>1)issues.push(file+': duplicate '+label+' metadata ('+matches.length+' tags)');
  }
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
  // Social previews must not silently point at deleted or renamed local photos.
  const socialMeta=[...head.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0]);
  for(const key of ['og:image','twitter:image']){
    const tag=socialMeta.find(value=>
      value.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1]===key);
    const imageUrl=tag?.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    if(!imageUrl)continue;
    let parsed;
    try{parsed=new URL(imageUrl,canonical||'https://edinburgh-walking-tour.scotlandkorea.workers.dev/')}
    catch{issues.push(file+': invalid social preview image URL');continue}
    if(parsed.origin!=='https://edinburgh-walking-tour.scotlandkorea.workers.dev')continue;
    let imagePath;
    try{imagePath=decodeURIComponent(parsed.pathname)}
    catch{issues.push(file+': malformed social preview image URL');continue}
    if(!existing.has(imagePath)&&!redirects.has(imagePath))
      issues.push(file+': missing '+key+' image '+imagePath);
  }
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

    const hrefMatch = anchor[0].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const href = hrefMatch?.[1] ?? hrefMatch?.[2];
    if (!href || !href.includes('#')) continue;
    let target;
    try { target = new URL(href.replace(/&amp;/g, '&'), siteOrigin + pathname); }
    catch { continue; }
    if (target.origin !== siteOrigin || !target.hash ||
        target.hash === '#tour-nav' || target.hash === '#place-nav') continue;
    const targetFile = htmlFilesByPath.get(target.pathname);
    if (!targetFile) continue; // redirected and external URLs have no local HTML ID target
    let fragment;
    try { fragment = decodeURIComponent(target.hash.slice(1)); }
    catch { issues.push(file + ': malformed local fragment ' + href); continue; }
    if (!fragment) continue;
    fragmentLinksChecked++;
    if (!anchorsIn(targetFile).has(fragment))
      issues.push(file + ': missing scroll target ' + href);
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

  // Responsive image sources are separate from img[src]. Check each local
  // srcset candidate so a deleted desktop/tablet photo cannot pass unnoticed.
  for (const tag of markup.matchAll(/<(?:source|img)\b[^>]*>/gi)) {
    const attr = tag[0].match(/\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!attr) continue;
    const candidates = (attr[1] ?? attr[2]).split(',');
    for (const candidate of candidates) {
      const raw = candidate.trim().split(/\s+/)[0];
      if (!raw || !raw.startsWith('/') || raw.startsWith('//')) continue;
      let imagePath = raw.split(/[?#]/)[0];
      linksChecked++;
      try { imagePath = decodeURIComponent(imagePath); }
      catch { issues.push(file + ': invalid srcset percent encoding in ' + raw); continue; }
      if (!existing.has(imagePath) && !redirects.has(imagePath))
        issues.push(file + ': missing responsive image ' + imagePath);
    }
  }
}

// Check externalized stylesheet images; static markup checks alone miss these.
for(const cssPath of ['assets/site.css']){
  const stylesheet=read(cssPath);
  for(const match of stylesheet.matchAll(/url\(\s*["']?(\/[^)"']+)/gi)){
    const raw=match[1].split(/[?#]/)[0];
    let imagePath;
    try{imagePath=decodeURIComponent(raw)}
    catch{issues.push(cssPath+': malformed image reference');continue}
    if(!existing.has(imagePath)&&!redirects.has(imagePath))
      issues.push(cssPath+': missing CSS resource '+imagePath);
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
// Internal search includes all HTML pages, including noindex and draft pages.
// noindex affects external search engines only. Catch accidental omissions.
const expectedSearchUrls=new Set(pages.map(file=>file==='index.html'?'/'
  :file==='st-andrews/index.html'?'/st-andrews/':'/'+file));
for(const url of expectedSearchUrls)
  if(!rowsByUrl.has(url))issues.push('search: HTML page missing from internal search '+url);
for(const field of ['aliases','titleOverrides','typeOverrides']){
  for(const url of Object.keys(curation[field]||{}))
    if(!rowsByUrl.has(url))issues.push('curation: orphan '+field+' entry '+url);
}
// Every manually approved alternate spelling must still find its intended page
// after the HTML-based search index is regenerated.
let validatedAliases=0;
for(const [url,variants] of Object.entries(curation.aliases||{})){
  const entry=rowsByUrl.get(url);
  if(!entry)continue;
  const present=new Set([entry.title,...(entry.aliases||[])]
    .map(value=>String(value).normalize('NFKC').toLocaleLowerCase('ko-KR').trim()));
  for(const variant of variants){
    validatedAliases++;
    if(!present.has(String(variant).normalize('NFKC').toLocaleLowerCase('ko-KR').trim()))
      issues.push('search: approved alias missing '+url+' / '+variant);
  }
}
console.log('Shared data: '+navRefs+' navigation entries, '
  +searchRows.length+' search records, '+expectedSearchUrls.size
  +' HTML pages, '+validatedAliases+' approved aliases verified');


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


// Test legacy JPEG-format correction as a real Worker GET/HEAD redirect.
const {default: routingWorker}=await import(
  'data:text/javascript;base64,'+Buffer.from(workerSource).toString('base64'));
const photoRedirects=new Map([
  ["/assets/city-chambers-courtyard-18363.png", "/assets/city-chambers-courtyard-18363.jpg"],
  ["/assets/city-chambers-front-18362.png", "/assets/city-chambers-front-18362.jpg"],
  ["/assets/new-college/john-knox-statue-final.png", "/assets/new-college/john-knox-statue-final.jpg"],
  ["/assets/new-college/new-college-courtyard.png", "/assets/new-college/new-college-courtyard.jpg"]
]);
for(const [from,to] of photoRedirects){
  if(!existing.has(to)) issues.push('missing corrected image '+to);
  for(const method of ['GET','HEAD']){
    const response=await routingWorker.fetch(
      new Request('https://example.test'+from+'?image-test=1',{method}),
      {ASSETS:{fetch:()=>{throw Error('Unexpected asset fetch on redirect')}}}
    );
    const destination=new URL(response.headers.get('location'));
    if(response.status!==301||destination.pathname!==to||
       destination.search!=='?image-test=1')
      issues.push('photo redirect failed: '+method+' '+from);
  }
}
console.log('Photo redirects: '+photoRedirects.size+' legacy URLs tested for GET/HEAD');

 // Exercise the real Worker handler with a mock asset binding, not just its
 // configuration. Old HTML query versions must not pin outdated shared UI.
 if(workerCacheBlock){
   const sharedAssets=JSON.parse('['+workerCacheBlock+']');
   const oldCache='public, max-age=31536000, immutable';
   let checked=0;
   for(const pathname of [...sharedAssets,'/places/new-town.html']){
     for(const method of ['GET','HEAD']){
       const requestUrl='https://example.test'+pathname+'?v=old-test-version';
       let fetchedPath='';
       const response=await routingWorker.fetch(
         new Request(requestUrl,{method}),
         {ASSETS:{fetch:assetRequest=>{
           fetchedPath=new URL(assetRequest.url).pathname;
           return new Response(null,{status:200,headers:{
             'Cache-Control':oldCache,
             'X-Audit-Asset':'preserved'
           }});
         }}}
       );
       const expectedCache=sharedAssets.includes(pathname)
         ?'public, max-age=0, must-revalidate':oldCache;
       if(response.status!==200||fetchedPath!==pathname||
          response.headers.get('Cache-Control')!==expectedCache||
          response.headers.get('X-Audit-Asset')!=='preserved')
         issues.push('worker asset cache header failed: '+method+' '+pathname);
       checked++;
     }
   }
   console.log('Worker cache: '+checked+' GET/HEAD responses checked with stale query versions');
 }

console.log('Audited ' + pages.length + ' HTML pages, ' + linksChecked
  + ' local references, ' + fragmentLinksChecked + ' scroll fragments, '
  + indexablePages + ' indexable pages, '
  + noindexPages + ' noindex pages');
if (issues.length) {
  console.error('Integrity issues (' + issues.length + '):\n' + issues.slice(0, 50).join('\n'));
  process.exitCode = 1;
} else console.log('Source integrity: PASS');
