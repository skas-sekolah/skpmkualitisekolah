import {fail,type SchoolDoc,type Row} from './domain.ts';
import {resourcesView,resourcesCommand,folderId,type ResourcesStore} from './resources-api.ts';
import {evidenceFolder,scriptConnectionReady} from './resources-model.ts';

export const SCRIPT_MAX_BYTES=5*1024*1024;
const encoder=new TextEncoder();
export async function signScript(payload:string,key:string){
 const k=await crypto.subtle.importKey('raw',encoder.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,encoder.encode(payload)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function validEndpoint(url:string,redirect=false){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port||(!redirect?u.hostname!=='script.google.com'||!/^\/macros\/s\/[a-zA-Z0-9_-]{10,}\/exec$/.test(u.pathname):u.hostname!=='script.googleusercontent.com'))fail('URL Apps Script tidak sah.',400);return u;}
export async function sendScript(url:string,key:string,data:Row,transport:typeof fetch=fetch){
 validEndpoint(url);const payload=JSON.stringify({...data,timestamp:Date.now()}),signature=await signScript(payload,key);
 let response=await transport(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,signature}),redirect:'manual',signal:AbortSignal.timeout(120000)});
 if([301,302,303].includes(response.status)){const location=response.headers.get('location');if(!location)fail('Apps Script tidak memberikan hasil.',502);validEndpoint(location,true);response=await transport(location,{redirect:'error',signal:AbortSignal.timeout(30000)});}
 if(!response.ok)fail('Apps Script belum dapat dicapai. Semak deployment dan kebenaran pemilik.',502);
 let result:Row;try{result=await response.json();}catch{fail('Deployment Apps Script belum sedia. Pastikan URL /exec dan akses permintaan pelayan dibenarkan.',502);}
 if(!result!.ok)fail(typeof result!.error==='string'?result!.error.slice(0,300):'Muat naik Apps Script gagal.',502);return result!;
}
export async function scriptUpload(d:SchoolDoc,m:Row,b:Row,transport:typeof fetch=fetch){
 // requireUser has already authenticated the school session; never trust browser folder IDs or filenames.
 const store=d as ResourcesStore,settings=resourcesView(d,m,b.year).settings,key=store.resources?.scriptSecret;
 if(!key||!scriptConnectionReady(settings))fail('Sambungan Apps Script sekolah belum lengkap.',409);
 if(b.action==='script-test'){
  if(m.role!=='admin')fail('Hanya Admin boleh menguji sambungan sekolah.',403);
  return sendScript(settings.scriptUrl!,key,{operation:'test',schoolCode:d.school.code,roots:Object.fromEntries(['strength','management','achievement','standard4'].map(module=>[module,folderId(evidenceFolder(settings,module as any))]))},transport);
 }
 const ticket=store.resources?.reservations?.find(r=>r.id===b.uploadId&&r.actorId===m.id&&r.year===b.year);
 if(!ticket||Date.now()-Date.parse(ticket.createdAt)>15*60000)fail('Sesi muat naik tamat. Pilih fail semula.',409);
 if(ticket.completed)return {name:ticket.name,url:ticket.url};
 if(ticket.root!==folderId(evidenceFolder(settings,ticket.module)))fail('Folder sekolah berubah. Pilih fail semula.',409);
 // Re-run permission checks against the latest document, without changing counters or assignments.
 resourcesCommand(structuredClone(d),m,{action:'reserve-upload',year:b.year,module:ticket.module,aspect:ticket.aspect,actionId:ticket.action,stage:ticket.stage,epoch:ticket.epoch,extension:ticket.name.split('.').pop(),size:ticket.size});
 if(ticket.size>SCRIPT_MAX_BYTES)fail('Apps Script menyokong fail sehingga 5 MB bagi setiap muat naik.');
 if(typeof b.base64!=='string'||b.base64.length>Math.ceil(SCRIPT_MAX_BYTES/3)*4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.base64))fail('Kandungan fail tidak sah.');
 const bytes=atob(b.base64);if(bytes.length!==ticket.size)fail('Saiz kandungan fail tidak sepadan.');
 const result=await sendScript(settings.scriptUrl!,key,{operation:'upload',schoolCode:d.school.code,uploadId:ticket.id,root:ticket.root,module:ticket.module,moduleRoot:ticket.moduleRoot,year:ticket.year,aspect:ticket.aspect,name:ticket.name,size:ticket.size,base64:b.base64},transport);
 if(typeof result.fileId!=='string'||!/^[a-zA-Z0-9_-]{10,160}$/.test(result.fileId)||result.name!==ticket.name)fail('Hasil fail Apps Script tidak sah.',502);
 ticket.completed=true;ticket.url='https://drive.google.com/file/d/'+result.fileId+'/view';
 return {name:ticket.name,url:ticket.url};
}
