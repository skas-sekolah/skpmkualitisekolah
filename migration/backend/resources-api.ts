import {rosterActive,stages} from './scoring.ts';
import {achievementCommand,achievementView,type AchievementStore} from './achievement-api.ts';
import {effectiveAchievementPSS,emptyAchievementRecord} from './achievement-model.ts';
import {isPGB,mayWrite,text,assignmentPeople,admin,audit,fail,now,assignmentIdentity,assignedTo,eligiblePPSAssignee,type Row,type SchoolDoc} from './domain.ts';
import {ASPECTS,validYear} from './strength-model.ts';
import {MANAGEMENT_UNITS} from './management-model.ts';
import {strengthCommand,strengthView} from './strength-api.ts';
import {managementCommand,managementView} from './management-api.ts';
import {inspectSchoolChoices,evidenceModules,evidenceModuleLabels,evidenceFolder,uploadConnectionReady,type DriveSettings,type AchievementPSS,type EvidenceModule} from './resources-model.ts';
export type Resources={scriptSecret?:string;pdpcConfirmations?:Record<string,{signature:string;by:string;at:string}>;lists?:Record<string,{revision:number;classes:string[];subjects:string[]}>;settings?:DriveSettings;folders?:Record<string,string>;counters?:Record<string,number>;reservations?:Row[];pss?:Record<string,{revision:number;rows:AchievementPSS[]}>};
export type ResourcesStore=SchoolDoc&{resources?:Resources};
const defaults=():DriveSettings=>({revision:0,folderUrl:'',moduleFolders:{},clientId:'',apiKey:'',projectNumber:'',updatedAt:null});
const str=(v:unknown,max=200)=>{if(typeof v!=='string'||v.length>max)fail('Teks tidak sah atau terlalu panjang.');return (v as string).trim();};
export function folderId(value:string){if(!value)return '';let u:URL;try{u=new URL(value);}catch{fail('Gunakan pautan folder Google Drive yang lengkap.');}if(u!.protocol!=='https:'||u!.hostname!=='drive.google.com'||u!.username||u!.password)fail('Gunakan pautan folder Google Drive yang sah.');const id=u!.pathname.match(/\/folders\/([a-zA-Z0-9_-]{10,})/)?.[1];if(!id)fail('Pautan mesti menuju ke folder Google Drive.');return id!;}
function active(d:SchoolDoc,m:Row){if(!d.members.some(p=>p.id===m.id&&p.active===1))fail('Akses akaun tidak aktif.',403);}
function pdpcStatus(d:SchoolDoc,year:number){const rows=d.assessments.filter(a=>a.year===year&&d.teachers.some(t=>t.id===a.teacherId&&rosterActive(t,year))&&stages.includes(a.stage)),expected=d.teachers.filter(t=>rosterActive(t,year)).length*stages.length,signature=JSON.stringify(rows.map(a=>[a.id,a.revision,a.status]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))),complete=expected>0&&rows.length===expected&&rows.every(a=>d.pdpc?.version===2?['submitted','verified'].includes(a.status):a.status==='submitted'),confirmation=(d as ResourcesStore).resources?.pdpcConfirmations?.[String(year)];return {status:complete&&(d.pdpc?.version===2?rows.every(a=>a.status==='verified'):confirmation?.signature===signature)?'verified':complete?'submitted':rows.length?'draft':'empty',count:rows.filter(a=>['submitted','verified'].includes(a.status)).length,expected,signature};}
export function resourcesView(d:SchoolDoc,m:Row,year:number){active(d,m);if(!validYear(year))fail('Tahun tidak sah.');const r=(d as ResourcesStore).resources;return {staff:m.role==='admin'?structuredClone(d.staff??[]):undefined,people:assignmentPeople(d,year),isPGB:isPGB(d,m),standard4:pdpcStatus(d,year),lists:structuredClone(r?.lists?.[String(year)]??{revision:0,classes:[],subjects:[]}),settings:structuredClone({...defaults(),...r?.settings,scriptConfigured:!!r?.scriptSecret}),pss: m.role==='admin'?structuredClone(r?.pss?.[String(year)]??{revision:0,rows:[]}):undefined,year};}
function checkPdpcUpload(d:SchoolDoc,m:Row,teacherId:string,stage:unknown,year:number,epoch:unknown){
 const teacher=d.teachers.find(t=>t.id===teacherId);if(!teacher||!stages.includes(stage as typeof stages[number])||!mayWrite(d,m,teacher,String(stage),year))fail('Anda tidak ditugaskan untuk memuat naik evidens penilaian ini.',403);
 if(d.pdpc?.version===2&&epoch!==d.pdpc.epoch)fail('Penilaian lama telah direset. Muat semula dahulu.',409);
 if(d.assessments.some(a=>a.teacherId===teacherId&&a.stage===stage&&a.year===year&&a.status!=='draft'))fail('Penilaian telah dihantar dan dikunci.',409);
}
export function resourcesCommand(d:SchoolDoc,m:Row,b:Row){
 active(d,m);if(!validYear(b.year))fail('Tahun tidak sah.');const store=d as ResourcesStore;
 if(b.action==='script-key'){
  admin(m);store.resources??={};store.resources.scriptSecret=crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');
  audit(d,m,'apps_script_key_rotated',d.school.id,null,{configured:true});return {key:store.resources.scriptSecret,schoolCode:d.school.code};
 }
 if(b.action==='staff-import'){
  admin(m);if(!Array.isArray(b.rows)||!b.rows.length||b.rows.length>200)fail('Masukkan antara 1 hingga 200 AKP.');
  const clean=b.rows.map((r:Row)=>({name:text(r.name),position:text(r.position||'AKP',2,180)})),key=(s:string)=>s.trim().toLocaleUpperCase().replace(/\s+/g,' ');
  if(new Set(clean.map((r:Row)=>key(r.name))).size!==clean.length)fail('Nama AKP berulang.');
  const next=structuredClone(d.staff??[]);for(const r of clean){const old=next.find(s=>key(s.name)===key(r.name));if(old)Object.assign(old,r);else next.push({id:crypto.randomUUID(),...r});}
  if(next.length>200)fail('Maksimum 200 AKP sekolah.');d.staff=next;d.rosterRevision=(d.rosterRevision??0)+1;audit(d,m,'staff_imported',d.school.id,null,{count:clean.length});return resourcesView(d,m,b.year);
 }
 if(b.action==='pps-assignments'){
  admin(m);if(!Array.isArray(b.groups)||!b.groups.length||b.groups.length>2||new Set(b.groups.map((g:Row)=>g.module)).size!==b.groups.length||b.groups.some((g:Row)=>!['management','achievement'].includes(g.module)))fail('Kumpulan PPS tidak sah.');
  const copy=structuredClone(d);for(const g of b.groups)resourcesCommand(copy,m,{action:'assign-all',module:g.module,year:b.year,rows:g.rows});
  (d as Row).management=(copy as Row).management;(d as Row).achievement=(copy as Row).achievement;store.resources??={};store.resources.pss=(copy as ResourcesStore).resources?.pss;d.audit=copy.audit;
  audit(d,m,'pps_assignments_confirmed',String(b.year),null,{count:b.groups.reduce((n:number,g:Row)=>n+g.rows.length,0)});return {ok:true};
 }
 if(b.action==='verify-standard4'){
  if(d.pdpc?.version===2)fail('Standard 4 disahkan melalui pegawai penyemak bagi setiap penilaian.',409);
  if(!isPGB(d,m))fail('Hanya PGB boleh mengesahkan Standard 4.',403);const state=pdpcStatus(d,b.year);if(state.status!=='submitted')fail('Lengkapkan dan hantar semua penilaian sebelum pengesahan Standard 4.',409);if(b.signature!==state.signature)fail('Penilaian berubah. Muat semula dahulu.',409);
  store.resources??={};store.resources.pdpcConfirmations??={};store.resources.pdpcConfirmations[String(b.year)]={signature:state.signature,by:m.id,at:now()};audit(d,m,'pdpc_verify_standard',String(b.year),null,{count:state.count});return resourcesView(d,m,b.year);
 }
 if(b.action==='lists'){
  admin(m);const old=store.resources?.lists?.[String(b.year)]??{revision:0,classes:[],subjects:[]};if(b.revision!==old.revision)fail('Senarai telah berubah. Muat semula dahulu.',409);
  const clean=(v:unknown,label:string)=>{if(!Array.isArray(v)||v.length>200)fail('Maksimum 200 pilihan.');if(v.some(x=>typeof x!=='string'||!x.trim()))fail('Nama kosong atau tidak sah.');const result=inspectSchoolChoices(v,label);if(result.errors.length)fail(result.errors[0]);if(result.duplicates.length)fail(label+' berulang: '+result.duplicates.join(', '));return result.names;};
  const next={revision:old.revision+1,classes:clean(b.classes,'Kelas'),subjects:clean(b.subjects,'Mata pelajaran')};store.resources??={};store.resources.lists??={};store.resources.lists[String(b.year)]=next;audit(d,m,'school_lists',String(b.year),old,next);return resourcesView(d,m,b.year);
 }
 if(b.action==='settings'){
  admin(m);const old=store.resources?.settings??defaults();if(b.revision!==old.revision)fail('Tetapan telah berubah. Muat semula dahulu.',409);
  const folderUrl=str(b.settings?.folderUrl??'',500),clientId=str(b.settings?.clientId??''),apiKey=str(b.settings?.apiKey??''),projectNumber=str(b.settings?.projectNumber??'',30);folderId(folderUrl);
  if(clientId&&!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId))fail('Google OAuth Client ID tidak sah.');if(apiKey&&!/^[a-zA-Z0-9_-]{20,100}$/.test(apiKey))fail('Google Picker API key tidak sah.');if(projectNumber&&!/^\d{6,25}$/.test(projectNumber))fail('Nombor projek Google tidak sah.');
  const raw=b.settings?.moduleFolders??old.moduleFolders??{};if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!evidenceModules.includes(k as EvidenceModule)))fail('Kategori folder evidens tidak sah.');
  const moduleFolders:Partial<Record<EvidenceModule,string>>={};for(const module of evidenceModules){const url=str(raw[module]??'',500);folderId(url);moduleFolders[module]=url;}
  const uploadMethod=b.settings?.uploadMethod??old.uploadMethod??'google',scriptUrl=str(b.settings?.scriptUrl??old.scriptUrl??'',500);if(!['google','apps-script'].includes(uploadMethod))fail('Kaedah muat naik tidak sah.');if(scriptUrl&&!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]{10,}\/exec$/.test(scriptUrl))fail('Gunakan URL deployment Apps Script yang berakhir dengan /exec.');
  const next={folderUrl,moduleFolders,clientId,apiKey,projectNumber,uploadMethod,scriptUrl,revision:old.revision+1,updatedAt:now()};store.resources??={};store.resources.settings=next;audit(d,m,'evidence_settings',d.school.id,{revision:old.revision,folderUrl:old.folderUrl,moduleFolders:old.moduleFolders??{}},{revision:next.revision,folderUrl,moduleFolders});return resourcesView(d,m,b.year);
 }
 if(b.action==='assign-all'){
  admin(m);if(!['strength','management','achievement'].includes(b.module)||!Array.isArray(b.rows)||b.rows.length<1||b.rows.length>42)fail('Senarai tugasan tidak sah.');
  const ids=new Set();for(const row of b.rows){if(ids.has(row.aspect))fail('Aspek berulang.');ids.add(row.aspect);}
  // Validate against a private copy first: a single invalid or stale row leaves every assignment unchanged.
  const copy=structuredClone(d);for(const row of b.rows){const cmd={...row,action:'assign',year:b.year};if(b.module==='strength')strengthCommand(copy,m,cmd);else if(b.module==='management')managementCommand(copy,m,cmd);else achievementCommand(copy,m,cmd);}
  if(b.module==='strength')(d as Row).strength=(copy as Row).strength;else if(b.module==='management')(d as Row).management=(copy as Row).management;else{(d as Row).achievement=(copy as Row).achievement;store.resources??={};store.resources.pss=(copy as ResourcesStore).resources?.pss;}d.audit=copy.audit;
  audit(d,m,'assignments_confirmed',b.module+':'+b.year,null,{aspects:[...ids]});return {ok:true,count:b.rows.length};
 }
 if(b.action==='pss'){
  admin(m);const old=store.resources?.pss?.[String(b.year)]??{revision:0,rows:[]};if(b.revision!==old.revision)fail('Senarai PPS telah berubah. Muat semula dahulu.',409);if(!Array.isArray(b.rows)||b.rows.length>100)fail('Maksimum 100 penugasan PPS.');const ids=new Set(),codes=new Set();
  const rows=b.rows.map((r:Row)=>{const id=str(r.id,80),standard=str(r.standard,40),title=str(r.title,200);if(!id||ids.has(id)||codes.has(standard)||!/^5(?:\.\d{1,2}){0,3}$/.test(standard)||!title)fail('Lengkapkan kod Standard 5, tajuk dan elakkan pendua.');ids.add(id);codes.add(standard);if(!Array.isArray(r.memberIds)||r.memberIds.length>50||new Set(r.memberIds.map((id:string)=>typeof id==='string'?assignmentIdentity(d,id):id)).size!==r.memberIds.length||r.memberIds.some((id:unknown)=>!eligiblePPSAssignee(d,id,b.year)))fail('Pilih PPS daripada senarai guru dan AKP sekolah.');return {id,standard,title,memberIds:r.memberIds};});
  const changed=achievementView(d,m,b.year).records.filter(r=>JSON.stringify([...r.pssIds].sort())!==JSON.stringify(effectiveAchievementPSS(rows,r.aspect).sort()));
  for(const r of changed){if(['submitted','verified'].includes(r.status))fail('Buka semula borang '+r.aspect+' sebelum menukar PPS.',409);}
  for(const r of changed){const a=d as AchievementStore;a.achievement??={};a.achievement[String(b.year)]??={};const oldRecord=a.achievement[String(b.year)][r.aspect]??emptyAchievementRecord(r.aspect,b.year);a.achievement[String(b.year)][r.aspect]={...oldRecord,revision:oldRecord.revision+1,updatedAt:now(),updatedBy:m.id};}
  store.resources??={};store.resources.pss??={};store.resources.pss[String(b.year)]={revision:old.revision+1,rows};audit(d,m,'pss_achievement',String(b.year),old,{revision:old.revision+1,rows});return resourcesView(d,m,b.year);
 }
 if(b.action==='folder-id'){
  const reservation=store.resources?.reservations?.find(r=>r.id===b.uploadId&&r.actorId===m.id&&r.year===b.year);if(!reservation)fail('Sesi muat naik tidak ditemui. Cuba semula.',403);
  if(reservation.root!==folderId(evidenceFolder(store.resources?.settings??defaults(),reservation.module))||!!reservation.moduleRoot!==!!store.resources?.settings?.moduleFolders?.[reservation.module as EvidenceModule])fail('Folder sekolah telah berubah. Cuba muat naik semula.',409);
  if(reservation.module==='standard4')checkPdpcUpload(d,m,reservation.aspect,reservation.stage,b.year,reservation.epoch);
  const candidate=str(b.candidate,160),level=b.level;if(!/^[a-zA-Z0-9_-]{10,160}$/.test(candidate)||!['module','year','aspect'].includes(level))fail('Folder muat naik tidak sah.');
  const base=reservation.root+':'+reservation.module+(reservation.moduleRoot?':direct':''),key=base+(level==='module'?'':':'+reservation.year)+(level==='aspect'?':'+reservation.aspect:'');store.resources!.folders??={};const folders=store.resources!.folders;
  if(reservation.moduleRoot&&level==='module')fail('Folder kategori sudah ditetapkan.');
  const parent=level==='module'?reservation.root:level==='year'?(reservation.moduleRoot?reservation.root:folders[base]):folders[base+':'+reservation.year];if(!parent)fail('Sediakan folder induk dahulu.',409);
  folders[key]??=candidate;const names:Record<string,string>=evidenceModuleLabels;return {id:folders[key],parent,name:level==='module'?names[reservation.module]:level==='year'?String(reservation.year):reservation.aspect};
 }
 if(b.action==='reserve-upload'){
  const module=b.module as EvidenceModule,aspect=str(b.aspect,80),action=str(b.actionId??'',10).toLowerCase();if(!evidenceModules.includes(module))fail('Modul evidens tidak sah.');
  if(module==='strength'){if(!ASPECTS.some(a=>a.id===aspect)||action)fail('Aspek tidak sah.');const r=strengthView(d,m,b.year).records.find(r=>r.aspect===aspect);if(!r?.canEdit)fail('Anda tidak boleh memuat naik evidens aspek ini.',403);}
  if(module==='management'){const unit=MANAGEMENT_UNITS.find(u=>u.id===aspect),r=managementView(d,m,b.year).records.find(r=>r.aspect===aspect);if(!unit||action&&!unit.actions.some(a=>a.id===action))fail('Tindakan tidak sah.');if(!r?.canEdit)fail('Anda tidak boleh memuat naik evidens standard ini.',403);}
  if(module==='achievement'){const r=achievementView(d,m,b.year).records.find(r=>r.aspect===aspect);if(action)fail('Medan tindakan tidak digunakan bagi Standard 5.');if(!r?.canEdit)fail('Anda tidak boleh memuat naik evidens Standard 5 ini.',403);}
  if(module==='standard4'){if(action)fail('Tindakan tidak digunakan bagi pencerapan.');checkPdpcUpload(d,m,aspect,b.stage,b.year,b.epoch);}
  const settings=store.resources?.settings??defaults(),root=folderId(evidenceFolder(settings,module));if(!root||!uploadConnectionReady({...settings,scriptConfigured:!!store.resources?.scriptSecret}))fail('Admin perlu melengkapkan tetapan Google Drive dahulu.',409);
  const ext=str(b.extension,10).toLowerCase();if(!['pdf','jpg','jpeg','png','webp','doc','docx','xls','xlsx','ppt','pptx','txt','csv','odt','ods','odp'].includes(ext))fail('Jenis fail tidak disokong.');if(!Number.isInteger(b.size)||b.size<1||b.size>20*1024*1024)fail('Saiz fail mestilah 1 bait hingga 20 MB.');
  store.resources??={};store.resources.counters??={};const code=module==='standard4'?'4.'+aspect+'.'+b.stage:aspect+(action?'.'+action.toUpperCase():''),key=[b.year,module,code].join(':'),n=(store.resources.counters[key]??0)+1;store.resources.counters[key]=n;
  const name=module==='strength'?aspect+'-'+String(n).padStart(3,'0')+'.'+ext:code+'('+n+').'+ext;
  const upload={id:crypto.randomUUID(),actorId:m.id,year:b.year,module,aspect,action,name,size:b.size,root,moduleRoot:!!settings.moduleFolders?.[module],...(module==='standard4'?{stage:b.stage,epoch:b.epoch}:{}),createdAt:now()};
  store.resources.reservations=[...(store.resources.reservations??[]).filter(r=>Date.parse(r.createdAt)>Date.now()-86400000),upload].slice(-500);
  audit(d,m,'evidence_upload_reserved',upload.id,null,{module,aspect,action,name,size:b.size});return {upload,settings:resourcesView(d,m,b.year).settings};
 }
 fail('Tindakan tetapan tidak sah.');
}
