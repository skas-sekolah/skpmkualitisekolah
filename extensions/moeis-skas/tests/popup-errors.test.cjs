const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const mode of ['auto','strength'])test(mode+' startup failure stays beside the clicked button after refresh',async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='autoSchool'?'BBA8284':id==='autoYear'?'2026':'all',textContent:'',disabled:false});return nodes.get(id);};let refresh;
 const ctx=vm.createContext({document:{getElementById:node},chrome:{tabs:{query:async()=>{throw Error('Sesi tab ujian gagal');}},storage:{session:{get:async()=>({}),set:async()=>{},remove:async()=>{}}}},setInterval:f=>refresh=f,confirm:()=>true});
 vm.runInContext(fs.readFileSync(__dirname+'/../'+(mode==='auto'?'auto-popup.js':'strength-popup.js'),'utf8'),ctx);
 await node(mode==='auto'?'autoStart':'strengthStart').onclick();await refresh();
 assert.match(node(mode==='auto'?'autoProgress':'strengthProgress').textContent,/Sesi tab ujian gagal/);
});
