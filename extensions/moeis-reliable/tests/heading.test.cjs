const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),url='https://moeisins.moe.gov.my/SJN/penilaian-kendiri/pengurusan-kami/standard3-2/list?id_aspek=85&id_kokurikulum=270&tahun=2026';
const radios=[0,1,2,3,4].map(v=>'<input type="radio" name="skor1" value="'+v+'">').join('');
const form='<form method="post" action="save"><input type="hidden" name="id_kokurikulum" value="270">'+radios+'<button type="submit">Simpan</button></form>';
function fixture(header,unit='BOLA SEPAK (SR)',code='3.2.4.1'){
 const html='<body>BBA8284<nav><h2>STANDARD 3.1: KURIKULUM</h2><a>STANDARD 3.3: HEM</a><a>'+code+'</a></nav>'+header+'<p>'+code+'</p><table><tr><td>Pengurusan Sukan/Permainan</td><td>'+unit+'</td></tr></table>'+form+'</body>';
 const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window;
 for(const f of ['core.js','page.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 return {dom,w,ctx:{url:w.ReliableCore.route(url),year:2026,schoolCode:'BBA8284',unitName:'BOLA SEPAK (SR)',record:{id:'3.2.4.1:fixture',fields:[{key:'scores.a',value:4}]}}};
}
let s=fixture('<table><tr><td>STANDARD</td><td>STANDARD 3.2: PENGURUSAN KOKURIKULUM</td></tr></table>');
assert.equal(s.w.ReliablePage.inspect(s.ctx).fields.length,1);s.dom.window.close();
s=fixture('<h2>STANDARD 3.2: PENGURUSAN KOKURIKULUM</h2>');
assert.equal(s.w.ReliablePage.inspect(s.ctx).fields.length,1);s.dom.window.close();
s=fixture('<table><tr><td>STANDARD</td><td>STANDARD 3.1: SALAH</td></tr></table><h2>STANDARD 3.2: PALSU</h2>');
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Tajuk standard kandungan/);s.dom.window.close();
s=fixture('<h2>STANDARD 3.2: KOKURIKULUM</h2>','BOLA JARING (SR)');
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Nama unit/);s.dom.window.close();
s=fixture('<h2>STANDARD 3.2: KOKURIKULUM</h2>','BOLA SEPAK (SR)','3.2.4.2');
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Nombor standard/);s.dom.window.close();
console.log('PASS: menu headings do not cause mixed-standard false alarms; incorrect main standard, unit and criterion remain blocked.');
