(()=>{
const C=ReliableCore;
function read(doc,ctx){
 C.context(ctx.url,ctx.record,ctx.year);
 if(doc.querySelector('input[type=password]'))throw Error('Sesi MOEIS tamat.');
 if(!new RegExp('(^|[^A-Z0-9])'+String(ctx.schoolCode).replace(/[^A-Z0-9-]/gi,'')+'([^A-Z0-9]|$)','i').test(doc.body.textContent))throw Error('Kod sekolah tidak dapat disahkan.');
 const standard=ctx.record.id.split(':')[0],major=standard.startsWith('3.')?standard.split('.').slice(0,2).join('.'):standard.split('.')[0];
 const text=doc.body.textContent.replace(/\s+/g,' ');
 const headings=[...text.matchAll(/STANDARD\s+([123](?:\.[123])?)\s*:/gi)].map(m=>m[1]);
 if(!headings.includes(major)||headings.some(h=>h!==major))throw Error('Tajuk standard halaman bercampur / tidak sepadan.');
 if(!text.includes(standard))throw Error('Nombor standard sumber tidak ditemui pada halaman.');
 const forms=[...doc.querySelectorAll('form')].filter(f=>f.querySelector('input[type=radio][name^=skor]'));
 if(forms.length!==1)throw Error('Borang skor tunggal tidak ditemui.');
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
async function verify(ctx,expected){
 // Read fresh server HTML. Never use DOM values changed by the extension as proof.
 const res=await fetch(ctx.url,{credentials:'same-origin',cache:'no-store',redirect:'follow'});
 if(!res.ok||C.route(res.url)!==ctx.url)throw Error('Respons pelayan / laluan berubah.');
 const doc=new DOMParser().parseFromString(await res.text(),'text/html'),r=read(doc,ctx);
 if(!C.same(r.identity,expected.identity))throw Error('Identiti respons pelayan berbeza.');
 return {ok:r.fields.every(f=>f.current===f.value),fields:r.fields};
}
globalThis.ReliablePage={inspect,apply,verify};
})();
