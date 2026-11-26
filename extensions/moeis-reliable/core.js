(()=>{
const origin='https://moeisins.moe.gov.my';
function route(raw){const u=new URL(raw);if(u.origin!==origin||!u.pathname.startsWith('/SJN/penilaian-kendiri/pengurusan-kami/')||/save|delete|hapus|logout/i.test(u.pathname))throw Error('Buka borang Pengurusan Kami yang betul.');u.hash='';u.searchParams.sort();return u.href;}
function group(code){return code.startsWith('3.')?'standard'+code.split('.').slice(0,2).join('-'):'standard'+code.split('.')[0];}
function context(url,record,year){
 const u=new URL(route(url)),code=record.id.split(':')[0];
 if(!u.pathname.includes('/'+group(code)+'/'))throw Error('Laluan standard tidak sepadan. Buka melalui menu MOEIS.');
 if(u.searchParams.get('tahun')!==String(year))throw Error('Tahun tidak sepadan.');
 const aspect=u.searchParams.get('no_aspek');if(aspect&&!(code===aspect||code.startsWith(aspect+'.')))throw Error('Aspek URL tidak sepadan.');
 if(record.id.includes(':')&&!['id_kokurikulum','id_panitia','id_subjek','id_matapelajaran','id_mata_pelajaran'].some(k=>u.searchParams.get(k)))throw Error('Identiti unit tidak dikenali pada URL ini. Tidak diisi.');
 return route(url);
}
function scores(r){return (Array.isArray(r.fields)?r.fields:[]).filter(f=>/^scores\.[a-z]$/.test(f.key)&&(typeof f.value==='number'||typeof f.value==='string'&&f.value.trim()!=='')&&Number.isInteger(Number(f.value))&&Number(f.value)>=0&&Number(f.value)<=4).map(f=>({key:f.key,name:'skor'+(f.key.slice(-1).charCodeAt(0)-96),value:String(f.value),label:f.label}));}
function decode(raw){const p=JSON.parse(raw);if(p.kind!=='SKAS_MOEIS_UPLOAD_V1'||!Number.isInteger(p.year)||!p.schoolCode||!Array.isArray(p.modules?.management?.records))throw Error('Pakej JSON Pengurusan Kami tidak sah.');return p;}
function unitName(value){
 let text=String(value||'').replace(/^.*?·\s*/,'').toUpperCase().trim().replace(/\s*\((SR|SM)\)\s*$/,'');
 const aliases={'RBT':'REKA BENTUK DAN TEKNOLOGI','PENDIDIKAN JASMANI DAN PENDIDIKAN KESIHATAN (PJPK)':'PENDIDIKAN JASMANI DAN PENDIDIKAN KESIHATAN'};
 text=aliases[text]||text;
 return text.replace(/^(?:(PANITIA|MATA PELAJARAN|KELAB|PERSATUAN)\s+)+/,'').replace(/[^A-Z0-9]/g,'');
}
function identity(form){return [...form.querySelectorAll('input[type=hidden]')].filter(e=>/^id_/i.test(e.name)&&!/(token|csrf|nonce|session)/i.test(e.name)).map(e=>[e.name,e.value]).sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]));}
// Chrome messaging may reorder object keys. Compare values, not insertion order.
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v!==null&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
function same(a,b){return canonical(a)===canonical(b);}
function changes(actual,expected){if(!expected||!Array.isArray(expected.fields)||!Array.isArray(expected.identity))return ['pratonton tidak lengkap'];const out=[];if(!same(actual.identity,expected.identity))out.push('identiti borang');if(actual.fields.length!==expected.fields.length)out.push('bilangan medan');for(let i=0;i<actual.fields.length;i++)if(!same(actual.fields[i],expected.fields[i]))out.push(actual.fields[i].name||'medan '+(i+1));return [...new Set(out)];}
globalThis.ReliableCore={route,group,context,scores,decode,identity,same,changes,unitName};
})();
