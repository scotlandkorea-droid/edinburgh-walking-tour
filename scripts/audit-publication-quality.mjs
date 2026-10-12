// Enforced metadata/image-dimension audit; protect completed article content from changes.
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
// Regression guard: our public uptime checks must never create fake Googlebot
// visits that could be mistaken for authentic Google crawler activity.
const publicAuditSource = fs.readFileSync('scripts/check-public-deployment.mjs', 'utf8');
const spoofedCrawlerUserAgent = publicAuditSource.includes('Googlebot/2.1') || /\bgooglebotComparison\b|\bconst\s+googlebot\s*=/.test(publicAuditSource);
for (const file of allPages) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.split(/<\/head>/i)[0];
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  // This image has no src until a visitor opens the lightbox. It is not
  // a loading image, and intrinsic width/height do not apply to it.
  const dynamicLightbox = /<div\b[^>]*class=["'][^"']*\blightbox\b[^"']*["'][^>]*id=["']lightbox["']/i.test(html);
  const missingSizeImages = images.filter(tag => {
    const isDynamicPlaceholder = dynamicLightbox &&
      readAttribute(tag, 'src') === null &&
      readAttribute(tag, 'srcset') === null &&
      readAttribute(tag, 'alt') === '확대 사진';
    return !isDynamicPlaceholder &&
      (readAttribute(tag, 'width') === null || readAttribute(tag, 'height') === null);
  });
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
    noDimensions: missingSizeImages.length
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
// Naver recommended a concise main description (80 Korean characters or fewer).
// Keep this quality limit specific to the homepage; do not rewrite finished detail metadata.
const homepageDescription = results.find(r => r.file === 'index.html')?.description ?? '';
// Keep first paint focused on the hero; gallery is well below the fold.
// Preserve image bytes, dimensions, order, and all visitor-visible markup.
const homepageHtml = fs.readFileSync(root, 'utf8');
const heroImageTag = homepageHtml.match(/<section class="hero">[\s\S]*?<picture>[\s\S]*?(<img\b[^>]*>)/i)?.[1] ?? '';
const homepageHeroPriorityCorrect =
  readAttribute(heroImageTag, 'fetchpriority') === 'high' &&
  readAttribute(heroImageTag, 'loading') !== 'lazy';
const homepageGallery = homepageHtml.match(/<div class="photo-strip" id="tourGallery">([\s\S]*?)<\/div>/i)?.[1] ?? '';
const homepageGalleryImages = homepageGallery.match(/<img\b[^>]*>/gi) ?? [];
const homepageGalleryEagerImages = homepageGalleryImages.filter(tag => readAttribute(tag, 'loading') !== 'lazy').length;
const homepageGalleryMissing = homepageGalleryImages.length === 0;
const homepageDescriptionTooLong = homepageDescription.length > 80 ||
  homepageDescription.length === 0;
const missingImages = results.filter(r => !r.ogImage).map(r => r.file);
const missingCards = results.filter(r => !r.twitterCard).map(r => r.file);
const imageDimensions = results.filter(r => r.noDimensions > 0).map(r => ({page:r.file, images:r.noDimensions}));
const dupTitles = duplicates('title');
const dupDescriptions = duplicates('description');
console.log('Publication-quality report for ' + results.length + ' HTML pages:');
console.log(JSON.stringify({
  homepageDescriptionLength: homepageDescription.length,
  homepageDescriptionWithin80Characters: !homepageDescriptionTooLong,
  noFabricatedGooglebotRequests: !spoofedCrawlerUserAgent,
  homepageHeroPriorityCorrect,
  homepageGalleryImageCount:homepageGalleryImages.length,
  homepageGalleryEagerImages,
  missingOpenGraphImage: missingImages.length, missingOpenGraphImageExamples:missingImages.slice(0,25),
  missingTwitterCard: missingCards.length, missingTwitterCardExamples:missingCards.slice(0,6),
  imageDimensionsMissingPages:imageDimensions.length, imageDimensionsMissingExamples:imageDimensions.slice(0,15),
  duplicateTitleGroups:dupTitles.length, duplicateTitleExamples:dupTitles.slice(0,12),
  duplicateDescriptionGroups:dupDescriptions.length, duplicateDescriptionExamples:dupDescriptions.slice(0,12),
  invalidStructuredData:brokenSchema, forbiddenBusinessSchema:forbidden
}, null, 2));
// Critical publication regressions fail CI instead of merely being reported.
const failures = [
  ['homepageDescriptionTooLongOrMissing', Number(homepageDescriptionTooLong)],
  ['spoofedCrawlerUserAgent', Number(spoofedCrawlerUserAgent)],
  ['homepageHeroPriorityMissing', Number(!homepageHeroPriorityCorrect)],
  ['homepageGalleryMissing', Number(homepageGalleryMissing)],
  ['homepageGalleryEagerImages', homepageGalleryEagerImages],
  ['missingOpenGraphImage', missingImages.length],
  ['missingTwitterCard', missingCards.length],
  ['imageDimensionsMissingPages', imageDimensions.length],
  ['duplicateTitleGroups', dupTitles.length],
  ['duplicateDescriptionGroups', dupDescriptions.length],
  ['invalidStructuredData', brokenSchema.length],
  ['forbiddenBusinessSchema', forbidden.length]
].filter(([, count]) => count > 0);
if (failures.length) {
  console.error('Publication quality gate FAILED: ' + JSON.stringify(failures));
  process.exitCode = 1;
} else {
  console.log('Publication quality gate PASS');
}
