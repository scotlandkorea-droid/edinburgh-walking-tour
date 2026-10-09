// Inspect embedded image metadata without reading or printing private values.
// Report-only audit: never modify or re-encode photographs.
import fs from 'node:fs';
import path from 'node:path';

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.posix.join(dir, item.name);
    if (item.isDirectory()) walk(name);
    else if (item.isFile() && /\.(?:jpe?g|png|webp)$/i.test(name)) files.push(name);
  }
}
walk('assets');
walk('images');

function inspectJpeg(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return ['unreadable JPEG'];
  const flags = new Set();
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    const begin = offset + 2;
    if (marker === 0xe1) {
      const prefix = bytes.toString('ascii',begin,Math.min(begin+34,offset+length));
      if (prefix.startsWith('Exif\0\0')) flags.add('EXIF');
      else if (prefix.includes('http://ns.adobe.com/xap/')) flags.add('XMP');
    }
    if (marker === 0xed) flags.add('IPTC/APP13');
    if (marker === 0xfe) flags.add('JPEG comment');
    offset += length;
  }
  return [...flags];
}
function inspectPng(bytes) {
  if (bytes.toString('hex',0,8) !== '89504e470d0a1a0a') return ['unreadable PNG'];
  const flags = new Set();
  let off = 8;
  while (off + 12 <= bytes.length) {
    const n=bytes.readUInt32BE(off);
    const type=bytes.toString('ascii',off+4,off+8);
    if (off + 12 + n > bytes.length) break;
    if (['eXIf','iTXt','tEXt','zTXt'].includes(type)) flags.add(type==='eXIf'?'EXIF':'PNG text');
    off += n+12;
    if (type==='IEND') break;
  }
  return [...flags];
}
function inspectWebp(bytes) {
  if (bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP') return ['unreadable WebP'];
  const flags=new Set();
  let off=12;
  while (off+8<=bytes.length) {
    const type=bytes.toString('ascii',off,off+4), n=bytes.readUInt32LE(off+4);
    if (off + 8 + n>bytes.length) break;
    if(type==='EXIF'||type==='XMP ') flags.add(type.trim());
    off+=8+n+(n%2);
  }
  return [...flags];
}
let inspected=0;
const flagged=[],mismatched=[];
for (const file of files.sort()) {
  const bytes=fs.readFileSync(file);
  const format=bytes[0]===0xff&&bytes[1]===0xd8?'JPEG'
    :bytes.toString('hex',0,8)==='89504e470d0a1a0a'?'PNG'
    :bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'WebP':'unknown';
  const extension=/\.jpe?g$/i.test(file)?'JPEG':/\.png$/i.test(file)?'PNG':'WebP';
  if(format!==extension)mismatched.push({file,extension,format});
  const flags=format==='JPEG'?inspectJpeg(bytes)
    :format==='PNG'?inspectPng(bytes)
    :format==='WebP'?inspectWebp(bytes):['unrecognized image signature'];
  if (flags.length) flagged.push({file,flags});
  inspected++;
}
console.log('Image privacy inspection: '+inspected+' files, '+flagged.length+' with embedded metadata or unknown signatures');
console.log('Image format mismatches: '+mismatched.length);
for(const item of mismatched)
  console.log('Format review: '+item.file+' [extension '+item.extension+', data '+item.format+']');
for(const item of flagged)
  console.log('Review metadata: '+item.file+' ['+item.flags.join(', ')+']');
console.log('Metadata values are never printed. This inspection does not modify image files.');
