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
function decodeMany(text){
 const rows=parse(text.replace(/^\uFEFF/,'')),header=rows.shift();if(!header||!rows.length)throw Error('CSV kosong.');
 const h=header.map(v=>v.trim().toLowerCase()),required=['nama_guru','kod_sekolah','tahun','sesi','kategori','mata_pelajaran','kelas'];
 if(new Set(h).size!==h.length)throw Error('Lajur CSV berulang.');for(const k of [...required,'sub_aspek','item','skor'])if(!h.includes(k))throw Error('Gunakan CSV lengkap SK@S. Tiada lajur '+k);
 const groups=new Map();for(const row of rows){if(row.length!==h.length)throw Error('Bilangan lajur tidak seragam.');const key=JSON.stringify([...required,...(h.includes('teacher_id')?['teacher_id']:[])].map(k=>row[h.indexOf(k)].trim()));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 if(groups.size>50)throw Error('Maksimum 50 penilaian setiap fail.');const quote=v=>'"'+v.replaceAll('"','""')+'"',result=[],seen=new Set();
 for(const rows of groups.values()){const record=decode([header,...rows].map(r=>r.map(quote).join(',')).join('\r\n'));const key=JSON.stringify([norm(record.meta.kod_sekolah),record.meta.tahun,norm(record.meta.nama_guru),record.meta.sesi]);if(seen.has(key))throw Error('Guru dan sesi berulang / kabur dalam fail.');seen.add(key);result.push(record);}return result;
}
function rosterIdentity(roster,url){
 if(!roster||!Array.isArray(roster.rows)||roster.rows.length>3000)throw Error('Semak Senarai Guru dahulu untuk mengesahkan nama guru.');
 const current=new URL(url),list=new URL(roster.url),root='/SJN/penilaian-kendiri/pengurusan-kami/standard4/';
 if(current.origin!=='https://moeisins.moe.gov.my'||list.origin!==current.origin||list.pathname!==root+'senaraiguru')throw Error('Sumber identiti bukan Senarai Guru MOEIS.');
 for(const k of ['tahun','id_sesi'])if(!current.searchParams.get(k)||current.searchParams.get(k)!==list.searchParams.get(k))throw Error('Tahun / sesi senarai berbeza. Semak Senarai Guru semula.');
 const keys=['id_individu','id_serahan_item_individu'].filter(k=>current.searchParams.has(k));if(!keys.length)throw Error('ID guru MOEIS tiada; padanan ditolak.');
 const matches=roster.rows.filter(r=>{try{const u=new URL(r.url);return u.origin===current.origin&&u.pathname===root+'pengisianskor'&&keys.every(k=>u.searchParams.get(k)===current.searchParams.get(k))&&['tahun','id_sesi'].every(k=>u.searchParams.get(k)===current.searchParams.get(k));}catch{return false;}});
 if(matches.length!==1||!matches[0].name)throw Error('Guru tidak ditemui secara unik dalam Senarai Guru yang disemak.');return matches[0].name;
}
function assertMatch(a,b){for(const k of ['nama_guru','sesi','mata_pelajaran','kelas'])if(!norm(a[k])||norm(a[k])!==norm(b[k]))throw Error('Tidak sepadan: '+k+'. Semak guru, sesi, subjek dan kelas.');}
function merge(old,page,meta){if(old){assertMatch(old.meta,meta);for(const k of ['kod_sekolah','tahun','kategori'])if(old.meta[k]!==meta[k])throw Error('Sekolah, tahun atau kategori berubah. Kosongkan kutipan dahulu.');}return {meta,scores:{...(old?.scores||{}),...page.scores}};}
function csv(bundle){const h=['kod_sekolah','teacher_id','nama_guru','tahun','sesi','kategori','sub_aspek','item','skor','tarikh','mata_pelajaran','kelas'];const esc=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,s=>"'"+s).replaceAll('"','""')+'"';return '\uFEFF'+[h,...items.map(([c,i])=>[bundle.meta.kod_sekolah,'',bundle.meta.nama_guru,bundle.meta.tahun,bundle.meta.sesi,bundle.meta.kategori,c,i,bundle.scores[c+':'+i]??'','',bundle.meta.mata_pelajaran,bundle.meta.kelas])].map(r=>r.map(esc).join(',')).join('\r\n');}
function csvMany(records){
 if(!Array.isArray(records)||!records.length||records.length>50)throw Error('CSV menerima 1–50 penilaian setiap fail.');
 const seen=new Set();for(const r of records){const m=r?.meta;if(!m||!m.nama_guru||!m.kod_sekolah||!/^20\d{2}$/.test(m.tahun)||!stage(m.sesi)||!r.scores||Object.keys(r.scores).length!==38)throw Error('Identiti / 38 item CSV tidak lengkap.');const key=JSON.stringify([norm(m.kod_sekolah),m.tahun,norm(m.nama_guru),m.sesi]);if(seen.has(key))throw Error('Guru dan sesi berulang dalam CSV.');seen.add(key);for(const [c,i]of items){const v=r.scores[c+':'+i];if(v!==null&&(!Number.isInteger(v)||v<0||v>4))throw Error('Skor CSV mesti 0–4 atau kosong.');}}
 const parts=records.map(r=>csv(r).replace(/^\uFEFF/,'').split('\r\n'));return '\uFEFF'+[parts[0][0],...parts.flatMap(p=>p.slice(1))].join('\r\n');
}
// Labels may have a separate colon cell, trailing colon or leading spacer.
function readField(doc,label){
 const clean=v=>norm(v).replace(/[：:]/g,'').trim(),values=[];
 for(const row of doc.querySelectorAll('tr')){
  const cells=[...(row.cells||[])];
  for(let i=0;i<cells.length;i++){
   const raw=String(cells[i].textContent||'').replace(/\s+/g,' ').trim();
   if(clean(raw)===label){const next=cells.slice(i+1).map(c=>String(c.textContent||'').replace(/\s+/g,' ').trim()).filter(v=>v&&!/^[：:]$/.test(v));if(next.length===1)values.push(next[0]);}
   else{const m=raw.match(/^(.+?)\s*[：:]\s*(.+)$/);if(m&&clean(m[1])===label)values.push(m[2].trim());}
  }
 }
 const unique=[...new Set(values)];if(unique.length!==1)throw Error('Label borang tidak dapat dipadankan dengan satu nilai: '+label+' ('+unique.length+' padanan).');return unique[0];
}
globalThis.SKASCore={counts,items,norm,stage,parse,decode,decodeMany,rosterIdentity,assertMatch,merge,csv,csvMany,readField};
})();