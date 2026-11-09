import {calculate,observationOfficer,normalized,stages,rosterActive,cleanWargaRosterRow,type Assessment,type TeacherType} from './scoring.ts';
export type Row=Record<string,any>;
export type SchoolDoc={rosterRevision?:number;school:Row;staff?:Row[];teachers:Row[];assessments:Row[];members:Row[];invitations:Row[];imports:Row[];audit:Row[];sessions:Row[];pdpc?:{version:number;epoch:string;revision:number;assignments:Record<string,Row[]>;resetAt?:string}};
export class ApiError extends Error {constructor(message:string,public status=400,public details:Row={}){super(message);}}
export function fail(s:string,status=400,details:Row={}):never{throw new ApiError(s,status,details);}
export const now=()=>new Date().toISOString();
// Activate only schools that have no existing assessment workflow to migrate.
// Existing configurations and legacy marks must never be reset by a login.
export function initializePdpc(d:SchoolDoc){
 if(d.pdpc||d.assessments.length)return false;
 d.pdpc={version:2,epoch:crypto.randomUUID(),revision:0,assignments:{}};
 return true;
}
export function text(s:unknown,min=3,max=180){if(typeof s!=='string'||s.trim().length<min||s.trim().length>max)fail('Semak maklumat yang dimasukkan.');return (s as string).trim().replace(/\s+/g,' ');}
export function code(s:unknown){const c=text(s,3,16).toUpperCase();if(!/^[A-Z0-9][A-Z0-9-]{2,15}$/.test(c))fail('Kod sekolah tidak sah.');return c;}
export function username(s:unknown){const u=text(s,3,32).toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(u))fail('ID pengguna tidak sah.');return u;}
export function password(s:unknown){if(typeof s!=='string'||s.length<10||s.length>128)fail('Kata laluan mestilah 10–128 aksara.');return s as string;}
export const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');}
export function actor(d:SchoolDoc,uid:string,sidHash:string){const m=d.members.find(m=>m.authUserId===uid&&m.active===1),s=d.sessions.find(s=>s.hash===sidHash&&s.expiresAt>now());if(!m||s?.memberId!==m.id)fail('Sesi telah tamat atau akses telah dinyahaktifkan. Log masuk semula.',401);return m;}
export function session(d:SchoolDoc,m:Row){return {memberId:m.id,schoolId:d.school.id,schoolCode:d.school.code,schoolName:d.school.name,username:m.username,displayName:m.displayName,isAdmin:m.role==='admin',isSchoolLeader:schoolLeader(own(d,m)?.position),teacherId:m.teacherId,staffId:m.staffId??null,legacyOwner:false};}
export const admin=(m:Row)=>{if(m.role!=='admin')fail('Tindakan ini hanya untuk Admin.',403);};
export const own=(d:SchoolDoc,m:Row)=>d.teachers.find(t=>t.id===m.teacherId);
// Teacher references allow planning before account activation. Access is resolved
// from the current account-to-teacher link, never from a matching display name.
export const schoolLeader=(position:unknown)=>typeof position==='string'&&/^(GURU BESAR|PENGETUA|PK(?:\s|$)|GPK(?:\s|$)|(?:GURU )?PENOLONG KANAN(?:\s|$))/.test(position.trim().toUpperCase().replace(/\s+/g,' '));
export function assignedMember(d:SchoolDoc,id:unknown):Row|undefined{
 if(typeof id!=='string')return undefined;
 if(id.startsWith('staff:')){const staffId=id.slice(6);if(!(d.staff??[]).some(s=>s.id===staffId))return undefined;const matches=d.members.filter(m=>m.staffId===staffId&&m.active===1);return matches.length===1?matches[0]:undefined;}
 if(!id.startsWith('teacher:'))return d.members.find(m=>m.id===id&&m.active===1);
 const teacherId=id.slice(8);if(!d.teachers.some(t=>t.id===teacherId))return undefined;
 const matches=d.members.filter(m=>m.teacherId===teacherId&&m.active===1);return matches.length===1?matches[0]:undefined;
}
export const assignmentIdentity=(d:SchoolDoc,id:string)=>id.startsWith('teacher:')||id.startsWith('staff:')?id:assignedMember(d,id)?.staffId?'staff:'+assignedMember(d,id)!.staffId:assignedMember(d,id)?.teacherId?'teacher:'+assignedMember(d,id)!.teacherId:id;
export const assignedTo=(d:SchoolDoc,id:unknown,memberId:unknown)=>!!memberId&&assignedMember(d,id)?.id===memberId;
export function eligibleScoreAssignee(d:SchoolDoc,id:unknown,leadersOnly=false,year?:number){
 if(typeof id!=='string')return false;
 const member=assignedMember(d,id),teacher=id.startsWith('teacher:')?d.teachers.find(t=>t.id===id.slice(8)):d.teachers.find(t=>t.id===member?.teacherId);
 // Keep existing account-only schools compatible until their teacher roster is prepared.
 return teacher?(rosterActive(teacher,year)&&(!leadersOnly||schoolLeader(teacher.position))):!leadersOnly&&!d.teachers.length&&!!member;
}
export function eligiblePPSAssignee(d:SchoolDoc,id:unknown,year?:number){
 if(typeof id!=='string')return false;
 if(id.startsWith('staff:'))return (d.staff??[]).some(s=>s.id===id.slice(6)&&rosterActive(s,year));
 const member=assignedMember(d,id);return !!member?.staffId&&(d.staff??[]).some(s=>s.id===member.staffId&&rosterActive(s,year))||eligibleScoreAssignee(d,id,false,year);
}
export function eligibleStrengthAssignee(d:SchoolDoc,id:unknown,year?:number){
 if(typeof id!=='string')return false;
 const member=assignedMember(d,id);return eligibleScoreAssignee(d,id,true,year)||(id.startsWith('staff:')?(d.staff??[]).some(s=>s.id===id.slice(6)&&rosterActive(s,year)):!!member?.staffId&&(d.staff??[]).some(s=>s.id===member.staffId&&rosterActive(s,year)));
}
export function eligibleReviewAssignee(d:SchoolDoc,id:unknown,year:number){return eligibleScoreAssignee(d,id,true,year);}
export function assignmentPeople(d:SchoolDoc,year?:number){return [
 ...d.teachers.filter(t=>typeof t.name==='string'&&t.name.trim()).map(t=>({id:'teacher:'+t.id,name:t.name,kind:'teacher' as const,position:t.position||'',schoolLeader:schoolLeader(t.position),inactiveFromYear:t.inactiveFromYear,available:rosterActive(t,year),linked:!!assignedMember(d,'teacher:'+t.id),teacherId:t.id})).sort((a,b)=>a.name.localeCompare(b.name,'ms')),
 ...(d.staff??[]).filter(t=>typeof t.name==='string'&&t.name.trim()).map(t=>({id:'staff:'+t.id,name:t.name,kind:'staff' as const,position:t.position||'',schoolLeader:false,inactiveFromYear:t.inactiveFromYear,available:rosterActive(t,year),linked:!!assignedMember(d,'staff:'+t.id),staffId:t.id,teacherId:null})).sort((a,b)=>a.name.localeCompare(b.name,'ms')),
 ...d.members.filter(m=>m.active===1).map(m=>({id:m.id,name:m.displayName||m.username,kind:'account' as const,position:'',schoolLeader:false,available:rosterActive(d.teachers.find(t=>t.id===m.teacherId)??(d.staff??[]).find(t=>t.id===m.staffId)??{},year),linked:true,staffId:m.staffId??null,teacherId:m.teacherId??null}))
 ];}
