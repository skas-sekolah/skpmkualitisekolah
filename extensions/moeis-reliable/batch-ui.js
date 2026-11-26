const $=id=>document.getElementById(id);let pack;
const labels={'empty-skipped':'Tiada skor / dilangkau','already-matched':'Sudah sepadan pada pelayan','server-confirmed':'Disahkan tersimpan','problem-skipped':'Bermasalah / dilangkau',ready:'Sedia untuk diisi'};
async function show(){
 const {reliableBatch:j}=await chrome.storage.local.get('reliableBatch');if(!j)return;
 $('status').textContent=j.message;const s=j.summary;
 $('summary').textContent=s?'Skor disahkan '+s.confirmedScores+'/'+s.sourceScores+' ('+s.percent+'%) · Rekod diproses '+s.processed+'/'+s.totalRecords:'';
 $('meter').value=s?.totalRecords?s.processed/s.totalRecords*100:0;
 $('log').textContent=(j.results||[]).map(r=>r.title+' · '+(labels[r.status]||r.status)+' · '+r.message).join('\n');
 $('start').disabled=!!j.running;for(const id of ['file','part','mode','confirm'])$(id).disabled=!!j.running;
}
$('file').onchange=async()=>{pack=null;try{const f=$('file').files[0];if(!f||f.size>8000000)throw Error('Pilih JSON sumber bawah 8 MB.');const p=ReliableCore.decode(await f.text());
 // Strip evidence, URLs and notes from the package passed into background processing.
 pack={kind:p.kind,schoolCode:p.schoolCode,year:p.year,modules:{management:{records:p.modules.management.records.map(r=>({id:r.id,title:r.title,group:r.group,readOnly:!!r.readOnly,fields:ReliableCore.scores(r).map(f=>({key:f.key,value:f.value,label:f.label||f.name}))}))}}};
 $('status').textContent=pack.schoolCode+' · '+pack.year+' · '+pack.modules.management.records.length+' rekod tersedia';
 }catch(e){$('status').textContent=e.message;}};
$('start').onclick=async()=>{try{
 if(!pack)throw Error('Pilih pakej SKAS_KE_MOEIS…json dahulu.');if($('mode').value==='fill'&&!$('confirm').checked)throw Error('Tandakan pengesahan sebelum pengisian.');
 const {reliableBatchTab:tabId}=await chrome.storage.session.get('reliableBatchTab');if(!tabId)throw Error('Buka mod berkelompok melalui popup pada tab MOEIS.');
 const selected=JSON.parse(JSON.stringify(pack));if($('part').value!=='all')selected.modules.management.records=selected.modules.management.records.filter(r=>r.group===$('part').value);
 if(!selected.modules.management.records.length)throw Error('Tiada rekod dalam bahagian pilihan.');
 $('start').disabled=true;const r=await chrome.runtime.sendMessage({type:'bulk-start',tabId,pack:selected,mode:$('mode').value});if(!r.ok)throw Error(r.error);
 }catch(e){$('status').textContent=e.message;$('start').disabled=false;}};
$('stop').onclick=async()=>{await chrome.runtime.sendMessage({type:'bulk-stop'});$('status').textContent='Menunggu rekod / carian semasa selesai…';};
$('report').onclick=async()=>{const {reliableBatch:j}=await chrome.storage.local.get('reliableBatch'),url=URL.createObjectURL(new Blob([JSON.stringify({version:'0.8.2',batch:j||null},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SKAS-laporan-berkelompok.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
chrome.storage.onChanged.addListener(()=>void show());void show();
