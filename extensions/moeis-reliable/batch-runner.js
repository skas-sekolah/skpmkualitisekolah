importScripts('batch-core.js');
let batchStop=false;
async function discoverBatch(ctx,pack){
 await chrome.scripting.executeScript({target:{tabId:ctx.tabId},files:['core.js','batch-page.js']});
 const [r]=await chrome.scripting.executeScript({target:{tabId:ctx.tabId},func:async(ctx,pack)=>{try{return {ok:true,data:await ReliableBatchPage.discover(ctx,pack)};}catch(e){return {ok:false,error:e.message};}},args:[ctx,pack]});
 if(!r?.result?.ok)throw Error(r?.result?.error||'Carian gagal.');return r.result.data;
}
async function navigateBatch(ctx){
 await chrome.tabs.update(ctx.tabId,{url:ctx.url});
 for(let i=0;i<120;i++){await delay(250);const t=await chrome.tabs.get(ctx.tabId);if(t.status==='complete'){if(ReliableCore.route(t.url)!==ctx.url)throw Error('Alamat borang berbeza daripada pautan asal.');await delay(350);return;}}
 throw Error('Halaman terlalu lambat.');
}

async function resolveBatchCandidates(tabId,record,pack,candidates,result){
 const unique=[...new Map(candidates.map(c=>[ReliableCore.context(c.url,record,pack.year),c])).values()];
 if(!unique.length)throw Error('Pautan / nama unit tidak ditemui.');
 if(unique.length>12)throw Error('Terlalu banyak calon pautan; perlu semakan manual.');
 result.candidates=[];const valid=[];
 for(const route of unique){
  if(batchStop)throw Error('Proses dihentikan sebelum Simpan.');
  const ctx={tabId,url:ReliableCore.context(route.url,record,pack.year),record,schoolCode:pack.schoolCode,year:pack.year,...(route.unit?{unitName:route.unit}:{})};
  try{
   const snapshot=await call(ctx,'probe');
   valid.push({ctx,snapshot});result.candidates.push({url:ctx.url,status:'validated'});
  }catch(e){result.candidates.push({url:ctx.url,status:'rejected',message:e.message});if(ReliableBatchCore.fatal(e.message))throw e;}
 }
 if(!valid.length)throw Error('Tiada calon borang lulus semakan: '+result.candidates.map(c=>c.message).join(' | '));
 // Multiple URLs may refer to the same form, but never merge distinct or missing identities.
 if(valid.length>1&&(!valid[0].snapshot.identity.length||valid.some(v=>!ReliableCore.same(v.snapshot,valid[0].snapshot))))throw Error('Lebih satu identiti borang yang sah; tidak dipilih secara rawak.');
 const selected=valid[0];result.chosenUrl=selected.ctx.url;result.candidateCount=unique.length;
 return selected;
}

async function runBatch(tabId,pack,mode){
 batchStop=false;const records=pack.modules.management.records,job={version:'0.8.3',schoolCode:pack.schoolCode,year:pack.year,mode,groups:[...new Set(records.map(r=>r.group||'management'))],running:true,status:'discovering',results:[],message:'Mencari pautan menu dan unit…',summary:ReliableBatchCore.totals(records,[])};
 const persist=async()=>{job.summary=ReliableBatchCore.totals(records,job.results);job.updatedAt=new Date().toISOString();await chrome.storage.local.set({reliableBatch:job});};
 try{
  await persist();const tab=await chrome.tabs.get(tabId),base=ReliableCore.route(tab.url);
  const found=await discoverBatch({tabId,url:base},pack),routes=ReliableBatchCore.uniqueRoutes(found.targets);
  job.discovery={visited:found.visited,warnings:found.warnings,unitRows:found.unitRows};job.status='filling';
  const claimed=new Map();
  for(const record of records){
   if(batchStop)break;const count=ReliableCore.scores(record).length;
   job.message='Memproses '+record.title;await persist();
   const result={id:record.id,title:record.title,scoreCount:count};
   try{
    if(record.readOnly||!count){result.status='empty-skipped';result.message='Tiada skor boleh diisi / rekod rujukan.';}
    else{
     const candidates=[...(routes.get(record.id)?.values()||[])];
     const {ctx,snapshot}=await resolveBatchCandidates(tabId,record,pack,candidates,result);
     const identityKey=JSON.stringify({group:ReliableCore.group(record.id.split(':')[0]),identity:snapshot.identity});
     if(claimed.has(ctx.url)||snapshot.identity.length&&claimed.has(identityKey))throw Error('Borang yang sama sudah dipadankan dengan rekod lain.');
     claimed.set(ctx.url,record.id);if(snapshot.identity.length)claimed.set(identityKey,record.id);
     await navigateBatch(ctx);const expected=await call(ctx,'inspect');
     if(!ReliableCore.same(snapshot,expected))throw Error('Borang berubah selepas semakan calon; tidak diisi.');
     if(expected.fields.every(f=>f.current===f.value)){
      const verified=await call(ctx,'verify',expected);
      if(!verified.ok)throw Error('Skor sedia ada tidak disahkan pada pelayan.');
      result.status='already-matched';result.message='Skor sedia ada disahkan pada pelayan; tiada Simpan baharu.';
     }else if(mode==='review'){result.status='ready';result.message='Padanan tersedia; semakan sahaja.';}
     else{
      result.status='submitting';job.pending={id:record.id,title:record.title};await persist();
      try{await call(ctx,'apply',expected);}catch(e){if(!/frame.*removed|context.*invalidated|message port closed/i.test(e.message))throw e;}
      let verified=false,last='';
      // Stop requests take effect after verification, avoiding accidental duplicate submit.
      for(let i=0;i<10;i++){await delay(1500);try{const v=await call(ctx,'verify',expected);if(v.ok){verified=true;break;}last='Skor pelayan belum sepadan.';}catch(e){last=e.message;if(ReliableBatchCore.fatal(last))throw e;}}
      if(!verified)throw Error('Simpanan tidak disahkan. '+last+' Tidak dihantar semula.');
      result.status='server-confirmed';result.message='Skor disahkan pada respons baharu pelayan.';
     }
    }
   }catch(e){result.status='problem-skipped';result.message=e.message;if(ReliableBatchCore.fatal(e.message))batchStop=true;}
   delete job.pending;job.results.push(result);await persist();
  }
  job.status=batchStop?'stopped':'completed';job.message=batchStop?'Dihentikan. Semak rekod terakhir.':'Proses selesai. Semak peratus disahkan dan rekod dilangkau.';
 }catch(e){job.status='error';job.message=e.message;}
 finally{job.running=false;running=false;await persist();}
}
