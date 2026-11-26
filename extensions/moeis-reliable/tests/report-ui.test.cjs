const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const live={running:false,status:'completed',summary:{totalRecords:2,sourceScores:10},results:[{id:'a',title:'Rekod A',scoreCount:5,status:'already-matched',message:'Skor disahkan.'},{id:'b',title:'Rekod B',scoreCount:5,status:'problem-skipped',message:'Pautan / nama unit tidak ditemui.'}]};
 for(const file of ['popup','batch']){
  const dom=new JSDOM(fs.readFileSync(path.join(root,file+'.html'),'utf8'),{url:'https://extension.test/'+file+'.html',runScripts:'outside-only'}),w=dom.window;let changed,sends=0,writes=0;
  w.chrome={storage:{local:{get:async()=>({reliableBatch:live}),set:async()=>writes++},onChanged:{addListener(fn){changed=fn;}}},tabs:{create:async()=>{}},runtime:{getURL:p=>p,sendMessage:async()=>{sends++;return {ok:true};}}};
  for(const s of ['core.js','report-summary.js',file==='batch'?'batch-ui.js':'popup.js'])w.eval(fs.readFileSync(path.join(root,s),'utf8'));
  await new Promise(r=>setTimeout(r,0));assert.match(w.document.getElementById('batch-summary').textContent,/50%/);
  if(file==='batch'){
   const snapshot={batch:{...live,summary:{totalRecords:2,sourceScores:20},running:true}},input=w.document.getElementById('report-file');
   Object.defineProperty(input,'files',{value:[{size:100,text:async()=>JSON.stringify(snapshot)}]});await input.onchange();
   assert.match(w.document.getElementById('batch-summary').textContent,/25%/);assert.match(w.document.getElementById('status').textContent,/diimport/);assert.equal(sends,0);assert.equal(writes,0);
   changed();await new Promise(r=>setTimeout(r,0));assert.match(w.document.getElementById('batch-summary').textContent,/25%/);
   w.document.getElementById('current-report').onclick();await new Promise(r=>setTimeout(r,0));assert.match(w.document.getElementById('batch-summary').textContent,/50%/);
  }
  live.summary.sourceScores=20;changed();await new Promise(r=>setTimeout(r,0));assert.match(w.document.getElementById('batch-summary').textContent,/25%/);live.summary.sourceScores=10;w.close();
 }
 console.log('PASS: popup and batch show stored percentages on opening and refresh on storage change; report import only changes displayed snapshot, never submits or overwrites live job.');
})().catch(e=>{console.error(e);process.exit(1);});
