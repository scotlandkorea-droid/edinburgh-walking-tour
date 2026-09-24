(()=>{
const path=location.pathname;
const h1=document.querySelector('h1');
const title=(h1?.textContent||document.title.split('|')[0]).trim();
function normalizeOg(){const url=document.querySelector('meta[property="og:url"]');if(url)url.content=location.href;const image=document.querySelector('meta[property="og:image"]');if(image&&/fanciful-naiad-e1081c\\.netlify\\.app/.test(image.content)){try{const old=new URL(image.content);image.content=location.origin+old.pathname+old.search}catch(e){}}}
normalizeOg();
function crumbParts(){if(path.startsWith('/places/'))return [['/','홈'],[null,'워킹투어 코스']];if(path.startsWith('/edinburgh/places/'))return [['/','홈'],['/edinburgh/places.html','장소로 보기'],[null,title]];if(path.startsWith('/scotland/places/'))return [['/','홈'],['/edinburgh/places.html#scotland','스코틀랜드 장소'],[null,title]];if(path.startsWith('/travel/'))return [['/','홈'],['/#travel','여행 정보'],[null,title]];if(path.includes('/people/'))return [['/','홈'],['/edinburgh/people.html','인물로 보기'],[null,title]];if(path.includes('/themes/'))return [['/','홈'],['/edinburgh/themes.html','테마로 보기'],[null,title]];if(path.endsWith('/edinburgh/tour-guide.html'))return [['/','홈'],[null,'투어 안내']];return []}
function setCrumb(){const parts=crumbParts();if(!parts.length||!h1)return;let el=document.querySelector('.breadcrumbs,.crumbs');if(!el){el=document.createElement('div');el.className='breadcrumbs';h1.parentNode.insertBefore(el,h1)}else el.className='breadcrumbs';el.innerHTML=parts.map(p=>p[0]?'<a href="'+p[0]+'">'+p[1]+'</a>':p[1]).join(' › ');if(path.startsWith('/travel/'))document.querySelectorAll('.crumb').forEach(c=>c.remove())}
setCrumb();
const shareButton=document.querySelector('.action-buttons .share-btn,[data-share-page]');
if(shareButton){shareButton.addEventListener('click',async()=>{const data={title:document.title,text:(document.querySelector('meta[name="description"]')?.content||title),url:location.href};try{if(navigator.share)await navigator.share(data);else if(navigator.clipboard)await navigator.clipboard.writeText(location.href);else{const i=document.createElement('input');i.style.position='fixed';i.style.left='-9999px';i.value=location.href;document.body.appendChild(i);i.select();document.execCommand('copy');i.remove()}}catch(e){}})}
})();
