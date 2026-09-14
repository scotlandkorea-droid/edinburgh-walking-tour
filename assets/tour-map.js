(()=>{
const stops=[
  {n:'스콧 기념탑',u:'/places/scott-monument.html',lat:55.95236,lng:-3.19326,start:true},
  {n:'프린스 스트리트 가든',u:'/places/princes-street.html',lat:55.95141,lng:-3.19361},
  {n:'에든버러 뉴타운',u:'/places/new-town.html',lat:55.95546,lng:-3.19900},
  {n:'뉴 칼리지',u:'/places/new-college.html',lat:55.94972,lng:-3.19528},
  {n:'에든버러 성',u:'/places/edinburgh-castle.html',lat:55.94868,lng:-3.20041},
  {n:'그래스마켓',u:'/places/grassmarket.html',lat:55.94757,lng:-3.19600},
  {n:'그레이프라이어스',u:'/places/greyfriars.html',lat:55.94700,lng:-3.19272},
  {n:'바비 동상',u:'/places/greyfriars-bobby.html',lat:55.94692,lng:-3.19130},
  {n:'국립박물관',u:'/places/national-museum.html',lat:55.94694,lng:-3.18889},
  {n:'엘리펀트 하우스',u:'/places/elephant-house.html',lat:55.94865,lng:-3.19407},
  {n:'데이비드 흄 동상',u:'/places/david-hume.html',lat:55.94956,lng:-3.19263},
  {n:'세인트 자일스',u:'/places/st-giles.html',lat:55.94944,lng:-3.19083},
  {n:'로열마일',u:'/places/royal-mile.html',lat:55.95056,lng:-3.18556},
  {n:'존 녹스 하우스',u:'/places/john-knox-house.html',lat:55.95067,lng:-3.18510},
  {n:'캐넌게이트',u:'/places/canongate.html',lat:55.95158,lng:-3.17899},
  {n:'스코틀랜드 의회',u:'/places/scottish-parliament.html',lat:55.95189,lng:-3.17502},
  {n:'홀리루드 궁전',u:'/places/holyrood-palace.html',lat:55.95270,lng:-3.17229},
  {n:'칼튼 힐',u:'/places/calton-hill.html',lat:55.95474,lng:-3.18191}
];
// Princes Street Gardens is one place/marker. Extra points below are route-only waypoints.
const path=[
  [55.95236,-3.19326],[55.95141,-3.19361],[55.95083,-3.19577],[55.95011,-3.19908],[55.95015,-3.20466],[55.95050,-3.19980],[55.95083,-3.19577],
  [55.95546,-3.19900],[55.94972,-3.19528],[55.94868,-3.20041],[55.94757,-3.19600],[55.94700,-3.19272],[55.94692,-3.19130],[55.94694,-3.18889],
  [55.94865,-3.19407],[55.94956,-3.19263],[55.94944,-3.19083],[55.95056,-3.18556],[55.95067,-3.18510],[55.95158,-3.17899],[55.95189,-3.17502],[55.95270,-3.17229],[55.95474,-3.18191]
];
const preview=document.querySelector('[data-route-preview]');
const openBtn=document.querySelector('[data-route-map-open]');
const modal=document.getElementById('routeMapModal');
const mapEl=document.getElementById('routeMap');
if(!preview||!openBtn||!modal||!mapEl)return;
function renderPreview(){
  const all=path;const lats=all.map(p=>p[0]),lngs=all.map(p=>p[1]);
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
  const project=([lat,lng])=>{const x=45+(lng-minLng)/(maxLng-minLng)*910;const y=185-(lat-minLat)/(maxLat-minLat)*145;return [x,y]};
  const pts=path.map(p=>project(p).join(',')).join(' ');
  const dots=stops.map((s,i)=>{const [x,y]=project([s.lat,s.lng]);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i===0?6:4.3}" class="${i===0?'start-dot':'stop-dot'}"><title>${s.n}</title></circle>`}).join('');
  const [sx,sy]=project([stops[0].lat,stops[0].lng]);
  preview.innerHTML=`<svg viewBox="0 0 1000 220" role="img" aria-label="에든버러 워킹투어 18개 장소의 대표 동선 미리보기"><path class="map-context" d="M35 72 C180 48 280 64 390 45 S620 34 760 62 920 50 978 32M45 155 C185 130 285 148 410 126 S665 118 790 141 910 128 970 105"></path><polyline class="preview-route" points="${pts}"></polyline>${dots}<g class="preview-start" transform="translate(${(sx-30).toFixed(1)} ${(sy-35).toFixed(1)})"><path d="M0 28V0m2 2h30l-7 8 7 8H2"/><text x="5" y="-6">START</text></g><text class="preview-label" x="50" y="207">Edinburgh · walking route preview</text></svg>`;
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
function initMap(){
  if(map){setTimeout(()=>{map.invalidateSize();map.fitBounds(path,{padding:[24,24]})},80);return}
  map=L.map(mapEl,{zoomControl:true,scrollWheelZoom:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  L.polyline(path,{color:'#27473a',weight:4,opacity:.9,lineJoin:'round'}).addTo(map);
  stops.forEach((s,i)=>{
    const icon=L.divIcon({className:'route-map-marker-wrap',html:i===0?'<span class="route-map-marker start">⚑</span>':'<span class="route-map-marker"></span>',iconSize:i===0?[28,28]:[18,18],iconAnchor:i===0?[14,14]:[9,9]});
    L.marker([s.lat,s.lng],{icon,title:s.n}).addTo(map).bindPopup(`<strong>${s.n}</strong><br><a href="${s.u}">자세히 보기 ›</a>`);
  });
  map.fitBounds(path,{padding:[24,24]});
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