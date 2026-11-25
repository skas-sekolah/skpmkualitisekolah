const {JSDOM}=require('jsdom'),{readFileSync}=require('node:fs'),{join}=require('node:path'),assert=require('node:assert/strict');
const root=join(__dirname,'..'),url='https://moeisins.moe.gov.my/SJN/penilaian-kendiri/pengurusan-kami/standard3-2/list?id_aspek=85&id_kokurikulum=270&kod_kat_kokurikulum=SP&tahun=2026';
const html='<body>BBA8284 <h2>STANDARD 3.2: PENGURUSAN KOKURIKULUM</h2><p>3.2.4.1 BOLA SEPAK</p><form method="post" action="save"><input type="hidden" name="id_aspek" value="85"><input type="hidden" name="id_kokurikulum" value="270">'+[0,1,2,3,4].map(v=>'<input type="radio" name="skor1" value="'+v+'">').join('')+'<button type="submit">Simpan</button></form></body>';
function setup(old=false){
 const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window;
 w.eval(readFileSync(join(root,'core.js'),'utf8'));let src=readFileSync(join(root,'page.js'),'utf8');
 if(old)src=src.replace("const changed=C.changes(r,expected);if(changed.length)throw Error('Borang berubah sejak pratonton: '+changed.join(', ')+'. Semak semula.');","if(JSON.stringify(r.identity)!==JSON.stringify(expected.identity)||JSON.stringify(r.fields)!==JSON.stringify(expected.fields))throw Error('Borang berubah sejak pratonton. Semak semula.');");
 w.eval(src);let submits=0;w.document.querySelector('form').requestSubmit=()=>submits++;
 const ctx={url,year:2026,schoolCode:'BBA8284',record:{id:'3.2.4.1:fixture',fields:[{key:'scores.a',label:'Merancang aktiviti',value:4}]}};
 const reorder=v=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,reorder(v[k])])):v;
 return {w,dom,ctx,expected:reorder(w.ReliablePage.inspect(ctx)),submits:()=>submits};
}
(async()=>{
 let s=setup(true);
 assert.throws(()=>s.w.ReliablePage.apply(s.ctx,s.expected),/Borang berubah/);assert.equal(s.submits(),0);s.dom.window.close();
 s=setup();assert.equal(s.w.ReliablePage.apply(s.ctx,s.expected).submitted,true);assert.equal(s.submits(),1);
 let responseHTML=html;let options;
 s.w.fetch=async(u,o)=>{assert.equal(u,url);options=o;return {ok:true,url,text:async()=>responseHTML};};
 // Live DOM is filled, but fresh server HTML is empty: must not claim success.
 assert.equal((await s.w.ReliablePage.verify(s.ctx,s.expected)).ok,false);assert.equal(options.cache,'no-store');assert.equal(options.credentials,'same-origin');
 responseHTML=html.replace('name="skor1" value="4"','name="skor1" value="4" checked');
 assert.equal((await s.w.ReliablePage.verify(s.ctx,s.expected)).ok,true);
 responseHTML=responseHTML.replace('name="id_kokurikulum" value="270"','name="id_kokurikulum" value="271"');
 await assert.rejects(()=>s.w.ReliablePage.verify(s.ctx,s.expected),/Identiti respons pelayan berbeza/);s.dom.window.close();
 s=setup();s.w.document.querySelector('input[value="0"]').checked=true;
 assert.throws(()=>s.w.ReliablePage.apply(s.ctx,s.expected),/skor1/);assert.equal(s.submits(),0);s.dom.window.close();
 s=setup();s.w.document.querySelector('input[name=id_kokurikulum]').value='271';
 assert.throws(()=>s.w.ReliablePage.apply(s.ctx,s.expected),/identiti borang/);assert.equal(s.submits(),0);s.dom.window.close();
 console.log('PASS: reproduces old key-order false alarm; fixed apply submits once; true score/identity edits still blocked; changed live DOM is not evidence of server persistence.');
})().catch(e=>{console.error(e);process.exit(1);});
