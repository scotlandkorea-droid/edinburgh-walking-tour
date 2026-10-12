// Report public Cloudflare deployment state separately from GitHub source state.
// The check is intentionally non-blocking because deployment may lag GitHub commits.
const base = 'https://edinburgh-walking-tour.scotlandkorea.workers.dev';
const checks = [
  {path:'/',kind:'home'},
  {path:'/robots.txt',kind:'robots'},
  {path:'/sitemap.xml',kind:'sitemap'},
  {path:'/favicon.ico',kind:'favicon'},
  {path:'/assets/site-header.js',kind:'shared-js'},
  {path:'/assets/site.css',kind:'shared-css'},
  {path:'/privacy.html',kind:'privacy'},
  {path:'/places/st-giles.html',kind:'article'},
  {path:'/places/scott-monument.html',kind:'article-privacy-free'},
  {path:'/places/arthurs-seat.html',kind:'image-dimensions',imageSrc:'../assets/arthurs-seat.jpg',expectedWidth:1536,expectedHeight:1152},
  {path:'/places/canongate-worlds-end.html',kind:'image-dimensions',imageSrc:'818px-Netherbow_E.jpg',expectedWidth:818,expectedHeight:1198},
  {path:'/__ew_missing_page_audit_20261011__',kind:'notfound'}
];
async function inspect({path,kind,imageSrc,expectedWidth,expectedHeight},agent) {
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
    if(type.includes('text/')||type.includes('xml')||type.includes('html')||type.includes('javascript'))
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
      findings.brandHeroSubtitle=page.includes('<p class="sub">걸어서 에든버러</p>');
      const heroImgTag=page.match(/<section class="hero">[\s\S]*?<picture>[\s\S]*?(<img\b[^>]*>)/i)?.[1]??'';
      findings.heroImageHighPriority=/\bfetchpriority="high"/.test(heroImgTag);
      const galleryHtml=page.match(/<div class="photo-strip" id="tourGallery">([\s\S]*?)<\/div>/i)?.[1]??'';
      const galleryImageTags=galleryHtml.match(/<img\b[^>]*>/gi)??[];
      findings.galleryImagesDeferred=galleryImageTags.length>0&&galleryImageTags.every(tag=>/\bloading="lazy"/.test(tag));
      findings.homeCssVersionUpdated=page.includes('/assets/site.css?v=20261012-6');
      findings.metaNoindex=/<meta\b[^>]*name=["']robots["'][^>]*noindex/i.test(page);
      const description=page.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]??'';
      findings.homeMetaDescription=description;
      findings.homeMetaDescriptionLength=description.length;
      findings.homeMetaDescriptionWithin80Characters=description.length>0&&description.length<=80;
      findings.inquiryPrivacyLink=/<div class="contact-privacy-area">[\s\S]*?카카오톡 문의[\s\S]*?이메일 문의[\s\S]*?class="privacy-notice-link"/.test(page);
      findings.footerPrivacyDuplicated=/<footer[\s\S]*?href="\/privacy.html"/.test(page);
      const tags=page.match(/<img\b[^>]*>/gi)??[];
      findings.homeImageCount=tags.length;
      findings.homeImagesWithSizes=tags.filter(tag=>/\bwidth=["']\d+/.test(tag)&&/\bheight=["']\d+/.test(tag)).length;
    } else if(kind==='shared-js') {
      findings.skipLinkCode=page.includes('skip-to-content');
      findings.noAutomaticFooterPrivacy= !page.includes('footerPrivacyLink');
    } else if(kind==='shared-css') {
      findings.skipLinkStyles=page.includes('body>.skip-to-content');
      findings.homeButtonGapOffset=page.includes('left:13px');
      findings.noPrivacyPilotCSS= !page.includes('privacy-placement-pilot');
      findings.subduedPrivacyColor=page.includes('#87928a');
      const layer=(name)=>{
        const start=page.indexOf('.'+name+'{');
        if(start<0)return 0;
        return Number(page.slice(start,page.indexOf('}',start)).match(/z-index:(\d+)/)?.[1]??0);
      };
      findings.galleryModalAboveHeader=layer('lightbox')>layer('site-header');
      findings.mapModalAboveGallery=layer('route-map-modal')>layer('lightbox');
      findings.heroSubtitleUsesSharedPlum=/\.hero \.sub\{[^}]*color:var\(--plum-strong\);/.test(page);
      findings.heroSubtitleSizeMobile=page.includes('font-size:clamp(24px,5.1vw,31px)');
      findings.heroSubtitleSizeTablet=page.includes('.hero .sub{font-size:30px}');
      findings.heroSubtitleSizeDesktop=page.includes('.hero .sub{font-size:32px}');
    } else if(kind==='robots') {
      findings.crawlerAllowed=/User-agent:\s*\*/i.test(page)&&/Allow:\s*\//i.test(page);
    } else if(kind==='sitemap') {
      findings.urls=(page.match(/<loc>/g)||[]).length;
      findings.lastmodCount=(page.match(/<lastmod>/g)||[]).length;
      findings.homeLastmod=page.match(/<url>\s*<loc>[^<]+<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1]??null;
    } else if(kind==='article') {
      findings.ogImage=/property=["']og:image["']/.test(page);
      findings.twitterCard=/name=["']twitter:card["']/.test(page);
    } else if(kind==='article-privacy-free') {
      findings.detailPrivacyLinkAbsent=!page.includes('href="/privacy.html"');
      findings.privacyPilotClassAbsent=!page.includes('privacy-placement-pilot');
    } else if(kind==='image-dimensions') {
      // Public HTTP verification is separate from GitHub CI/source inspection.
      const tag=(page.match(/<img\b[^>]*>/gi)||[]).find(img=>img.includes(imageSrc));
      findings.imageLocated=Boolean(tag);
      findings.width=tag?.match(/\bwidth=["'](\d+)["']/i)?.[1]??null;
      findings.height=tag?.match(/\bheight=["'](\d+)["']/i)?.[1]??null;
      findings.expectedWidth=expectedWidth;
      findings.expectedHeight=expectedHeight;
      findings.imageDimensionsMatch=Number(findings.width)===expectedWidth&&
        Number(findings.height)===expectedHeight;
    } else if(kind==='privacy') {
      findings.threeMonthLimit=page.includes('문의 종료일로부터 3개월 이내');
      findings.unwantedProfileOrPayment=/프로필 정보|온라인 결제 기능이 없습니다/.test(page);
      findings.noticeText=page.includes('개인정보 처리 안내') || page.includes('개인정보 안내');
      findings.noSelfFooterLink=!/<footer[\s\S]*?href="\/privacy.html"/.test(page);
    } else if(kind==='notfound') {
      findings.customPage=page.includes('페이지를 찾을 수 없습니다');
    }
    return findings;
  } catch(error) {
    return {kind,path,error:String(error)};
  } finally {clearTimeout(timeout);}
}
const normal='Mozilla/5.0 (compatible; EW-Public-Deployment-Audit/1.0)';
// Only use the audit's own user agent. Spoofing crawler identities pollutes
// Cloudflare request logs and cannot prove that genuine search crawlers visited.
const results=await Promise.all(checks.map(c=>inspect(c,normal)));
console.log(JSON.stringify({
  auditedAt:new Date().toISOString(),
  note:'Public deployment audit uses only its own declared user agent; real crawler visits must be verified separately.',
  results
},null,2));
