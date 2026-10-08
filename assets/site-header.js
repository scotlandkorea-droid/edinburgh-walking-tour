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

  const cleanPageUrl=location.origin+location.pathname+location.search;

  // Navigation is handled by one shared system. Header/share/gallery logic stays here.
  if(!window.EW_NAV_SYSTEM&&!document.querySelector('script[data-ew-nav-system]')){
    const navScript=document.createElement('script');
    navScript.src='/assets/navigation-system.js?v=20261008-1';
    navScript.dataset.ewNavSystem='true';
    document.head.appendChild(navScript);
  }


  // Shared site search: compact header trigger, overlay panel, lazy-loaded index.
  let closeSearch=()=>{};
  const searchHeader=document.querySelector('.site-header');
  const searchTopbar=searchHeader?.querySelector('.topbar');
  if(searchHeader&&searchTopbar&&!searchTopbar.querySelector('.site-search-toggle')){
    const searchToggle=document.createElement('button');
    searchToggle.type='button';
    searchToggle.className='site-search-toggle';
    searchToggle.setAttribute('aria-label','검색 열기');
    searchToggle.setAttribute('aria-expanded','false');
    searchToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.6"></circle><path d="m16 16 4.2 4.2"></path></svg>';

    const mobileMenu=searchTopbar.querySelector('.mobile-menu');
    searchTopbar.insertBefore(searchToggle,mobileMenu||null);

    const searchPanel=document.createElement('div');
    searchPanel.className='site-search-panel';
    searchPanel.hidden=true;
    searchPanel.innerHTML=`
      <div class="wrap site-search-inner">
        <form class="site-search-form" role="search">
          <svg class="site-search-field-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.6"></circle><path d="m16 16 4.2 4.2"></path></svg>
          <label class="site-search-label" for="site-search-input">사이트 검색</label>
          <input id="site-search-input" class="site-search-input" type="search" inputmode="search" autocomplete="off" placeholder="장소 · 인물 · 이야기 · 여행정보 검색">
          <button class="site-search-close" type="button" aria-label="검색 닫기">✕</button>
        </form>
        <div class="site-search-status" aria-live="polite"></div>
        <div class="site-search-results"></div>
      </div>`;
    searchHeader.appendChild(searchPanel);

    const form=searchPanel.querySelector('.site-search-form');
    const input=searchPanel.querySelector('.site-search-input');
    const status=searchPanel.querySelector('.site-search-status');
    const results=searchPanel.querySelector('.site-search-results');
    const closeButton=searchPanel.querySelector('.site-search-close');
    let searchDataPromise=null;

    const normalize=value=>String(value||'')
      .toLocaleLowerCase('ko-KR')
      .normalize('NFKC')
      .replace(/[·•—–_\/\\.(),"\'’‘:;!?]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
    const compact=value=>normalize(value).replace(/\s+/g,'');

    const editDistance=(a,b)=>{
      const left=compact(a),right=compact(b);
      if(left===right)return 0;
      if(!left)return right.length;
      if(!right)return left.length;
      let prev=Array.from({length:right.length+1},(_,i)=>i);
      for(let i=1;i<=left.length;i++){
        const next=[i];
        for(let j=1;j<=right.length;j++){
          const cost=left[i-1]===right[j-1]?0:1;
          next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+cost);
        }
        prev=next;
      }
      return prev[right.length];
    };

    const fuzzyScore=(query,record)=>{
      const q=compact(query);
      if(q.length<2)return null;
      const candidates=[record.title,...(Array.isArray(record.aliases)?record.aliases:[])].filter(Boolean);
      let best=null;
      for(const candidate of candidates){
        const c=compact(candidate);
        if(!c)continue;
        const maxLen=Math.max(q.length,c.length);
        const lengthGap=Math.abs(q.length-c.length);
        const allowed=maxLen<=3?1:maxLen<=6?2:Math.max(2,Math.floor(maxLen*.22));
        if(lengthGap>allowed)continue;
        const distance=editDistance(q,c);
        if(distance>allowed)continue;
        const similarity=1-distance/maxLen;
        if(similarity<.62)continue;
        const score=Math.round(similarity*100)-distance*5+(c.startsWith(q)||q.startsWith(c)?8:0);
        if(best===null||score>best)best=score;
      }
      return best;
    };

    const loadSearchData=()=>{
      if(Array.isArray(window.EW_SEARCH_INDEX))return Promise.resolve(window.EW_SEARCH_INDEX);
      if(searchDataPromise)return searchDataPromise;
      searchDataPromise=new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='/assets/search-data.js?v=20260930-4';
        script.dataset.ewSearchData='true';
        script.onload=()=>resolve(Array.isArray(window.EW_SEARCH_INDEX)?window.EW_SEARCH_INDEX:[]);
        script.onerror=reject;
        document.head.appendChild(script);
      });
      return searchDataPromise;
    };

    const directMatches=(query,data)=>{
      const terms=query.split(' ').filter(Boolean);
      return data.map(record=>{
        const title=normalize(record.title);
        const description=normalize(record.description);
        const keywords=normalize(record.keywords);
        const aliases=(Array.isArray(record.aliases)?record.aliases:[]).map(normalize);
        const aliasText=aliases.join(' ');
        const haystack=`${title} ${description} ${keywords} ${aliasText}`;
        if(!terms.every(term=>haystack.includes(term)))return null;
        let score=0;
        if(title===query)score+=220;
        else if(aliases.includes(query))score+=200;
        else if(title.startsWith(query))score+=130;
        else if(aliases.some(alias=>alias.startsWith(query)))score+=115;
        else if(title.includes(query))score+=90;
        else if(aliasText.includes(query))score+=80;
        for(const term of terms){
          if(title.includes(term))score+=36;
          if(aliases.some(alias=>alias.includes(term)))score+=30;
          if(description.includes(term))score+=12;
          if(keywords.includes(term))score+=9;
        }
        return {record,score};
      }).filter(Boolean).sort((a,b)=>b.score-a.score||a.record.title.localeCompare(b.record.title,'ko'));
    };

    const fuzzyMatches=(query,data)=>{
      return data.map(record=>{
        const score=fuzzyScore(query,record);
        return score===null?null:{record,score};
      }).filter(Boolean).sort((a,b)=>b.score-a.score||a.record.title.localeCompare(b.record.title,'ko'));
    };

    const renderResults=async value=>{
      const query=normalize(value);
      results.replaceChildren();
      if(!query){
        status.textContent='';
        return;
      }
      let data=[];
      try{data=await loadSearchData()}
      catch(e){status.textContent='검색 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';return}
      let matches=directMatches(query,data);
      let similar=false;
      if(!matches.length){
        matches=fuzzyMatches(query,data);
        similar=matches.length>0;
      }
      const visible=matches.slice(0,8);
      status.textContent=matches.length?(similar?`비슷한 검색 결과 ${matches.length}개`:`검색 결과 ${matches.length}개`):'검색 결과가 없습니다.';
      for(const {record} of visible){
        const link=document.createElement('a');
        link.className='site-search-result';
        link.href=(record.type==='장소'&&!String(record.url).includes('#'))?record.url+'#place-nav':record.url;
        const type=document.createElement('span');
        type.className='site-search-result-type';
        type.textContent=record.type||'페이지';
        const copy=document.createElement('span');
        copy.className='site-search-result-copy';
        const title=document.createElement('strong');
        title.textContent=record.title;
        const description=document.createElement('small');
        description.textContent=record.description||'';
        copy.append(title,description);
        const arrow=document.createElement('span');
        arrow.className='site-search-result-arrow';
        arrow.setAttribute('aria-hidden','true');
        arrow.textContent='›';
        link.append(type,copy,arrow);
        results.appendChild(link);
      }
    };

    const openSearch=async()=>{
      if(mobileMenu?.hasAttribute('open'))mobileMenu.removeAttribute('open');
      searchPanel.hidden=false;
      searchToggle.setAttribute('aria-expanded','true');
      searchToggle.setAttribute('aria-label','검색 닫기');
      await loadSearchData().catch(()=>{});
      requestAnimationFrame(()=>input.focus({preventScroll:true}));
      renderResults(input.value);
    };
    closeSearch=()=>{
      searchPanel.hidden=true;
      searchToggle.setAttribute('aria-expanded','false');
      searchToggle.setAttribute('aria-label','검색 열기');
    };

    searchToggle.addEventListener('click',()=>searchPanel.hidden?openSearch():closeSearch());
    closeButton.addEventListener('click',closeSearch);
    input.addEventListener('input',()=>renderResults(input.value));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const first=results.querySelector('.site-search-result');
      if(first)location.href=first.href;
    });
    document.addEventListener('click',event=>{
      if(!searchPanel.hidden&&!searchHeader.contains(event.target))closeSearch();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!searchPanel.hidden)closeSearch();
    });
  }

  const gallery=document.getElementById('tourGallery');
  const lightbox=document.getElementById('lightbox');
  if(gallery&&lightbox){
    const prev=document.querySelector('.gallery-arrow.prev');
    const next=document.querySelector('.gallery-arrow.next');
    const image=lightbox.querySelector('img');
    const closeButton=lightbox.querySelector('button');
    const protectedImages=[...gallery.querySelectorAll('.photo-card img'),image];
    protectedImages.forEach(photo=>{
      photo.draggable=false;
      photo.setAttribute('draggable','false');
    });
    const blockImageSave=event=>{
      const target=event.target;
      if(target instanceof HTMLImageElement&&(gallery.contains(target)||lightbox.contains(target))){
        event.preventDefault();
      }
    };
    gallery.addEventListener('contextmenu',blockImageSave);
    lightbox.addEventListener('contextmenu',blockImageSave);
    gallery.addEventListener('dragstart',blockImageSave);
    lightbox.addEventListener('dragstart',blockImageSave);
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
  if(menu){
    const close=()=>menu.removeAttribute('open');
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    menu.addEventListener('toggle',()=>{if(menu.hasAttribute('open'))closeSearch()});
    document.addEventListener('click',e=>{if(menu.hasAttribute('open')&&!menu.contains(e.target))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
})();