(()=>{
const counts={'4.1.1':3,'4.2.1':3,'4.2.2':4,'4.3.1':5,'4.4.1':7,'4.4.2':4,'4.5.1':5,'4.6.1':7};
const items=Object.entries(counts).flatMap(([code,n])=>Array.from({length:n},(_,i)=>[code,String.fromCharCode(97+i)]));
const norm=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase();
const stage=v=>({'KENDIRI':'kendiri','PENILAIAN KENDIRI':'kendiri','PERTAMA':'pertama','PENCERAPAN 1':'pertama','PENCERAPAN PERTAMA':'pertama','KEDUA':'kedua','PENCERAPAN 2':'kedua','PENCERAPAN KEDUA':'kedua'}[norm(v)]||'');
function parse(text){
 if(text.length>2000000)throw Error('Fail melebihi 2 MB.');
 let rows=[],r=[],s='',q=false,closed=false;
 const push=()=>{r.push(s);s='';closed=false;};
 for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){s+='"';i++;}else if(q){q=false;closed=true;}else if(s===''&&!closed)q=true;else throw Error('Petikan CSV tidak sah.');}else if(c===','&&!q)push();else if(/[\r\n]/.test(c)&&!q){if(c==='\r'&&text[i+1]==='\n')i++;push();if(r.some(v=>v.trim()))rows.push(r);r=[];}else{if(closed)throw Error('Petikan CSV tidak sah.');s+=c;} }
 if(q)throw Error('Petikan CSV tidak ditutup.');push();if(r.some(v=>v.trim()))rows.push(r);return rows;
}
function decode(text){
 const rows=parse(text.replace(/^\uFEFF/,'')),h=rows.shift()?.map(v=>v.trim().toLowerCase())||[];
 if(new Set(h).size!==h.length)throw Error('Lajur CSV berulang.');
 for(const k of ['nama_guru','kod_sekolah','tahun','sesi','kategori','mata_pelajaran','kelas','sub_aspek','item','skor'])if(!h.includes(k))throw Error('Gunakan CSV lengkap SK@S (bukan CSV tiga lajur). Tiada lajur '+k);
 const at=(r,k)=>(r[h.indexOf(k)]??'').trim();let meta=null,scores={};
 for(const r of rows){if(r.length!==h.length)throw Error('Bilangan lajur tidak seragam.');const m=Object.fromEntries(['nama_guru','kod_sekolah','tahun','sesi','kategori','mata_pelajaran','kelas'].map(k=>[k,at(r,k)]));m.sesi=stage(m.sesi);if(!m.nama_guru||!m.kod_sekolah||!/^20\d{2}$/.test(m.tahun)||!m.sesi||!['perdana','khas'].includes(m.kategori))throw Error('Identiti, tahun, sesi atau kategori CSV tidak lengkap.');if(meta&&JSON.stringify(meta)!==JSON.stringify(m))throw Error('Pilih fail satu guru dan satu sesi sahaja.');meta=m;const code=at(r,'sub_aspek'),item=at(r,'item').toLowerCase(),key=code+':'+item;if(!items.some(x=>x[0]===code&&x[1]===item)||Object.hasOwn(scores,key))throw Error('Item tidak dikenali / berulang: '+key);let v=at(r,'skor');if(v!==''&&!/^[0-4]$/.test(v))throw Error('Skor mesti 0–4 atau kosong.');scores[key]=v===''?null:Number(v);}
 if(Object.keys(scores).length!==38)throw Error('Fail perlu tepat 38 item.');return {meta,scores};
}
function assertMatch(a,b){for(const k of ['nama_guru','sesi','mata_pelajaran','kelas'])if(!norm(a[k])||norm(a[k])!==norm(b[k]))throw Error('Tidak sepadan: '+k+'. Semak guru, sesi, subjek dan kelas.');}
function merge(old,page,meta){if(old){assertMatch(old.meta,meta);for(const k of ['kod_sekolah','tahun','kategori'])if(old.meta[k]!==meta[k])throw Error('Sekolah, tahun atau kategori berubah. Kosongkan kutipan dahulu.');}return {meta,scores:{...(old?.scores||{}),...page.scores}};}
function csv(bundle){const h=['kod_sekolah','teacher_id','nama_guru','tahun','sesi','kategori','sub_aspek','item','skor','tarikh','mata_pelajaran','kelas'];const esc=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,s=>"'"+s).replaceAll('"','""')+'"';return '\uFEFF'+[h,...items.map(([c,i])=>[bundle.meta.kod_sekolah,'',bundle.meta.nama_guru,bundle.meta.tahun,bundle.meta.sesi,bundle.meta.kategori,c,i,bundle.scores[c+':'+i]??'','',bundle.meta.mata_pelajaran,bundle.meta.kelas])].map(r=>r.map(esc).join(',')).join('\r\n');}
globalThis.SKASCore={counts,items,norm,stage,parse,decode,assertMatch,merge,csv};
})();