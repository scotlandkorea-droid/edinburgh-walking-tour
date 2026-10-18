/* Shared hiking maps: real OpenStreetMap geography, schematic waypoint connections. */
(()=>{'use strict';
const routes=[
{id:1,name:'펜틀란드 힐스',color:'#dc8b20',points:[[55.88,-3.31],[55.85,-3.32],[55.83,-3.34]],zoom:11},
{id:2,name:'파이프 코스탈 패스',color:'#2474b7',points:[[56.01,-3.39],[56.03,-3.27],[56.06,-3.23],[56.11,-3.16],[56.14,-3.04],[56.19,-2.85],[56.20,-2.73],[56.22,-2.70],[56.19,-2.59],[56.21,-2.51],[56.25,-2.59],[56.30,-2.66],[56.33,-2.80],[56.34,-2.94]],zoom:9},
{id:3,name:'유니언 운하·포스 클라이드 운하',color:'#32946a',points:[[55.94,-3.22],[55.94,-3.37],[55.95,-3.53],[55.98,-3.69],[56.00,-3.84],[55.98,-3.93],[55.95,-4.08],[55.94,-4.15],[55.90,-4.28]],zoom:9},
{id:4,name:'존 뮤어 웨이',color:'#9b55a4',points:[[56.00,-4.73],[56.00,-4.59],[55.94,-4.15],[56.00,-3.78],[55.98,-3.60],[55.99,-3.40],[55.96,-3.19],[56.06,-2.72],[56.00,-2.51]],zoom:8},
{id:5,name:'세인트 커스버트 웨이',color:'#d64b75',points:[[55.60,-2.72],[55.57,-2.64],[55.55,-2.28],[55.55,-2.02],[55.66,-1.93],[55.67,-1.80]],zoom:9},
{id:6,name:'웨스트 하이랜드 웨이',color:'#d64b43',points:[[55.94,-4.32],[56.07,-4.45],[56.09,-4.54],[56.15,-4.64],[56.33,-4.72],[56.43,-4.71],[56.52,-4.77],[56.65,-4.84],[56.71,-4.96],[56.82,-5.11]],zoom:9},
{id:7,name:'롭 로이 웨이',color:'#23796c',points:[[56.07,-4.45],[56.18,-4.38],[56.24,-4.22],[56.32,-4.32],[56.47,-4.32],[56.62,-3.87],[56.70,-3.73]],zoom:9},
{id:8,name:'그레이트 글렌 웨이',color:'#426cce',points:[[56.82,-5.11],[56.91,-4.99],[57.04,-4.82],[57.14,-4.68],[57.21,-4.62],[57.33,-4.48],[57.48,-4.23]],zoom:9},
{id:9,name:'먼로 배깅',color:'#79563b',points:[[56.80,-5.00],[56.19,-4.63],[56.34,-4.22],[57.12,-3.67]],zoom:8,area:true}
];
const towns=[['에든버러',55.953,-3.19],['글래스고',55.864,-4.25],['포트 윌리엄',56.82,-5.11],['인버네스',57.48,-4.23]];

const stageNames={
1:[['Flotterstone',55.872,-3.220],['Glencorse Reservoir',55.855,-3.285],['Scald Law',55.831,-3.327]],
2:[['North Queensferry',56.010,-3.395],['Dalgety Bay',56.032,-3.351],['Aberdour',56.054,-3.300],['Kinghorn',56.069,-3.176],['Kirkcaldy',56.112,-3.159],['Leven',56.196,-2.997],['Elie',56.192,-2.823],['Anstruther',56.223,-2.701],['Crail',56.261,-2.627],['St Andrews',56.340,-2.799],['Newburgh',56.351,-3.207]],
3:[['Edinburgh',55.941,-3.222],['Ratho',55.921,-3.380],['Linlithgow',55.978,-3.600],['Falkirk Wheel',55.999,-3.841],['Kirkintilloch',55.940,-4.152],['Bowling',55.931,-4.491]],
4:[['Helensburgh',56.002,-4.732],['Balloch',56.002,-4.591],['Strathblane',55.986,-4.308],['Kirkintilloch',55.940,-4.152],['Falkirk',55.999,-3.784],['Linlithgow',55.978,-3.600],['South Queensferry',55.990,-3.399],['Edinburgh',55.953,-3.189],['North Berwick',56.058,-2.717],['Dunbar',56.000,-2.516]],
5:[['Melrose',55.598,-2.722],['St Boswells',55.574,-2.645],['Harestanes',55.533,-2.525],['Morebattle',55.515,-2.352],['Kirk Yetholm',55.546,-2.279],['Wooler',55.548,-2.013],['Holy Island',55.670,-1.800]],
6:[['Milngavie',55.941,-4.319],['Drymen',56.067,-4.451],['Balmaha',56.088,-4.540],['Rowardennan',56.151,-4.643],['Inverarnan',56.329,-4.720],['Tyndrum',56.432,-4.711],['Bridge of Orchy',56.516,-4.766],['Kingshouse',56.651,-4.843],['Kinlochleven',56.713,-4.964],['Fort William',56.819,-5.106]],
7:[['Drymen',56.067,-4.451],['Aberfoyle',56.179,-4.385],['Callander',56.243,-4.216],['Strathyre',56.324,-4.325],['Killin',56.468,-4.319],['Aberfeldy',56.620,-3.865],['Pitlochry',56.703,-3.729]],
8:[['Fort William',56.819,-5.106],['Gairlochy',56.914,-4.992],['Laggan',57.040,-4.820],['Fort Augustus',57.145,-4.681],['Invermoriston',57.215,-4.617],['Drumnadrochit',57.333,-4.480],['Inverness',57.477,-4.225]]
};
function drawWestHighland(el){
 const r=routes[5], W=440,H=940;
 const pts=[
 ['Milngavie',55.941,-4.319],['Drymen',56.067,-4.451],['Balmaha',56.088,-4.540],
 ['Rowardennan',56.151,-4.643],['Inversnaid',56.245,-4.685],['Inverarnan',56.329,-4.720],
 ['Crianlarich',56.390,-4.615],['Tyndrum',56.432,-4.711],['Bridge of Orchy',56.516,-4.766],
 ['Inveroran',56.540,-4.785],['Kingshouse',56.651,-4.843],['Kinlochleven',56.713,-4.964],['Fort William',56.819,-5.106]
 ];
 const xy=(lat,lon)=>[222+(lon+4.72)*205,860-(lat-55.94)*800];
 const line=pts.map((p,i)=>{const [x,y]=xy(p[1],p[2]);return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
 const labels=pts.map((p,i)=>{const [x,y]=xy(p[1],p[2]);const right=i%2===0,dx=right?14:-14;
 return '<circle cx="'+x+'" cy="'+y+'" r="4" fill="white" stroke="#bd574e" stroke-width="2.5"/><text x="'+(x+dx)+'" y="'+(y+4)+'" text-anchor="'+(right?'start':'end')+'" fill="#263a3c" font-size="12.5" font-weight="'+(i===0||i===pts.length-1?'700':'500')+'" stroke="white" stroke-width="4" paint-order="stroke">'+p[0]+'</text>';}).join('');
 el.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="West Highland Way from Milngavie to Fort William, south to north"><path d="'+line+'" fill="none" stroke="#d15b50" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+labels+'</svg>';
 el.classList.add('hiking-course-diagram','hiking-course-vertical');
}
function drawCourse(el,n){
 const r=routes.find(x=>x.id===n),stages=stageNames[n]||[];
 if(!r||!stages.length)return;
 const coords=r.points.concat(stages.map(x=>[x[1],x[2]]));
 const minLat=Math.min(...coords.map(p=>p[0])),maxLat=Math.max(...coords.map(p=>p[0]));
 const midLat=(minLat+maxLat)/2,scale=Math.cos(midLat*Math.PI/180);
 const minLon=Math.min(...coords.map(p=>p[1])),maxLon=Math.max(...coords.map(p=>p[1]));
 const latRange=Math.max(.035,maxLat-minLat),lonRange=Math.max(.035,(maxLon-minLon)*scale);
 const W=760,H=560, padX=185,padY=48;
 const factor=Math.min((W-2*padX)/lonRange,(H-2*padY)/latRange);
 const xy=(lat,lon)=>[W/2+((lon-(minLon+maxLon)/2)*scale)*factor,H/2-(lat-midLat)*factor];
 const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const points=r.points.map(p=>xy(...p).map(v=>v.toFixed(1)).join(',')).join(' ');
 const dots=stages.map(([name,lat,lon],i)=>{
 const [x,y]=xy(lat,lon),right=i%2===0,dx=right?12:-12,anchor=right?'start':'end';
 const labelY=y+((i%3)-1)*7;
 return '<circle cx="'+x+'" cy="'+y+'" r="4.5" fill="white" stroke="'+r.color+'" stroke-width="2.5"/>'+
 '<text x="'+(x+dx)+'" y="'+(labelY+4)+'" text-anchor="'+anchor+'" fill="#24343b" stroke="white" stroke-width="4" paint-order="stroke" font-size="13" font-weight="'+(i===0||i===stages.length-1?'700':'500')+'">'+esc(name)+'</text>';
 }).join('');
 el.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(r.name)+' course diagram with English place names" preserveAspectRatio="xMidYMid meet"><polyline points="'+points+'" fill="none" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><polyline points="'+points+'" fill="none" stroke="'+r.color+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
 el.classList.add('hiking-course-diagram');
}

function start(){
if(!window.L)return;
document.querySelectorAll('[data-hiking-map]').forEach(el=>{
if(el.dataset.ready)return;el.dataset.ready='1';
const n=Number(el.getAttribute('data-hiking-map')),main=!n;
if(n===6){drawWestHighland(el);return;}
if(n>=1&&n<=8){drawCourse(el,n);return;}
const map=L.map(el,{scrollWheelZoom:false,zoomControl:false,attributionControl:true,dragging:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,tap:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const bounds=L.latLngBounds([]);
const chosen=main?routes.filter(r=>r.id!==9):routes.filter(r=>r.id===n);
chosen.forEach(r=>{
if(!r.area){
L.polyline(r.points,{color:'#fff',weight:7,opacity:.94,interactive:false}).addTo(map);
L.polyline(r.points,{color:r.color,weight:4.5,opacity:1,interactive:false}).addTo(map);
}
r.points.forEach(p=>bounds.extend(p));
const labelPoint=main?({1:[55.84,-3.35],2:[56.35,-3.00],3:[55.89,-3.72],4:[55.99,-2.45],5:[55.64,-2.30],6:[56.48,-4.88],7:[56.47,-4.23],8:[57.26,-4.48],9:[56.84,-4.98]}[r.id]):r.points[Math.floor(r.points.length/2)];
L.marker(labelPoint,{interactive:false,icon:L.divIcon({className:'hiking-route-index',html:'<span style="--route-color:'+r.color+'">'+String(r.id).padStart(2,'0')+'</span>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map);

if(r.area){
const peaks=[[56.796,-5.004],[56.65,-4.99],[56.68,-4.97],[56.55,-4.75],[56.19,-4.63],[56.34,-4.22],[56.62,-3.94],[57.12,-3.67],[57.07,-3.67],[57.04,-3.53],[57.19,-3.84],[57.21,-4.71],[57.45,-5.25]];
peaks.forEach(p=>L.marker(p,{interactive:false,icon:L.divIcon({className:'hiking-munro-peak',html:'▲',iconSize:[15,15],iconAnchor:[7,8]})}).addTo(map));
}
if(!main){
/* Names correspond to the source articles. Points indicate towns or landmarks,
   while the connecting line remains a geographic overview, not a GPS trail. */

const stages=stageNames[r.id]||[];
stages.forEach(([name,lat,lon],i)=>{
L.circleMarker([lat,lon],{radius:3.3,color:r.color,fillColor:'#fff',weight:2,fillOpacity:1,interactive:false}).addTo(map);
const right=i%2===0;
L.marker([lat,lon],{interactive:false,icon:L.divIcon({className:'hiking-stage-label',html:'<span>'+name+'</span>',iconSize:[112,18],iconAnchor:right?[-7,9]:[119,9]})}).addTo(map);
});
}
});
/* Base map already labels major towns; avoid duplicate labels. */
/* towns.forEach(([name,lat,lon])=>{
L.circleMarker([lat,lon],{radius:3,color:'#334155',fillColor:'#334155',fillOpacity:1,weight:1,interactive:false}).addTo(map);
L.marker([lat,lon],{interactive:false,icon:L.divIcon({className:'hiking-town-text',html:name,iconSize:[90,16],iconAnchor:[-7,9]})}).addTo(map);
});
*/
if(main){map.fitBounds([[55.39,-5.14],[57.65,-1.71]],{padding:[5,5]});}else{map.fitBounds(bounds.pad(.28),{padding:[25,25],maxZoom:10});}
setTimeout(()=>map.invalidateSize(),100);
});
}
function load(){if(window.L){start();return;}const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.onload=start;document.head.appendChild(js);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();