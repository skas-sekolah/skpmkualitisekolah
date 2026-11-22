(()=>{
if(globalThis.SKASStrengthAuto)return;
const base='/SJN/penilaian-kendiri/kekuatan-kami/',origin='https://moeisins.moe.gov.my';let running=false,stopped=false;
const text=e=>(e?.textContent||'').replace(/\s+/g,' ').trim();
function safe(raw,from){const u=new URL(raw,from);if(u.hostname!=='moeisins.moe.gov.my'||u.username||u.password||!['http:','https:'].includes(u.protocol)||!u.pathname.startsWith(base)||!/^(index|aspek3-9)$/.test(u.pathname.slice(base.length)))throw Error('Pautan bukan Kekuatan Kami ditolak.');u.protocol='https:';u.hash='';return u.href;}
function parse(doc,url,options){
 const body=text(doc.body),matches=[...body.matchAll(/\bA([1-9])\s*:\s*/g)].map(m=>'A'+m[1]),aspects=[...new Set(matches)];
 if(aspects.length!==1)throw Error('Tajuk aspek tidak dapat dikenal pasti.');const aspect=aspects[0],u=new URL(url);
 if(u.searchParams.get('no_aspek')&&u.searchParams.get('no_aspek')!==aspect)throw Error('Aspek borang tidak sepadan dengan pautan.');
 if(u.searchParams.get('tahun')!==String(options.year))throw Error('Tahun pautan MOEIS tidak sepadan.');
 const percent=e=>{const m=text(e).match(/^(\d{1,3}(?:[.,]\d{1,2})?)\s*%$/);return m?Number(m[1].replace(',','.')):null;};
 const tables=[...doc.querySelectorAll('table')],header=tables.find(t=>/PERNYATAAN KUALITI/i.test(text(t))&&/\bSKOR\b/i.test(text(t))&&new RegExp(aspect+'\\s*:').test(text(t)));
 if(!header)throw Error('Ringkasan skor aspek tidak ditemui.');const totals=[...header.querySelectorAll('td')].map(percent).filter(v=>v!==null);
 if(totals.length!==1)throw Error('Skor jumlah MOEIS tidak jelas.');
 const criteria=[];
 for(const table of tables){if(table===header||!(/SKOR\s*\(%\)/i.test(text(table))))continue;let current=null;
  for(const row of table.querySelectorAll('tr')){
   const cells=[...row.cells],scores=cells.map(percent).filter(v=>v!==null);
   if(scores.length>1)throw Error('Lebih daripada satu skor dalam baris.');
   if(scores.length){const label=cells.map(text).filter(t=>t&&!/^\d+$/.test(t)&&!/^\d+(?:[.,]\d+)?\s*%$/.test(t)).join(' · ');current={label:label||'Kriteria '+(criteria.length+1),score:scores[0],fields:[]};criteria.push(current);}
   const inputs=[...row.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=submit]):not([type=button])')];
   if(inputs.length){if(!current)throw Error('Bilangan tidak mempunyai skor kriteria.');const labels=cells.filter(c=>!c.querySelector('input')).map(text).filter(t=>t&&!/^\d+(?:[.,]\d+)?\s*%$/.test(t));const selected=[...row.querySelectorAll('select')].map(s=>s.selectedOptions?.[0]?.textContent?.trim()).filter(Boolean);const label=[...labels,...selected].join(' · ')||'Bilangan';
    for(const input of inputs){const raw=input.value.trim();if(raw&&!/^\d+(?:[.,]\d+)?$/.test(raw))throw Error('Format bilangan berubah.');current.fields.push({label:label+(inputs.length>1?' ['+(current.fields.length+1)+']':''),value:raw?Number(raw.replace(',','.')):null});}
   }
  }
 }
 if(criteria.length&&Math.abs(criteria.reduce((s,c)=>s+c.score,0)-totals[0])>0.021)throw Error('Jumlah skor kriteria tidak sepadan dengan skor aspek.');
 if(!criteria.length&&!(aspect==='A8'&&/tiada|tidak mempunyai|tidak berkenaan/i.test(body)&&totals[0]===0))throw Error('Kriteria skor tidak ditemui.');
 return {aspect,schoolCode:options.school,year:Number(options.year),capturedAt:new Date().toISOString(),score:totals[0],criteria};
}
async function collect(options){
 if(running)throw Error('Kutipan masih berjalan.');if(location.origin!==origin)throw Error('Buka MOEIS dahulu.');const start=safe(location.href,location.href),context=new URL(start);
 if(!/^[A-Z0-9][A-Z0-9-]{2,15}$/.test(options.school)||!/^20\d{2}$/.test(String(options.year)))throw Error('Isi sekolah dan tahun.');
 if(context.searchParams.get('tahun')!==String(options.year))throw Error('Tahun MOEIS tidak sepadan.');
 running=true;stopped=false;const state={running:true,rows:[],message:'Membaca Kekuatan Kami…',failed:false};const persist=()=>chrome.storage.session.set({strengthAuto:state});await persist();
 try{const queue=[start],seen=new Set();while(queue.length){if(stopped)throw Error('Kutipan dihentikan.');const url=queue.shift();if(seen.has(url))continue;if(seen.size>=12)throw Error('Had halaman dicapai.');seen.add(url);
  // Read-only GET: no Save or Submit requests are issued.
  const r=await fetch(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('MOEIS memberi ralat '+r.status);const html=await r.text();if(html.length>5000000)throw Error('Halaman terlalu besar.');const doc=new DOMParser().parseFromString(html,'text/html');
  if(new URL(url).pathname.endsWith('/aspek3-9')){const row=parse(doc,url,options);if(state.rows.some(x=>x.aspect===row.aspect))throw Error('Aspek berulang.');state.rows.push(row);}
  for(const a of doc.querySelectorAll('a[href]')){if(!/^ASPEK\s*:\s*A[1-9]$/i.test(text(a)))continue;const next=safe(a.getAttribute('href'),url),u=new URL(next);if(['tahun','sek','id_serahan'].some(k=>context.searchParams.has(k)&&u.searchParams.get(k)!==context.searchParams.get(k)))throw Error('Konteks sekolah / penilaian berubah.');if(!seen.has(next)&&!queue.includes(next))queue.push(next);}
  state.message=state.rows.length+'/9 aspek dibaca.';await persist();
 }
 if(state.rows.length!==9)throw Error('Pautan kesemua A1–A9 tidak ditemui. Kutipan belum lengkap.');state.rows.sort((a,b)=>a.aspect.localeCompare(b.aspect));state.message='Selesai: 9 aspek. Hantar ke pratonton SK@S atau muat turun JSON.';
 }catch(e){state.failed=true;state.message=e.message+' Tiada skor disimpan ke SK@S.';}finally{running=false;state.running=false;await persist();}}
globalThis.SKASStrengthAuto={parse,safe,start:options=>{if(running)throw Error('Kutipan masih berjalan.');void collect(options).catch(e=>chrome.storage.session.set({strengthAuto:{running:false,rows:[],failed:true,message:e.message}}));return true;},stop:()=>{stopped=true;return true;}};
})();
