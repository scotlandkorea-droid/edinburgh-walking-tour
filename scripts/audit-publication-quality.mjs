// Report-only audit for publication metadata that link-integrity checks do not cover.
// Do not rewrite pages or their completed editorial copy.
import fs from 'node:fs';
import path from 'node:path';

const root = 'index.html';
const directories = ['places', 'edinburgh', 'scotland', 'st-andrews', 'travel'];
const allPages = [root];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && file.endsWith('.html')) allPages.push(file);
  }
}
directories.forEach(walk);

const readAttribute = (tag, key) => {
  const pair = [...tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .find(match => match[1].toLowerCase() === key.toLowerCase());
  return pair ? (pair[2] ?? pair[3]) : null;
};
const meta = (head, key, name) => {
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    if (readAttribute(tag, key)?.toLowerCase() === name.toLowerCase()) {
      return readAttribute(tag, 'content') ?? '';
    }
  }
  return '';
};
const results = [];
const forbidden = [];
const brokenSchema = [];
for (const file of allPages) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.split(/<\/head>/i)[0];
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const tags = [...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const tag of tags) {
    try {
      const schema = JSON.parse(tag[1]);
      const serialized = JSON.stringify(schema);
      // This site is an informational website; never describe it as a business
      // with an invented registered address or a shopping/price offer.
      if (/(?:LocalBusiness|TravelAgency|"@type":"(?:Offer|Product)"|"@type":"PostalAddress")/.test(serialized)) forbidden.push(file);
    } catch (error) {
      brokenSchema.push(file + ': ' + error.message);
    }
  }
  results.push({
    file,
    title: (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim(),
    description: meta(head, 'name', 'description').trim(),
    ogImage: meta(head, 'property', 'og:image').trim(),
    ogType: meta(head, 'property', 'og:type').trim(),
    twitterCard: meta(head, 'name', 'twitter:card').trim(),
    images: images.length,
    noDimensions: images.filter(tag => readAttribute(tag, 'width') === null || readAttribute(tag, 'height') === null).length
  });
}
const duplicates = (name) => {
  const groups = new Map();
  for (const r of results) {
    if (!r[name]) continue;
    const key = r[name].toLocaleLowerCase('ko-KR');
    groups.set(key, [...(groups.get(key) ?? []), r.file]);
  }
  return [...groups.values()].filter(x => x.length > 1);
};
const missingImages = results.filter(r => !r.ogImage).map(r => r.file);
const missingCards = results.filter(r => !r.twitterCard).map(r => r.file);
const imageDimensions = results.filter(r => r.noDimensions > 0).map(r => ({page:r.file, images:r.noDimensions}));
const dupTitles = duplicates('title');
const dupDescriptions = duplicates('description');
console.log('Publication-quality report for ' + results.length + ' HTML pages:');
console.log(JSON.stringify({
  missingOpenGraphImage: missingImages.length, missingOpenGraphImageExamples:missingImages.slice(0,25),
  missingTwitterCard: missingCards.length, missingTwitterCardExamples:missingCards.slice(0,6),
  imageDimensionsMissingPages:imageDimensions.length, imageDimensionsMissingExamples:imageDimensions.slice(0,15),
  duplicateTitleGroups:dupTitles.length, duplicateTitleExamples:dupTitles.slice(0,12),
  duplicateDescriptionGroups:dupDescriptions.length, duplicateDescriptionExamples:dupDescriptions.slice(0,12),
  invalidStructuredData:brokenSchema, forbiddenBusinessSchema:forbidden
}, null, 2));
if (brokenSchema.length || forbidden.length) {
  console.error('Invalid / inaccurate structured data must be fixed.');
  process.exitCode = 1;
}
