(()=>{
  const VERSION='20260926-7';
  const NAV_TOUR='#tour-nav';
  const NAV_PLACE='#place-nav';

  const normalizePath=path=>{
    const clean=(path||'/').replace(/\/+$/,'')||'/';
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

  const contextualUrl=(url,context)=>url+(context==='tour'?NAV_TOUR:NAV_PLACE);

  const setCourseBreadcrumb=label=>{
    const breadcrumbs=document.querySelector('.breadcrumbs');
    const crumbs=document.querySelector('.crumbs');
    if(breadcrumbs)breadcrumbs.innerHTML='<a href="/">홈</a> › <a href="/#tour">에든버러 워킹투어 코스</a> › '+label;
    if(crumbs)crumbs.innerHTML='<a href="/">홈</a><span>›</span><a href="/#tour">에든버러 워킹투어 코스</a><span>›</span>'+label;
  };

  const setPlaceBreadcrumb=region=>{
    const scopeHash=region.scope==='scotland'?'#scotland':'#edinburgh';
    const scopeLabel=region.scope==='scotland'?'스코틀랜드 전역':'에든버러';
    const breadcrumbs=document.querySelector('.breadcrumbs');
    const crumbs=document.querySelector('.crumbs');
    if(breadcrumbs)breadcrumbs.innerHTML='<a href="/">홈</a> › <a href="/edinburgh/places.html'+scopeHash+'">장소로 보기</a> › '+scopeLabel+' › '+region.name;
    if(crumbs)crumbs.innerHTML='<a href="/">홈</a><span>›</span><a href="/edinburgh/places.html'+scopeHash+'">장소로 보기</a><span>›</span>'+scopeLabel+'<span>›</span>'+region.name;
  };

  const setHub=(href,label)=>{
    const hub=document.querySelector('.course-hub');
    if(!hub)return;
    hub.href=href;
    hub.textContent=label;
  };

  const legacyPageNavs=()=>[...document.querySelectorAll('.page-nav')].filter(nav=>!nav.closest('.story-card,.story-list')&&!nav.dataset.navSystem);
  const existingContextNav=context=>document.querySelector('.page-nav[data-nav-system="'+context+'"]');

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
    nav.className='page-nav context-nav '+(context==='tour'?'context-nav-tour tour-course-nav':'context-nav-place place-browse-nav');
    nav.dataset.navSystem=context;
    nav.setAttribute('aria-label',label);
    if(index===0)nav.classList.add('next-only');
    if(index===items.length-1)nav.classList.add('prev-only');

    const makeLink=(item,direction)=>{
      const a=document.createElement('a');
      a.className='place-'+direction;
      a.href=contextualUrl(item.url,context);

      const arrow=document.createElement('span');
      arrow.className='place-nav-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent=direction==='prev'?'←':'→';

      const copy=document.createElement('span');
      copy.className='place-nav-label';
      copy.textContent=item.name;

      if(direction==='prev')a.append(arrow,copy);
      else a.append(copy,arrow);
      return a;
    };

    if(index>0)nav.append(makeLink(items[index-1],'prev'));
    if(index<items.length-1)nav.append(makeLink(items[index+1],'next'));
    return nav;
  };

  const findSeries=(data,path)=>{
    for(const series of data.series||[]){
      const index=(series.items||[]).findIndex(item=>normalizePath(item.url)===path);
      if(index>=0)return {series,index};
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
    let context=requested||(tourMatch?'tour':'place');
    if(context==='tour'&&!tourMatch)context='place';
    if(context==='place'&&!regionMatch&&tourMatch)context='tour';

    const tourNav=tourMatch
      ?(existingContextNav('tour')||makeLinearNav(tourMatch.items,tourMatch.index,'tour','워킹투어 코스 이전·다음'))
      :null;
    const placeNav=regionMatch
      ?(existingContextNav('place')||makeLinearNav(regionMatch.region.items,regionMatch.index,'place',regionMatch.region.name+' 이전·다음 장소'))
      :null;

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
      setHub(regionMatch.region.hub,regionMatch.region.hubLabel);
      setPlaceBreadcrumb(regionMatch.region);
    }

    document.documentElement.dataset.navContext=context;
    return true;
  };

  const makeSeriesLink=(series,item,direction,{isHub=false}={})=>{
    const a=document.createElement('a');
    a.className=direction==='prev'?'story-prev':'story-next';
    a.href=isHub?series.hub:item.url;

    const arrow=document.createElement('span');
    arrow.className='nav-arrow';
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent=direction==='prev'?'←':'→';

    const copy=document.createElement('span');
    copy.className='nav-copy';
    const small=document.createElement('small');
    small.textContent=direction==='prev'?'이전 '+series.kind:'다음 '+series.kind;
    const strong=document.createElement('strong');
    const num=document.createElement('span');
    num.className='nav-num';
    num.textContent=isHub?'00':item.number;
    strong.append(num,document.createTextNode(' '+(isHub?(series.hubPrevName||'전체 개요'):item.name)));
    copy.append(small,strong);

    if(direction==='prev')a.append(arrow,copy);
    else a.append(copy,arrow);
    return a;
  };

  const syncSeriesTabs=(series,index)=>{
    const tabs=document.querySelector('.story-series-tabs, .story-tabs');
    if(series.kind!=='이야기'||!tabs)return;
    const legacy=tabs.classList.contains('story-tabs');
    tabs.setAttribute('aria-label',series.name+' 이야기 목록');
    tabs.replaceChildren(...series.items.map((item,i)=>{
      const a=document.createElement('a');
      a.className=(legacy?'story-tab':'story-series-tab')+(i===index?' active':'');
      if(i===index)a.setAttribute('aria-current','page');
      a.href=item.url;
      if(legacy){
        a.textContent=item.number+' '+(item.tabName||item.name);
      }else{
        const num=document.createElement('span');
        num.textContent=item.number;
        a.append(num,document.createTextNode(' '+(item.tabName||item.name)));
      }
      return a;
    }));
  };

  const renderSeriesNavigation=(match)=>{
    const {series,index}=match;
    const nav=document.createElement('nav');
    const story=series.kind==='이야기';
    nav.className='page-nav '+(story?'story-series-nav':'detail-series-nav');
    nav.dataset.navSystem='series';
    nav.setAttribute('aria-label',series.name+' 이전·다음 '+series.kind);

    const prev=index>0?series.items[index-1]:null;
    const next=index<series.items.length-1?series.items[index+1]:null;
    const prevIsHub=!prev&&index===0&&series.includeHubPrev;

    if(!prev&&!prevIsHub)nav.classList.add('next-only');
    if(!next)nav.classList.add('prev-only');

    if(prev)nav.append(makeSeriesLink(series,prev,'prev'));
    else if(prevIsHub)nav.append(makeSeriesLink(series,null,'prev',{isHub:true}));
    if(next)nav.append(makeSeriesLink(series,next,'next'));

    replaceLegacyNavsWith([nav]);
    syncSeriesTabs(series,index);
    setHub(series.hub,series.hubLabel);
    document.documentElement.dataset.navContext='series';
    return true;
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
    markEntryLinks();

    const seriesMatch=findSeries(data,currentPath);
    if(seriesMatch){
      renderSeriesNavigation(seriesMatch);
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