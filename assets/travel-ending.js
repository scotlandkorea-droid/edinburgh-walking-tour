(()=>{const header=document.querySelector('body>header');if(header){header.className='site-header';header.innerHTML='<div class="wrap topbar"><a class="brand" href="/"><span class="mark">EW</span><span>에든버러 워킹투어</span></a><nav class="nav"><a href="/edinburgh/tour-guide.html">투어 안내</a><a href="/#tour">투어 코스</a><a href="/#explore">장소 · 테마 · 인물</a><a href="/#walked">함께한 분들</a><a href="/#guide">안내자 소개</a><a href="/#travel">여행 정보</a><a href="/#contact">문의</a></nav><details class="mobile-menu"><summary aria-label="메뉴 열기">≡</summary><nav><a href="/edinburgh/tour-guide.html">투어 안내</a><a href="/#tour">투어 코스</a><a href="/#explore">장소 · 테마 · 인물</a><a href="/#walked">함께한 분들</a><a href="/#guide">안내자 소개</a><a href="/#travel">여행 정보</a><a href="/#contact">문의</a></nav></details></div>'}
const article=document.querySelector('main article,main .travel-article,main .wrap');if(!article)return;
const existingEnding=article.querySelector('.travel-ending');
const top=[
['when-to-go.html','언제'],['where-to-go.html','어디'],['airport-transport.html','교통'],['accommodation.html','숙소'],['food-drink.html','음식'],['shopping.html','쇼핑'],['hiking.html','트레킹'],['festivals.html','축제'],['itineraries.html','추천 일정']
];
const children={
'st-andrews.html':{parentHref:'/travel/where-to-go.html',parentLabel:'어디 전체 보기',siblings:[['st-andrews.html','세인트앤드루스']]}
};
const file=(location.pathname.split('/').pop()||'').toLowerCase(),child=children[file];
let hubHref='/#travel',hubLabel='스코틀랜드 여행정보 전체 보기',prev=null,next=null;
if(child){hubHref=child.parentHref;hubLabel=child.parentLabel;const i=child.siblings.findIndex(x=>x[0]===file);if(i>0)prev=child.siblings[i-1];if(i>=0&&i<child.siblings.length-1)next=child.siblings[i+1]}
else{const i=top.findIndex(x=>x[0]===file);if(i>0)prev=top[i-1];if(i>=0&&i<top.length-1)next=top[i+1]}
const explicitPrev=document.querySelector('link[rel="prev"]'),explicitNext=document.querySelector('link[rel="next"]');
if(explicitPrev)prev=[explicitPrev.getAttribute('href'),explicitPrev.dataset.label||explicitPrev.title||'이전 글'];
if(explicitNext)next=[explicitNext.getAttribute('href'),explicitNext.dataset.label||explicitNext.title||'다음 글'];
if(existingEnding)return;const ending=document.createElement('div');ending.className='travel-ending';
ending.innerHTML='<button class="travel-share" type="button" aria-label="현재 페이지 공유하기">↗ 공유하기</button><div class="travel-hub-row"><a class="travel-hub"></a></div><nav class="travel-series" aria-label="이전·다음 여행정보"></nav><div class="travel-kakao"><a href="https://open.kakao.com/o/snuaTFyg" target="_blank" rel="noopener">카카오톡 문의</a></div>';
article.appendChild(ending);
const hub=ending.querySelector('.travel-hub');hub.href=hubHref;hub.textContent=hubLabel;
const nav=ending.querySelector('.travel-series');
const add=(item,kind)=>{if(!item)return;const a=document.createElement('a');a.className=kind;a.href=item[0].startsWith('/')?item[0]:'/travel/'+item[0];a.textContent=kind==='prev'?'← '+item[1]:item[1]+' →';nav.appendChild(a)};
add(prev,'prev');add(next,'next');
if(!prev&&!next)nav.hidden=true;else if(!(prev&&next))nav.classList.add('single');
let footer=document.querySelector('body>footer');if(footer)footer.remove();footer=document.createElement('footer');footer.className='travel-footer';footer.innerHTML='<a href="/">에든버러 워킹투어</a>';document.body.appendChild(footer);
const b=ending.querySelector('.travel-share');b.addEventListener('click',async()=>{const original='↗ 공유하기',data={title:document.title,text:document.querySelector('meta[name="description"]')?.content||document.title,url:location.href};try{if(navigator.share)await navigator.share(data);else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);b.textContent='✓ 링크 복사됨';setTimeout(()=>b.textContent=original,1800)}}catch(e){if(e?.name!=='AbortError'){b.textContent='주소를 복사해 공유해 주세요.';setTimeout(()=>b.textContent=original,2200)}}});
const menu=document.querySelector('.mobile-menu');if(menu){const close=()=>menu.removeAttribute('open');menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));document.addEventListener('click',e=>{if(menu.hasAttribute('open')&&!menu.contains(e.target))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})}
})();