'use strict';
const $=id=>document.getElementById(id), all=(q,base=document)=>[...base.querySelectorAll(q)], esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const themeColors={'其他／背景不明':'#8c9189','城市變遷與地方記憶':'#c9a66b','戰爭與集體創傷':'#a4504b','日常生活中的恐懼':'#6aa9a1','死亡與亡魂':'#a85c78','民間信仰與超自然力量':'#9a86b8','禁忌與行為規範':'#c28357'};
const stories=window.STORIES, byPlace=new Map(), places=new Map(json_HK_Island_Ghost_Coordinates_7.features.map(f=>[f.properties.place_id,f])), themePlaces=new Map(json_Ghost_Places_Analysis_8.features.map(f=>[f.properties.place_id,f.properties]));
for(const s of stories){if(!byPlace.has(s.place))byPlace.set(s.place,[]);byPlace.get(s.place).push(s)}
const iconNames={'LOC-001':'high','LOC-013':'murray','LOC-036':'murray','LOC-033':'wahfu'};
const pointFeatures=[...places.values()].filter(f=>f.geometry?.type==='Point');
const extent=L.latLngBounds(pointFeatures.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]]));
const map=L.map('map',{minZoom:10,maxZoom:19,zoomControl:false,attributionControl:true}); L.control.zoom({position:'topleft'}).addTo(map);map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a> · QGIS');
const base=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,maxNativeZoom:18,className:'dark-basemap',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const historyDefs=[{id:'1927',label:'1927 香港歷史地圖',image:'data/1927HongKongHistoricalMap_3.png',bounds:[[22.06644608625031,113.6848600722476],[22.68280804256718,114.57281615662785]]},{id:'1957',label:'1957 香港歷史地圖',image:'data/1957HongKongHistoricalMap_1.png',bounds:[[22.102810397209673,113.78266691526161],[22.645067667286575,114.54149823630382]]},{id:'1960',label:'1960–1964 歷史地圖',tile:'https://hkgeotiles.com/api/tiles/dataset/mbtiles-t600-t1200-1960-1964/{z}/{x}/{y}.png'},{id:'1976',label:'1976 航空照片',tile:'https://hkgeotiles.com/api/tiles/dataset/mbtiles-dop1000-1976/{z}/{x}/{y}.png'}];
for(const [i,h] of historyDefs.entries()){h.pane=map.createPane('historic'+h.id);h.pane.style.zIndex=210+i;h.pane.style.pointerEvents='none';h.opacity=.75;h.layer=h.image?L.imageOverlay(h.image,h.bounds,{pane:'historic'+h.id,opacity:h.opacity,interactive:false,attribution:h.id+' 歷史地圖（QGIS 匯出）'}):L.tileLayer(h.tile,{pane:'historic'+h.id,opacity:h.opacity,maxZoom:19,maxNativeZoom:18,attribution:'<a href="https://hkgeotiles.com/">HKGeoTiles</a>'});h.layer.on('tileerror error',()=>{if(map.hasLayer(h.layer))$('compareHint').textContent=h.id+' 圖層部分資源未能載入，請檢查網絡或來源。'});}
const shapeStyles={'LOC-013':{color:'#c9a66b',fillColor:'#c9a66b',fillOpacity:.28,weight:2},'LOC-042':{color:'#b98567',fillColor:'#b98567',fillOpacity:.2,weight:2,dashArray:'8 5'},'LOC-033':{color:'#6aa9a1',fillColor:'#6aa9a1',fillOpacity:.2,weight:2,dashArray:'8 5'}};
const shapeMap=new Map(); let matched=new Map(); let mode='ghost';let activePlace=null; const placePopup=L.popup({maxWidth:320,autoPanPadding:[24,24]});
const buildings=L.geoJSON(json_historical_buildings_5,{style:f=>shapeStyles[f.properties.place_id]||{color:'#b39870'},onEachFeature:(f,l)=>{const id=f.properties.place_id;shapeMap.set(id,l);l.on('click',()=>showPlace(id,l.getBounds().getCenter(),null,false));}}).addTo(map);
const coast=L.geoJSON(json_sevensisters_6,{style:{color:'#8fc4bd',weight:4,opacity:.85,dashArray:'7 5'},onEachFeature:(f,l)=>{const id=f.properties.place_id;shapeMap.set(id,l);l.on('click',()=>showPlace(id,l.getBounds().getCenter(),null,false));}}).addTo(map);
const clusters=L.markerClusterGroup({showCoverageOnHover:false,spiderfyOnMaxZoom:true,maxClusterRadius:42,iconCreateFunction:c=>L.divIcon({className:'cluster-custom',html:String(c.getChildCount()),iconSize:[35,35]})}).addTo(map);
const themeLayer=L.layerGroup(), rendered=new Map();
function precision(id,s){return places.get(id)?.properties.precision_short||shapeMap.get(id)?.feature?.properties?.precision_short||s.precision||'Unknown'}
function resetView(){map.fitBounds(extent,{padding:[30,30],maxZoom:14});}resetView();
function makeIcon(id){const name=iconNames[id]||'skull';return L.icon({iconUrl:'assets/'+name+'.png',iconSize:[28,28],iconAnchor:[14,14],className:'ghost-icon'});}
function makeFeature(f){const id=f.properties.place_id,p=f.geometry.coordinates,latlng=[p[1],p[0]];let layer;if(mode==='ghost')layer=L.marker(latlng,{icon:makeIcon(id),zIndexOffset:iconNames[id]?500:0,title:f.properties.name_zh,alt:f.properties.name_zh});else layer=L.circleMarker(latlng,{radius:8,color:'#202420',weight:1.2,fillOpacity:1,fillColor:themeColors[themePlaces.get(id)?.primary_theme]||'#b3a587'});layer.on('click',()=>showPlace(id,layer.getLatLng(),null,false));return layer;}
function renderMap(){map.closePopup();clusters.clearLayers();themeLayer.clearLayers();rendered.clear();if(mode==='ghost'){if(map.hasLayer(themeLayer))map.removeLayer(themeLayer);if(!map.hasLayer(clusters))clusters.addTo(map)}else{if(map.hasLayer(clusters))map.removeLayer(clusters);if(!map.hasLayer(themeLayer))themeLayer.addTo(map)}for(const f of pointFeatures){const id=f.properties.place_id;if(!matched.has(id))continue;const l=makeFeature(f);rendered.set(id,l);(mode==='ghost'?clusters:themeLayer).addLayer(l)}renderLegend();}
function renderLegend(){const list=mode==='ghost'?[['高街','high'],['美利樓','murray'],['華富邨','wahfu'],['其他鬼故地點','skull']].map(([n,k])=>`<div class="legend-item"><img src="assets/${k}.png" alt="">${n}</div>`):Object.entries(themeColors).map(([n,c])=>`<div class="legend-item"><span class="dot" style="background:${c}"></span>${esc(n)}</div>`);$('legend').innerHTML=list.join('')+(mode==='theme'?'<p class="hint">以地點原始主要主題著色；篩選按故事標籤。</p>':'');}
const selectedThemes=new Set(); $('themes').innerHTML=Object.entries(themeColors).map(([n,c])=>`<label><input type="checkbox" value="${esc(n)}"><span class="dot" style="background:${c}"></span>${esc(n)}</label>`).join('');
function selectOptions(id,values){$(id).innerHTML='<option value="">全部</option>'+[...new Set(values)].filter(Boolean).sort().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}
selectOptions('district',stories.map(s=>s.district));selectOptions('period',stories.map(s=>s.period));selectOptions('precision',stories.map(s=>precision(s.place,s)));
function filter(){const q=$('query').value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean),district=$('district').value,period=$('period').value,prec=$('precision').value;matched=new Map();for(const s of stories){const fields=[s.name,s.english,places.get(s.place)?.properties.name_zh,s.area,s.district,s.brief,s.story,s.people,s.era,s.background,s.theme,...s.tags].join(' ').toLocaleLowerCase();if(q.some(t=>!fields.includes(t))||district&&s.district!==district||period&&s.period!==period||prec&&precision(s.place,s)!==prec||selectedThemes.size&&![...selectedThemes].some(t=>s.tags.includes(t)||s.theme===t))continue;if(!matched.has(s.place))matched.set(s.place,[]);matched.get(s.place).push(s)}$('activeCount').textContent=selectedThemes.size+[district,period,prec].filter(Boolean).length||'';const n=[...matched.values()].reduce((a,v)=>a+v.length,0);$('resultCount').textContent=`${n} 則 · ${matched.size} 地點`;$('results').innerHTML=matched.size?[...matched].map(([id,ss])=>{const s=ss[0],p=places.get(id)?.properties;return `<button class="result" data-place="${esc(id)}">${s.photo?`<img src="${esc(s.photo)}" loading="lazy" alt="">`:''}<span><strong>${esc(p?.name_zh||s.name)}</strong><small>${esc(s.district)} · ${ss.length} 則${p?.located_status==='UNKNOWN'?' · 歷史位置':''}</small></span></button>`}).join(''):'<p class="empty">未找到符合條件的故事。試試其他關鍵字，或清除分類篩選。</p>';renderMap()}
$('query').addEventListener('input',filter);for(const id of ['district','period','precision'])$(id).addEventListener('change',filter);$('themes').addEventListener('change',e=>{if(e.target.checked)selectedThemes.add(e.target.value);else selectedThemes.delete(e.target.value);filter()});$('clear').onclick=()=>{selectedThemes.clear();all('#themes input').forEach(x=>x.checked=false);for(const id of ['query','district','period','precision'])$(id).value='';filter()};all('[name=mode]').forEach(el=>el.onchange=()=>{mode=el.value;renderMap()});$('results').onclick=e=>{const b=e.target.closest('[data-place]');if(b)goTo(b.dataset.place)};
function getStories(id){return matched.get(id)||byPlace.get(id)||[]}
function header(id,s){let p=places.get(id)?.properties;return `<div class="popup-name">${esc(p?.name_zh||s.name)}</div><div class="popup-en">${esc(s.english)}</div><div class="popup-place">${esc(s.district)} · ${esc(s.area)}</div>${s.photo?`<img class="popup-photo" src="${esc(s.photo)}" alt="${esc(p?.name_zh||s.name)} 地點參考照片">`:''}<div class="popup-precision">Location Precision: ${esc(precision(id,s))}</div>`}
function showPlace(id,latlng,index=0,forceAll=false){const ss=forceAll?byPlace.get(id):getStories(id);if(!ss?.length)return;index=Math.max(0,Math.min(index??0,ss.length-1));activePlace={id,latlng,index,forceAll};const s=ss[index];const root=document.createElement('div');root.innerHTML=header(id,byPlace.get(id)[0])+`<p class="popup-brief">${esc(s.brief)}</p><div class="popup-actions"><button class="readMore">Read More　›</button>${ss.length>1?`<div class="pager"><button class="prev" aria-label="上一則故事" ${index===0?'disabled':''}>‹</button><span>${index+1} / ${ss.length}</span><button class="next" aria-label="下一則故事" ${index===ss.length-1?'disabled':''}>›</button></div>`:''}</div>`;root.querySelector('.readMore').onclick=()=>showDetail(id,s);root.querySelector('.prev')?.addEventListener('click',()=>showPlace(id,latlng,index-1,forceAll));root.querySelector('.next')?.addEventListener('click',()=>showPlace(id,latlng,index+1,forceAll));if(latlng)placePopup.setLatLng(latlng).setContent(root).openOn(map);else showDetail(id,s);}
function goTo(id){if(innerWidth<=760)closeSearch();const l=rendered.get(id);if(l){const done=()=>showPlace(id,l.getLatLng(),0,false);if(mode==='ghost')clusters.zoomToShowLayer(l,done);else{map.setView(l.getLatLng(),Math.max(map.getZoom(),16));done()}return}const shape=shapeMap.get(id);if(shape){if(id==='LOC-021'&&!map.hasLayer(coast)){$('coast').checked=true;coast.addTo(map)}if(id!=='LOC-021'&&!map.hasLayer(buildings)){$('buildings').checked=true;buildings.addTo(map)}map.fitBounds(shape.getBounds(),{padding:[45,45],maxZoom:17});showPlace(id,shape.getBounds().getCenter(),0,!matched.has(id));return}const f=places.get(id);if(f?.geometry?.type==='Point'){const p=f.geometry.coordinates;map.setView([p[1],p[0]],16);showPlace(id,[p[1],p[0]],0,true)}else showPlace(id,null,0,true)}
function safeURL(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
/* 以該地點為中心的文獻共現資料；找不到對應時退回全島共現 */
function netFor(id){
  const N=window.PLACE_NETWORK;if(!N)return null;
  const pid=N.map?.[id],p=pid?N.places?.[pid]:null;
  return p||N.island||null;
}
let miniState=null;
function drawMiniNet(net,placeName){
  const cv=$('miniGraph'),box=cv?.parentElement;if(!cv||!box)return;
  const W=box.clientWidth,H=box.clientHeight;if(!W||!H)return;
  const DPR=window.devicePixelRatio||1;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';
  const ctx=cv.getContext('2d');ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  const terms=(net?.terms||[]).slice(0,18);miniState=null;
  if(!terms.length){ctx.fillStyle='#9f9787';ctx.font='12px sans-serif';ctx.fillText('此地點暫無共現資料',18,28);return}
  const cx=W/2,cy=H/2,R=Math.min(W,H)*0.37;
  let ci=terms.findIndex(t=>placeName&&(placeName.includes(t.t)||t.t.includes(placeName)));
  if(ci<0)ci=0;
  const order=[ci,...terms.map((_,i)=>i).filter(i=>i!==ci)];
  const pts=order.map((idx,k)=>{
    if(k===0)return {t:terms[idx].t,x:cx,y:cy,r:10,df:terms[idx].df};
    const a=(k-1)/(order.length-1)*Math.PI*2-Math.PI/2;
    const rr=R*(k<=9?.62:1);
    return {t:terms[idx].t,x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr*.82,r:5+Math.min(5,Math.sqrt(terms[idx].df||1)),df:terms[idx].df};
  });
  const byT=Object.fromEntries(pts.map(p=>[p.t,p]));
  for(const e of (net.term_edges||[])){
    const a=byT[e.a],b=byT[e.b];if(!a||!b)continue;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
    ctx.strokeStyle=`rgba(140,203,183,${Math.min(.62,.16+(e.w||1)*.1)})`;
    ctx.lineWidth=Math.min(3.4,.7+(e.w||1)*.42);ctx.stroke();
  }
  pts.forEach((p,i)=>{
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=i===0?'#d7bd93':(p.df>5?'#8ccbb7':'#6c8d80');ctx.fill();
    ctx.strokeStyle='#0c1210';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle=i===0?'#f3e2c2':'#d8ddcf';ctx.font=(i===0?'600 12px':'11px')+' "Noto Sans TC",sans-serif';
    ctx.textAlign='center';ctx.fillText(p.t.length>9?p.t.slice(0,9)+'…':p.t,p.x,p.y-p.r-5);
  });
  miniState={pts,net};
  const d=$('miniDetail');if(d)d.innerHTML='<b>點選節點</b>查看它與其他詞語的 bonds，以及出現於哪些文獻。';
}
function showMiniBonds(t){
  const d=$('miniDetail');if(!d||!miniState)return;
  const {net}=miniState;
  const edges=(net.term_edges||[]).filter(e=>e.a===t||e.b===t).sort((a,b)=>b.w-a.w).slice(0,12);
  const term=(net.terms||[]).find(x=>x.t===t);
  const ex=(term?.examples||[]).slice(0,2).map(e=>`<div class="hint">〈${esc(e.title)}〉${esc(e.text)}</div>`).join('');
  d.innerHTML=`<b>${esc(t)}</b> · 出現於 ${term?.df??'—'} 份文獻，共 ${term?.tf??'—'} 次<br>`+
    (edges.length?edges.map(e=>`<span class="bond">${esc(e.a===t?e.b:e.a)} ×${e.w}</span>`).join(''):'<span class="hint">沒有達到最低共現強度的 bonds。</span>')+ex;
}
function showDetail(id,s){
  const relation={'LOC-013':'LOC-036','LOC-036':'LOC-013','LOC-021':'LOC-022','LOC-022':'LOC-021'}[id];
  const other=relation?places.get(relation)?.properties.name_zh:null;
  const net=netFor(id),pname=places.get(id)?.properties.name_zh||s.name;
  const note=window.PLACE_NETWORK?.notes?.[id]||'';
  $('detailContent').innerHTML=`<div class="detail-shell"><article class="detail-story">${header(id,byPlace.get(id)[0])}<h2>故事記載</h2><p>${esc(s.story||s.brief)}</p><p class="hint">${esc(s.status)} · ${esc(s.era)}</p><h2>歷史背景</h2><p>${esc(s.background||'暫無額外背景記載。')}</p><p class="hint">${esc(s.photoNote||'')}</p><h2>資料來源</h2>${s.sources.map(x=>{const u=safeURL(x.url);return u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} · ${esc(new URL(u).hostname)}</a>`:`<p>${esc(x.label)}：${esc(x.url)}</p>`}).join('')||'<p>原表未提供來源。</p>'}${other?`<h2>相關地點</h2><button id="related">${esc(other)}　›</button>`:''}</article>`+
    `<aside class="detail-net"><h2>文獻共現 · ${esc(pname)}</h2><div class="net-meta">${net?esc(net.summary||''):'暫無資料'}<br>${esc(note)}</div><div class="net-stage"><canvas id="miniGraph" aria-label="此地點的文獻共現詞語網絡"></canvas><div class="net-tip" id="miniTip"></div></div><div class="net-detail" id="miniDetail">點選節點查看 bonds。</div><div class="net-actions"><button id="enlargeNet">放大共現圖　↗</button></div></aside></div>`;
  if(other)$('related').onclick=()=>{$('detail').close();goTo(relation)};
  if(!$('detail').open)$('detail').showModal();
  requestAnimationFrame(()=>drawMiniNet(net,pname));
  const cv=$('miniGraph');
  cv.onclick=e=>{
    if(!miniState)return;const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    const hit=miniState.pts.find(p=>Math.hypot(p.x-mx,p.y-my)<=p.r+6);
    if(hit)showMiniBonds(hit.t);
  };
  cv.onmousemove=e=>{const tip=$('miniTip');if(!miniState||!tip)return;const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;const hit=miniState.pts.find(p=>Math.hypot(p.x-mx,p.y-my)<=p.r+6);tip.style.display=hit?'block':'none';if(hit){tip.textContent=hit.t;tip.style.left=Math.min(mx+12,r.width-90)+'px';tip.style.top=Math.max(4,my-28)+'px'}};
  cv.onmouseleave=()=>{const tip=$('miniTip');if(tip)tip.style.display='none'};
  $('enlargeNet').onclick=()=>{
    $('detail').close();
    const nav=all('.nav button').find(b=>b.dataset.page==='analysis');nav?.click();
    const frame=document.querySelector('#analysis iframe');
    const send=()=>frame?.contentWindow?.postMessage({type:'HAUNT_OPEN_NET',place:net,mode:'terms'},'*');
    if(frame){frame.addEventListener('load',send,{once:true});send();setTimeout(send,700)}
  };
}
$('closeDetail').onclick=()=>$('detail').close();$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});
$('historical').innerHTML=historyDefs.map(h=>`<div class="hist"><label><input type="checkbox" id="hist${h.id}"> ${h.label}</label><div class="opacity"><input aria-label="${h.label} 透明度" type="range" id="op${h.id}" min="0" max="100" value="75"><span id="val${h.id}">75%</span></div></div>`).join('');
function syncHistory(changed){const comp=$('compare').checked;let enabled=historyDefs.filter(h=>$('hist'+h.id).checked);if(comp&&enabled.length>1){const keep=changed&&$('hist'+changed.id).checked?changed:enabled[enabled.length-1];for(const h of enabled)if(h!==keep)$('hist'+h.id).checked=false;enabled=[keep]}
for(const h of historyDefs){h.pane.style.clip='';const on=$('hist'+h.id).checked;if(on&&!map.hasLayer(h.layer))h.layer.addTo(map);if(!on&&map.hasLayer(h.layer))map.removeLayer(h.layer);h.layer.setOpacity(comp&&on?1:h.opacity);$('op'+h.id).disabled=comp&&on;}$('swipeUI').hidden=!(comp&&enabled.length);$('compareHint').textContent=comp?(enabled.length?'拖動分隔線，左歷史、右現代。':'請先勾選一張歷史地圖。'):'可疊加歷史地圖並調節透明度。';applyClip()}
function applyClip(){const value=Number($('swipe').value),on=$('compare').checked;const sz=map.getSize();const p=map.containerPointToLayerPoint([sz.x*value/100,sz.y]);const origin=map.containerPointToLayerPoint([0,0]);$('swipeLine').style.left=value+'%';for(const h of historyDefs)h.pane.style.clip=on&&map.hasLayer(h.layer)?`rect(${origin.y-5000}px,${p.x}px,${p.y+5000}px,${origin.x-5000}px)`:'';}
for(const h of historyDefs){$('hist'+h.id).onchange=()=>syncHistory(h);$('op'+h.id).oninput=e=>{h.opacity=Number(e.target.value)/100;$('val'+h.id).textContent=e.target.value+'%';h.layer.setOpacity(h.opacity)}}$('compare').onchange=()=>syncHistory();$('swipe').oninput=applyClip;map.on('move zoom zoomend resize',applyClip);
$('buildings').onchange=e=>e.target.checked?buildings.addTo(map):map.removeLayer(buildings);$('coast').onchange=e=>e.target.checked?coast.addTo(map):map.removeLayer(coast);
function invalidate(){requestAnimationFrame(()=>{map.invalidateSize({pan:false});applyClip()})}function closeSearch(){$('explore').classList.add('searchclosed');$('searchPanel').hidden=true;$('openSearch').hidden=false;invalidate()}function openSearch(){$('explore').classList.remove('searchclosed');$('searchPanel').hidden=false;$('openSearch').hidden=true;if(innerWidth<=760)closeLayers();invalidate()}function closeLayers(){$('explore').classList.add('layersclosed');$('layerPanel').hidden=true;invalidate()}function openLayers(){$('explore').classList.remove('layersclosed');$('layerPanel').hidden=false;if(innerWidth<=760)closeSearch();invalidate()}
$('closeSearch').onclick=closeSearch;$('openSearch').onclick=openSearch;$('openLayers').onclick=openLayers;$('closeLayers').onclick=closeLayers;$('reset').onclick=()=>{map.closePopup();resetView()};
all('.nav button').forEach(b=>b.onclick=()=>{all('.nav button').forEach(x=>x.removeAttribute('aria-current'));b.setAttribute('aria-current','page');for(const sec of all('main>section'))sec.hidden=sec.id!==b.dataset.page;if(b.dataset.page==='explore')invalidate();if(b.dataset.page==='analysis'){const fr=document.querySelector('#analysis iframe');const ping=()=>fr?.contentWindow?.postMessage({type:'HAUNT_RESIZE'},'*');requestAnimationFrame(ping);setTimeout(ping,120);setTimeout(ping,550)}});document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!$('explore').hidden){e.preventDefault();openSearch();$('query').focus()}});if(innerWidth<=760){closeSearch();closeLayers()}let mobile=innerWidth<=760;window.addEventListener('resize',()=>{const now=innerWidth<=760;if(mobile!==now){mobile=now;if(now){closeSearch();closeLayers()}else{openSearch();openLayers()}}invalidate()});
/* 進場 logo → 地圖 */
let introDone=false;
function finishIntro(){
  if(introDone)return;introDone=true;
  document.body.classList.add('intro-exit');
  setTimeout(()=>{document.body.classList.add('intro-done');invalidate()},950);
}
$('skipIntro')?.addEventListener('click',finishIntro);
setTimeout(finishIntro,matchMedia('(prefers-reduced-motion: reduce)').matches?350:2650);

filter();syncHistory();
