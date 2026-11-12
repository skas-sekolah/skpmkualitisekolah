import assert from 'node:assert/strict';import vm from 'node:vm';import {createHmac} from 'node:crypto';
import {domain,compile,read,fixture,R} from './achievement-fixtures.mjs';
const resourceMock=compile('export const resourcesView=(...a)=>globalThis.scriptFixtures.view(...a);export const resourcesCommand=(...a)=>globalThis.scriptFixtures.command(...a);export const folderId=s=>s.match(/\\/folders\\/([a-zA-Z0-9_-]+)/)?.[1]||"";');
globalThis.scriptFixtures={view:R.resourcesView,command:R.resourcesCommand};
const model=compile(read('migration/backend/resources-model.ts'));
const API=await import(compile(read('migration/backend/apps-script-upload.ts').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./resources-api.ts'",JSON.stringify(resourceMock)).replace("'./resources-model.ts'",JSON.stringify(model))));
const d=fixture(),admin=d.members[0],other=d.members.find(m=>m.id==='other');
const settings={folderUrl:'',moduleFolders:{management:'https://drive.google.com/drive/folders/ROOT_FOLDER_1234'},clientId:'',apiKey:'',projectNumber:'',uploadMethod:'apps-script',scriptUrl:'https://script.google.com/macros/s/DEPLOYMENT_FIXTURE_1234/exec'};
const key=R.resourcesCommand(d,admin,{action:'script-key',year:2026}).key;assert.equal(key.length,64);R.resourcesCommand(d,admin,{action:'settings',year:2026,revision:0,settings});
assert.ok(!JSON.stringify(R.resourcesView(d,admin,2026)).includes(key));assert.ok(!JSON.stringify(R.resourcesView(d,other,2026)).includes(key));assert.ok(!JSON.stringify(d.audit).includes(key));
assert.throws(()=>R.resourcesCommand(d,other,{action:'script-key',year:2026}),e=>e.status===403);
const reserve=()=>R.resourcesCommand(d,admin,{action:'reserve-upload',year:2026,module:'management',aspect:'1.1.1',actionId:'a',extension:'pdf',size:7}).upload;
const ticket=reserve();assert.equal(ticket.name,'1.1.1.A(1).pdf');let calls=0;
const transport=async(url,init)=>{calls++;assert.equal(new URL(url).hostname,'script.google.com');const envelope=JSON.parse(init.body),p=JSON.parse(envelope.payload);assert.equal(envelope.signature,createHmac('sha256',key).update(envelope.payload).digest('hex'));assert.equal(p.schoolCode,d.school.code);assert.equal(p.root,'ROOT_FOLDER_1234');assert.equal(p.name,ticket.name);assert.equal(p.base64,Buffer.from('fixture').toString('base64'));return Response.json({ok:true,fileId:'FILE_FIXTURE_1234',name:p.name});};
const b={action:'script-upload',year:2026,uploadId:ticket.id,base64:Buffer.from('fixture').toString('base64')};
await assert.rejects(()=>API.scriptUpload(d,other,b,transport),e=>e.status===409);assert.equal(calls,0);
const otherSchool=fixture();otherSchool.resources=structuredClone(d.resources);otherSchool.resources.reservations=[];await assert.rejects(()=>API.scriptUpload(otherSchool,admin,b,transport),e=>e.status===409);
await assert.rejects(()=>API.scriptUpload(d,admin,{...b,base64:'bad!'},transport),e=>e.status===400);assert.equal(calls,0);
const saved=await API.scriptUpload(d,admin,b,transport);assert.equal(saved.url,'https://drive.google.com/file/d/FILE_FIXTURE_1234/view');await API.scriptUpload(d,admin,b,transport);assert.equal(calls,1,'Completed tickets are idempotent');
const locked=reserve();d.management={2026:{'1.1.1':{aspect:'1.1.1',year:2026,status:'submitted',revision:1,data:{scores:{},evidence:[],notes:''}}}};await assert.rejects(()=>API.scriptUpload(d,admin,{...b,uploadId:locked.id},transport),e=>e.status===403);assert.equal(calls,1);
await assert.rejects(()=>API.sendScript('https://evil.test/',key,{},transport));
await assert.rejects(()=>API.sendScript(settings.scriptUrl,key,{},async()=>new Response(null,{status:302,headers:{location:'http://169.254.169.254/'}})));
console.log('PASS signed Apps Script proxy: school/actor isolation, live permissions, revoked/locked records, private key redaction, signed canonical names and roots, malformed payloads, idempotent retries and SSRF restrictions.');
// Run the actual published Apps Script template under a mock Google environment.
const roots={management:'ROOT_FOLDER_1234'},folders=new Map(),files=[];
function folder(name){return {getName:()=>name,getFoldersByName:n=>iterator(folders.has(name+'/'+n)?[folders.get(name+'/'+n)]:[]),createFolder:n=>{const f=folder(name+'/'+n);folders.set(name+'/'+n,f);return f;},getFilesByName:n=>iterator(files.filter(f=>f.folder===name&&f.getName()===n)),createFile:blob=>{const f={folder:name,getId:()=>'SAVED_SCRIPT_FILE_123',getName:()=>blob.name,getDescription:()=>f.description,setDescription:v=>{f.description=v;}};files.push(f);return f;}};}
function iterator(a){let i=0;return {hasNext:()=>i<a.length,next:()=>a[i++]};}
const root=folder('root');const sandbox={Utilities:{Charset:{UTF_8:'UTF-8'},computeHmacSha256Signature:(p,k)=>[...createHmac('sha256',k).update(p).digest()],base64Decode:v=>[...Buffer.from(v,'base64')],newBlob:(bytes,type,name)=>({bytes,type,name})},DriveApp:{getFolderById:id=>{assert.equal(id,roots.management);return root;}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})},Date,JSON,Number,Math,Object,Error,String};
vm.createContext(sandbox);vm.runInContext(read('public/templates/SKAS_Evidens.gs').replace(/const SKAS_CONFIG = .*?;/,()=> 'const SKAS_CONFIG = '+JSON.stringify({schoolCode:'UJI',secret:key,roots})+';'),sandbox);
const request=p=>{const payload=JSON.stringify({timestamp:Date.now(),schoolCode:'UJI',...p});return JSON.parse(sandbox.doPost({postData:{contents:JSON.stringify({payload,signature:createHmac('sha256',key).update(payload).digest('hex')})}}));};
const p={operation:'upload',uploadId:ticket.id,root:roots.management,module:'management',moduleRoot:true,year:2026,aspect:'1.1.1',name:ticket.name,size:7,base64:Buffer.from('fixture').toString('base64')};
assert.equal(request(p).ok,true);assert.equal(request(p).ok,true);assert.equal(files.length,1,'Replay does not create duplicate files');assert.equal(files[0].folder,'root/UJI/2026/1.1.1');
assert.equal(request({...p,schoolCode:'OTHER'}).ok,false);assert.equal(request({...p,root:'OTHER_FOLDER'}).ok,false);assert.equal(request({...p,timestamp:0}).ok,false);assert.equal(request({...p,size:6000000}).ok,false);
assert.equal(JSON.parse(sandbox.doPost({postData:{contents:JSON.stringify({payload:'{}',signature:'0'.repeat(64)})}})).ok,false);
assert.equal(files.length,1);console.log('PASS actual Apps Script: rejects forged/stale/foreign/oversized requests, isolates folders by school/year/aspect, assigns canonical filename, deduplicates upload retries and never changes sharing. Mock Google transport; live owner authorization still required.');
