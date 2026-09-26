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
    navScript.src='/assets/navigation-system.js?v=20260926-5';
    navScript.dataset.ewNavSystem='true';
    document.head.appendChild(navScript);
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