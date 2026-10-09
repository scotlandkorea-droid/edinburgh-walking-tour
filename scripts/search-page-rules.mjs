// One shared rule for omitting unfinished placeholder pages from site search.
// Never equate noindex with an unfinished page: some noindex pages contain
// useful manuscripts and should remain findable within the website.
export function isUnfinishedSearchPage(html) {
  const head = String(html).split(/<\/head>/i)[0];
  const robots = [...head.matchAll(/<meta\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => /\bname\s*=\s*["']robots["']/i.test(tag));
  if (!robots || !/\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(robots))
    return false;
  const main = String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  const text = main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return /(?:원고(?:는|를)?\s*준비\s*중|다룰\s*예정입니다)/.test(text);
}
