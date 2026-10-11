// Fill missing intrinsic image dimensions using local image headers.
// Preserve text, pixels, image URLs, order and existing CSS; safe to re-run.
import fs from 'node:fs';
import path from 'node:path';
const write=process.argv.includes('--write');
const pages=['index.html'];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.posix.join(dir,entry.name);
    if(entry.isDirectory())walk(file);
    else if(entry.isFile()&&file.endsWith('.html'))pages.push(file);
  }
}
['places','edinburgh','scotland','st-andrews','travel'].forEach(walk);
function attributes(tag){
  const data={};
  for(const m of tag.matchAll(/([a-zA-Z_][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))data[m[1].toLowerCase()]=m[2]??m[3];
  return data;
}
function dims(bytes){
  if(bytes.length<25)return null;
  if(bytes.toString('hex',0,8)==='89504e470d0a1a0a')return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
  if(bytes[0]===0xff&&bytes[1]===0xd8){
    let p=2;
    while(p+9<bytes.length){
      if(bytes[p++]!==0xff)break;
      while(p<bytes.length&&bytes[p]===0xff)p++;
      const marker=bytes[p++];
      if(marker===0xd9||marker===0xda)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      if(p+2>bytes.length)break;
      const len=bytes.readUInt16BE(p);
      if(len<2||p+len>bytes.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))
        return [bytes.readUInt16BE(p+5),bytes.readUInt16BE(p+3)];
      p+=len;
    }
  }
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
    const type=bytes.toString('ascii',12,16);
    if(type==='VP8X'&&bytes.length>=30)return [1+bytes.readUIntLE(24,3),1+bytes.readUIntLE(27,3)];
    if(type==='VP8L'&&bytes.length>=25&&bytes[20]===0x2f){
      const [b1,b2,b3,b4]=[bytes[21],bytes[22],bytes[23],bytes[24]];
      return [1+(((b2&63)<<8)|b1),1+(((b4&15)<<10)|(b3<<2)|((b2&192)>>6))];
    }
    if(type==='VP8 '&&bytes.length>=30&&bytes[23]===0x9d&&bytes[24]===0x01&&bytes[25]===0x2a)
      return [bytes.readUInt16LE(26)&16383,bytes.readUInt16LE(28)&16383];
  }
  return null;
}
const cache=new Map(),missing=[],examples=[];
let updatedImages=0,updatedPages=0,unreadable=0;
for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  let changed=0;
  const next=html.replace(/<img\b[^>]*>/gi,tag=>{
    const a=attributes(tag);
    if(a.width&&a.height)return tag;
    const src=a.src?.split(/[?#]/)[0];
    if(!src||!/^\/(?:assets|images)\//.test(src))return tag;
    let file;try{file=decodeURIComponent(src).slice(1)}catch{return tag}
    if(!fs.existsSync(file)){missing.push({page,src});return tag}
    if(!cache.has(file))cache.set(file,dims(fs.readFileSync(file)));
    const xy=cache.get(file);
    if(!xy||xy.some(n=>!Number.isInteger(n)||n<1||n>50000)){unreadable++;return tag}
    const extra=(a.width?'':' width="'+xy[0]+'"')+(a.height?'':' height="'+xy[1]+'"');
    if(!extra)return tag;
    changed++;updatedImages++;
    return tag.replace(/(\s*\/?>)$/,extra+'$1');
  });
  if(changed){
    if(write)fs.writeFileSync(page,next,'utf8');
    updatedPages++;
    if(examples.length<25)examples.push({page,images:changed});
  }
}
console.log(JSON.stringify({mode:write?'write':'report',pages:pages.length,updatedPages,updatedImages,examples,missingFiles:missing.slice(0,12),unreadableImages:unreadable},null,2));
if(missing.length||unreadable)process.exitCode=1;
