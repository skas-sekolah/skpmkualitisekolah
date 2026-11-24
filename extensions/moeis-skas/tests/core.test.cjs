const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync(__dirname+'/../core.js','utf8'));const C=SKASCore;
const meta={nama_guru:'GURU UJIAN, A',kod_sekolah:'TRY001',tahun:'2026',sesi:'kendiri',kategori:'perdana',mata_pelajaran:'MATEMATIK',kelas:'UJIAN'};
const bundle={meta,scores:Object.fromEntries(C.items.map(([c,i],n)=>[c+':'+i,n===0?0:n===1?null:n%5]))};
test('38 items, eight subaspects; CSV round trip preserves zero/null and quoted identity',()=>{assert.equal(C.items.length,38);assert.equal(Object.keys(C.counts).length,8);assert.deepEqual(C.decode(C.csv(bundle)),bundle);});
test('reject duplicate, invalid scores, missing item, multi teacher, helper CSV',()=>{const text=C.csv(bundle);assert.throws(()=>C.decode(text+'\r\n'+text.split('\r\n')[1]));assert.throws(()=>C.decode(text.replace('"0"','"5"')));assert.throws(()=>C.decode(text.split('\r\n').slice(0,-1).join('\r\n')));assert.throws(()=>C.decode(text.replace('GURU UJIAN, A','GURU LAIN')));assert.throws(()=>C.decode('sub_aspek,item,skor\n4.1.1,a,4'));});
test('identity and collection context cannot change silently',()=>{const page={scores:{'4.1.1:a':0}};assert.equal(C.merge(null,page,meta).scores['4.1.1:a'],0);assert.throws(()=>C.merge(bundle,page,{...meta,sesi:'kedua'}));assert.throws(()=>C.merge(bundle,page,{...meta,tahun:'2027'}));assert.throws(()=>C.assertMatch(meta,{...meta,kelas:'LAIN'}));});
test('malformed CSV and aliases',()=>{assert.throws(()=>C.parse('a,"broken'));assert.equal(C.stage('PENCERAPAN PERTAMA'),'pertama');assert.equal(C.stage('PENCERAPAN KEDUA'),'kedua');});

test('metadata labels accept colons / spacer cells and reject conflicting teachers',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/../core.js','utf8'),context);const C=context.SKASCore;
 const doc=rows=>({querySelectorAll:()=>rows.map(cells=>({cells:cells.map(textContent=>({textContent}))}))});
 for(const cells of [['Nama Guru :','GURU REKAAN'],['','Nama Guru',':','GURU REKAAN'],['NAMA GURU： GURU REKAAN'],['NAMA\u00a0GURU','GURU REKAAN']])assert.equal(C.readField(doc([cells]),'NAMA GURU'),'GURU REKAAN');
 assert.throws(()=>C.readField(doc([['NAMA GURU','GURU SATU'],['NAMA GURU','GURU DUA']]),'NAMA GURU'));
});
test('CSV batch has one header, 38 rows per teacher, preserves blanks and zero, rejects partial/duplicate data',()=>{
 const second={meta:{...meta,nama_guru:'GURU B',kategori:''},scores:{...bundle.scores}},text=C.csvMany([bundle,second]),rows=C.parse(text.replace(/^\uFEFF/,''));
 assert.equal(rows.length,77);assert.equal(rows[0][2],'nama_guru');assert.equal(rows[1][8],'0');assert.equal(rows[2][8],'');assert.equal(rows[39][2],'GURU B');
 assert.throws(()=>C.csvMany([bundle,bundle]),/berulang/);assert.throws(()=>C.csvMany([]));assert.throws(()=>C.csvMany(Array(51).fill(bundle)));
 const partial={meta,scores:{...bundle.scores}};delete partial.scores['4.1.1:a'];assert.throws(()=>C.csvMany([partial]),/38 item/);
 assert.throws(()=>C.csvMany([{meta,scores:{...bundle.scores,'4.1.1:a':7}}]),/0–4/);
});
