const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('popup downloads the selected 50-record CSV batch without changing collected scores',async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',disabled:false});return nodes.get(id);};let state,blob,filename,clicked=false,refresh;
 const ctx=vm.createContext({Blob,setTimeout:()=>{},setInterval:f=>refresh=f,document:{getElementById:node,body:{appendChild:()=>{}},createElement:()=>({set download(v){filename=v;},click:()=>clicked=true,remove:()=>{}})},URL:{createObjectURL:b=>{blob=b;return 'blob:fixture';},revokeObjectURL:()=>{}},chrome:{storage:{session:{get:async()=>({auto:state})}}}});
 vm.runInContext(fs.readFileSync(__dirname+'/../core.js','utf8'),ctx);const C=ctx.SKASCore;
 state={records:Array.from({length:53},(_,i)=>({meta:{kod_sekolah:'TRY001',tahun:'2026',nama_guru:'GURU '+i,sesi:'pertama',kategori:'',mata_pelajaran:'MATEMATIK',kelas:'UJIAN'},scores:Object.fromEntries(C.items.map(([c,k],j)=>[c+':'+k,j%5]))})),running:false,sent:0,errors:[]};
 const before=JSON.stringify(state);vm.runInContext(fs.readFileSync(__dirname+'/../auto-popup.js','utf8'),ctx);await refresh();node('autoBatch').value='1';await node('autoDownload').onclick();
 assert.equal(clicked,true);assert.equal(filename,'SKAS_MOEIS_TRY001_2026_pertama_2.csv');const rows=C.parse((await blob.text()).replace(/^\uFEFF/,''));assert.equal(rows.length,115);assert.equal(rows[1][2],'GURU 50');assert.equal(rows.at(-1)[2],'GURU 52');assert.equal(JSON.stringify(state),before);assert.match(node('autoProgress').textContent,/CSV dimuat turun/);
});