export function mayView(d:SchoolDoc,m:Row,t:Row,year?:number){if(d.pdpc?.version===2)return m.role==='admin'||t.id===m.teacherId||Object.entries(d.pdpc.assignments).some(([y,rows])=>(year===undefined||String(year)===y)&&rows.some(r=>r.teacherId===t.id&&[r.observerId,observationOfficer(r,'kedua'),r.reviewerId].some(id=>eligibleScoreAssignee(d,id,true,Number(y))&&assignedTo(d,id,m.id))));const o=own(d,m);return m.role==='admin'||t.id===m.teacherId||!!o&&(normalized(t.pp1)===normalized(o.name)||normalized(t.pp2)===normalized(o.name));}
export function mayWrite(d:SchoolDoc,m:Row,t:Row,stage:string,year?:number){if(!rosterActive(t,year))return false;if(d.pdpc?.version===2){if(!stages.includes(stage as typeof stages[number]))return false;if(stage==='kendiri')return t.id===m.teacherId;return (d.pdpc.assignments[String(year)]??[]).some(r=>r.teacherId===t.id&&eligibleScoreAssignee(d,observationOfficer(r,stage),true,year)&&assignedTo(d,observationOfficer(r,stage),m.id)&&m.teacherId!==t.id);}if(m.role==='admin')return true;if(stage==='kendiri')return t.id===m.teacherId;const o=own(d,m);return !!o&&normalized(stage==='pertama'?t.pp1:t.pp2)===normalized(o.name);}
export function audit(d:SchoolDoc,m:Row,action:string,id:string,before:unknown,after:unknown){d.audit.push({id:crypto.randomUUID(),schoolId:d.school.id,actorId:m.id,action,entityId:id,before:before==null?null:JSON.stringify(before),after:after==null?null:JSON.stringify(after),createdAt:now()});}
function occupiedObservations(d:SchoolDoc){
 const occupied:Record<string,Record<string,string[]>>={};
 function add(year:string,stage:string,teacherId:string){
  const sessions=occupied[year]??={};
  (sessions[stage]??=[]).push(teacherId);
 }
 for(const [year,rows] of Object.entries(d.pdpc?.assignments??{})){
  for(const row of rows)for(const stage of ['pertama','kedua']){
   if(observationOfficer(row,stage))add(year,stage,row.teacherId);
  }
 }
 for(const a of d.assessments){
  if(a.stage!=='kendiri'&&a.status!=='draft')add(String(a.year),a.stage,a.teacherId);
 }
 return occupied;
}
export function getData(d:SchoolDoc,m:Row){const teachers=d.teachers.filter(t=>mayView(d,m,t)),ids=new Set(teachers.map(t=>t.id));return {rosterRevision:d.rosterRevision??0,staff:m.role==='admin'?(d.staff??[]).map(t=>({...t,status:'AKP',type:''})):undefined,teachers:teachers.map(t=>{const copy={...t};if(m.role!=='admin'&&t.id!==m.teacherId)delete copy.ic;return copy;}),assessments:d.assessments.filter(a=>ids.has(a.teacherId)&&mayView(d,m,teachers.find(t=>t.id===a.teacherId)!,a.year)),rosterInfo:[...d.imports].sort((a,b)=>b.importedAt.localeCompare(a.importedAt))[0]??null,session:session(d,m),pdpc:d.pdpc?{...d.pdpc,assignments:Object.fromEntries(Object.entries(d.pdpc.assignments).map(([y,rows])=>[y,rows.filter(r=>ids.has(r.teacherId))])),people:assignmentPeople(d),occupiedObservations:schoolLeader(own(d,m)?.position)?occupiedObservations(d):undefined}:undefined};}
function roster(v:Row){if(!v||!['perdana','khas'].includes(v.type))fail('Kategori guru tidak sah.');const r:Row={name:text(v.name),type:v.type};for(const f of ['pp1','pp2','position','grade','session'])if(v[f]!==undefined){if(typeof v[f]!=='string'||v[f].length>180)fail('Maklumat guru tidak sah.');r[f]=v[f].trim();}if(v.sourceNumber!==undefined){if(!Number.isInteger(v.sourceNumber)||v.sourceNumber<0||v.sourceNumber>10000)fail('Nombor rujukan tidak sah.');r.sourceNumber=v.sourceNumber;}return r;}
function revoke(d:SchoolDoc,ids:string[]){d.sessions=d.sessions.filter(s=>!ids.includes(s.memberId));}
export function dataCommand(d:SchoolDoc,m:Row,b:Row){
 if(b.action==='roster-lifecycle'){
  admin(m);if(b.rosterRevision!==(d.rosterRevision??0))fail('Senarai berubah. Muat semula dahulu.',409);
  if(!['deactivate','reactivate'].includes(b.mode)||!Array.isArray(b.references)||!b.references.length||b.references.length>700||new Set(b.references).size!==b.references.length)fail('Pilih Guru / AKP yang sah.');
  if(b.mode==='deactivate'&&(!Number.isInteger(b.fromYear)||b.fromYear<2020||b.fromYear>2100||typeof b.reason!=='string'||b.reason.trim().length<3||b.reason.length>500))fail('Pilih tahun kuat kuasa dan nyatakan sebab.');
  const targets=b.references.map((ref:unknown)=>{if(typeof ref!=='string')fail('Rujukan tidak sah.');const staff=ref.startsWith('staff:'),teacher=ref.startsWith('teacher:');if(!staff&&!teacher)fail('Rujukan tidak sah.');const row=(staff?d.staff??[]:d.teachers).find(t=>t.id===ref.slice(staff?6:8));if(!row)fail('Nama tidak ditemui.',404);return row;});
  const before=structuredClone(targets);for(const row of targets){if(b.mode==='reactivate'){delete row.inactiveFromYear;delete row.inactiveReason;}else{row.inactiveFromYear=b.fromYear;row.inactiveReason=b.reason.trim();}}
  d.rosterRevision=(d.rosterRevision??0)+1;audit(d,m,'roster_'+b.mode,d.school.id,before,targets);return {updated:targets.length};
 }
 if(b.action==='pdpc-claim-observation'){
  if(!Number.isInteger(b.year)||b.year<2020||b.year>2100||!['pertama','kedua'].includes(b.stage))fail('Tahun atau sesi pencerapan tidak sah.');
  const config=d.pdpc;
  if(!config||config.version!==2||b.revision!==config.revision)fail('Tetapan berubah. Muat semula dahulu.',409);
  if(!eligibleScoreAssignee(d,m.id,true,b.year))fail('Pilihan ini hanya untuk pentadbir sekolah yang aktif.',403);
  if(m.teacherId===b.teacherId||!d.teachers.some(t=>t.id===b.teacherId&&rosterActive(t,b.year)))fail('Pilih guru lain yang aktif dalam tahun pelaporan.');
  const rows=config.assignments[String(b.year)]??[];
  const existing=rows.find(r=>r.teacherId===b.teacherId);
  const current=observationOfficer(existing,b.stage);
  if(assignedTo(d,current,m.id))return {ok:true};
  if(current||d.assessments.some(a=>a.teacherId===b.teacherId&&a.year===b.year&&a.stage===b.stage&&a.status!=='draft'))fail('Sesi ini sudah ditetapkan atau telah dihantar. Hubungi Admin sekolah.',409);
  const next={teacherId:b.teacherId,observerId:existing?.observerId??null,observer2Id:observationOfficer(existing,'kedua'),reviewerId:existing?.reviewerId??null};
  next[b.stage==='pertama'?'observerId':'observer2Id']=m.id;
  config.assignments[String(b.year)]=[...rows.filter(r=>r.teacherId!==b.teacherId),next];
  config.revision++;
  audit(d,m,'pdpc_claim_observation',String(b.year),existing??null,next);
  return {ok:true};
 }
 if(b.action==='pdpc-assignments'){
  admin(m);if(!d.pdpc||d.pdpc.version!==2)fail('Tetapan Standard 4 baharu belum diaktifkan.',409);if(!Number.isInteger(b.year)||b.year<2020||b.year>2100||b.revision!==d.pdpc.revision)fail('Tetapan berubah. Muat semula dahulu.',409);
  if(!Array.isArray(b.rows)||b.rows.length>500)fail('Senarai tugasan tidak sah.');const seen=new Set();const rows=b.rows.map((r:Row)=>{
   if(!d.teachers.some(t=>t.id===r.teacherId&&rosterActive(t,b.year))||seen.has(r.teacherId))fail('Guru tidak sah atau berulang.');seen.add(r.teacherId);
   const old=(d.pdpc!.assignments[String(b.year)]??[]).find(x=>x.teacherId===r.teacherId),observer2Id=r.observer2Id===undefined?(old&&old.observer2Id!==undefined?old.observer2Id:r.observerId):r.observer2Id;
   for(const id of [r.observerId,observer2Id,r.reviewerId]){if(id!==null&&!eligibleScoreAssignee(d,id,true,b.year))fail('Pencerap 1, Pencerap 2 dan penyemak mestilah pentadbir sekolah.');if(id&&assignmentIdentity(d,id)==='teacher:'+r.teacherId)fail('Guru tidak boleh mencerap atau menyemak rekod dirinya sendiri.');}
   if(d.assessments.some(a=>a.teacherId===r.teacherId&&a.year===b.year&&a.status!=='draft')&&(old?.observerId!==r.observerId||observationOfficer(old,'kedua')!==observer2Id||old?.reviewerId!==r.reviewerId))fail('Buka semula penilaian sebelum menukar tugasan.',409);
   return {teacherId:r.teacherId,observerId:r.observerId,observer2Id,reviewerId:r.reviewerId};});
  const before=structuredClone(d.pdpc);d.pdpc.assignments[String(b.year)]=[...rows,...(d.pdpc.assignments[String(b.year)]??[]).filter(r=>!seen.has(r.teacherId)&&d.teachers.some(t=>t.id===r.teacherId&&!rosterActive(t,b.year)))];d.pdpc.revision++;audit(d,m,'pdpc_assignments',String(b.year),before,d.pdpc);return {ok:true};
 }
 if(b.action==='pdpc-review'){
  const a=d.assessments.find(a=>a.id===b.id);if(!a||!d.pdpc||d.pdpc.version!==2)fail('Penilaian tidak ditemui.',404);const r=(d.pdpc.assignments[String(a.year)]??[]).find(r=>r.teacherId===a.teacherId);if(!r||!eligibleScoreAssignee(d,r.reviewerId,true,a.year)||!assignedTo(d,r.reviewerId,m.id)||m.teacherId===a.teacherId)fail('Hanya penyemak yang ditugaskan boleh menyemak rekod guru lain.',403);if(b.revision!==a.revision)fail('Penilaian berubah. Muat semula.',409);if(!['verify','return','reopen'].includes(b.decision))fail('Tindakan semakan tidak sah.');if(b.decision==='reopen'?!['verified','submitted'].includes(a.status):a.status!=='submitted')fail('Status tidak membenarkan semakan ini.',409);if(b.decision!=='verify'&&(typeof b.feedback!=='string'||b.feedback.trim().length<5||b.feedback.length>1500))fail('Nyatakan sebab sekurang-kurangnya 5 aksara.');
  const before=structuredClone(a);Object.assign(a,{status:b.decision==='verify'?'verified':'draft',feedback:b.decision==='verify'?'':b.feedback.trim(),verifiedBy:b.decision==='verify'?m.id:null,verifiedAt:b.decision==='verify'?now():null,revision:a.revision+1,mutationId:'',updatedAt:now()});audit(d,m,'pdpc_'+b.decision,a.id,before,a);return {assessment:a};
 }

 if(b.action==='import-roster'){
  admin(m);if(b.rosterRevision!==(d.rosterRevision??0))fail('Senarai Guru / AKP telah berubah. Muat semula dan semak import sekali lagi.',409);
  if(!Array.isArray(b.teachers)||!b.teachers.length||b.teachers.length>500)fail('Import antara 1 hingga 500 Guru / AKP.');
  let rows:ReturnType<typeof cleanWargaRosterRow>[];try{rows=b.teachers.map(cleanWargaRosterRow);}catch(e){fail((e as Error).message);}
  const names=new Set<string>(),ics=new Set<string>(),targets=new Set<string>(),all=[...d.teachers,...(d.staff??[])];
  const plan=rows!.map(v=>{
   const key=normalized(v.name);if(names.has(key)||v.ic&&ics.has(v.ic))fail('Nama atau No. IC berulang dalam fail.');names.add(key);if(v.ic)ics.add(v.ic);
   const byId=v.id?all.find(t=>t.id===v.id):undefined,byIC=v.ic?all.find(t=>t.ic===v.ic):undefined,byName=all.find(t=>normalized(t.name)===key);
   if(v.id&&!byId)fail('ID Guru / AKP tidak ditemui. Muat turun senarai terkini.',409);
   const found=[byId,byIC,byName,...all.filter(t=>normalized(t.name)===key||!!v.ic&&t.ic===v.ic)].filter(Boolean) as Row[];if(new Set(found.map(t=>t.id)).size>1)fail('Nama, ID dan No. IC merujuk kepada individu berlainan.',409);
   const t=found[0],wasTeacher=!!t&&d.teachers.includes(t),staff=v.status==='AKP',convert=wasTeacher&&staff;
   if(t){if(targets.has(t.id))fail('Dua baris merujuk kepada individu yang sama.');targets.add(t.id);
    if(!wasTeacher&&!staff)fail('Rekod AKP tidak boleh ditukar kepada guru melalui import. Semak status dalam fail.',409);
    if(wasTeacher&&(convert||t.type!==v.type)&&d.assessments.some(a=>a.teacherId===t.id))fail('Status / kategori '+v.name+' tidak boleh diubah kerana penilaian telah disimpan.',409);
    if(convert&&(schoolLeader(t.position)||Object.values(d.pdpc?.assignments??{}).flat().some(r=>[r.observerId,observationOfficer(r,'kedua'),r.reviewerId].some(id=>typeof id==='string'&&assignmentIdentity(d,id)==='teacher:'+t.id))))fail(v.name+' ditetapkan sebagai pentadbir / pegawai Standard 4. Semak penugasan sebelum menukar status kepada AKP.',409);
   }
   return {v,t,staff,convert};
  });
  if((d.staff?.length??0)+plan.filter(p=>p.staff&&(!p.t||p.convert)).length>200)fail('Maksimum 200 AKP sekolah.');
  if(d.teachers.length+plan.filter(p=>!p.staff&&!p.t).length-plan.filter(p=>p.convert).length>500)fail('Maksimum 500 guru sekolah.');
  let added=0,updated=0,converted=0;
  const remap=(value:any,old:string,next:string):any=>typeof value==='string'?(value===old?next:value):Array.isArray(value)?value.map(x=>remap(x,old,next)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,old,next)])):value;
  for(const {v,t,staff,convert} of plan){const {id,type,...metadata}=v;
   if(convert){d.teachers=d.teachers.filter(x=>x.id!==t.id);d.staff??=[];d.staff.push(t);delete t.type;delete t.pp1;delete t.pp2;
    for(const module of ['strength','management','achievement','resources'])if((d as Row)[module])(d as Row)[module]=remap((d as Row)[module],'teacher:'+t.id,'staff:'+t.id);
    for(const x of d.members)if(x.teacherId===t.id){x.staffId=t.id;x.teacherId=null;}
    if(d.pdpc){for(const [year,entries] of Object.entries(d.pdpc.assignments))d.pdpc.assignments[year]=entries.filter(r=>r.teacherId!==t.id);d.pdpc.revision++;}
    converted++;
   }
   if(t){const old=t.name;Object.assign(t,metadata,{normalized:normalized(v.name)},staff?{}:{type});if(old!==v.name){for(const x of d.teachers){if(x.pp1===old)x.pp1=v.name;if(x.pp2===old)x.pp2=v.name;}for(const x of d.members)if(x.teacherId===t.id||x.staffId===t.id)x.displayName=v.name;}updated++;}
   else{const entry={id:crypto.randomUUID(),schoolId:d.school.id,createdAt:now(),normalized:normalized(v.name),position:'',grade:'',session:'',sourceNumber:0,...metadata,...(staff?{}:{type,pp1:'',pp2:''})};if(staff){d.staff??=[];d.staff.push(entry);}else d.teachers.push(entry);added++;}
  }
  d.rosterRevision=(d.rosterRevision??0)+1;const result={added,updated,converted,teachers:plan.filter(p=>!p.staff).length,staff:plan.filter(p=>p.staff).length,skipped:0};
  d.imports.push({id:crypto.randomUUID(),schoolId:d.school.id,importedAt:now(),filename:'Import Excel senarai Guru dan AKP',rowCount:rows!.length});audit(d,m,'roster_imported',d.school.id,null,result);return result;
 }
 if(['reset-marks','reset-all','delete-teacher','import','teacher','reopen'].includes(b.action))admin(m);
 if(b.action==='import'){
  if(!Array.isArray(b.teachers)||!b.teachers.length||b.teachers.length>500)fail('Import antara 1 hingga 500 guru.');const rows=b.teachers.map(roster);let added=0,updated=0;
  for(const v of rows){let t=d.teachers.find(t=>t.normalized===normalized(v.name));if(t){const {type,...metadata}=v;Object.assign(t,metadata);updated++;}else{t={id:crypto.randomUUID(),schoolId:d.school.id,normalized:normalized(v.name),createdAt:now(),pp1:'',pp2:'',position:'',grade:'',session:'',sourceNumber:0,...v};d.teachers.push(t);added++;}}
  d.rosterRevision=(d.rosterRevision??0)+1;const result={added,updated,skipped:0};d.imports.push({id:crypto.randomUUID(),schoolId:d.school.id,importedAt:now(),filename:'Import senarai guru (CSV / tampalan)',rowCount:rows.length});audit(d,m,'roster_imported',d.school.id,null,result);return result;
 }
 if(b.action==='teacher'){
  const t=d.teachers.find(t=>t.id===b.id);if(!t)fail('Guru tidak ditemui.',404);const v=roster(b);if(t.type!==v.type&&d.assessments.some(a=>a.teacherId===t.id))fail('Kategori tidak boleh diubah selepas penilaian disimpan.');const key=normalized(v.name);if(d.teachers.some(x=>x.id!==t.id&&x.normalized===key))fail('Nama guru telah digunakan.',409);const before=structuredClone(t),oldName=t.name;Object.assign(t,v,{normalized:key});if(oldName!==v.name){for(const x of d.teachers){if(x.pp1===oldName)x.pp1=v.name;if(x.pp2===oldName)x.pp2=v.name;}for(const x of d.members)if(x.teacherId===t.id)x.displayName=v.name;}d.rosterRevision=(d.rosterRevision??0)+1;audit(d,m,'teacher_updated',t.id,before,t);return {ok:true};
 }
 if(['reset-marks','reset-all','delete-teacher'].includes(b.action)){
  const phrase=b.action==='reset-marks'?'RESET MARKAH':b.action==='reset-all'?'RESET SEMUA':'PADAM GURU';if(b.confirmation!==phrase)fail('Taip frasa pengesahan yang ditetapkan.');
  if(b.action==='reset-marks'){if(!Number.isInteger(b.year)||b.year<2020||b.year>2100)fail('Tahun tidak sah.');const old=structuredClone(d.assessments.filter(a=>a.year===b.year));for(const a of d.assessments.filter(a=>a.year===b.year))Object.assign(a,{scores:Array(38).fill(null),total:null,status:'draft',mutationId:'',revision:a.revision+1,updatedAt:now()});audit(d,m,'assessment_year_reset',String(b.year),old,null);return {assessments:d.assessments.filter(a=>a.year===b.year)};}
  const targets=b.action==='delete-teacher'?d.teachers.filter(t=>t.id===b.teacherId):d.teachers;if(b.action==='delete-teacher'&&!targets.length)fail('Guru tidak ditemui.',404);d.rosterRevision=(d.rosterRevision??0)+1;const ids=new Set(targets.map(t=>t.id)),before={teachers:structuredClone(targets),assessments:d.assessments.filter(a=>ids.has(a.teacherId))};
  d.assessments=d.assessments.filter(a=>!ids.has(a.teacherId));d.teachers=d.teachers.filter(t=>!ids.has(t.id));const changed:string[]=[];for(const x of d.members)if(ids.has(x.teacherId)){x.teacherId=null;if(x.role!=='admin')x.active=0;if(b.action==='delete-teacher'||x.role!=='admin')changed.push(x.id);}revoke(d,changed);audit(d,m,b.action==='delete-teacher'?'teacher_deleted':'school_data_reset',b.teacherId||d.school.id,before,null);return {ok:true};
 }
 if(b.action==='reopen'){if(d.pdpc?.version===2)fail('Gunakan semakan oleh pegawai penyemak yang ditugaskan.',403);const a=d.assessments.find(a=>a.id===b.id);if(!a)fail('Penilaian tidak ditemui.',404);const before=structuredClone(a);Object.assign(a,{status:'draft',mutationId:'',revision:a.revision+1,updatedAt:now()});audit(d,m,'assessment_reopened',a.id,before,a);return {assessment:a};}
 if(b.action!=='save')fail('Tindakan tidak sah.');const v=b.assessment as Assessment;
 if(!v||!stages.includes(v.stage)||!Number.isInteger(v.year)||v.year<2020||v.year>2100||!['draft','submitted'].includes(v.status)||!Number.isInteger(v.revision)||v.revision<0)fail('Maklumat penilaian tidak sah.');
 const t=d.teachers.find(t=>t.id===v.teacherId);if(!t)fail('Guru tidak ditemui.',404);if(!mayWrite(d,m,t,v.stage,v.year))fail('Cikgu tidak ditugaskan untuk mengisi sesi penilaian guru ini.',403);
 if(d.pdpc?.version===2&&(v as unknown as Row).epoch!==d.pdpc.epoch)fail('Penilaian lama telah direset. Muat semula dan buat pengisian baharu.',409);
 if(typeof v.mutationId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(v.mutationId))fail('Rujukan simpanan tidak sah.');
 const previous=d.assessments.find(a=>a.teacherId===t.id&&a.year===v.year&&a.stage===v.stage);
 if(previous?.mutationId===v.mutationId)return {assessment:previous};
 if(previous&&previous.status!=='draft')fail('Penilaian telah dihantar dan dikunci.',409,{assessment:previous,locked:true});
 if((previous?.revision??0)!==v.revision)fail('Rekod telah berubah. Semak versi pelayan.',409,{assessment:previous??null});
 if(!Array.isArray(v.scores)||v.scores.length!==38||v.scores.some(n=>n!==null&&(!Number.isInteger(n)||n<0||n>4)))fail('Skor mestilah nombor bulat 0 hingga 4 bagi 38 item.');
 for(const f of ['evaluator','date','subject','classroom','notes'] as const)if(typeof v[f]!=='string'||v[f].length>(f==='notes'?5000:200))fail('Maklumat borang tidak sah.');
 const rawEvidence=v.evidence??previous?.evidence??[];if(!Array.isArray(rawEvidence)||rawEvidence.length>20||rawEvidence.some(url=>{if(typeof url!=='string'||url.length>500)return true;try{const u=new URL(url);return !['https:','http:'].includes(u.protocol)||!!u.username||!!u.password;}catch{return true;}}))fail('Gunakan maksimum 20 pautan evidens yang sah.');const evidence=[...new Set(rawEvidence.map(url=>new URL(url).href))];
 if(v.status==='submitted'&&(!evidence.length||!previous||JSON.stringify([...evidence].sort())!==JSON.stringify([...new Set((previous.evidence??[]).map((url:string)=>new URL(url).href))].sort())))fail('Masukkan dan simpan semua pautan evidens sebagai draf sebelum menghantar penilaian.');
 const evaluator=d.pdpc?.version===2?(own(d,m)?.name||m.displayName):m.role==='admin'?v.evaluator.trim():(own(d,m)?.name||m.displayName),result=calculate(v.scores,t.type as TeacherType);
 if(v.status==='submitted'&&(result.total===null||!evaluator||!v.subject.trim()||!v.classroom.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||Number(v.date.slice(0,4))!==v.year||Number.isNaN(Date.parse(v.date))||new Date(v.date).toISOString().slice(0,10)!==v.date))fail('Lengkapkan semua skor, penilai, mata pelajaran, kelas dan tarikh.');
 if(d.pdpc?.version===2&&v.status==='submitted'&&!(d.pdpc.assignments[String(v.year)]??[]).find(r=>r.teacherId===t.id&&eligibleScoreAssignee(d,observationOfficer(r,v.stage==='kendiri'?'pertama':v.stage),true,v.year)&&eligibleScoreAssignee(d,r.reviewerId,true,v.year)&&assignedMember(d,observationOfficer(r,v.stage==='kendiri'?'pertama':v.stage))&&assignedMember(d,r.reviewerId)))fail('Admin perlu menetapkan pencerap dan penyemak yang dipautkan kepada akaun aktif.');
 const id=previous?.id||[t.id,v.year,v.stage,...(d.pdpc?.version===2?[d.pdpc.epoch]:[])].join(':'),record={id,schoolId:d.school.id,teacherId:t.id,year:v.year,stage:v.stage,status:v.status,scores:v.scores,evaluator,date:v.date,subject:v.subject.trim(),classroom:v.classroom.trim(),notes:v.notes.trim(),evidence,total:result.total===null?null:result.total.toFixed(2),revision:v.revision+1,mutationId:v.mutationId,updatedAt:now(),...(d.pdpc?.version===2?{epoch:d.pdpc.epoch,updatedBy:m.id}: {})};
 audit(d,m,v.status==='submitted'?'assessment_submitted':'assessment_draft_saved',id,previous??null,record);d.assessments=d.assessments.filter(a=>a.id!==id);d.assessments.push(record);return {assessment:record};
}
export async function schoolCommand(d:SchoolDoc,m:Row,b:Row){admin(m);
 if(b.action==='delete-accounts'){
  if(b.confirmation!=='PADAM AKAUN')fail('Taip PADAM AKAUN untuk mengesahkan pemadaman.');
  if(!Array.isArray(b.memberIds)||!b.memberIds.length||b.memberIds.length>500||b.memberIds.some((id:unknown)=>typeof id!=='string'||!id.length||id.length>100))fail('Pilih antara 1 hingga 500 akaun.');
  const ids=new Set<string>(b.memberIds);
  if(ids.has(m.id))fail('Akaun yang sedang digunakan tidak boleh dipadam.',403);
  const targets=d.members.filter(x=>ids.has(x.id));
  if(targets.length!==ids.size)fail('Sebahagian akaun tidak ditemui. Muat semula senarai dan pilih semula.',404);
  if(!d.members.some(x=>!ids.has(x.id)&&x.role==='admin'&&x.active===1&&x.authUserId))fail('Sekolah mesti mempunyai sekurang-kurangnya seorang Admin aktif.',409);
  // Revoke the application capability in the same CAS commit as removal.
  // An existing JWT or offline draft never recreates school membership.
  revoke(d,[...ids]);d.invitations=d.invitations.filter(i=>!ids.has(i.memberId));
  d.members=d.members.filter(x=>!ids.has(x.id));
  for(const x of targets)audit(d,m,'account_deleted',x.id,{username:x.username,displayName:x.displayName,teacherId:x.teacherId,role:x.role,active:x.active},null);
  return {ok:true,deleted:targets.length};
 }
 if(b.action==='school-name'){const name=text(b.name,5,160),old=d.school.name;d.school.name=name;audit(d,m,'school_name_updated',d.school.id,{name:old},{name});return {ok:true};}
 if(b.action==='invite'){
  const u=username(b.username),role=b.role==='admin'?'admin':'member';if(b.teacherId&&b.staffId)fail('Pilih seorang guru atau AKP sahaja.');const t=b.teacherId?d.teachers.find(t=>t.id===b.teacherId):null,staff=b.staffId?(d.staff??[]).find(s=>s.id===b.staffId):null;if(b.teacherId&&!t||b.staffId&&!staff)fail('Guru / AKP tidak ditemui.',404);if(!t&&!staff&&role!=='admin')fail('Pilih guru atau AKP untuk akaun.');if(d.members.some(x=>x.username===u||t&&x.teacherId===t.id||staff&&x.staffId===staff.id))fail('ID pengguna atau guru / AKP sudah mempunyai akaun.',409);
  const member={id:crypto.randomUUID(),schoolId:d.school.id,username:u,authUserId:null,teacherId:t?.id??null,staffId:staff?.id??null,displayName:t?.name||staff?.name||text(b.displayName),role,active:1,mustChangePassword:0,createdAt:now()};d.members.push(member);return invite(d,m,member,'account_invited');
 }
 const member=d.members.find(x=>x.id===b.memberId);if(!member)fail('Akaun tidak ditemui.',404);if(member.id===m.id)fail('Gunakan tetapan kata laluan untuk akaun sendiri.');
 if(b.action==='reset-account'){revoke(d,[member.id]);return invite(d,m,member,'account_reset_requested');}
 if(b.action==='toggle-active'){if(member.role==='admin'&&member.active&&d.members.filter(x=>x.role==='admin'&&x.active).length<2)fail('Sekolah mesti mempunyai Admin aktif.');const old=member.active;member.active=old?0:1;revoke(d,[member.id]);audit(d,m,'account_active_updated',member.id,{active:old},{active:member.active});return {ok:true};}
 fail('Tindakan tidak sah.');
}
async function invite(d:SchoolDoc,m:Row,member:Row,action:string){const token=secret();d.invitations=d.invitations.filter(i=>i.memberId!==member.id);d.invitations.push({hash:await hash(token),memberId:member.id,expiresAt:new Date(Date.now()+604800000).toISOString(),consumedAt:null});audit(d,m,action,member.id,null,{username:member.username,teacherId:member.teacherId,role:member.role});return {username:member.username,schoolCode:d.school.code,invitation:token,expiresDays:7};}
export function getSchool(d:SchoolDoc,m:Row){admin(m);return {staff:structuredClone(d.staff??[]),members:d.members.map(m=>({id:m.id,username:m.username,teacherId:m.teacherId,staffId:m.staffId??null,displayName:m.displayName,role:m.role,active:m.active,hasAccount:!!m.authUserId})),events:[...d.audit].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100)};}

export const isPGB=(d:SchoolDoc,m:Row)=>d.members.some(x=>x.id===m.id&&x.active===1)&&/^(GURU BESAR|PENGETUA)(?:\s|$)/.test(String(own(d,m)?.position??'').trim().toUpperCase());

export function scoreEntry(v:unknown):boolean{if(v==null||v==='')return false;if(typeof v==='number')return true;if(typeof v==='boolean')return v;if(typeof v==='string')return !!v.trim();if(Array.isArray(v))return v.some(scoreEntry);return typeof v==='object'&&Object.entries(v).some(([k,x])=>k==='applicable'?x===false:!['mode','name','id'].includes(k)&&scoreEntry(x));}
