/* Shared hiking maps: real OpenStreetMap geography, schematic waypoint connections. */
(()=>{'use strict';
const routes=[
{id:1,name:'펜틀란드 힐스',color:'#dc8b20',points:[[55.88,-3.31],[55.85,-3.32],[55.83,-3.34]],zoom:11},
{id:2,name:'파이프 코스탈 패스',color:'#2474b7',points:[[56.06,-3.72],[56.00,-3.39],[56.05,-3.28],[56.06,-3.23],[56.11,-3.16],[56.11,-3.00],[56.20,-2.70],[56.23,-2.70],[56.19,-2.59],[56.21,-2.51],[56.34,-2.80],[56.35,-3.38]],zoom:9},
{id:3,name:'유니언 운하·포스 클라이드 운하',color:'#32946a',points:[[55.94,-3.22],[55.97,-3.60],[55.98,-3.69],[56.00,-3.84],[55.94,-4.15],[55.90,-4.28]],zoom:9},
{id:4,name:'존 뮤어 웨이',color:'#9b55a4',points:[[56.00,-4.73],[56.00,-4.59],[55.94,-4.15],[56.00,-3.78],[55.98,-3.60],[55.99,-3.40],[55.96,-3.19],[56.06,-2.72],[56.00,-2.51]],zoom:8},
{id:5,name:'세인트 커스버트 웨이',color:'#d64b75',points:[[55.60,-2.72],[55.57,-2.64],[55.55,-2.28],[55.55,-2.02],[55.66,-1.93],[55.67,-1.80]],zoom:9},
{id:6,name:'웨스트 하이랜드 웨이',color:'#d64b43',points:[[55.94,-4.32],[56.07,-4.45],[56.09,-4.54],[56.15,-4.64],[56.33,-4.72],[56.43,-4.71],[56.52,-4.77],[56.65,-4.84],[56.71,-4.96],[56.82,-5.11]],zoom:9},
{id:7,name:'롭 로이 웨이',color:'#23796c',points:[[56.07,-4.45],[56.18,-4.38],[56.24,-4.22],[56.32,-4.32],[56.47,-4.32],[56.62,-3.87],[56.70,-3.73]],zoom:9},
{id:8,name:'그레이트 글렌 웨이',color:'#426cce',points:[[56.82,-5.11],[56.91,-4.99],[57.04,-4.82],[57.14,-4.68],[57.21,-4.62],[57.33,-4.48],[57.48,-4.23]],zoom:9},
{id:9,name:'먼로 배깅',color:'#79563b',points:[[56.80,-5.00],[56.19,-4.63],[56.34,-4.22],[57.12,-3.67]],zoom:8,area:true}
];
const towns=[['에든버러',55.953,-3.19],['글래스고',55.864,-4.25],['포트 윌리엄',56.82,-5.11],['인버네스',57.48,-4.23]];
function start(){
if(!window.L)return;
document.querySelectorAll('[data-hiking-map]').forEach(el=>{
if(el.dataset.ready)return;el.dataset.ready='1';
const n=Number(el.getAttribute('data-hiking-map')),main=!n;
const map=L.map(el,{scrollWheelZoom:false,zoomControl:false,attributionControl:true,dragging:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,tap:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const bounds=L.latLngBounds([]);
const chosen=main?routes.filter(r=>r.id!==9):routes.filter(r=>r.id===n);
chosen.forEach(r=>{
if(!r.area&&r.id!==2){
L.polyline(r.points,{color:'#fff',weight:7,opacity:.94,interactive:false}).addTo(map);
L.polyline(r.points,{color:r.color,weight:4.5,opacity:1,interactive:false}).addTo(map);
}
r.points.forEach(p=>bounds.extend(p));
const labelPoint=main?({1:[55.84,-3.35],2:[56.22,-2.57],3:[56.04,-3.76],4:[55.91,-2.47],5:[55.64,-2.30],6:[56.48,-4.88],7:[56.47,-4.23],8:[57.26,-4.48],9:[56.84,-4.98]}[r.id]):r.points[Math.floor(r.points.length/2)];
L.marker(labelPoint,{interactive:false,icon:L.divIcon({className:'hiking-route-index',html:'<span style="--route-color:'+r.color+'">'+String(r.id).padStart(2,'0')+'</span>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map);

if(r.area){
const peaks=[[56.796,-5.004],[56.65,-4.99],[56.68,-4.97],[56.55,-4.75],[56.19,-4.63],[56.34,-4.22],[56.62,-3.94],[57.12,-3.67],[57.07,-3.67],[57.04,-3.53],[57.19,-3.84],[57.21,-4.71],[57.45,-5.25]];
peaks.forEach(p=>L.marker(p,{interactive:false,icon:L.divIcon({className:'hiking-munro-peak',html:'▲',iconSize:[15,15],iconAnchor:[7,8]})}).addTo(map));
}
if(!main&&r.id===6){
const stages=[['밀가비 · 출발',55.94,-4.32],['드라이먼',56.07,-4.45],['발마하',56.09,-4.54],['로와데넌',56.15,-4.64],['인버아너넌',56.33,-4.72],['틴드럼',56.43,-4.71],['브리지 오브 오키',56.52,-4.77],['킹스하우스',56.65,-4.84],['킨로클레븐',56.71,-4.96],['포트 윌리엄 · 도착',56.82,-5.11]];
stages.forEach(([name,lat,lon],i)=>{L.circleMarker([lat,lon],{radius:3.5,color:r.color,fillColor:'#fff',weight:2,fillOpacity:1,interactive:false}).addTo(map);L.marker([lat,lon],{interactive:false,icon:L.divIcon({className:'hiking-stage-label',html:name,iconSize:[125,18],iconAnchor:i%2?[130,8]:[-8,8]})}).addTo(map);});
}
});
towns.forEach(([name,lat,lon])=>{
L.circleMarker([lat,lon],{radius:3,color:'#334155',fillColor:'#334155',fillOpacity:1,weight:1,interactive:false}).addTo(map);
L.marker([lat,lon],{interactive:false,icon:L.divIcon({className:'hiking-town-text',html:name,iconSize:[90,16],iconAnchor:[-7,9]})}).addTo(map);
});
if(main){map.fitBounds([[55.28,-5.20],[57.67,-1.62]],{padding:[10,10]});}else{map.fitBounds(bounds.pad(.28),{padding:[25,25],maxZoom:10});}
setTimeout(()=>map.invalidateSize(),100);
});
}
function load(){if(window.L){start();return;}const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.onload=start;document.head.appendChild(js);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();