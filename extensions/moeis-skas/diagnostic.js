(()=>{
 const clean=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
 const shape=e=>{
  const t=clean(e);
  if(/^(NAMA GURU|MATA PELAJARAN|KELAS|SESI PENGISIAN)\s*[:：]?$/i.test(t))return t;
  if(/^(ASPEK|SKOR|BILANGAN|DESKRIPSI|BIL\.?|PE(?:R)?NYATAAN\s*KUALITI)$/i.test(t)||/^A[1-9]\s*:/i.test(t))return t.slice(0,150);
  if(/^\d{1,7}(?:[.,]\d{1,2})?\s*%?$/.test(t))return t;
  return t?'[teks '+t.length+' aksara]':'';
 };
 const cell=c=>({
  tag:c.tagName,text:shape(c),rowspan:c.rowSpan,colspan:c.colSpan,
  inputs:[...c.querySelectorAll('input:not([type=hidden])')].slice(0,10).map(i=>({type:i.type,name:i.name,id:i.id,disabled:i.disabled}))
 });
 const table=t=>({id:t.id,rows:[...t.querySelectorAll('tr')].slice(0,180).map(r=>[...r.cells].slice(0,12).map(cell))});
 globalThis.SKASDiagnostic=module=>{
  const doc=globalThis.SKASLastReadDocuments?.[module]||document;
  const hasForm=[...doc.querySelectorAll('form')].some(f=>module==='s4'?f.id==='myForm':/\/kekuatan-kami\/save$/.test(new URL(f.getAttribute('action')||location.pathname,location.href).pathname));
  const currentOK=module==='s4'?location.pathname.endsWith('/standard4/pengisianskor'):location.pathname.endsWith('/kekuatan-kami/aspek3-9');
  if(!hasForm||doc===document&&!currentOK)throw Error(module==='s4'?'Buka borang skor seorang guru (pilihan 0–4), kemudian muat turun diagnostik.':'Buka ASPEK A1 sehingga jadual skor muncul, kemudian muat turun diagnostik.');
  return {
   kind:'SKAS_MOEIS_DIAGNOSTIC_V1',version:'0.4.1',module,path:location.pathname,
   readSource:doc===document?'halaman semasa':'halaman terakhir dibaca',
   forms:[...doc.querySelectorAll('form')].slice(0,10).map(f=>({id:f.id,actionPath:new URL(f.getAttribute('action')||location.pathname,location.href).pathname})),
   tables:[...doc.querySelectorAll('table')].slice(0,30).map(table),
   links:[...doc.querySelectorAll('a[href]')].filter(a=>/ASPEK\s*:|^4\.[1-6]/i.test(clean(a))).slice(0,40).map(a=>({label:clean(a).slice(0,80),path:new URL(a.getAttribute('href'),location.href).pathname}))
  };
 };
})();
