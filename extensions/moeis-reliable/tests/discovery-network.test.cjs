const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),url='https://moeisins.moe.gov.my/SJN/penilaian-kendiri/pengurusan-kami/standard2/index?tahun=2026';
const record={id:'2.1.1',title:'Sumber manusia',fields:[{key:'scores.a',value:4}]},pack={schoolCode:'TEST01',year:2026,modules:{management:{records:[record]}}};
(async()=>{
 const dom=new JSDOM('<body>TEST01 <p>Halaman sudah terbuka</p></body>',{url,runScripts:'outside-only'}),w=dom.window;
 for(const f of ['core.js','batch-page.js','report-summary.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 let calls=0;w.fetch=async()=>{calls++;throw TypeError('Failed to fetch');};
 let found=await w.ReliableBatchPage.discover({url:w.ReliableCore.route(url)},pack);assert.equal(calls,0);assert.equal(found.visited,1);
 const a=w.document.createElement('a');a.href=url+'&no_aspek=2.1';a.textContent='2.1.1';w.document.body.append(a);
 await assert.rejects(()=>w.ReliableBatchPage.discover({url:w.ReliableCore.route(url)},pack),e=>{assert.match(e.message,/Carian dihentikan/);assert.equal(e.discovery.interrupted,true);assert.equal(e.discovery.visited,2);assert.equal(e.discovery.warnings[0].type,'network');return true;});assert.equal(calls,1,'Stop at first network failure, do not mark remaining names absent');
 const results=Array.from({length:126},(_,i)=>({id:String(i),title:'Rekod '+i,scoreCount:i<74?4:0,status:i<74?'problem-skipped':'empty-skipped',message:i<74?'Pautan / nama unit tidak ditemui.':'Tiada skor.'}));
 const old={status:'completed',mode:'review',summary:{totalRecords:126,sourceScores:337},results,discovery:{visited:1,unitRows:[],warnings:[{message:'Failed to fetch'}]}};
 const model=w.ReliableReport.model(old);assert.equal(model.blocked,74);assert.equal(model.processed,52);assert.equal(model.remaining,74);assert.equal(model.counts['problem-skipped']||0,0);assert.equal(old.results[0].status,'problem-skipped','Never mutate imported original');
 const host=w.document.createElement('div');w.ReliableReport.render(host,old);assert.match(host.textContent,/74 rekod berskor belum diperiksa/);assert.equal(host.querySelector('select').value,'not-checked');
 let stored,submits=0;const ctx={URL,console,setTimeout:fn=>{fn();return 1;},chrome:{runtime:{id:'test',onMessage:{addListener(){}},onStartup:{addListener(){}},onInstalled:{addListener(){}}},storage:{local:{set:async x=>{if(x.reliableBatch)stored=JSON.parse(JSON.stringify(x.reliableBatch));}}},tabs:{get:async()=>({url,status:'complete'})},scripting:{executeScript:async x=>{if(x.files)return [];if(x.args?.[0]==='apply')submits++;return [{result:{ok:false,error:'Carian dihentikan: Failed to fetch',discovery:{visited:1,warnings:[{message:'Failed to fetch',type:'network'}],unitRows:[],interrupted:true}}}];}}}};
 vm.createContext(ctx);ctx.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx));vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),ctx);
 await ctx.runBatch(1,pack,'review');assert.equal(stored.status,'error');assert.equal(stored.results.length,0);assert.equal(stored.summary.processed,0);assert.equal(stored.discovery.interrupted,true);assert.equal(submits,0);assert(ctx.ReliableBatchCore.fatal('Failed to fetch'));w.close();
 console.log('PASS: discovery uses open DOM without root fetch, stops on network failure, preserves diagnostics through background, never submits, and displays old 74 false missing-route results as unexamined without modifying source report.');
})().catch(e=>{console.error(e);process.exit(1);});
