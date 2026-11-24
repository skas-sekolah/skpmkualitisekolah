const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../progress.js','utf8'),ctx=vm.createContext({});vm.runInContext(source,ctx);const P=ctx.SKASProgress;
test('listing stays indeterminate; work progress includes current subaspects and never reports ready early',()=>{
 assert.equal(P.view({running:true,phase:'listing',total:20,pagesRead:1}).percent,null);
 const s={running:true,phase:'reading',startedAt:1000,updatedAt:61000,total:100,processed:9,subaspects:4,itemCount:19,currentTeacher:'GURU UJIAN',records:Array(9).fill({}),errors:[]};const p=P.view(s,61000);assert.equal(p.percent,9);assert.equal(p.ready,false);assert.match(p.current,/4\/8.*19\/38/);assert.match(p.eta,/Anggaran berbaki/);
 assert.equal(P.view({...s,processed:99,subaspects:8},61000).percent,99);
});
test('finished, failed, stopped and stalled reads have distinct truthful states',()=>{
 const s={running:false,phase:'done',total:10,processed:10,records:[{}],errors:['Skipped'],startedAt:1000,finishedAt:61000};let p=P.view(s,999000);assert.equal(p.percent,100);assert.equal(p.ready,true);assert.match(p.title,/SIAP/);assert.equal(p.elapsed,'Masa berlalu: 1 min 0 saat');
 p=P.view({...s,phase:'stopped',processed:3,failed:true},999000);assert.equal(p.percent,30);assert.match(p.title,/Dihentikan/);assert.equal(p.ready,true);
 p=P.view({...s,phase:'error',processed:3,failed:true},999000);assert.match(p.title,/terhenti/);assert.equal(p.percent,30);
 p=P.view({...s,running:true,phase:'reading',updatedAt:1000,finishedAt:undefined},40000);assert.match(p.title,/Menunggu respons/);assert.ok(!p.eta.includes('Anggaran berbaki:'));assert.equal(p.ready,false);
});
test('popup binds progress bar and completion message to stored collector state',async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',dataset:{},removeAttribute(k){delete this[k];}});return nodes.get(id);};let refresh,state={running:true,phase:'listing',records:[]};
 const c=vm.createContext({document:{getElementById:node},chrome:{storage:{session:{get:async()=>({auto:state})}}},setInterval:f=>refresh=f});vm.runInContext(source,c);vm.runInContext(fs.readFileSync(__dirname+'/../auto-popup.js','utf8'),c);await refresh();await new Promise(r=>setImmediate(r));assert.equal(node('autoMeter').value,undefined);assert.equal(node('autoReady').hidden,true);
 state={running:false,phase:'done',total:2,processed:2,records:[{},{}],errors:[]};await refresh();await new Promise(r=>setImmediate(r));assert.equal(node('autoMeter').value,100);assert.equal(node('autoReady').hidden,false);assert.equal(node('autoDownload').disabled,false);assert.match(node('autoProgressTitle').textContent,/SIAP/);
});
