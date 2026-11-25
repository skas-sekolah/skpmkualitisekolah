const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
async function run({review=false,failVerify=false,fatal=false}={}){
 const base='https://moeisins.moe.gov.my/SJN/penilaian-kendiri/pengurusan-kami/standard3-2/list?tahun=2026&id_aspek=85';
 const records=['empty','problem','zero','existing'].map((n,i)=>({id:'3.2.4.1:'+n,title:n,fields:i?[{key:'scores.a',value:i===2?0:4}]:[]}));
 const pack={year:2026,schoolCode:'TEST01',modules:{management:{records}}};let url=base,stored,apply=[],saved=new Set();
 const c={URL,console,setTimeout:fn=>{fn();return 1;},chrome:{runtime:{id:'test',onMessage:{addListener(){}},onStartup:{addListener(){}}},storage:{local:{set:async x=>{if(x.reliableBatch)stored=JSON.parse(JSON.stringify(x.reliableBatch));}}},tabs:{get:async()=>({url,status:'complete'}),update:async(_,p)=>{url=p.url;}},scripting:{executeScript:async x=>{
  if(x.files)return [];
  if(typeof x.args[0]==='object')return [{result:{ok:true,data:{targets:records.map((r,i)=>({id:r.id,url:c.ReliableCore.route(base+'&id_kokurikulum='+i)})),visited:1,warnings:[],unitRows:[]}}}];
  const [action,ctx]=x.args,name=ctx.record.title,value=String(ctx.record.fields[0]?.value);
  if(name==='problem')return [{result:{ok:false,error:fatal?'Sesi MOEIS tamat.':'Padanan borang bermasalah.'}}];
  if(action==='inspect')return [{result:{ok:true,data:{identity:[],fields:[{name:'skor1',value,current:name==='existing'?value:null}]}}}];
  if(action==='apply'){apply.push(name);saved.add(name);return [{result:{ok:true,data:{submitted:true}}}];}
  if(action==='verify')return [{result:{ok:true,data:{ok:name==='existing'||saved.has(name)&&!failVerify}}}];
 }}}};
 vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),c));
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','background.js'),'utf8'),c);
 await c.runBatch(1,pack,review?'review':'fill');return {stored,apply};
}
(async()=>{
 const a=await run();assert.equal(a.stored.status,'completed');assert.deepEqual(a.apply,['zero']);assert.equal(a.stored.summary.sourceScores,3);assert.equal(a.stored.summary.confirmedScores,2);assert.equal(a.stored.summary.percent,66.67);assert.equal(a.stored.results[0].status,'empty-skipped');assert.equal(a.stored.results[1].status,'problem-skipped');
 const b=await run({review:true});assert.equal(b.apply.length,0);assert.equal(b.stored.results[2].status,'ready');assert.equal(b.stored.summary.confirmedScores,1);
 const d=await run({failVerify:true});assert.equal(d.stored.results[2].status,'problem-skipped');assert.equal(d.stored.summary.confirmedScores,1);assert.equal(d.apply.length,1);
 const f=await run({fatal:true});assert.equal(f.stored.status,'stopped');assert.equal(f.apply.length,0);assert.equal(f.stored.results.length,2);
 console.log('PASS: batch continues past record errors, skips empty, preserves zero, verifies existing data, review never submits, failed verification is not counted or resubmitted, session failure stops.');
})().catch(e=>{console.error(e);process.exit(1);});
