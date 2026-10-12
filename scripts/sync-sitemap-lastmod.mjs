// Update public sitemap dates from actual material Git history, not deploy time.
// Requires complete Git history: actions/checkout with fetch-depth: 0.
// This script changes only sitemap.xml, never finished article HTML or photos.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const SITEMAP='sitemap.xml';
const ORIGIN='https://edinburgh-walking-tour.scotlandkorea.workers.dev';
const CHECK=process.argv.includes('--check');
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:12*1024*1024});
if(git(['rev-parse','--is-shallow-repository']).trim()!=='false')
  throw Error('Full Git history required for accurate lastmod (checkout fetch-depth: 0).');

function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const name=path.posix.join(dir,e.name);
    return e.isDirectory()?walk(name):e.isFile()&&name.endsWith('.html')?[name]:[];
  });
}
function attr(tag,name){
  const re=new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\'([^\\']*)\\')','i');
  const m=tag.match(re);return m?(m[1]??m[2]):null;
}
const head=html=>html.split(/<\/head\s*>/i)[0]||'';
function meta(h,name){
  for(const tag of h.match(/<meta\b[^>]*>/gi)||[])
    if(attr(tag,'name')?.toLowerCase()===name)return attr(tag,'content')||'';
  return '';
}
function pageCanonical(file,html){
  for(const tag of head(html).match(/<link\b[^>]*>/gi)||[]){
    if(attr(tag,'rel')?.toLowerCase()!=='canonical')continue;
    const href=attr(tag,'href');
    if(!href)throw Error(file+': canonical is empty');
    const url=new URL(href,ORIGIN);
    if(url.origin!==ORIGIN||url.search||url.hash)throw Error(file+': invalid canonical '+href);
    return url.href;
  }
  throw Error(file+': canonical is absent');
}
function significant(html){
  const h=head(html);
  let main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1]||'';
  main=main.replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<(?:script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/(?:script|style|svg|noscript)\s*>/gi,' ');
  const content=main.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
  const headings=[...main.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>/gi)]
    .map(m=>m[1].toLowerCase()+':'+m[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
  const links=[...main.matchAll(/<a\b[^>]*>/gi)]
    .map(m=>(attr(m[0],'href')||'').replace(/\?v=[^&#]*/i,'')).filter(Boolean);
  const images=[...main.matchAll(/<(?:img|source)\b[^>]*>/gi)]
    .map(m=>(attr(m[0],'src')||attr(m[0],'srcset')||'').replace(/\?v=[^&#]*/i,'')).filter(Boolean);
  const schemas=[...h.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m=>{try{return JSON.stringify(JSON.parse(m[1]));}catch{return m[1].replace(/\s+/g,' ').trim();}});
  const title=h.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.replace(/\s+/g,' ').trim()||'';
  const canonicalTag=(h.match(/<link\b[^>]*>/gi)||[]).find(tag=>attr(tag,'rel')?.toLowerCase()==='canonical')||'';
  // Ignore styling, spacing, image dimensions, cached asset versions,
  // and footer/shared code. Keep editorial text, headings, major media,
  // real links, metadata and structured data.
  return JSON.stringify({title,description:meta(h,'description'),robots:meta(h,'robots'),
    canonical:attr(canonicalTag,'href'),schemas,content,headings,links,images});
}
const blobs=new Map();
function at(sha,file){
  const key=sha+':'+file;
  if(blobs.has(key))return blobs.get(key);
  let value='';
  try{value=git(['show',key]);}catch{}
  blobs.set(key,value);
  return value;
}
function lastMaterialDate(file,html){
  const history=git(['log','--follow','--format=%H%x09%cI','--',file])
    .split('\n').filter(line=>/^[a-f0-9]{40}\t\d{4}-\d{2}-\d{2}/.test(line))
    .map(line=>{const [sha,date]=line.split('\t');return {sha,date:date.slice(0,10)};});
  if(!history.length)throw Error(file+': no Git history; refusing invented lastmod');
  let newer=significant(html);
  for(let i=0;i<history.length-1;i++){
    const older=at(history[i+1].sha,file);
    if(!older||newer!==significant(older))return history[i].date;
    newer=significant(older);
  }
  return history.at(-1).date; // First published revision.
}
const pages=['index.html',...['places','edinburgh','scotland','st-andrews','travel'].flatMap(walk)].sort();
const indexable=new Map();
for(const file of pages){
  const html=fs.readFileSync(file,'utf8');
  if(/\bnoindex\b/i.test(meta(head(html),'robots')))continue;
  const url=pageCanonical(file,html);
  if(indexable.has(url))throw Error('Duplicate canonical URL: '+url);
  indexable.set(url,{file,html});
}
const original=fs.readFileSync(SITEMAP,'utf8');
const seen=new Set();
let updatedDates=0,filledMissingDates=0,unchanged=0;
let xml=original.replace(/<url>([\s\S]*?)<\/url>/g,(whole,inner)=>{
  const loc=inner.match(/<loc>([^<]+)<\/loc>/)?.[1]?.replace(/&amp;/g,'&');
  if(!loc)throw Error('Sitemap URL without loc');
  if(seen.has(loc))throw Error('Duplicate sitemap loc: '+loc);
  seen.add(loc);
  const target=indexable.get(loc);
  if(!target)throw Error('Unknown or nonindexable sitemap loc: '+loc+' (manual review needed)');
  const date=lastMaterialDate(target.file,target.html);
  const old=inner.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  if(old===date){unchanged++;return whole;}
  if(old)updatedDates++;else filledMissingDates++;
  return old?whole.replace(/<lastmod>[^<]*<\/lastmod>/,'<lastmod>'+date+'</lastmod>')
    :whole.replace(/(<loc>[^<]*<\/loc>)/,'$1\n    <lastmod>'+date+'</lastmod>');
});
let addedURLs=0;
for(const [url,{file,html}] of indexable){
  if(seen.has(url))continue;
  const loc=url.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const block='  <url>\n    <loc>'+loc+'</loc>\n    <lastmod>'+lastMaterialDate(file,html)+'</lastmod>\n  </url>\n';
  xml=xml.replace(/<\/urlset>/,block+'</urlset>');
  addedURLs++;
}
if(seen.size+addedURLs!==indexable.size)throw Error('Sitemap coverage mismatch');
if(xml!==original&&!CHECK)fs.writeFileSync(SITEMAP,xml);
console.log(JSON.stringify({mode:CHECK?'check':'write',publicPages:indexable.size,
  sitemapURLs:seen.size+addedURLs,updatedDates,filledMissingDates,addedURLs,
  unchanged,changed:xml!==original},null,2));
if(CHECK&&xml!==original)process.exitCode=1;
