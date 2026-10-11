// Safely add only missing social sharing metadata to static HTML heads.
// Preserves every byte after </head>, existing per-page share images, and all copy.
import fs from 'node:fs';
import path from 'node:path';

const base = 'https://edinburgh-walking-tour.scotlandkorea.workers.dev';
const fallback = base + '/assets/ef5aaf4cfaf9f16155eb5ee1cd41d106619e0101e5cda928c3643511b0087258.png';
const write = process.argv.includes('--write');
const pages = ['index.html'];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.html')) pages.push(full);
  }
}
['places','edinburgh','scotland','st-andrews','travel'].forEach(walk);
function attr(tag, key) {
  const entries = [...tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)];
  const found = entries.find(e => e[1].toLowerCase() === key);
  return found ? (found[2] ?? found[3]) : null;
}
function hasMeta(head,key,val) {
  return (head.match(/<meta\b[^>]*>/gi) ?? [])
    .some(tag => attr(tag,key)?.toLowerCase() === val);
}
function relevantImage(html) {
  // Existing content photographs are preferred; do not invent thumbnails.
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = attr(tag,'src');
    if (!src || !/^\/(?:assets|images)\//.test(src)) continue;
    const pathOnly = src.split(/[?#]/)[0];
    if (!/\.(?:png|jpe?g|webp)$/i.test(pathOnly)) continue;
    let file;
    try { file = decodeURIComponent(pathOnly).slice(1); } catch { continue; }
    if (fs.existsSync(file)) return base + pathOnly;
  }
  return fallback;
}
let changed=0, missingOG=0, missingCard=0, firstPhoto=0;
const sample=[];
for (const file of pages) {
  const html = fs.readFileSync(file,'utf8');
  const end = html.search(/<\/head>/i);
  if (end<0)throw Error(file + ': no closing head');
  const head = html.slice(0,end), rest=html.slice(end);
  const needsOG = !hasMeta(head,'property','og:image');
  const needsCard = !hasMeta(head,'name','twitter:card');
  if (!needsOG&&!needsCard) continue;
  const added=[];
  let selected=null;
  if (needsOG) {
    selected = relevantImage(html);
    added.push('<meta property="og:image" content="' + selected + '">');
    missingOG++;
    if (selected!==fallback) firstPhoto++;
  }
  if (needsCard) {
    added.push('<meta name="twitter:card" content="summary_large_image">');
    missingCard++;
  }
  const result=head+added.join('\n')+'\n'+rest;
  if (result.split(/<\/head>/i).slice(1).join('</head>')!==html.split(/<\/head>/i).slice(1).join('</head>')) throw Error(file + ': body changed');
  if (write) fs.writeFileSync(file,result,'utf8');
  changed++;
  if(sample.length<20)sample.push({file,image:selected,card:needsCard});
}
console.log(JSON.stringify({mode:write?'write':'report',pages:pages.length,filesToUpdate:changed,missingOgImage:missingOG,missingTwitterCard:missingCard,usingPagePhoto:firstPhoto,usingGenericFallback:missingOG-firstPhoto,sample},null,2));
