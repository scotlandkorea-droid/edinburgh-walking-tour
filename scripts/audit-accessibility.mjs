// Enforced static HTML accessibility checks (no markup writes).
// Manual keyboard/screen-reader and mobile checks remain necessary.
import fs from 'node:fs';
import path from 'node:path';
const pages=['index.html'];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const d of fs.readdirSync(dir,{withFileTypes:true})){
    const name=path.posix.join(dir,d.name);
    if(d.isDirectory())walk(name);
    else if(d.isFile()&&name.endsWith('.html'))pages.push(name);
  }
}
['places','edinburgh','scotland','st-andrews','travel'].forEach(walk);
const finds={missingLanguage:[],missingMain:[],missingSharedHeaderScript:[],duplicateIds:[],targetBlankWithoutNoopener:[],iframeMissingTitle:[],buttonsWithoutName:[],modalStackingConflicts:[]};
function attr(tag,key){
  const found=[...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .find(m=>m[1].toLowerCase()===key);
  return found?(found[2]??found[3]):null;
}
for(const p of pages){
  const html=fs.readFileSync(p,'utf8');
  if(!/<html\b[^>]*\blang=["']ko["']/i.test(html))finds.missingLanguage.push(p);
  if(!/<main\b[^>]*>/i.test(html))finds.missingMain.push(p);
  if(!/<script\b[^>]*src=["']\/assets\/site-header\.js/i.test(html))finds.missingSharedHeaderScript.push(p);
  const ids=[...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
  const duplicates=ids.filter((name,i)=>ids.indexOf(name)!==i);
  if(duplicates.length)finds.duplicateIds.push({page:p,ids:[...new Set(duplicates)]});
  for(const tag of html.match(/<a\b[^>]*>/gi)??[]){
    if(attr(tag,'target')!=='_blank')continue;
    const rel=attr(tag,'rel')??'';
    if(!/noopener/i.test(rel))finds.targetBlankWithoutNoopener.push(p);
  }
  for(const tag of html.match(/<iframe\b[^>]*>/gi)??[])
    if(!attr(tag,'title'))finds.iframeMissingTitle.push(p);
  // A button with an icon and no text or ARIA label is likely inaccessible.
  for(const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)){
    if(attr(m[0].split('>')[0]+'>','aria-label'))continue;
    const text=m[1].replace(/<[^>]*>/g,'').trim();
    if(!text&&!/title=["']/.test(m[0]))finds.buttonsWithoutName.push(p);
  }
}
// Keep document-level photo/map dialogs above the sticky shared header.
const css=fs.readFileSync('assets/site.css','utf8');
const layer=(name)=>{
  const start=css.indexOf('.'+name+'{');
  if(start<0)return 0;
  const rule=css.slice(start,css.indexOf('}',start));
  return Number(rule.match(/z-index:(\d+)/)?.[1]??0);
};
const headerLayer=layer('site-header');
const photoLayer=layer('lightbox');
const mapLayer=layer('route-map-modal');
if(!(headerLayer>0&&photoLayer>headerLayer&&mapLayer>photoLayer))
  finds.modalStackingConflicts.push({headerLayer,photoLayer,mapLayer});
console.log(JSON.stringify({totalPages:pages.length,issues:Object.fromEntries(Object.entries(finds).map(([k,v])=>[k,{count:v.length,examples:v.slice(0,16)}]))},null,2));
const failures = Object.entries(finds).filter(([, items]) => items.length);
if (failures.length) {
  console.error('Accessibility consistency gate FAILED: ' +
    JSON.stringify(failures.map(([name, items]) => ({name, count:items.length}))));
  process.exitCode = 1;
} else {
  console.log('Accessibility consistency gate PASS');
}
