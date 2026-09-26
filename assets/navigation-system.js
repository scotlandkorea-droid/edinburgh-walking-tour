(()=>{
  const VERSION='20260926-1';
  const NAV_TOUR='#tour-nav';
  const NAV_PLACE='#place-nav';
  const normalizePath=path=>{
    const clean=(path||'/').replace(/\/+$/,'')||'/';
    return clean==='/st-andrews/index.html'?'/st-andrews':clean;
  };
  const currentPath=normalizePath(location.pathname);

  const loadScript=(src,test)=>new Promise((resolve,reject)=>{
    if(test())return resolve();
    const existing=[...document.scripts].find(s=>s.src&&s.src.includes(src.split('?')[0]));
    if(existing){
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

  const cleanLabel=s=>(s||'').replace(/\s+/g,' ').trim();
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

  const navInsertionPoint=()=>{
    const hub=document.querySelector('.course-hub');
    if(hub)return {target:hub,where:'beforebegin'};
    const actions=document.querySelector('.action-buttons');
    if(actions)return {target:actions,where:'afterend'};
    const kakao=document.querySelector('.kakao-action');
    if(kakao)return {target:kakao,where:'beforebegin'};
    const article=document.querySelector('article');
    if(article)return {target:article,where:'beforeend'};
    return null;
  };

  const installNav=nav=>{
    const existing=[...document.querySelectorAll('.page-nav')].filter(n=>!n.closest('.story-card,.story-list'));
    if(existing.length){
      existing[0].replaceWith(nav);
      existing.slice(1).forEach(n=>n.remove());
      return nav;
    }
    const point=navInsertionPoint();
    if(point)point.target.insertAdjacentElement(point.where,nav);
    return nav;
  };

  const removePageNav=()=>{
    document.querySelectorAll('.page-nav').forEach(nav=>nav.remove());
  };

  const renderLinearNav=(items,index,context,label)=>{
    if(!Array.isArray(items)||items.length<=1){removePageNav();return;}
    const nav=document.createElement('nav');
    nav.className='page-nav '+(context==='tour'?'tour-course-nav':'place-browse-nav');
    nav.dataset.navSystem=context;
    nav.setAttribute('aria-label',label);
    if(index===0)nav.classList.add('next-only');
    if(index===items.length-1)nav.classList.add('prev-only');

    const make=(item,direction)=>{
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
      direction==='prev'?a.append(arrow,copy):a.append(copy,arrow);
      return a;
    };

    if(index>0)nav.append(make(items[index-1],'prev'));
    if(index<items.length-1)nav.append(make(items[index+1],'next'));
    installNav(nav);
  };

  const renderSeriesNav=(series,index)=>{
    const items=series.items;
    const nav=document.createElement('nav');
    nav.className='page-nav story-series-nav';
    nav.dataset.navSystem='series';
    nav.setAttribute('aria-label',series.name+' 이전·다음 '+series.kind);

    let prev=index>0?items[index-1]:null;
    const next=index<items.length-1?items[index+1]:null;
    const prevIsHub=!prev&&index===0&&series.includeHubPrev;

    if(!prev&&!prevIsHub)nav.classList.add('next-only');
    if(!next)nav.classList.add('prev-only');

    const makeStoryLink=(item,direction,isHub=false)=>{
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
      strong.append(num,document.createTextNode(' '+(isHub?cleanLabel(series.hubPrevName||'전체 개요'):item.name)));
      copy.append(small,strong);
      direction==='prev'?a.append(arrow,copy):a.append(copy,arrow);
      return a;
    };

    if(prev)nav.append(makeStoryLink(prev,'prev'));
    else if(prevIsHub)nav.append(makeStoryLink(null,'prev',true));
    if(next)nav.append(makeStoryLink(next,'next'));
    installNav(nav);
    setHub(series.hub,series.hubLabel);
  };

  const findSeries=(data,path)=>{
    for(const series of data.series||[]){
      const index=series.items.findIndex(item=>normalizePath(item.url)===path);
      if(index>=0)return {series,index};
    }
    return null;
  };

  const findRegion=(data,path)=>{
    for(const region of data.placeRegions||[]){
      const index=region.items.findIndex(item=>normalizePath(item.url)===path);
      if(index>=0)return {region,index};
    }
    return null;
  };

  const findTour=path=>{
    const stops=Array.isArray(window.EW_TOUR_STOPS)?window.EW_TOUR_STOPS:[];
    const index=stops.findIndex(item=>normalizePath(item.url)===path);
    return index>=0?{items:stops,index}:null;
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
        loadScript('/assets/tour-course-data.js?v=20260925-1',()=>Array.isArray(window.EW_TOUR_STOPS))
      ]);
    }catch(e){return;}

    const data=window.EW_NAV_DATA||{placeRegions:[],series:[]};
    markEntryLinks();

    // Detail series is an isolated navigation system. It always wins.
    const seriesMatch=findSeries(data,currentPath);
    if(seriesMatch){
      renderSeriesNav(seriesMatch.series,seriesMatch.index);
      document.documentElement.dataset.navContext='series';
      return;
    }

    const regionMatch=findRegion(data,currentPath);
    const tourMatch=findTour(currentPath);
    const requested=location.hash===NAV_PLACE?'place':(location.hash===NAV_TOUR?'tour':null);

    if(requested==='place'&&regionMatch){
      renderLinearNav(regionMatch.region.items,regionMatch.index,'place','장소로 보기 이전·다음');
      setHub(regionMatch.region.hub,regionMatch.region.hubLabel);
      setPlaceBreadcrumb(regionMatch.region);
      document.documentElement.dataset.navContext='place';
      return;
    }

    if(requested==='tour'&&tourMatch){
      renderLinearNav(tourMatch.items,tourMatch.index,'tour','워킹투어 코스 이전·다음');
      setHub('/#tour','워킹투어 코스 전체 보기');
      setCourseBreadcrumb(tourMatch.items[tourMatch.index].name);
      document.documentElement.dataset.navContext='tour';
      return;
    }

    // Direct opening keeps official tour pages in tour context; other places use their region.
    if(tourMatch){
      renderLinearNav(tourMatch.items,tourMatch.index,'tour','워킹투어 코스 이전·다음');
      setHub('/#tour','워킹투어 코스 전체 보기');
      setCourseBreadcrumb(tourMatch.items[tourMatch.index].name);
      document.documentElement.dataset.navContext='tour';
    }else if(regionMatch){
      renderLinearNav(regionMatch.region.items,regionMatch.index,'place','장소로 보기 이전·다음');
      setHub(regionMatch.region.hub,regionMatch.region.hubLabel);
      setPlaceBreadcrumb(regionMatch.region);
      document.documentElement.dataset.navContext='place';
    }
  };

  window.EW_NAV_SYSTEM={version:VERSION,init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
