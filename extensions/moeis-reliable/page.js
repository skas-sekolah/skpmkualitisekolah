(()=>{
const C=ReliableCore;
// MOEIS criterion badges can be anchors, nested spans, DIVs or input buttons.
// A criterion link need not equal the current URL (e.g. JavaScript badges).
// Resolve selected/current badges first; otherwise require exactly one content code.
function standardMarkers(doc,form,url,standard){
 const records=[],depth=standard.split('.').length;
 for(const e of doc.querySelectorAll('p,td,th,button,h1,h2,h3,h4,span,a,div,label,strong,b,input[type=button],input[type=submit]')){
  if(e.closest('nav,aside,header,.sidebar,.menu,.breadcrumb,[role=navigation],[hidden],[aria-hidden=true],script,style')||e.querySelector('table,form,input[type=radio]'))continue;
  if(!form.contains(e)&&!(e.compareDocumentPosition(form)&4))continue;
  const text=String(e.matches('input')?e.value:e.textContent).replace(/\s+/g,' ').trim();
  if(text.length>300)continue;
  const code=text.match(/^([123](?:\.\d+){2,3})(?:\s|$)/)?.[1];
  if(!code||code.split('.').length!==depth)continue;
  const link=e.closest('a[href]');let current=false;
  if(link){try{current=C.route(new URL(link.getAttribute('href'),url).href)===url;}catch{}}
  const selected=!!e.closest('[aria-current=page],[aria-selected=true],.active');
  records.push({code,current,selected});
 }
 const selected=records.filter(r=>r.selected),current=records.filter(r=>r.current);
 return [...new Set((selected.length?selected:current.length?current:records).map(r=>r.code))];
}
function read(doc,ctx){
 C.context(ctx.url,ctx.record,ctx.year);
 if(doc.querySelector('input[type=password]'))throw Error('Sesi MOEIS tamat.');
 if(!new RegExp('(^|[^A-Z0-9])'+String(ctx.schoolCode).replace(/[^A-Z0-9-]/gi,'')+'([^A-Z0-9]|$)','i').test(doc.body.textContent))throw Error('Kod sekolah tidak dapat disahkan.');
 const standard=ctx.record.id.split(':')[0],major=standard.startsWith('3.')?standard.split('.').slice(0,2).join('.'):standard.split('.')[0];
 // Read the STANDARD content row / heading, excluding navigation menu text.
 const primary=[...doc.querySelectorAll('tr')].flatMap(row=>{
  const cells=[...row.cells];return cells.length>=2&&/^STANDARD$/i.test(cells[0].textContent.trim())?[cells[1].textContent]:[];
 });
 const headingTexts=primary.length?primary:[...doc.querySelectorAll('h1,h2,h3,h4')].filter(e=>!e.closest('nav,aside,header,a')).map(e=>e.textContent);
 const headings=headingTexts.map(t=>t.trim().match(/^STANDARD\s+([123](?:\.[123])?)\s*:/i)?.[1]).filter(Boolean);
 if(!headings.length||headings.some(h=>h!==major))throw Error('Tajuk standard kandungan tidak sepadan / tidak dapat disahkan.');
 const forms=[...doc.querySelectorAll('form')].filter(f=>f.querySelector('input[type=radio][name^=skor]'));
 if(forms.length!==1)throw Error('Borang skor tunggal tidak ditemui.');
 const markerCodes=standardMarkers(doc,forms[0],ctx.url,standard);
 if(markerCodes.length!==1||markerCodes[0]!==standard)throw Error('Nombor standard sumber tidak sepadan / belum dapat disahkan. Dipilih: '+standard+'. Kod kandungan: '+(markerCodes.join(', ')||'tiada')+'.');
 if(ctx.unitName&&!([...doc.querySelectorAll('td,th,p,h1,h2,h3,h4')].some(e=>!e.querySelector('table,form')&&!e.closest('nav,aside,header')&&C.unitName(e.textContent)===C.unitName(ctx.unitName))))throw Error('Nama unit pada borang tidak sepadan.');
 const form=forms[0],action=new URL(form.getAttribute('action')||ctx.url,ctx.url);
 if(action.origin!==new URL(ctx.url).origin||!action.pathname.includes('/'+C.group(standard)+'/')||String(form.method).toLowerCase()!=='post')throw Error('Destinasi Simpan tidak sepadan.');
 const fields=C.scores(ctx.record);if(!fields.length)throw Error('Tiada skor sumber.');
 const values=fields.map(f=>{const els=[...form.querySelectorAll('input[type=radio]')].filter(e=>e.name===f.name);
 if(els.length!==5||!['0','1','2','3','4'].every(v=>els.some(e=>e.value===v))||els.some(e=>e.disabled||e.classList.contains('custom-disabled')))throw Error('Pilihan skor tidak lengkap / dikunci: '+f.name);
 return {...f,current:els.find(e=>e.checked)?.value??null};});
 return {form,fields:values,identity:C.identity(form)};
}
function inspect(ctx){if(C.route(location.href)!==ctx.url)throw Error('Halaman berubah.');const r=read(document,ctx);return {fields:r.fields,identity:r.identity};}
function apply(ctx,expected){
 const r=read(document,ctx);
 if(C.route(location.href)!==ctx.url)throw Error('Alamat borang berubah sejak pratonton. Semak semula.');
 const changed=C.changes(r,expected);if(changed.length)throw Error('Borang berubah sejak pratonton: '+changed.join(', ')+'. Semak semula.');
 const buttons=[...r.form.querySelectorAll('button,input[type=submit]')].filter(e=>!e.disabled&&/^(simpan|save)$/i.test((e.textContent||e.value||'').trim()));
 if(buttons.length!==1||buttons[0].type!=='submit'||!r.form.checkValidity())throw Error('Butang Simpan / medan wajib belum sah.');
 // Validate everything before modifying the first score.
 for(const f of r.fields){const e=[...r.form.querySelectorAll('input[type=radio]')].find(e=>e.name===f.name&&e.value===f.value);e.checked=true;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}
 const after=read(document,ctx);
 if(!C.same(after.identity,r.identity)||after.fields.some(f=>f.current!==f.value))throw Error('Identiti / skor berubah selepas isi. Tidak dihantar.');
 r.form.requestSubmit(buttons[0]);return {submitted:true};
}
async function probe(ctx){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 let res;try{res=await fetch(ctx.url,{credentials:'same-origin',cache:'no-store',redirect:'follow',signal:controller.signal});}finally{clearTimeout(timer);}
 if(!res.ok||C.route(res.url)!==ctx.url)throw Error('Respons pelayan / laluan berubah.');
 const doc=new DOMParser().parseFromString(await res.text(),'text/html'),r=read(doc,ctx);
 return {fields:r.fields,identity:r.identity};
}
async function verify(ctx,expected){
 // Fresh server GET, never the values just filled in the current DOM.
 const r=await probe(ctx);
 if(!C.same(r.identity,expected.identity))throw Error('Identiti respons pelayan berbeza.');
 return {ok:r.fields.every(f=>f.current===f.value),fields:r.fields};
}
globalThis.ReliablePage={inspect,apply,verify,probe};
})();
