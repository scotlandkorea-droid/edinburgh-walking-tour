// Non-destructive CSS clean-up inventory.
// This report identifies classes only found in CSS, not in any site HTML/JS.
// It does not claim that candidates are safe to delete: JS may construct
// class names dynamically, selectors can match browser-created state, and
// unused declarations may have cascade relationships. Visual review required.
import fs from 'node:fs';
import path from 'node:path';

const read=p=>fs.readFileSync(p,'utf8');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
  const file=path.posix.join(dir,item.name);
  return item.isDirectory()?walk(file):item.isFile()?[file]:[];
});
const markup=[
  'index.html',
  ...['places','edinburgh','scotland','st-andrews','travel'].flatMap(walk)
    .filter(p=>p.endsWith('.html'))
];
const dynamicScripts=walk('assets').filter(p=>/\.(?:js|json)$/.test(p)&&p!=='assets/search-data.js');
const sources=[...markup,...dynamicScripts];
const sourceText=sources.map(read).join('\n');
const css=read('assets/site.css');
const clean=css.replace(/\/\*[\s\S]*?\*\//g,' ');
const referenced=new Set(
  [...sourceText.matchAll(/(?<![a-zA-Z0-9_-])([a-zA-Z_][a-zA-Z0-9_-]*)(?![a-zA-Z0-9_-])/g)].map(m=>m[1])
);
const rules=[];
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const selector=match[1].trim();
  if(!selector||selector.startsWith('@'))continue;
  const classes=[...selector.matchAll(/(?<!\\)\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map(m=>m[1]);
  if(!classes.length)continue;
  const unknown=[...new Set(classes.filter(c=>!referenced.has(c)))];
  if(unknown.length){
    const line=clean.slice(0,match.index).split('\n').length;
    rules.push({line,unknown,selector:selector.slice(0,180)});
  }
}
const grouped=new Map();
for(const {unknown,selector,line} of rules){
 for(const name of unknown){
   let item=grouped.get(name);
   if(!item){item={name,selectors:0,examples:[]};grouped.set(name,item)}
   item.selectors++;
   if(item.examples.length<2)item.examples.push(selector);
 }
}
const candidates=[...grouped.values()].sort((a,b)=>b.selectors-a.selectors||a.name.localeCompare(b.name));
console.log('CSS cleanup inventory: '+markup.length+' HTML files, '+dynamicScripts.length+
  ' JS/JSON sources, '+css.length+' CSS characters');
console.log('CSS classes absent from inspected HTML/JS tokens: '+candidates.length);
for(const c of candidates.slice(0,70))
  console.log('CSS CANDIDATE: '+c.name+' ('+c.selectors+' rules) -- '+c.examples.join(' || '));
console.log('Report only. No stylesheet or website content was modified.');
