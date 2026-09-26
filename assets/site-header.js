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
  const cleanPageUrl=location.origin+location.pathname+location.search;
  const withContext=(url,context)=>url+(context==='tour'?NAV_TOUR:NAV_PLACE);

  const loadNavigationData=async()=>{
    if(Array.isArray(window.EW_PLACE_REGIONS)&&Array.isArray(window.EW_DETAIL_SERIES))return true;
    const path=normalizePath(location.pathname);
    const relevant=path.startsWith('/places/')||path.startsWith('/edinburgh/places/')||path==='/edinburgh/places.html'||path.startsWith('/scotland/places/')||path==='/st-andrews'||path.startsWith('/st-andrews/');
    if(!relevant)return false;
    try{
      await new Promise((resolve,reject)=>{
        const existing=document.querySelector('script[data-ew-navigation-data]');
        if(existing){
          if(Array.isArray(window.EW_PLACE_REGIONS))resolve();
          else existing.addEventListener('load',resolve,{once:true});
          return;
        }
        const script=document.createElement('script');
        script.src='/assets/navigation-data.js?v=20260926-1';
        script.dataset.ewNavigationData='1';
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      });
    }catch(e){return false}
    return Array.isArray(window.EW_PLACE_REGIONS)&&Array.isArray(window.EW_DETAIL_SERIES);
  };
  await loadNavigationData();

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

  const findRegion=(path)=>{
    const regions=Array.isArray(window.EW_PLACE_REGIONS)?window.EW_PLACE_REGIONS:[];
    for(const region of regions){
      const index=region.items.findIndex(item=>normalizePath(item.url)===path);
      if(index>=0)return {region,index};
    }
    return null;
  };

  const findSeries=(path)=>{
    const seriesList=Array.isArray(window.EW_DETAIL_SERIES)?window.EW_DETAIL_SERIES:[];
    for(const series of seriesList){
      const index=series.items.findIndex(item=>normalizePath(item.url)===path);
      if(index>=0)return {series,index};
    }
    return null;
  };

  const insertNavHost=(host)=>{
    const existing=document.querySelector('.page-nav:not(.story-series-nav):not(.detail-series-nav)');
    if(existing){
      existing.insertAdjacentElement('beforebegin',host);
      existing.remove();
      return;
    }
    const actions=document.querySelector('.action-buttons');
    const kakao=document.querySelector('.kakao-action');
    const hub=document.querySelector('.course-hub');
    if(actions)actions.insertAdjacentElement('afterend',host);
    else if(kakao)kakao.insertAdjacentElement('beforebegin',host);
    else if(hub)hub.insertAdjacentElement('beforebegin',host);
  };

  const ensureContextHost=()=>{
    let host=document.querySelector('.context-nav-host');
    if(host)return host;
    host=document.createElement('div');
    host.className='context-nav-host';
    insertNavHost(host);
    return host;
  };

  const buildSimpleNav=(items,index,{className,label,context})=>{
    const nav=document.createElement('nav');
    nav.className='page-nav '+className;
    nav.setAttribute('aria-label',label);
    if(index===0)nav.classList.add('next-only');
    if(index===items.length-1)nav.classList.add('prev-only');
    const links=[];
    if(index>0){
      const prev=items[index-1];
      const href=context?withContext(prev.url,context):prev.url;
      links.push(`<a href="${href}">← ${prev.name}</a>`);
    }
    if(index<items.length-1){
      const next=items[index+1];
      const href=context?withContext(next.url,context):next.url;
      links.push(`<a href="${href}">${next.name} →</a>`);
    }
    nav.innerHTML=links.join('');
    return nav;
  };

  const decorateSimpleNav=(nav)=>{
    if(!nav)return;
    nav.querySelectorAll('a').forEach(link=>{
      if(link.querySelector('.place-nav-label'))return;
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

  const syncContextNavigation=(currentPath)=>{
    const stops=Array.isArray(window.EW_TOUR_STOPS)?window.EW_TOUR_STOPS:[];
    const tourIndex=stops.findIndex(stop=>normalizePath(stop.url)===currentPath);
    const placeMatch=findRegion(currentPath);
    if(tourIndex<0&&!placeMatch)return false;

    const host=ensureContextHost();
    host.replaceChildren();

    let tourNav=null;
    let placeNav=null;
    if(tourIndex>=0){
      tourNav=buildSimpleNav(stops,tourIndex,{
        className:'context-nav context-nav-tour tour-course-nav',
        label:'워킹투어 코스 이전·다음',
        context:'tour'
      });
      host.appendChild(tourNav);
    }
    if(placeMatch&&placeMatch.region.items.length>1){
      placeNav=buildSimpleNav(placeMatch.region.items,placeMatch.index,{
        className:'context-nav context-nav-place place-browse-nav',
        label:placeMatch.region.name+' 이전·다음 장소',
        context:'place'
      });
      host.appendChild(placeNav);
    }

    const requested=location.hash===NAV_PLACE?'place':(location.hash===NAV_TOUR?'tour':null);
    let context=requested||(tourIndex>=0?'tour':'place');
    if(context==='tour'&&!tourNav)context='place';
    if(context==='place'&&!placeNav&&tourNav)context='tour';

    if(tourNav)tourNav.hidden=context!=='tour';
    if(placeNav)placeNav.hidden=context!=='place';
    decorateSimpleNav(tourNav);
    decorateSimpleNav(placeNav);

    const hub=document.querySelector('.course-hub');
    if(context==='tour'&&tourIndex>=0){
      if(hub){hub.href='/#tour';hub.textContent='워킹투어 코스 전체 보기'}
      setCourseBreadcrumb(stops[tourIndex].name);
    }else if(context==='place'&&placeMatch){
      if(hub){
        hub.href='/edinburgh/places.html#'+placeMatch.region.scope;
        hub.textContent=placeMatch.region.scope==='scotland'?'스코틀랜드 전역 장소 보기':'장소 전체 보기';
      }
      setPlaceBreadcrumb(placeMatch.region.name,placeMatch.region.scope);
    }
    return true;
  };

  const buildStorySeriesNav=(series,index)=>{
    let nav=document.querySelector('.story-series-nav');
    if(!nav){
      nav=document.createElement('nav');
      nav.className='page-nav story-series-nav';
      insertNavHost(nav);
    }
    nav.className='page-nav story-series-nav';
    nav.classList.toggle('next-only',index===0);
    nav.classList.toggle('prev-only',index===series.items.length-1);
    nav.setAttribute('aria-label',series.name+' 이전·다음 이야기');
    const links=[];
    if(index>0){
      const prev=series.items[index-1];
      links.push(`<a class="story-prev" href="${prev.url}"><span class="nav-arrow" aria-hidden="true">←</span><span class="nav-copy"><small>이전 이야기</small><strong><span class="nav-num">${prev.number}</span> ${prev.name}</strong></span></a>`);
    }
    if(index<series.items.length-1){
      const next=series.items[index+1];
      links.push(`<a class="story-next" href="${next.url}"><span class="nav-copy"><small>다음 이야기</small><strong><span class="nav-num">${next.number}</span> ${next.name}</strong></span><span class="nav-arrow" aria-hidden="true">→</span></a>`);
    }
    nav.innerHTML=links.join('');

    let tabs=document.querySelector('.story-series-tabs');
    if(tabs){
      tabs.setAttribute('aria-label',series.name+' 이야기 목록');
      tabs.innerHTML=series.items.map((item,i)=>`<a class="story-series-tab${i===index?' active':''}"${i===index?' aria-current="page"':''} href="${item.url}"><span>${item.number}</span> ${item.name}</a>`).join('');
    }
  };

  const buildCourseSeriesNav=(series,index)=>{
    let nav=document.querySelector('.detail-series-nav');
    const legacy=document.querySelector('.page-nav:not(.story-series-nav):not(.context-nav)');
    if(!nav&&legacy){
      nav=legacy;
      nav.className='page-nav detail-series-nav';
    }
    if(!nav){
      nav=document.createElement('nav');
      nav.className='page-nav detail-series-nav';
      insertNavHost(nav);
    }
    nav.setAttribute('aria-label',series.name+' 상세 코스 이전·다음');
    const before=index===0?series.hubItem:series.items[index-1];
    const after=index<series.items.length-1?series.items[index+1]:null;
    const links=[];
    if(before)links.push(`<a href="${before.url}">← ${before.number} ${before.name}</a>`);
    if(after)links.push(`<a href="${after.url}">${after.number} ${after.name} →</a>`);
    nav.innerHTML=links.join('');
    nav.classList.toggle('prev-only',!after);
    nav.classList.toggle('next-only',!before);
    decorateSimpleNav(nav);
  };

  const syncDetailSeries=(currentPath)=>{
    const match=findSeries(currentPath);
    if(!match)return false;
    document.querySelectorAll('.context-nav-host,.page-nav:not(.story-series-nav):not(.detail-series-nav)').forEach(node=>{
      if(!node.classList.contains('detail-series-nav'))node.remove();
    });
    if(match.series.kind==='story')buildStorySeriesNav(match.series,match.index);
    else buildCourseSeriesNav(match.series,match.index);
    return true;
  };

  const currentPath=normalizePath(location.pathname);
  const isDetailSeries=syncDetailSeries(currentPath);
  if(!isDetailSeries)syncContextNavigation(currentPath);

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