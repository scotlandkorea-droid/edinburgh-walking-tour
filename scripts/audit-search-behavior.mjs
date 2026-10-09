// Regression-check the actual client-side search ranking without a DOM,
// external packages or duplicate hand-maintained search logic.
// Evaluates only the pure functions from the shared browser search source.
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(path,'utf8');
const context={window:{}};
vm.runInNewContext(read('assets/search-data.js'),context,{timeout:1000});
const records=context.window.EW_SEARCH_INDEX;
const curation=JSON.parse(read('scripts/search-curation.json'));
const source=read('assets/site-header.js');

function section(from,to){
  const a=source.indexOf(from),b=source.indexOf(to,a);
  if(a<0||b<0||b<=a)throw new Error('Search code section not found: '+from);
  return source.slice(a,b);
}
// Do not copy or reimplement search rules in the test. Import the pure
// routines directly from the visitor-facing header's existing source.
const pure=section('    const normalize=value=>','    const loadSearchData=()=>')
  +section('    const directMatches=(query,data)=>','    const renderResults=async value=>');
const {normalize,directMatches,fuzzyMatches}=new Function(
  pure+'; return {normalize,directMatches,fuzzyMatches};'
)();
if(typeof fuzzyMatches!=='function')throw new Error('Fuzzy matching missing');

let checks=0;
const misses=[];
const cache=new Map();
function assertFinds(url,phrase,kind){
  const query=normalize(phrase);
  let results=cache.get(query);
  if(!results){
    results=directMatches(query,records).slice(0,8).map(x=>x.record.url);
    cache.set(query,results);
  }
  checks++;
  if(!results.includes(url))misses.push({url,phrase,kind,top:results.slice(0,3)});
}

for(const row of records)assertFinds(row.url,row.title,'title');
for(const [url,variants] of Object.entries(curation.aliases||{}))
  for(const alias of variants)assertFinds(url,alias,'approved spelling');

// Basic typo fallback remains available; do not require an arbitrary
// misspelling to match a particular page or rank above an exact title.
if(!fuzzyMatches('세인트 자일ㅅ',records).length)
  misses.push({kind:'fuzzy',phrase:'세인트 자일ㅅ'});

console.log('Internal search behavior: '+checks+
  ' title/approved-alias queries, '+cache.size+' unique queries checked');
if(misses.length){
  console.error('Search regressions ('+misses.length+'): '+
    JSON.stringify(misses.slice(0,20)));
  process.exitCode=1;
}else console.log('Internal search ranking: PASS');
