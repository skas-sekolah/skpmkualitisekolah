(()=>{
const C=ReliableCore,clean=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
const code=s=>String(s||'').match(/^(?:ASPEK\s*:?\s*)?([123](?:\.\d+){1,3})(?:\s|$)/i)?.[1]||null;
const codes=s=>[...new Set(String(s||'').match(/\b[123](?:\.\d+){2,3}\b/g)||[])];
const unitKeys=['id_kokurikulum','id_panitia','id_subjek','id_matapelajaran','id_mata_pelajaran'];
const unitKey=raw=>{const u=new URL(raw),pairs=unitKeys.filter(k=>u.searchParams.get(k)).map(k=>[k,u.searchParams.get(k)]);return pairs.length?JSON.stringify([u.pathname.split('/').slice(0,-1).join('/'),u.searchParams.get('tahun'),pairs]):null;};
function headerGrid(rows){const grid=[];for(let y=0;y<rows.length;y++){grid[y]??=[];let x=0;for(const h of rows[y].cells){while(grid[y][x])x++;for(let dy=0;dy<(h.rowSpan||1);dy++){grid[y+dy]??=[];for(let dx=0;dx<(h.colSpan||1);dx++)grid[y+dy][x+dx]=h;}x+=h.colSpan||1;}}return grid;}
function extract(doc,url,records,scope=null){
 const out=[],links=[],unitRows=[],unitPages=[],diagnostics=[];
 const add=(record,raw,unit)=>{try{const target=C.context(new URL(raw,url).href,record,new URL(url).searchParams.get('tahun'));out.push({id:record.id,url:target,unit:unit||null});}catch{}};
 const scoped=scope?records.filter(r=>scope.recordIds.includes(r.id)):[];
 for(const a of doc.querySelectorAll('a[href]')){
  if(a.getAttribute('data-method')&&a.getAttribute('data-method').toLowerCase()!=='get')continue;
  let href;try{href=C.route(new URL(a.getAttribute('href'),url).href);}catch{continue;}
  if(new URL(href).searchParams.get('tahun')!==new URL(url).searchParams.get('tahun'))continue;
  links.push(href);const label=code(clean(a));
  for(const r of records)if(!r.id.includes(':')&&r.id===label)add(r,href);
  if(scope&&unitKey(href)===unitKey(url)){const matches=scoped.filter(r=>r.id.split(':')[0]===label);if(matches.length===1)add(matches[0],href,scope.unit);}
 }
 if(scope){
  const selected=[...doc.querySelectorAll('[aria-current=page],[aria-selected=true],a.active,button.active')].map(e=>code(clean(e))).filter(Boolean),active=[...new Set(selected)];
  if(active.length===1&&doc.querySelector('form input[type=radio][name^=skor]')){const matches=scoped.filter(r=>r.id.split(':')[0]===active[0]);if(matches.length===1)add(matches[0],url,scope.unit);}
  diagnostics.push({type:'unit-page',url,unit:scope.unit,criterionLinks:out.filter(t=>scope.recordIds.includes(t.id)).length,hasScoreForm:!!doc.querySelector('form input[type=radio][name^=skor]')});
 }
 for(const table of doc.querySelectorAll('table')){
  const rows=[...table.rows];let headerRows=[];
  for(const row of rows){if(row.querySelector('th')||(!headerRows.length&&/panitia|mata pelajaran|nama unit/i.test(clean(row))))headerRows.push(row);else if(headerRows.length)break;}
  if(!headerRows.length)continue;
  const grid=headerGrid(headerRows),allCodes=[...new Set(headerRows.flatMap(r=>[...r.cells].flatMap(h=>codes(clean(h)))))];
  const columnCode=col=>{for(let i=grid.length-1;i>=0;i--){const found=codes(clean(grid[i][col]));if(found.length===1)return found[0];}return null;};
  for(const row of rows){
   if(headerRows.includes(row)||row.querySelector('th'))continue;
   const cells=[...row.cells];
   // Names may themselves be links. Match exact source names before using a plain cell.
   const exact=cells.flatMap(c=>[c,...c.querySelectorAll('a,span')]).find(e=>records.some(r=>r.id.includes(':')&&C.unitName(r.title)===C.unitName(clean(e))));
   const cell=exact||cells.find(c=>clean(c)&&!/^[-–—\d.,%\s]+$/.test(clean(c))&&!c.querySelector('button,input,select')&&(!c.querySelector('a')||/panitia|mata pelajaran/i.test(clean(headerRows[0]))));
   if(!cell)continue;const unit=clean(cell);
   const matching=records.filter(r=>r.id.includes(':')&&C.unitName(r.title)===C.unitName(unit)&&C.group(r.id.split(':')[0])===new URL(url).pathname.split('/').slice(-2,-1)[0]);
   if(!matching.length)continue;
   diagnostics.push({type:'unit-row',url,unit,headers:headerRows.map(r=>clean(r).slice(0,400)),observedLinks:[...row.querySelectorAll('a[href]')].slice(0,12).flatMap(a=>{try{const u=new URL(C.route(new URL(a.getAttribute('href'),url).href));return [{path:u.pathname,parameterNames:[...u.searchParams.keys()].filter(k=>!/(token|csrf|nonce|session)/i.test(k)),label:clean(a).slice(0,120)}];}catch{return [];}})});
   const rowCodes=allCodes.length?allCodes:matching.map(r=>r.id.split(':')[0]);
   for(const standard of rowCodes)unitRows.push({standard,unit});
   for(const a of row.querySelectorAll('a[href]')){
    if(a.getAttribute('data-method')&&a.getAttribute('data-method').toLowerCase()!=='get')continue;
    const col=cells.indexOf(a.closest('td')),label=code(clean(a));
    let standard=columnCode(col);if(!standard&&label&&rowCodes.includes(label))standard=label;if(!standard&&allCodes.length===1)standard=allCodes[0];
    const matches=matching.filter(r=>r.id.split(':')[0]===standard);
    if(matches.length===1)add(matches[0],a.getAttribute('href'),unit);
    else if(!standard){
     // A single pencil can open a unit landing page with all four criteria.
     // Follow only observed URLs; never assign it to every criterion or invent IDs.
     try{const target=C.route(new URL(a.getAttribute('href'),url).href);if(!unitKey(target))continue;const valid=matching.filter(r=>{try{C.context(target,r,new URL(url).searchParams.get('tahun'));return true;}catch{return false;}});if(valid.length)unitPages.push({url:target,unit,recordIds:valid.map(r=>r.id)});}catch{}
    }
   }
  }
 }
 return {targets:out,links:[...new Set(links)],unitRows,unitPages:[...new Map(unitPages.map(p=>[p.url,p])).values()],diagnostics};
}
async function discover(ctx,pack){
 const records=pack.modules.management.records,queue=[ctx.url],seen=new Set(),scopes=new Map(),targets=[],warnings=[],unitRows=[],diagnostics=[];
 const enqueue=url=>{if(!seen.has(url)&&!queue.includes(url))queue.push(url);};
 const started=Date.now();while(queue.length&&seen.size<260&&Date.now()-started<240000){
  const url=queue.shift();if(seen.has(url))continue;seen.add(url);
  try{
   let doc;
   // Discovery can read the already-open page. This is never proof of saved scores.
   if(url===ctx.url&&C.route(location.href)===url)doc=document;
   else{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    let res;try{res=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer);}
    if(!res.ok||C.route(res.url)!==C.route(url))throw Error('Respons / alamat berubah.');
    doc=new DOMParser().parseFromString(await res.text(),'text/html');
   }
   if(doc.querySelector('input[type=password]'))throw Error('Sesi MOEIS tamat.');
   const school=String(pack.schoolCode).replace(/[^A-Z0-9-]/gi,'');
   if(!school||!new RegExp('(^|[^A-Z0-9])'+school+'([^A-Z0-9]|$)','i').test(doc.body.textContent))throw Error('Kod sekolah tidak sepadan.');
   const scope=scopes.get(url)||null,data=extract(doc,url,records,scope);targets.push(...data.targets);unitRows.push(...data.unitRows);diagnostics.push(...data.diagnostics);
   for(const page of data.unitPages){const old=scopes.get(page.url);if(old&&C.unitName(old.unit)!==C.unitName(page.unit)){warnings.push({message:'Pautan unit dikongsi nama berbeza; tidak dipilih.',path:new URL(page.url).pathname});continue;}scopes.set(page.url,page);enqueue(page.url);}
   for(const link of data.links){
    const u=new URL(link);
    if(scope&&unitKey(link)===unitKey(url)){scopes.set(link,scope);enqueue(link);}
    else if(records.some(r=>u.pathname.includes('/'+C.group(r.id.split(':')[0])+'/'))&&!unitKey(link))enqueue(link);
   }
  }catch(e){
   if(/Sesi|sekolah/.test(e.message))throw e;
   if(e.name==='AbortError'||/Failed to fetch|NetworkError|Load failed|fetch failed|net::/i.test(e.message)){
    warnings.push({path:new URL(url).pathname,message:e.message,type:'network'});
    const failure=Error('Carian dihentikan kerana permintaan halaman MOEIS gagal: '+e.message+'. Rekod yang belum diperiksa tidak dianggap salah nama atau tiada pautan.');
    failure.discovery={visited:seen.size,warnings,unitRows,diagnostics,interrupted:true};throw failure;
   }
   warnings.push({path:new URL(url).pathname,message:e.message});
  }
 }
 if(queue.length)warnings.push({message:'Had carian halaman / masa dicapai; rekod tanpa pautan akan dilangkau.'});
 return {targets,visited:seen.size,warnings,unitRows,diagnostics};
}
globalThis.ReliableBatchPage={extract,discover,unitKey};
})();
