(()=>{
function inspect(roster){
 if(location.origin!=='https://moeisins.moe.gov.my'||!location.pathname.endsWith('/standard4/pengisianskor'))throw Error('Buka borang Pengisian Skor Standard 4 MOEIS dahulu.');
 const C=globalThis.SKASCore,form=document.querySelector('form#myForm');if(!form||!new URL(form.action,location.href).pathname.endsWith('/standard4/saveskor'))throw Error('Struktur borang tidak dikenali.');
 const field=label=>C.readField(document,label);
 let teacherName;try{teacherName=field('NAMA GURU');}catch(e){if(!String(e.message).includes('(0 padanan)'))throw e;teacherName=C.rosterIdentity(roster,location.href);}
 const meta={nama_guru:teacherName,mata_pelajaran:field('MATA PELAJARAN'),kelas:field('KELAS'),sesi:C.stage(field('SESI PENGISIAN'))};
 if(!meta.nama_guru||!meta.sesi)throw Error('Identiti borang tidak lengkap.');
 const links=[...document.querySelectorAll('a')].filter(a=>/^4\.\d\.\d$/.test(a.textContent.trim()));
 const radios=[...form.querySelectorAll('input[type=radio]')];const names=[...new Set(radios.map(r=>r.name))];
 // The page links do not reliably expose an active class. Use its selected URL item or unique item count.
 const id=new URL(location.href).searchParams.get('id_item_aspek');
 let candidates=links.filter(a=>id&&new URL(a.href).searchParams.get('id_item_aspek')===id).map(a=>a.textContent.trim());
 if(candidates.length!==1)candidates=links.map(a=>a.textContent.trim()).filter(c=>C.counts[c]===names.length);
 if(candidates.length!==1)throw Error('Subaspek tidak dapat dikenal pasti dengan selamat.');
 const code=candidates[0];if(C.counts[code]!==names.length)throw Error('Bilangan item berubah.');
 const scores={};names.forEach((name,i)=>{if(name!=='skor'+(i+1))throw Error('Susunan item berubah.');const rs=radios.filter(r=>r.name===name);if(rs.length!==5||new Set(rs.map(r=>r.value)).size!==5||rs.some(r=>! /^[0-4]$/.test(r.value)||r.disabled))throw Error('Pilihan skor berubah / dikunci.');const checked=rs.filter(r=>r.checked);if(checked.length>1)throw Error('Skor berganda.');scores[code+':'+String.fromCharCode(97+i)]=checked.length?Number(checked[0].value):null;});
 return {meta,code,scores,sourceURL:location.href};
}
function apply(bundle,expected,replace,roster){const C=globalThis.SKASCore,page=inspect(roster);C.assertMatch(bundle.meta,page.meta);if(JSON.stringify(page)!==JSON.stringify(expected))throw Error('Borang telah berubah. Semak semula.');const pageYear=new URL(location.href).searchParams.get('tahun');if(pageYear&&bundle.meta.tahun&&pageYear!==bundle.meta.tahun)throw Error('Tahun MOEIS berbeza daripada CSV.');const controls=[];Object.keys(page.scores).forEach((key,i)=>{const val=bundle.scores[key];if(val===null||val===undefined)throw Error('Skor subaspek ini belum lengkap.');if(page.scores[key]!==null&&page.scores[key]!==val&&!replace)throw Error('Tandakan izin menggantikan skor sedia ada.');const r=document.querySelector('#myForm input[name="skor'+(i+1)+'"][value="'+val+'"]');if(!r||r.disabled)throw Error('Pilihan skor tidak tersedia.');controls.push(r);});controls.forEach(r=>{r.checked=true;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));});const after=inspect(roster);for(const key of Object.keys(after.scores))if(after.scores[key]!==bundle.scores[key])throw Error('Semakan selepas pengisian gagal.');return after;}
function roster(){const A=globalThis.SKASAuto;if(!A||!location.pathname.endsWith('/standard4/senaraiguru'))throw Error('Buka Senarai Guru bagi sesi sasaran dahulu.');return {url:A.safe(location.href,location.href),rows:A.listRows(document,location.href).filter(r=>r.url)};}
globalThis.SKASAdapter={inspect,apply,roster};
})();