// Report public Cloudflare deployment state separately from GitHub source state.
// The check is intentionally non-blocking because deployment may lag GitHub commits.
const base = 'https://edinburgh-walking-tour.scotlandkorea.workers.dev';
const checks = [
  {path:'/',kind:'home'},
  {path:'/robots.txt',kind:'robots'},
  {path:'/sitemap.xml',kind:'sitemap'},
  {path:'/favicon.ico',kind:'favicon'},
  {path:'/privacy.html',kind:'privacy'},
  {path:'/places/st-giles.html',kind:'article'},
  {path:'/__ew_missing_page_audit_20261011__',kind:'notfound'}
];
async function inspect({path,kind},agent) {
  const url=base+path;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),14000);
  try {
    const response=await fetch(url,{
      headers:{'User-Agent':agent,'Accept':'*/*'},
      redirect:'follow',signal:controller.signal
    });
    const type=response.headers.get('content-type')??'';
    const buf=await response.arrayBuffer();
    let page='';
    if(type.includes('text/')||type.includes('xml')||type.includes('html'))
      page=new TextDecoder().decode(buf);
    const findings={
      kind,path,status:response.status,url:response.url,
      contentType:type,bytes:buf.byteLength,
      xRobotsTag:response.headers.get('x-robots-tag'),
      cacheControl:response.headers.get('cache-control'),
      nosniff:response.headers.get('x-content-type-options'),
      referrerPolicy:response.headers.get('referrer-policy')
    };
    if(kind==='home') {
      findings.siteSchema=/"@type"\s*:\s*"WebSite"/.test(page);
      findings.misleadingBusinessSchema=/"@type"\s*:\s*"LocalBusiness"/.test(page);
      findings.faviconLinked=page.includes('href="/favicon.ico"');
      findings.privacyLinked=page.includes('href="/privacy.html"');
      findings.metaNoindex=/<meta\b[^>]*name=["']robots["'][^>]*noindex/i.test(page);
    } else if(kind==='robots') {
      findings.crawlerAllowed=/User-agent:\s*\*/i.test(page)&&/Allow:\s*\//i.test(page);
    } else if(kind==='sitemap') {
      findings.urls=(page.match(/<loc>/g)||[]).length;
    } else if(kind==='article') {
      findings.ogImage=/property=["']og:image["']/.test(page);
      findings.twitterCard=/name=["']twitter:card["']/.test(page);
    } else if(kind==='privacy') {
      findings.noticeText=page.includes('개인정보 안내');
    } else if(kind==='notfound') {
      findings.customPage=page.includes('페이지를 찾을 수 없습니다');
    }
    return findings;
  } catch(error) {
    return {kind,path,error:String(error)};
  } finally {clearTimeout(timeout);}
}
const normal='Mozilla/5.0 (compatible; EW-Public-Deployment-Audit/1.0)';
const googlebot='Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const results=await Promise.all(checks.map(c=>inspect(c,normal)));
const googlebotComparison=await inspect({path:'/',kind:'home'},googlebot);
console.log(JSON.stringify({auditedAt:new Date().toISOString(),note:'Googlebot user-agent simulation is not proof of genuine Google crawler access',results,googlebotComparison},null,2));
