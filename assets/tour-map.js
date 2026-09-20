(()=>{
function setupWalkedGallery(){
  const gallery=document.getElementById('tourGallery');
  if(!gallery)return;
  if(!document.querySelector('style[data-walked-gallery]')){const s=document.createElement('style');s.dataset.walkedGallery='1';s.textContent='#walked .photo-card{aspect-ratio:4/3!important;background:#f3f1eb!important;overflow:hidden!important}#walked .photo-card img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center center!important;background:#f3f1eb}#walked .photo-card:nth-child(2) img,#walked .photo-card:nth-child(4) img,#walked .photo-card:nth-child(6) img,#walked .photo-card:nth-child(9) img,#walked .photo-card:nth-child(12) img,#walked .photo-card:nth-child(14) img{object-position:center 38%!important}#walked .walked-consent{margin:12px 0 0;font-size:.82rem;line-height:1.35;color:#68756e;white-space:nowrap}@media(max-width:420px){#walked .walked-consent{font-size:.76rem;letter-spacing:-.02em}}@media(max-width:619px){#walked .photo-card{flex-basis:82%!important;max-width:360px!important}}@media(min-width:620px){#walked .photo-card{flex-basis:calc((100% - 32px)/3)!important;max-width:none!important}}';document.head.appendChild(s)}
  const photos=[
    '/assets/1280＿20250828＿084545.jpg',
    '/assets/1280＿20250821＿113352.jpg',
    '/assets/1754396924726.jpg',
    '/assets/1280＿20250821＿110052.jpg',
    '/assets/1280＿1754399052815.jpg',
    '/assets/1280＿20250815＿155115.jpg',
    '/assets/externalFile.jpg',
    '/assets/1280＿1755036285208.jpg',
    '/assets/1754403534267.jpg',
    '/assets/1280＿1754399052345.jpg',
    '/assets/externalFile%20(1).jpg',
    '/assets/1280＿1755072289623.jpg',
    '/assets/1754403534399.jpg',
    '/assets/1280＿1754399052952.jpg',
    '/assets/patrick-hamilton-ph.jpg'
  ];
  gallery.innerHTML=photos.map((src,i)=>`<figure class="photo-card"><img src="${src}" loading="${i<3?'eager':'lazy'}" decoding="async" alt="함께 걸은 에든버러 워킹투어 사진 ${i+1}"></figure>`).join('');
  let note=document.querySelector('#walked .walked-consent');

  const lb=document.getElementById('lightbox');
  const li=lb?.querySelector('img');
  if(lb&&li){gallery.querySelectorAll('.photo-card img').forEach(img=>{img.onclick=()=>{li.src=img.src;li.alt=img.alt;lb.classList.add('open');lb.setAttribute('aria-hidden','false')}})}
}
setupWalkedGallery();
const stops=[
  {n:'스콧 기념탑',u:'/places/scott-monument.html',lat:55.95236,lng:-3.19326,start:true},
  {n:'프린스 스트리트 가든',u:'/places/princes-street.html',lat:55.95178,lng:-3.19505},
  {n:'에든버러 뉴타운',u:'/places/new-town.html',lat:55.95218,lng:-3.19570},
  {n:'뉴 칼리지',u:'/places/new-college.html',lat:55.94972,lng:-3.19528},
  {n:'에든버러 성',u:'/places/edinburgh-castle.html',lat:55.94868,lng:-3.20041},
  {n:'그래스마켓',u:'/places/grassmarket.html',lat:55.94757,lng:-3.19600},
  {n:'그레이프라이어스',u:'/places/greyfriars.html',lat:55.94700,lng:-3.19272},
  {n:'바비 동상',u:'/places/greyfriars-bobby.html',lat:55.94692,lng:-3.19130},
  {n:'국립박물관',u:'/places/national-museum.html',lat:55.94694,lng:-3.18889},
  {n:'엘리펀트 하우스',u:'/places/elephant-house.html',lat:55.94750,lng:-3.19167},
  {n:'데이비드 흄 동상',u:'/places/david-hume.html',lat:55.94956,lng:-3.19263},
  {n:'세인트 자일스',u:'/places/st-giles.html',lat:55.94944,lng:-3.19083},
  {n:'로열마일',u:'/places/royal-mile.html',lat:55.95056,lng:-3.18556},
  {n:'존 녹스 하우스',u:'/places/john-knox-house.html',lat:55.95067,lng:-3.18510},
  {n:'캐넌게이트',u:'/places/canongate.html',lat:55.95158,lng:-3.17899},
  {n:'스코틀랜드 의회',u:'/places/scottish-parliament.html',lat:55.95189,lng:-3.17502},
  {n:'홀리루드 궁전',u:'/places/holyrood-palace.html',lat:55.95270,lng:-3.17229},
  {n:'칼튼 힐',u:'/places/calton-hill.html',lat:55.95474,lng:-3.18191},
  {n:'발모럴 호텔',u:'/places/balmoral-hotel.html',lat:55.95305,lng:-3.18905,end:true}
];
// 장소 마커와 실제 걷는 선을 분리한다. 스콧 기념탑에서 가든으로 들어간 뒤 정원 안을 서쪽으로 걸어 로스 분수 부근까지 간 다음,
// 북쪽 프린스 스트리트 쪽으로 올라와 동쪽으로 돌아 The Mound/국립미술관 방향으로 이어지는 실제 투어 흐름을 표현한다.
const path=[
  [55.95236,-3.19326],
  [55.95210,-3.19370],[55.95188,-3.19435],[55.95178,-3.19505],
  [55.95155,-3.19720],[55.95128,-3.19955],[55.95090,-3.20155],[55.95009,-3.20305],
  // 로스 분수 부근에서 북쪽으로 올라가 프린스 스트리트 쪽 보행 흐름을 탄다.
  [55.95072,-3.20325],[55.95145,-3.20315],[55.95205,-3.20265],
  // 프린스 스트리트를 따라 동쪽으로 돌아오며 뉴타운 설명 지점과 The Mound 쪽으로 자연스럽게 연결한다.
  [55.95220,-3.20055],[55.95224,-3.19845],[55.95222,-3.19650],[55.95218,-3.19570],
  [55.95162,-3.19566],[55.95082,-3.19555],[55.94972,-3.19528],
  [55.94868,-3.20041],[55.94757,-3.19600],[55.94700,-3.19272],[55.94692,-3.19130],[55.94694,-3.18889],
  [55.94750,-3.19167],[55.94956,-3.19263],[55.94944,-3.19083],[55.95056,-3.18556],[55.95067,-3.18510],
  [55.95158,-3.17899],[55.95189,-3.17502],[55.95270,-3.17229],[55.95474,-3.18191],
  // 칼튼 힐 정상에서 종점으로 직선 연결하지 않고 도로 쪽으로 내려와 Waterloo Place/Princes Street 방향으로 이어간다.
  [55.95415,-3.18275],[55.95372,-3.18390],[55.95342,-3.18510],[55.95316,-3.18655],[55.95288,-3.18800],[55.95305,-3.18905]
];
const arrowSegments=[2,6,10,13,16,19,22,25,28,31,34,37];
const preview=document.querySelector('[data-route-preview]');
const openBtn=document.querySelector('[data-route-map-open]');
const modal=document.getElementById('routeMapModal');
const mapEl=document.getElementById('routeMap');
if(!preview||!openBtn||!modal||!mapEl)return;
function renderPreview(){
  const lats=path.map(p=>p[0]),lngs=path.map(p=>p[1]);
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
  const project=([lat,lng])=>{const x=45+(lng-minLng)/(maxLng-minLng)*910;const y=185-(lat-minLat)/(maxLat-minLat)*145;return [x,y]};
  const pts=path.map(p=>project(p).join(',')).join(' ');
  const dots=stops.slice(1,-1).map(s=>{const [x,y]=project([s.lat,s.lng]);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.3" class="stop-dot"><title>${s.n}</title></circle>`}).join('');
  const arrows=arrowSegments.filter(i=>i<path.length-1).map(i=>{const a=project(path[i]),b=project(path[i+1]);const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;const deg=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;return `<text class="preview-arrow" x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">›</text>`}).join('');
  const [sx,sy]=project([stops[0].lat,stops[0].lng]);
  const [ex,ey]=project([stops[stops.length-1].lat,stops[stops.length-1].lng]);
  preview.innerHTML=`<svg viewBox="0 0 1000 220" role="img" aria-label="에든버러 워킹투어 19개 장소의 대표 동선 미리보기"><path class="map-context" d="M35 72 C180 48 280 64 390 45 S620 34 760 62 920 50 978 32M45 155 C185 130 285 148 410 126 S665 118 790 141 910 128 970 105"></path><polyline class="preview-route" points="${pts}"></polyline>${arrows}${dots}<g class="preview-start" transform="translate(${(sx-12).toFixed(1)} ${(sy-14).toFixed(1)})"><path d="M0 20V0m2 2h28l-6 7 6 7H2"/><text x="2" y="-5">START</text></g><g class="preview-end" transform="translate(${(ex-8).toFixed(1)} ${(ey-12).toFixed(1)})"><text x="0" y="0">END</text></g><text class="preview-label" x="50" y="207">에든버러 워킹투어 코스</text></svg>`;
}
renderPreview();
let map=null,lastFocus=null,leafletPromise=null;
function loadLeaflet(){
  if(window.L)return Promise.resolve();
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.leaflet='1';document.head.appendChild(l)}
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';s.crossOrigin='';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });return leafletPromise;
}
function arrowAngle(a,b){const lat=(a[0]+b[0])/2*Math.PI/180;const dx=(b[1]-a[1])*Math.cos(lat),dy=-(b[0]-a[0]);return Math.atan2(dy,dx)*180/Math.PI}
function initMap(){
  if(map){setTimeout(()=>{map.invalidateSize();map.fitBounds(path,{padding:[28,28]})},80);return}
  map=L.map(mapEl,{zoomControl:true,scrollWheelZoom:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  L.polyline(path,{color:'#27473a',weight:4,opacity:.9,lineJoin:'round'}).addTo(map);
  arrowSegments.filter(i=>i<path.length-1).forEach(i=>{const a=path[i],b=path[i+1],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],deg=arrowAngle(a,b);const icon=L.divIcon({className:'route-map-arrow-wrap',html:`<span class="route-map-arrow" style="transform:rotate(${deg.toFixed(1)}deg)">➤</span>`,iconSize:[18,18],iconAnchor:[9,9]});L.marker(mid,{icon,interactive:false}).addTo(map)});
  stops.forEach((s,i)=>{
    const isStart=i===0,isEnd=i===stops.length-1;
    const html=isStart?'<span class="route-map-marker start">⚑ START</span>':(isEnd?'<span class="route-map-marker end">END</span>':'<span class="route-map-marker"></span>');
    const icon=L.divIcon({className:'route-map-marker-wrap',html,iconSize:isStart?[62,24]:(isEnd?[48,24]:[18,18]),iconAnchor:isStart?[31,12]:(isEnd?[24,12]:[9,9])});
    const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.lat+','+s.lng)}`;
    const storyIcon='<svg class="route-popup-icon story" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm3 3h7M8 11h7M8 15h5"/></svg>';
    const mapIcon='<svg class="route-popup-icon map" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>';
    const popup=`<div class="route-popup"><strong>${s.n}</strong><div class="route-popup-actions"><a class="route-popup-action story" href="${s.u}">${storyIcon}<span>이야기 보기</span></a><a class="route-popup-action map" href="${mapsUrl}" target="_blank" rel="noopener">${mapIcon}<span>지도 보기</span></a></div></div>`;
    const m=L.marker([s.lat,s.lng],{icon,title:s.n}).addTo(map).bindPopup(popup);
    m.bindTooltip(s.n,{permanent:true,direction:isStart?'bottom':(isEnd?'bottom':'top'),offset:isStart?[0,10]:(isEnd?[0,10]:[0,-8]),className:'route-map-label'});
  });
  map.fitBounds(path,{padding:[28,28]});
}
async function openMap(){
  lastFocus=document.activeElement;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('map-open');modal.querySelector('.route-map-close').focus();
  mapEl.innerHTML='<div class="map-loading">지도를 불러오는 중입니다…</div>';
  try{await loadLeaflet();mapEl.innerHTML='';initMap();setTimeout(()=>map.invalidateSize(),100)}catch(e){mapEl.innerHTML='<div class="map-loading">지도를 불러오지 못했습니다. 위의 코스 목록은 계속 이용할 수 있습니다.</div>'}
}
function closeMap(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('map-open');if(lastFocus)lastFocus.focus()}
openBtn.addEventListener('click',openMap);preview.addEventListener('click',openMap);preview.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMap()}});
modal.querySelector('.route-map-close').addEventListener('click',closeMap);modal.addEventListener('click',e=>{if(e.target===modal)closeMap()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeMap()});
})();