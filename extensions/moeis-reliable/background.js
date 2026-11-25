importScripts('core.js');
let running=false;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function call(ctx,action,arg){await chrome.scripting.executeScript({target:{tabId:ctx.tabId},files:['core.js','page.js']});const [r]=await chrome.scripting.executeScript({target:{tabId:ctx.tabId},func:async(action,ctx,arg)=>{try{return {ok:true,data:await ReliablePage[action](ctx,arg)};}catch(e){return {ok:false,error:e.message};}},args:[action,ctx,arg]});if(!r?.result?.ok)throw Error(r?.result?.error||'Halaman tidak dapat dibaca.');return r.result.data;}
async function put(job,message,status){Object.assign(job,{message,status,updatedAt:new Date().toISOString()});await chrome.storage.local.set({reliableJob:job});}
async function run(ctx,expected){
 const job={running:true,recordId:ctx.record.id,title:ctx.record.title,url:ctx.url,scoreCount:expected.fields.length,confirmedScores:0};
 try{
  await put(job,'Menghantar Simpan sekali…','submitting');
  try{await call(ctx,'apply',expected);}catch(e){if(!/frame.*removed|context.*invalidated|message port closed/i.test(e.message))throw e;}
  await put(job,'Simpan dicuba. Sedang membaca semula respons pelayan…','verifying');
  let last='';
  for(let i=0;i<10;i++){await delay(1500);try{const data=await call(ctx,'verify',expected);if(data.ok){job.confirmedScores=expected.fields.length;await put(job,'Disahkan pada respons pelayan: '+job.confirmedScores+' skor. Semak juga melalui menu MOEIS.','server-confirmed');return;}last='Skor respons pelayan belum sepadan.';}catch(e){last=e.message;}}
  throw Error('Simpanan TIDAK disahkan. '+last+' Tiada penghantaran semula automatik.');
 }catch(e){await put(job,e.message,'unconfirmed');}
 finally{running=false;job.running=false;await chrome.storage.local.set({reliableJob:job});}
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(sender.id!==chrome.runtime.id)return;
 if(m.type==='inspect'){call(m.ctx,'inspect').then(data=>reply({ok:true,data}),e=>reply({ok:false,error:e.message}));return true;}
 if(m.type==='start'){if(running){reply({ok:false,error:'Proses masih berjalan.'});return;}running=true;void run(m.ctx,m.expected);reply({ok:true});}
});
chrome.runtime.onStartup.addListener(async()=>{const {reliableJob:j}=await chrome.storage.local.get('reliableJob');if(j?.running){j.running=false;j.status='unconfirmed';j.message='Pelayar dimulakan semula. Simpanan belum disahkan; semak MOEIS sebelum mengulang.';await chrome.storage.local.set({reliableJob:j});}});