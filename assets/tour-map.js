(()=>{

const stops=(Array.isArray(window.EW_TOUR_STOPS)?window.EW_TOUR_STOPS:[]).map(stop=>({n:stop.name,u:stop.url,lat:stop.lat,lng:stop.lng}));
if(!stops.length)return;
// 장소 마커와 실제 걷는 선을 분리한다. 스콧 기념탑에서 가든으로 들어간 뒤 정원 안을 서쪽으로 걸어 로스 분수 부근까지 간 다음,
// 북쪽 프린스 스트리트 쪽으로 올라와 동쪽으로 돌아 The Mound/국립미술관 방향으로 이어지는 실제 투어 흐름을 표현한다.
const path=[
  [55.95236,-3.19326],
  [55.95210,-3.19370],[55.95188,-3.19435],[55.95178,-3.19505],
  [55.95155,-3.19720],[55.95128,-3.19955],[55.95090,-3.20155],[55.95009,-3.20305],
  // 로스 분수 부근에서 북쪽으로 올라가 프린스 스트리트 쪽 보행 흐름을 탄다.
  // 로스 분수에서 북쪽으로는 Princes Street까지만 올라간다. George Street 쪽으로 더 올라가지 않는다.
  [55.95145,-3.20315],[55.95200,-3.20285],
  // Princes Street 남쪽 가장자리(Princes Street Gardens 쪽)를 따라 동쪽으로 곧게 이동해
  // National Gallery/The Mound 앞에서 남쪽으로 내려가 다음 코스로 이어간다.
  [55.95202,-3.20100],[55.95203,-3.19900],[55.95203,-3.19710],[55.95202,-3.19545],
  [55.95145,-3.19542],[55.95065,-3.19535],[55.94972,-3.19528],
  [55.94868,-3.20041],[55.94757,-3.19600],[55.94700,-3.19272],[55.94692,-3.19130],[55.94694,-3.18889],
  [55.94750,-3.19167],[55.94956,-3.19263],[55.94944,-3.19083],[55.95056,-3.18556],[55.95067,-3.18510],
  [55.95158,-3.17899],[55.95189,-3.17502],[55.95270,-3.17229],[55.95474,-3.18191],
  // 칼튼 힐에서 도로로 내려와 Waterloo Place와 Princes Street를 따라 발모럴 호텔 쪽으로 이어진다.
  [55.95418,-3.18242],[55.95374,-3.18322],[55.95346,-3.18428],[55.95330,-3.18572],
  [55.95316,-3.18718],[55.95328,-3.18948]
];
const arrowSegments=[2,6,10,13,16,19,22,25,28,31,34,37];
const optionalStop={n:'아서스 시트',u:'/places/arthurs-seat.html',lat:55.94410,lng:-3.16180};
const optionalFrom=[55.95270,-3.17229];
const mapBounds=[...path,[optionalStop.lat,optionalStop.lng]];
const preview=document.querySelector('[data-route-preview]');
const openBtn=document.querySelector('[data-route-map-open]');
const modal=document.getElementById('routeMapModal');
const mapEl=document.getElementById('routeMap');
if(!preview||!openBtn||!modal||!mapEl)return;
function renderPreview(){
  const lats=[...path.map(p=>p[0]),optionalStop.lat],lngs=[...path.map(p=>p[1]),optionalStop.lng];
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
  const project=([lat,lng])=>{const x=45+(lng-minLng)/(maxLng-minLng)*910;const y=185-(lat-minLat)/(maxLat-minLat)*145;return [x,y]};
  const pts=path.map(p=>project(p).join(',')).join(' ');
  const dots=stops.slice(1,-1).map(s=>{const [x,y]=project([s.lat,s.lng]);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.3" class="stop-dot"><title>${s.n}</title></circle>`}).join('');
  const arrows=arrowSegments.filter(i=>i<path.length-1).map(i=>{const a=project(path[i]),b=project(path[i+1]);const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;const deg=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;return `<text class="preview-arrow" x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">›</text>`}).join('');
  const [sx,sy]=project([stops[0].lat,stops[0].lng]);
  const [ex,ey]=project([stops[stops.length-1].lat,stops[stops.length-1].lng]);
  const [ox,oy]=project([optionalStop.lat,optionalStop.lng]);
  const [ofx,ofy]=project(optionalFrom);
  const optionalBranch=`<line class="preview-optional-line" x1="${ofx.toFixed(1)}" y1="${ofy.toFixed(1)}" x2="${ox.toFixed(1)}" y2="${oy.toFixed(1)}"></line><circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="6" class="preview-optional-dot"><title>아서스 시트 · 별도 방문</title></circle><text class="preview-optional-label" x="${(ox-8).toFixed(1)}" y="${(oy-10).toFixed(1)}" text-anchor="end">아서스 시트 · 별도</text>`;
  preview.innerHTML=`<svg viewBox="0 0 1000 220" role="img" aria-label="에든버러 워킹투어 19개 장소와 아서스 시트 별도 방문 동선 미리보기"><path class="map-context" d="M35 72 C180 48 280 64 390 45 S620 34 760 62 920 50 978 32M45 155 C185 130 285 148 410 126 S665 118 790 141 910 128 970 105"></path><polyline class="preview-route" points="${pts}"></polyline>${optionalBranch}${arrows}${dots}<g class="preview-start" transform="translate(${(sx-12).toFixed(1)} ${(sy-14).toFixed(1)})"><path d="M0 20V0m2 2h28l-6 7 6 7H2"/><text x="2" y="-5">START</text></g><g class="preview-end" transform="translate(${(ex-8).toFixed(1)} ${(ey-12).toFixed(1)})"><text x="0" y="0">END</text></g><text class="preview-label" x="50" y="207">에든버러 워킹투어 코스</text></svg>`;
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
function bindInteractiveLabel(marker,label,tooltipOptions={}){
  marker.bindTooltip(label,{permanent:true,interactive:true,...tooltipOptions,className:'route-map-label'});
  const setup=()=>{
    const tooltip=marker.getTooltip(),el=tooltip&&tooltip.getElement();
    if(!el||el.dataset.routeInteractive==='1')return;
    el.dataset.routeInteractive='1';
    el.setAttribute('role','button');
    el.setAttribute('tabindex','0');
    el.setAttribute('aria-label',label+' 자세히 보기 열기');
    const open=e=>{
      if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;
      if(e.type==='keydown')e.preventDefault();
      if(window.L&&L.DomEvent)L.DomEvent.stopPropagation(e);
      marker.openPopup();
    };
    el.addEventListener('click',open);
    el.addEventListener('keydown',open);
  };
  marker.on('tooltipopen',setup);
  requestAnimationFrame(setup);
  return marker;
}
function initMap(){
  if(map){setTimeout(()=>{map.invalidateSize();map.fitBounds(mapBounds,{padding:[28,28]})},80);return}
  map=L.map(mapEl,{zoomControl:true,scrollWheelZoom:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  L.polyline(path,{color:'#27473a',weight:4,opacity:.9,lineJoin:'round'}).addTo(map);
  L.polyline([optionalFrom,[optionalStop.lat,optionalStop.lng]],{color:'#6f8477',weight:3,opacity:.85,dashArray:'6 7'}).addTo(map);
  const optionalIcon=L.divIcon({className:'route-map-optional-wrap',html:'<span class="route-map-optional">별도</span>',iconSize:[34,24],iconAnchor:[17,12]});
  const optionalMapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(optionalStop.lat+','+optionalStop.lng)}`;
  const optionalStoryIcon='<svg class="route-popup-icon story" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm3 3h7M8 11h7M8 15h5"/></svg>';
  const optionalMapIcon='<svg class="route-popup-icon map" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>';
  const optionalPopup=`<div class="route-popup"><strong>${optionalStop.n} · 별도 방문</strong><div class="route-popup-actions"><a class="route-popup-action story" href="${optionalStop.u}#place-nav">${optionalStoryIcon}<span>자세히 보기 ›</span></a><a class="route-popup-action map" href="${optionalMapsUrl}" target="_blank" rel="noopener">${optionalMapIcon}<span>지도 보기</span></a></div></div>`;
  const optionalMarker=L.marker([optionalStop.lat,optionalStop.lng],{icon:optionalIcon,title:optionalStop.n+' · 별도 방문'}).bindPopup(optionalPopup);
  bindInteractiveLabel(optionalMarker,optionalStop.n+' · 별도 방문',{direction:'top',offset:[0,-10]});
  optionalMarker.addTo(map);
  arrowSegments.filter(i=>i<path.length-1).forEach(i=>{const a=path[i],b=path[i+1],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],deg=arrowAngle(a,b);const icon=L.divIcon({className:'route-map-arrow-wrap',html:`<span class="route-map-arrow" style="transform:rotate(${deg.toFixed(1)}deg)">➤</span>`,iconSize:[18,18],iconAnchor:[9,9]});L.marker(mid,{icon,interactive:false}).addTo(map)});
  stops.forEach((s,i)=>{
    const isStart=i===0,isEnd=i===stops.length-1,number=i+1;
    const status=isStart?'<span class="route-map-status start">⚑ START</span>':(isEnd?'<span class="route-map-status end">END</span>':'');
    const stateClass=isStart?' start':(isEnd?' end':'');
    const markerHtml=`<span class="route-map-marker-stack"><span class="route-map-marker${stateClass}">${number}</span>${status}</span>`;
    const icon=L.divIcon({className:'route-map-marker-wrap',html:markerHtml,iconSize:[28,28],iconAnchor:[14,14]});
    const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.lat+','+s.lng)}`;
    const storyIcon='<svg class="route-popup-icon story" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm3 3h7M8 11h7M8 15h5"/></svg>';
    const mapIcon='<svg class="route-popup-icon map" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>';
    const popup=`<div class="route-popup"><strong>${number}. ${s.n}</strong><div class="route-popup-actions"><a class="route-popup-action story" href="${s.u}#tour-nav">${storyIcon}<span>자세히 보기 ›</span></a><a class="route-popup-action map" href="${mapsUrl}" target="_blank" rel="noopener">${mapIcon}<span>지도 보기</span></a></div></div>`;
    const m=L.marker([s.lat,s.lng],{icon,title:`${number}. ${s.n}`}).bindPopup(popup);
    bindInteractiveLabel(m,s.n,{direction:isStart?'bottom':(isEnd?'bottom':'top'),offset:isStart?[0,14]:(isEnd?[0,14]:[0,-10])});
    m.addTo(map);
  });
  map.fitBounds(mapBounds,{padding:[28,28]});
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