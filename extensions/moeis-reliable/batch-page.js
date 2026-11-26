(()=>{
const C=ReliableCore,clean=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
const code=s=>String(s||'').match(/^(?:ASPEK\s*:?\s*)?([123](?:\.\d+){1,3})(?:\s|$)/i)?.[1]||null;
const name=C.unitName;
function extract(doc,url,records){
 const out=[],links=[],unitRows=[];
 const add=(record,raw,unit)=>{try{const target=C.context(new URL(raw,url).href,record,new URL(url).searchParams.get('tahun'));out.push({id:record.id,url:target,unit:unit||null});}catch{}};
 for(const a of doc.querySelectorAll('a[href]')){
  let href;try{href=C.route(new URL(a.getAttribute('href'),url).href);}catch{continue;}
  if(new URL(href).searchParams.get('tahun')!==new URL(url).searchParams.get('tahun'))continue;
  links.push(href);const label=code(clean(a));
  for(const r of records)if(!r.id.includes(':')&&r.id===label)add(r,href);
 }
 for(const table of doc.querySelectorAll('table')){
  const headers=[...table.querySelectorAll('tr')].find(r=>r.querySelector('th'));
  if(!headers)continue;
  const hs=[...headers.cells],codes=[...new Set(hs.map(h=>code(clean(h))).filter(x=>x&&x.split('.').length>=3))];
  for(const row of table.querySelectorAll('tr')){
   if(row.querySelector('th'))continue;
   const cells=[...row.cells],unitCell=cells.find(c=>clean(c)&&!/^[-–—\d.,%\s]+$/.test(clean(c))&&!c.querySelector('a,button,input,select'));
   if(!unitCell)continue;const unit=clean(unitCell);
   for(const a of row.querySelectorAll('a[href]')){
    const col=cells.indexOf(a.closest('td'));let column=0,standard=null;
    for(const h of hs){const span=h.colSpan||1;if(col>=column&&col<column+span)standard=code(clean(h));column+=span;}
    if(!standard&&codes.length===1)standard=codes[0];
    if(!standard)continue;
    unitRows.push({standard,unit});
    const matches=records.filter(r=>r.id.includes(':')&&r.id.split(':')[0]===standard&&name(r.title.replace(/^.*?·\s*/,''))===name(unit));
    if(matches.length===1)add(matches[0],a.getAttribute('href'),unit);
   }
  }
 }
 return {targets:out,links:[...new Set(links)],unitRows};
}
async function discover(ctx,pack){
 const records=pack.modules.management.records,queue=[ctx.url],seen=new Set(),targets=[],warnings=[],unitRows=[];
 const started=Date.now();while(queue.length&&seen.size<180&&Date.now()-started<180000){
  const url=queue.shift();if(seen.has(url))continue;seen.add(url);
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   let res;try{res=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer);}
   if(!res.ok||C.route(res.url)!==C.route(url))throw Error('Respons / alamat berubah.');
   const doc=new DOMParser().parseFromString(await res.text(),'text/html');
   if(doc.querySelector('input[type=password]'))throw Error('Sesi MOEIS tamat.');
   const school=String(pack.schoolCode).replace(/[^A-Z0-9-]/gi,'');
   if(!school||!new RegExp('(^|[^A-Z0-9])'+school+'([^A-Z0-9]|$)','i').test(doc.body.textContent))throw Error('Kod sekolah tidak sepadan.');
   const data=extract(doc,url,records);targets.push(...data.targets);unitRows.push(...data.unitRows);
   for(const link of data.links){
    // Explore menu/list pages only. Unit edit forms are opened later for validation.
    const u=new URL(link);if(records.some(r=>u.pathname.includes('/'+C.group(r.id.split(':')[0])+'/'))&&!['id_kokurikulum','id_panitia','id_subjek','id_matapelajaran','id_mata_pelajaran'].some(k=>u.searchParams.has(k))&&!seen.has(link)&&!queue.includes(link))queue.push(link);
   }
  }catch(e){if(/Sesi|sekolah/.test(e.message))throw e;warnings.push({path:new URL(url).pathname,message:e.message});}
 }
 if(queue.length)warnings.push({message:'Had carian halaman / masa dicapai; rekod tanpa pautan akan dilangkau.'});
 return {targets,visited:seen.size,warnings,unitRows};
}
globalThis.ReliableBatchPage={extract,discover};
})();
