(()=>{
  const VERSION='20261007-3';
  const NAV_TOUR='#tour-nav';
  const NAV_PLACE='#place-nav';

  const normalizePath=path=>{
    const raw=(path||'/').split(/[?#]/)[0];
    const clean=raw.replace(/\/+$/,'')||'/';
    return clean==='/st-andrews/index.html'?'/st-andrews':clean;
  };
  const currentPath=normalizePath(location.pathname);

  const loadScript=(src,test)=>new Promise((resolve,reject)=>{
    if(test())return resolve();
    const base=src.split('?')[0];
    const existing=[...document.scripts].find(s=>s.src&&s.src.includes(base));
    if(existing){
      if(test())return resolve();
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',reject,{once:true});
      setTimeout(()=>test()&&resolve(),0);
      return;
    }
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=reject;
    document.head.appendChild(script);
  });

  const contextualUrl=(url,context)=>normalizePath(url)+(context==='tour'?NAV_TOUR:NAV_PLACE);

  const setBreadcrumb=parts=>{
    const render=node=>{
      if(!node)return;
      node.replaceChildren();
      parts.forEach((part,index)=>{
        if(index){
          const sep=document.createElement('span');
          sep.className='breadcrumb-separator';
          sep.setAttribute('aria-hidden','true');
          sep.textContent='›';
          node.append(sep);
        }
        if(part.href){
          const a=document.createElement('a');
          a.href=part.href;
          a.textContent=part.label;
          node.append(a);
        }else{
          node.append(document.createTextNode(part.label));
        }
      });
    };
    render(document.querySelector('.breadcrumbs'));
    render(document.querySelector('.crumbs'));
  };

  const setCourseBreadcrumb=label=>setBreadcrumb([
    {label:'홈',href:'/'},
    {label:'워킹투어 코스',href:'/#tour'},
    {label}
  ]);

  const placeDirectoryHref=region=>region?.id
    ?'/edinburgh/places.html#'+region.id
    :'/edinburgh/places.html';

  const setPlaceBreadcrumb=(label,region)=>setBreadcrumb([
    {label:'홈',href:'/'},
    {label:'장소로 보기',href:placeDirectoryHref(region)},
    {label}
  ]);

  const setSeriesBreadcrumb=(data,series,item,context)=>{
    const parentRegion=context==='place'
      ?findRegion(data,normalizePath(series.hub))?.region
      :null;
    return setBreadcrumb([
      {label:'홈',href:'/'},
      context==='tour'
        ?{label:'워킹투어 코스',href:'/#tour'}
        :{label:'장소로 보기',href:placeDirectoryHref(parentRegion)},
      {label:series.breadcrumbLabel||series.name,href:contextualUrl(series.hub,context)},
      {label:item.number}
    ]);
  };

  const setHub=(href,label)=>{
    const hub=document.querySelector('.course-hub');
    if(!hub)return;
    hub.href=href;
    hub.textContent=label;
  };

  const legacyPageNavs=()=>[...document.querySelectorAll('.page-nav')].filter(nav=>!nav.closest('.story-card,.story-list')&&!nav.dataset.navSystem);

  const insertionPoint=()=>{
    const legacy=legacyPageNavs()[0];
    if(legacy)return {target:legacy,where:'beforebegin'};
    const actions=document.querySelector('.action-buttons');
    if(actions)return {target:actions,where:'afterend'};
    const kakao=document.querySelector('.kakao-action');
    if(kakao)return {target:kakao,where:'beforebegin'};
    const hub=document.querySelector('.course-hub');
    if(hub)return {target:hub,where:'beforebegin'};
    const article=document.querySelector('article');
    if(article)return {target:article,where:'beforeend'};
    return null;
  };

  const replaceLegacyNavsWith=nodes=>{
    const list=Array.isArray(nodes)?nodes.filter(Boolean):[nodes].filter(Boolean);
    const point=insertionPoint();
    if(point){
      list.filter(node=>!node.isConnected).forEach(node=>point.target.insertAdjacentElement(point.where,node));
    }
    legacyPageNavs().forEach(nav=>{if(!list.includes(nav))nav.remove()});
  };

  const removeLegacyNavs=()=>legacyPageNavs().forEach(nav=>nav.remove());

  const makeLinearNav=(items,index,context,label)=>{
    if(!Array.isArray(items)||items.length<=1)return null;
    const nav=document.createElement('nav');
    nav.className='page-nav ew-prevnext context-nav '+(context==='tour'?'context-nav-tour tour-course-nav':'context-nav-place place-browse-nav');
    nav.dataset.navSystem=context;
    nav.setAttribute('aria-label',label);
    if(index===0)nav.classList.add('next-only');
    if(index===items.length-1)nav.classList.add('prev-only');

    const makeLink=(item,direction)=>{
      const a=document.createElement('a');
      a.className='place-'+direction+' ew-prevnext-link ew-prevnext-'+direction;
      a.href=contextualUrl(item.url,context);

      const arrow=document.createElement('span');
      arrow.className='place-nav-arrow ew-prevnext-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent=direction==='prev'?'←':'→';

      const copy=document.createElement('span');
      copy.className='place-nav-label ew-prevnext-title';
      copy.textContent=item.name;

      if(direction==='prev')a.append(arrow,copy);
      else a.append(copy,arrow);
      return a;
    };

    if(index>0)nav.append(makeLink(items[index-1],'prev'));
    if(index<items.length-1)nav.append(makeLink(items[index+1],'next'));
    return nav;
  };

  const seriesItemsFor=(series,context)=>context==='place'&&Array.isArray(series.placeItems)&&series.placeItems.length
    ?series.placeItems
    :(series.items||[]);
  const seriesEnabledForContext=(series,context)=>!(context==='place'&&series.placeMode==='region');

  const findSeries=(data,path,context='tour')=>{
    for(const series of data.series||[]){
      if(!seriesEnabledForContext(series,context))continue;
      const items=seriesItemsFor(series,context);
      const index=items.findIndex(item=>normalizePath(item.url)===path);
      if(index>=0)return {series,index,context,items};
    }
    return null;
  };

  const findRegion=(data,path)=>{
    for(const region of data.placeRegions||[]){
      const index=(region.items||[]).findIndex(item=>normalizePath(item.url)===path);
      if(index>=0)return {region,index};
    }
    return null;
  };

  const placeHubFor=region=>{
    if(region?.hub&&normalizePath(region.hub)!==currentPath){
      return {href:contextualUrl(region.hub,'place'),label:region.hubLabel||region.name+' 전체 보기'};
    }
    return region&&region.scope==='scotland'
      ?{href:'/edinburgh/places.html#scotland',label:'스코틀랜드 전역 장소 보기'}
      :{href:'/edinburgh/places.html#edinburgh',label:'에든버러 장소 보기'};
  };

  const placeSequenceFor=regionMatch=>{
    const all=regionMatch?.region?.items||[];
    const hub=regionMatch?.region?.hub?normalizePath(regionMatch.region.hub):null;
    if(!hub||currentPath===hub)return {items:all,index:regionMatch?.index??-1};
    const items=all.filter(item=>normalizePath(item.url)!==hub);
    return {items,index:items.findIndex(item=>normalizePath(item.url)===currentPath)};
  };

  const regionalSeriesForPath=(data,path)=>(data.series||[]).find(series=>
    series.placeMode==='region'&&(
      normalizePath(series.hub)===path||
      (series.items||[]).some(item=>normalizePath(item.url)===path)
    )
  );

  const setRegionalSeriesChromeVisible=(data,context)=>{
    const series=regionalSeriesForPath(data,currentPath);
    if(!series)return;
    const visible=context!=='place';
    const wrap=document.querySelector('.detail-intro>.wrap,.page-hero>.wrap');
    const eyebrow=wrap?.querySelector(':scope > .eyebrow');
    const tabs=wrap?.querySelector(':scope > .story-series-tabs,:scope > .story-tabs');
    [eyebrow,tabs].filter(Boolean).forEach(node=>{
      node.hidden=!visible;
      if(visible)node.style.removeProperty('display');
      else node.style.setProperty('display','none','important');
    });
  };

  const seriesContext=(data,series)=>{
    const requested=location.hash===NAV_PLACE?'place':(location.hash===NAV_TOUR?'tour':null);
    const hubPath=normalizePath(series.hub);
    const canTour=!!findTour(hubPath);
    const canPlace=!!findRegion(data,hubPath);
    if(requested==='tour'&&canTour)return 'tour';
    if(requested==='place'&&canPlace)return 'place';
    return canTour?'tour':'place';
  };

  const markSeriesEntryLinks=(data,context)=>{
    if(context!=='tour'&&context!=='place')return;
    // Preserve the current browsing context not only on a series hub,
    // but also on detail pages that are themselves independent Place entries
    // (e.g. Gladstone's Land / Mary King's Close / Canongate stories).
    const series=(data.series||[]).find(item=>{
      if(!seriesEnabledForContext(item,context))return false;
      if(normalizePath(item.hub)===currentPath)return true;
      return seriesItemsFor(item,context).some(entry=>normalizePath(entry.url)===currentPath);
    });
    if(!series)return;
    const itemPaths=new Set(seriesItemsFor(series,context).map(item=>normalizePath(item.url)));
    document.querySelectorAll('a[href]').forEach(link=>{
      const raw=link.getAttribute('href');
      if(!raw)return;
      const url=new URL(raw,location.origin);
      if(url.origin!==location.origin||!itemPaths.has(normalizePath(url.pathname)))return;
      link.setAttribute('href',contextualUrl(url.pathname,context));
    });
  };

  const findTour=path=>{
    const stops=Array.isArray(window.EW_TOUR_STOPS)?window.EW_TOUR_STOPS:[];
    const index=stops.findIndex(item=>normalizePath(item.url)===path);
    return index>=0?{items:stops,index}:null;
  };

  const renderContextNavigation=(data)=>{
    const regionMatch=findRegion(data,currentPath);
    const tourMatch=findTour(currentPath);
    if(!regionMatch&&!tourMatch)return false;

    const requested=location.hash===NAV_PLACE?'place':(location.hash===NAV_TOUR?'tour':null);
    const regionalPlace=!!regionalSeriesForPath(data,currentPath);
    let context=requested||(regionalPlace?'place':(tourMatch?'tour':'place'));
    if(context==='tour'&&!tourMatch)context='place';
    if(context==='place'&&!regionMatch&&tourMatch)context='tour';
    setRegionalSeriesChromeVisible(data,context);

    // navigation-data.js / tour-course-data.js are the single source of truth.
    // Rebuild context navigation every time so stale links embedded in old HTML
    // can never override the current shared order.
    const staleContextNavs=[...document.querySelectorAll('.page-nav[data-nav-system="tour"],.page-nav[data-nav-system="place"]')];
    const tourNav=tourMatch
      ?makeLinearNav(tourMatch.items,tourMatch.index,'tour','워킹투어 코스 이전·다음')
      :null;
    const placeSequence=regionMatch?placeSequenceFor(regionMatch):null;
    const placeNav=placeSequence&&placeSequence.index>=0
      ?makeLinearNav(placeSequence.items,placeSequence.index,'place',regionMatch.region.name+' 이전·다음 장소')
      :null;
    staleContextNavs.forEach(nav=>nav.remove());

    const setNavVisible=(nav,visible)=>{
      if(!nav)return;
      nav.hidden=!visible;
      if(visible)nav.style.removeProperty('display');
      else nav.style.setProperty('display','none','important');
    };
    setNavVisible(tourNav,context==='tour');
    setNavVisible(placeNav,context==='place');

    const contextNavs=[tourNav,placeNav].filter(Boolean);
    if(contextNavs.length)replaceLegacyNavsWith(contextNavs);
    else removeLegacyNavs();

    if(context==='tour'&&tourMatch){
      setHub('/#tour','워킹투어 코스 전체 보기');
      setCourseBreadcrumb(tourMatch.items[tourMatch.index].name);
    }else if(context==='place'&&regionMatch){
      const parentHub=placeHubFor(regionMatch.region);
      setHub(parentHub.href,parentHub.label);
      setPlaceBreadcrumb(regionMatch.region.items[regionMatch.index].name,regionMatch.region);
    }

    document.documentElement.dataset.navContext=context;
    markSeriesEntryLinks(data,context);
    return true;
  };

  const makeSeriesLink=(series,item,direction,context,{isHub=false}={})=>{
    const a=document.createElement('a');
    a.className=(direction==='prev'?'story-prev':'story-next')+' ew-prevnext-link ew-prevnext-'+direction;
    a.href=contextualUrl(isHub?series.hub:item.url,context);

    const arrow=document.createElement('span');
    arrow.className='nav-arrow ew-prevnext-arrow';
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent=direction==='prev'?'←':'→';

    const copy=document.createElement('span');
    copy.className='nav-copy ew-prevnext-copy';
    const small=document.createElement('small');
    const navKind=context==='place'?'장소':series.kind;
    small.className='ew-prevnext-kicker';
    small.textContent=direction==='prev'?'이전 '+navKind:'다음 '+navKind;
    const strong=document.createElement('strong');
    const num=document.createElement('span');
    num.className='nav-num';
    num.textContent=isHub?'00':item.number;
    const title=document.createElement('span');
    title.className='nav-title ew-prevnext-title';
    title.textContent=isHub?(series.hubPrevName||'전체 개요'):item.name;
    strong.append(num,title);
    copy.append(small,strong);

    if(direction==='prev')a.append(arrow,copy);
    else a.append(copy,arrow);
    return a;
  };

  const syncSeriesEyebrow=(series,item,context)=>{
    const wrap=document.querySelector('.detail-intro>.wrap,.page-hero>.wrap');
    if(!wrap||!item)return;
    let eyebrow=wrap.querySelector(':scope > .eyebrow');
    if(series.detailEyebrow===false){
      if(eyebrow)eyebrow.remove();
      return;
    }
    if(!eyebrow&&context==='place'){
      eyebrow=document.createElement('p');
      eyebrow.className='eyebrow';
      const title=wrap.querySelector('h1,.course-title');
      if(title)title.insertAdjacentElement('beforebegin',eyebrow);
      else wrap.append(eyebrow);
    }
    if(eyebrow){
      eyebrow.hidden=false;
      eyebrow.style.removeProperty('display');
      eyebrow.textContent=item.number+' · '+(series.breadcrumbLabel||series.name);
    }
  };

  const syncSeriesTabs=(series,index,context)=>{
    if(series.kind!=='이야기')return;
    let tabs=document.querySelector('.story-series-tabs, .story-tabs');
    if(!tabs&&context==='place'&&Array.isArray(series.placeItems)){
      tabs=document.createElement('nav');
      tabs.className='story-series-tabs place-context-series-tabs';
      const wrap=document.querySelector('.detail-intro>.wrap,.page-hero>.wrap');
      const lead=wrap?.querySelector('.lead');
      if(lead)lead.insertAdjacentElement('afterend',tabs);
      else wrap?.append(tabs);
    }
    if(!tabs)return;
    tabs.hidden=false;
    tabs.style.removeProperty('display');
    const items=seriesItemsFor(series,context);
    const legacy=tabs.classList.contains('story-tabs');
    tabs.setAttribute('aria-label',series.name+(context==='place'?' 장소 목록':' 이야기 목록'));
    tabs.replaceChildren(...items.map((item,i)=>{
      const a=document.createElement('a');
      a.className=(legacy?'story-tab':'story-series-tab')+(i===index?' active':'');
      if(i===index)a.setAttribute('aria-current','page');
      a.href=contextualUrl(item.url,context);
      if(legacy){
        a.textContent=item.number+' '+(item.tabName||item.name);
      }else{
        const num=document.createElement('span');
        num.textContent=item.number;
        a.append(num,document.createTextNode(' '+(item.tabName||item.name)));
      }
      return a;
    }));

    // Mobile series tabs: keep 01 at the natural left start, but make the
    // current item visible on later pages by bringing it near the left edge.
    requestAnimationFrame(()=>{
      if(index===0){
        tabs.scrollLeft=0;
        return;
      }
      if(tabs.scrollWidth<=tabs.clientWidth+1)return;
      const active=tabs.querySelector('.active');
      if(!active)return;
      const tabsRect=tabs.getBoundingClientRect();
      const activeRect=active.getBoundingClientRect();
      const target=tabs.scrollLeft+(activeRect.left-tabsRect.left)-3;
      const maxScroll=Math.max(0,tabs.scrollWidth-tabs.clientWidth);
      tabs.scrollLeft=Math.max(0,Math.min(maxScroll,target));
    });
  };

  const renderSeriesNavigation=(data,match)=>{
    const {series,index}=match;
    const context=match.context||seriesContext(data,series);
    const items=match.items||seriesItemsFor(series,context);
    const nav=document.createElement('nav');
    const story=series.kind==='이야기';
    nav.className='page-nav ew-prevnext ew-prevnext-numbered '+(story?'story-series-nav':'detail-series-nav');
    nav.dataset.navSystem='series';
    nav.setAttribute('aria-label',series.name+' 이전·다음 '+(context==='place'?'장소':series.kind));

    const prev=index>0?items[index-1]:null;
    const next=index<items.length-1?items[index+1]:null;
    const prevIsHub=!prev&&index===0&&series.includeHubPrev;

    if(!prev&&!prevIsHub)nav.classList.add('next-only');
    if(!next)nav.classList.add('prev-only');

    if(prev)nav.append(makeSeriesLink(series,prev,'prev',context));
    else if(prevIsHub)nav.append(makeSeriesLink(series,null,'prev',context,{isHub:true}));
    if(next)nav.append(makeSeriesLink(series,next,'next',context));

    replaceLegacyNavsWith([nav]);
    syncSeriesEyebrow(series,items[index],context);
    syncSeriesTabs(series,index,context);
    setHub(contextualUrl(series.hub,context),series.hubLabel);
    setSeriesBreadcrumb(data,series,items[index],context);
    document.documentElement.dataset.navContext=context;
    markSeriesEntryLinks(data,context);
    return true;
  };

  const syncPlaceDirectoryOrder=(data)=>{
    const scope=document.querySelector('.place-scope-section');
    if(!scope)return;
    const normalizeHref=href=>{
      try{return normalizePath(new URL(href,location.origin).pathname)}catch(e){return normalizePath(href)}
    };
    document.querySelectorAll('#edinburgh article.area,#scotland article.area').forEach(area=>{
      const name=area.querySelector(':scope > h2')?.textContent?.trim();
      const region=(data.placeRegions||[]).find(item=>item.name===name);
      if(!region)return;
      const order=new Map((region.items||[]).map((item,index)=>[normalizePath(item.url),index]));
      const containers=[...area.querySelectorAll(':scope > .place-strip,:scope > .story-list')];
      containers.forEach(container=>{
        const links=[...container.querySelectorAll(':scope > a[href]')];
        links.sort((a,b)=>(order.get(normalizeHref(a.getAttribute('href')))??999)-(order.get(normalizeHref(b.getAttribute('href')))??999));
        links.forEach(link=>container.appendChild(link));
      });
      containers.sort((a,b)=>{
        const firstIndex=container=>Math.min(...[...container.querySelectorAll(':scope > a[href]')].map(link=>order.get(normalizeHref(link.getAttribute('href')))??999));
        return firstIndex(a)-firstIndex(b);
      }).forEach(container=>area.appendChild(container));
    });
  };

  const syncSeriesHubCards=(data)=>{
    const series=(data.series||[]).find(item=>normalizePath(item.hub)===currentPath);
    if(!series)return;
    const links=[...document.querySelectorAll('a.story[href],a.stg-story[href]')];
    const byUrl=new Map(links.map(link=>[normalizePath(new URL(link.getAttribute('href'),location.origin).pathname),link]));
    (series.items||[]).forEach(item=>{
      const link=byUrl.get(normalizePath(item.url));
      if(!link)return;
      const num=link.querySelector('.num,small');
      const title=link.querySelector('h3,strong');
      const desc=link.querySelector('p,span');
      if(num)num.textContent=item.number;
      if(title)title.textContent=item.name;
      if(desc&&item.description)desc.textContent=item.description;
    });
    const parent=links.find(link=>byUrl.get(normalizePath(new URL(link.getAttribute('href'),location.origin).pathname))===link)?.parentElement;
    if(parent){
      (series.items||[]).forEach(item=>{
        const link=byUrl.get(normalizePath(item.url));
        if(link&&link.parentElement===parent)parent.appendChild(link);
      });
    }
  };

  const markEntryLinks=()=>{
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
  };

  const init=async()=>{
    try{
      await Promise.all([
        loadScript('/assets/navigation-data.js?v='+VERSION,()=>!!window.EW_NAV_DATA),
        loadScript('/assets/tour-course-data.js?v=20260926-6',()=>Array.isArray(window.EW_TOUR_STOPS))
      ]);
    }catch(e){return;}

    const data=window.EW_NAV_DATA||{placeRegions:[],series:[]};
    syncPlaceDirectoryOrder(data);
    syncSeriesHubCards(data);
    markEntryLinks();

    const requested=location.hash===NAV_PLACE?'place':(location.hash===NAV_TOUR?'tour':null);
    const regionMatch=findRegion(data,currentPath);
    const tourMatch=findTour(currentPath);
    const regionalPlace=!!regionalSeriesForPath(data,currentPath);

    let seriesMatch=null;
    if(requested==='place')seriesMatch=findSeries(data,currentPath,'place');
    else if(requested==='tour')seriesMatch=findSeries(data,currentPath,'tour');
    else if(!tourMatch&&!regionalPlace)seriesMatch=findSeries(data,currentPath,'tour')||findSeries(data,currentPath,'place');

    if(seriesMatch){
      renderSeriesNavigation(data,seriesMatch);
      return;
    }

    renderContextNavigation(data);
  };

  window.EW_NAV_SYSTEM={version:VERSION,init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  addEventListener('hashchange',()=>{
    if(location.hash===NAV_PLACE||location.hash===NAV_TOUR)init();
  });
})();