(async()=>{
  const fitTitles=()=>{
    document.querySelectorAll('.course-title').forEach(el=>{
      el.style.removeProperty('font-size');
      el.style.removeProperty('white-space');
      el.style.removeProperty('text-wrap');
      const base=parseFloat(getComputedStyle(el).fontSize)||37;
      const min=22;
      let size=base;
      el.style.setProperty('white-space','nowrap');
      while(el.scrollWidth>el.clientWidth+1&&size>min){
        size=Math.max(min,size-.5);
        el.style.setProperty('font-size',size+'px','important');
      }
      if(el.scrollWidth>el.clientWidth+1){
        el.style.setProperty('white-space','normal');
        el.style.setProperty('text-wrap','balance');
      }
    });
  };
  const sharePage=async(button)=>{
    const data={title:document.title,text:document.querySelector('meta[name="description"]')?.content||document.title,url:cleanPageUrl};
    try{
      if(navigator.share) await navigator.share(data);
      else if(navigator.clipboard){
        await navigator.clipboard.writeText(cleanPageUrl);
        const original=button.textContent;
        button.textContent='✓ 링크 복사됨';
        setTimeout(()=>button.textContent=original,1800);
      }
    }catch(e){}
  };
  document.querySelectorAll('.travel-share,.share-btn').forEach(button=>button.addEventListener('click',()=>sharePage(button)));

  const normalizePath=path=>path.replace(/\/+$/,'')||'/';
  const NAV_TOUR='#tour-nav';
  const NAV_PLACE='#place-nav';
  const withContext=(url,context)=>url+(context==='tour'?NAV_TOUR:NAV_PLACE);
  const cleanPageUrl=location.origin+location.pathname+location.search;

  const setCourseBreadcrumb=(label)=>{
    const breadcrumbs=document.querySelector('.breadcrumbs');
    const crumbs=document.querySelector('.crumbs');
    if(breadcrumbs)breadcrumbs.innerHTML=`<a href="/">홈</a> › <a href="/#tour">에든버러 워킹투어 코스</a> › ${label}`;
    if(crumbs)crumbs.innerHTML=`<a href="/">홈</a><span>›</span><a href="/#tour">에든버러 워킹투어 코스</a><span>›</span>${label}`;
  };

  const setPlaceBreadcrumb=(area,scope)=>{
    const breadcrumbs=document.querySelector('.breadcrumbs');
    const crumbs=document.querySelector('.crumbs');
    const scopeHash=scope==='scotland'?'#scotland':'#edinburgh';
    const scopeLabel=scope==='scotland'?'스코틀랜드 전역':'에든버러';
    if(breadcrumbs)breadcrumbs.innerHTML=`<a href="/">홈</a> › <a href="/edinburgh/places.html${scopeHash}">장소로 보기</a> › ${scopeLabel} › ${area}`;
    if(crumbs)crumbs.innerHTML=`<a href="/">홈</a><span>›</span><a href="/edinburgh/places.html${scopeHash}">장소로 보기</a><span>›</span>${scopeLabel}<span>›</span>${area}`;
  };

  const renderNav=(items,index,context,label)=>{
    let nav=document.querySelector('.page-nav:not(.story-series-nav)');
    if(context==='place'&&items.length<=1){
      if(nav)nav.remove();
      return;
    }
    if(!nav&&context==='place'){
      nav=document.createElement('nav');
      const actions=document.querySelector('.action-buttons');
      const kakao=document.querySelector('.kakao-action');
      if(actions)actions.insertAdjacentElement('afterend',nav);
      else if(kakao)kakao.insertAdjacentElement('beforebegin',nav);
    }
    if(!nav)return;
    nav.className='page-nav '+(context==='tour'?'tour-course-nav':'place-browse-nav');
    if(index===0)nav.classList.add('next-only');
    if(index===items.length-1)nav.classList.add('prev-only');
    nav.setAttribute('aria-label',label);
    const links=[];
    if(index>0){
      const prev=items[index-1];
      links.push(`<a href="${withContext(prev.url,context)}">← ${prev.name}</a>`);
    }
    if(index<items.length-1){
      const next=items[index+1];
      links.push(`<a href="${withContext(next.url,context)}">${next.name} →</a>`);
    }
    nav.innerHTML=links.join('');
  };

  const syncTourCourseNav=()=>{
    const stops=Array.isArray(window.EW_TOUR_STOPS)?window.EW_TOUR_STOPS:[];
    if(!stops.length)return false;
    const current=normalizePath(location.pathname);
    const index=stops.findIndex(stop=>normalizePath(stop.url)===current);
    if(index<0)return false;
    renderNav(stops,index,'tour','워킹투어 코스 이전·다음');
    const hub=document.querySelector('.course-hub');
    if(hub){hub.href='/#tour';hub.textContent='워킹투어 코스 전체 보기'}
    setCourseBreadcrumb(stops[index].name);
    return true;
  };

  const getPlaceArea=async()=>{
    const current=normalizePath(location.pathname);
    try{
      const response=await fetch('/edinburgh/places.html',{credentials:'same-origin'});
      if(!response.ok)return null;
      const markup=await response.text();
      const doc=new DOMParser().parseFromString(markup,'text/html');
      for(const scope of ['edinburgh','scotland']){
        for(const area of doc.querySelectorAll('#'+scope+' .area')){
          const title=area.querySelector('h2')?.textContent.trim()||(scope==='scotland'?'스코틀랜드 전역':'에든버러');
          const items=[...area.querySelectorAll('a[href]')].map(link=>{
            const href=link.getAttribute('href');
            const url=new URL(href,location.origin);
            const labelSource=link.querySelector('strong')||link;
            return {name:labelSource.textContent.replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim(),url:url.pathname};
          }).filter(item=>item.url&&item.url!=='/edinburgh/places.html');
          const index=items.findIndex(item=>normalizePath(item.url)===current);
          if(index>=0)return {title,items,index,scope};
        }
      }
    }catch(e){}
    return null;
  };

  const syncPlaceBrowseNav=async()=>{
    const area=await getPlaceArea();
    if(!area)return false;
    renderNav(area.items,area.index,'place','장소로 보기 이전·다음');
    const hub=document.querySelector('.course-hub');
    if(hub){
      hub.href='/edinburgh/places.html#'+area.scope;
      hub.textContent=area.scope==='scotland'?'스코틀랜드 전역 장소 보기':'장소 전체 보기';
    }
    setPlaceBreadcrumb(area.title,area.scope);
    return true;
  };

  const tourStops=Array.isArray(window.EW_TOUR_STOPS)?window.EW_TOUR_STOPS:[];
  const currentPath=normalizePath(location.pathname);
  const isTourPage=tourStops.some(stop=>normalizePath(stop.url)===currentPath);
  const requestedContext=location.hash===NAV_PLACE?'place':(location.hash===NAV_TOUR?'tour':null);
  const context=requestedContext||(isTourPage?'tour':'place');
  const hasRegionalNavSurface=!!document.querySelector('.page-nav:not(.story-series-nav)');
  const isScotlandPlaceHub=/^\/scotland\/places\/[^/]+\.html$/.test(currentPath)||currentPath==='/st-andrews';
  const shouldResolvePlaceContext=context==='place'&&(requestedContext==='place'||hasRegionalNavSurface||isScotlandPlaceHub);

  const placeContextMatched=shouldResolvePlaceContext?await syncPlaceBrowseNav():false;
  if(context==='tour'&&isTourPage)syncTourCourseNav();

  if(document.querySelector('.place-scope-section')){
    document.querySelectorAll('#edinburgh .area a[href],#scotland .area a[href]').forEach(link=>{
      const url=new URL(link.getAttribute('href'),location.origin);
      if(url.origin===location.origin)link.setAttribute('href',url.pathname+NAV_PLACE);
    });
  }

  if(document.querySelector('#tour')){
    document.querySelectorAll('#tour .route-card[href]').forEach(link=>{
      const url=new URL(link.getAttribute('href'),location.origin);
      link.setAttribute('href',url.pathname+NAV_TOUR);
    });
  }

  const normalizePlaceNav=()=>{
    if(placeContextMatched){
      document.querySelectorAll('.page-nav:not(.story-series-nav)').forEach(nav=>{
        if(!nav.classList.contains('tour-course-nav'))nav.classList.add('place-browse-nav');
      });
    }
    document.querySelectorAll('.page-nav:not(.story-series-nav) a').forEach(link=>{
      if(link.querySelector('.place-nav-label'))return;
      if(placeContextMatched&&link.closest('.place-browse-nav')){
        const url=new URL(link.getAttribute('href'),location.origin);
        link.setAttribute('href',url.pathname+NAV_PLACE);
      }
      const raw=link.textContent.replace(/\s+/g,' ').trim();
      let direction='';
      let label=raw;
      if(raw.startsWith('←')){
        direction='prev';
        label=raw.replace(/^←\s*/,'');
      }else if(raw.endsWith('→')){
        direction='next';
        label=raw.replace(/\s*→$/,'');
      }else return;
      link.classList.add('place-'+direction);
      link.textContent='';
      const arrow=document.createElement('span');
      arrow.className='place-nav-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent=direction==='prev'?'←':'→';
      const copy=document.createElement('span');
      copy.className='place-nav-label';
      copy.textContent=label;
      if(direction==='prev')link.append(arrow,copy);
      else link.append(copy,arrow);
    });
  };
  normalizePlaceNav();

  const gallery=document.getElementById('tourGallery');
  const lightbox=document.getElementById('lightbox');
  if(gallery&&lightbox){
    const prev=document.querySelector('.gallery-arrow.prev');
    const next=document.querySelector('.gallery-arrow.next');
    const image=lightbox.querySelector('img');
    const closeButton=lightbox.querySelector('button');
    const closeLightbox=()=>{
      lightbox.classList.remove('open','zooming');
      lightbox.setAttribute('aria-hidden','true');
    };
    const openLightbox=async(photo)=>{
      lightbox.classList.remove('open','zooming');
      image.src=photo.currentSrc||photo.src;
      image.alt=photo.alt;
      try{if(image.decode)await image.decode()}catch(e){}
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>{
        void image.offsetWidth;
        lightbox.classList.add('zooming');
      });
    };
    prev?.addEventListener('click',()=>gallery.scrollBy({left:-gallery.clientWidth*.78,behavior:'smooth'}));
    next?.addEventListener('click',()=>gallery.scrollBy({left:gallery.clientWidth*.78,behavior:'smooth'}));
    gallery.querySelectorAll('.photo-card img').forEach(photo=>photo.addEventListener('click',()=>openLightbox(photo)));
    closeButton?.addEventListener('click',closeLightbox);
    lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&lightbox.classList.contains('open'))closeLightbox()});
  }

  requestAnimationFrame(fitTitles);
  let timer;
  addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(fitTitles,80)});

  const menu=document.querySelector('.mobile-menu');
  if(!menu)return;
  const close=()=>menu.removeAttribute('open');
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('click',e=>{if(menu.hasAttribute('open')&&!menu.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();