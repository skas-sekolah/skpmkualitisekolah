const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const c={URL,console,importScripts(){}};vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'core.js'),'utf8'),c);
 vm.runInContext(fs.readFileSync(path.join(root,'batch-core.js'),'utf8'),c);
 vm.runInContext(fs.readFileSync(path.join(root,'batch-runner.js'),'utf8'),c);
 const pack={year:2026,schoolCode:'BBA8284'};
 const snapshot=id=>({identity:[['id_dimensi',id]],fields:[{name:'skor1',value:'4',current:null}]});
 for(const id of ['2.1.1','2.1.2','3.2.1.1','3.3.1.1']){
  const record={id,fields:[{key:'scores.a',value:4}]},base='https://moeisins.moe.gov.my/SJN/penilaian-kendiri/pengurusan-kami/'+c.ReliableCore.group(id)+'/';
  const candidates=[{url:base+'index?tahun=2026'},{url:base+'list?tahun=2026'}];let calls=0,result={};
  c.call=async(ctx,action)=>{calls++;assert.equal(action,'probe');if(ctx.url.includes('/index?'))throw Error('Borang skor tunggal tidak ditemui.');return snapshot('17');};
  let selected=await c.resolveBatchCandidates(1,record,pack,candidates,result);
  assert(selected.ctx.url.includes('/list?'));assert.equal(calls,2);assert.equal(result.candidates[0].status,'rejected');
  c.call=async()=>snapshot('17');result={};
  selected=await c.resolveBatchCandidates(1,record,pack,candidates,result);assert.equal(result.candidateCount,2);
  c.call=async(ctx)=>snapshot(ctx.url.includes('/index?')?'17':'18');
  await assert.rejects(()=>c.resolveBatchCandidates(1,record,pack,candidates,{}),/Lebih satu identiti/);
  c.call=async()=>({identity:[],fields:[]});
  await assert.rejects(()=>c.resolveBatchCandidates(1,record,pack,candidates,{}),/Lebih satu identiti/);
  c.call=async()=>{throw Error('Sesi MOEIS tamat.');};
  await assert.rejects(()=>c.resolveBatchCandidates(1,record,pack,candidates,{}),/Sesi/);
 }
 assert.equal(c.ReliableCore.unitName('RBT'),c.ReliableCore.unitName('REKA BENTUK DAN TEKNOLOGI'));
 assert.equal(c.ReliableCore.unitName('PENDIDIKAN JASMANI DAN PENDIDIKAN KESIHATAN (PJPK)'),c.ReliableCore.unitName('PENDIDIKAN JASMANI DAN PENDIDIKAN KESIHATAN'));
 assert.notEqual(c.ReliableCore.unitName('BAHASA ELEKTIF'),c.ReliableCore.unitName('BAHASA ARAB'));
 assert.notEqual(c.ReliableCore.unitName('(PRASEKOLAH) BAHASA MELAYU'),c.ReliableCore.unitName('BAHASA MELAYU'));
 console.log('PASS: all four reported standards probe candidates read-only; reject landing page, accept same identity aliases, block distinct/missing identities and expired session; safe subject aliases.');
})().catch(e=>{console.error(e);process.exit(1);});
