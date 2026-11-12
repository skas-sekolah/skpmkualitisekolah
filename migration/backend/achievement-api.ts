import {scoreEntry,admin,audit,fail,now,assignmentPeople,isPGB,eligibleReviewAssignee,assignmentIdentity,assignedMember,assignedTo,eligiblePPSAssignee,type Row,type SchoolDoc} from './domain.ts';
import {ACHIEVEMENT_ITEMS,emptyAchievementRecord,cleanAchievementData,achievementIssues,validAchievement,validAchievementYear,effectiveAchievementPSS,type AchievementRecord,type AchievementBundle} from './achievement-model.ts';
import type {AchievementPSS} from './resources-model.ts';
export type AchievementStore=SchoolDoc&{achievement?:Record<string,Record<string,AchievementRecord>>;resources?:{pss?:Record<string,{revision:number;rows:AchievementPSS[]}>}};
function record(d:SchoolDoc,aspect:string,year:number){const store=d as AchievementStore,r=structuredClone(store.achievement?.[String(year)]?.[aspect]??emptyAchievementRecord(aspect,year));r.pssIds=effectiveAchievementPSS(store.resources?.pss?.[String(year)]?.rows??[],aspect);r.assigneeId=r.pssIds[0]??null;return r;}
function permissions(d:SchoolDoc,m:Row,r:AchievementRecord){const canAdmin=m.role==='admin',writer=[r.assigneeId,...(r.pssIds??[])].some(id=>eligiblePPSAssignee(d,id,r.year)&&assignedTo(d,id,m.id)),reviewer=isPGB(d,m);return {canAdmin,canRead:canAdmin||writer||reviewer,canWrite:canAdmin||writer,canEdit:(canAdmin||writer)&&['draft','returned'].includes(r.status),canReopen:reviewer&&!writer&&(r as unknown as Row).lastEditorId!==m.id&&['submitted','verified'].includes(r.status),canReview:reviewer&&r.status==='submitted'&&!writer&&(r as unknown as Row).lastEditorId!==m.id};}
export function achievementView(d:SchoolDoc,m:Row,year:number):AchievementBundle{
 if(!d.members.some(x=>x.id===m.id&&x.active===1))fail('Akses akaun tidak aktif.',403);if(!validAchievementYear(year))fail('Tahun tidak sah.');
 return {year,records:ACHIEVEMENT_ITEMS.map(a=>{const r=record(d,a.id,year),p=permissions(d,m,r),hasEntry=scoreEntry(r.data);if(!p.canRead){r.data=emptyAchievementRecord(a.id,year).data;r.feedback='';r.verifiedName=null;r.lastEditorId=null;}delete r.lastMutationId;delete r.lastMutationActor;return {...r,...p,hasEntry};}),people:assignmentPeople(d,year),school:{code:d.school.code,name:d.school.name},sessionId:m.id};
}
export function achievementCommand(d:SchoolDoc,m:Row,b:Row):AchievementBundle{
 if(!d.members.some(x=>x.id===m.id&&x.active===1))fail('Akses akaun tidak aktif.',403);
 if(!validAchievementYear(b.year))fail('Pilih tahun antara 2020–2100.');
 if(!validAchievement(b.aspect))fail('Aspek tidak sah.');
 const store=d as AchievementStore,year=b.year,aspect=b.aspect as string,r=record(store,aspect,year),before=structuredClone(r),p=permissions(d,m,r);
 if(b.action==='assign')admin(m);else if(b.action==='save'||b.action==='submit'){if(!p.canWrite)fail('Hanya Admin atau PPS yang ditugaskan boleh mengisi skor ini.',403);}else if(['verify','return','reopen'].includes(b.action)){if(!isPGB(d,m)||[r.assigneeId,...(r.pssIds??[])].some(id=>assignedTo(d,id,m.id))||(r as unknown as Row).lastEditorId===m.id)fail('Hanya PGB boleh menyemak borang yang diisi oleh orang lain.',403);}else fail('Tindakan modul tidak sah.');
 if(b.action==='save'&&typeof b.mutationId==='string'&&r.lastMutationId===b.mutationId&&r.lastMutationActor===m.id)return achievementView(d,m,year);
 if(!Number.isInteger(b.revision)||b.revision!==r.revision)fail('Rekod telah berubah. Muat semula dan semak perubahan sebelum menyimpan.',409,{record:{...r,...p}});
 if(b.action==='assign'){
  if(['submitted','verified'].includes(r.status))fail('Buka semula borang sebelum menukar penugasan.',409);
  const eligible=(id:unknown)=>id===null||typeof id==='string'&&eligibleReviewAssignee(d,id,b.year);
  if(b.assigneeId!==null&&!eligiblePPSAssignee(d,b.assigneeId,b.year))fail('Pilih pengisi daripada senarai guru dan AKP sekolah.');if(!eligible(b.reviewerId))fail('Pilih penyemak daripada barisan pentadbir sekolah.',400);
  if(b.assigneeId&&b.reviewerId&&assignmentIdentity(d,b.assigneeId)===assignmentIdentity(d,b.reviewerId))fail('Pengisi dan penyemak mesti orang yang berbeza.');
  const pss=b.pssIds??(b.assigneeId?[b.assigneeId]:[]);if(!Array.isArray(pss)||pss.length>50||new Set(pss.map((id:string)=>typeof id==='string'?assignmentIdentity(d,id):id)).size!==pss.length||pss.some((id:unknown)=>!eligiblePPSAssignee(d,id,b.year))||pss.some((id:string)=>b.reviewerId&&assignmentIdentity(d,id)===assignmentIdentity(d,b.reviewerId))||b.assigneeId&&!pss.includes(b.assigneeId))fail('Pilih PPS daripada senarai guru / AKP dan penyemak yang berbeza.');r.assigneeId=b.assigneeId;r.pssIds=pss;r.reviewerId=b.reviewerId;
  store.resources??={};store.resources.pss??={};const prior=store.resources.pss[String(year)]??{revision:0,rows:[]},existing=prior.rows.find(x=>x.standard===aspect);store.resources.pss[String(year)]={revision:prior.revision+1,rows:[...prior.rows.filter(x=>x.standard!==aspect),{id:existing?.id??crypto.randomUUID(),standard:aspect,title:ACHIEVEMENT_ITEMS.find(x=>x.id===aspect)!.name,memberIds:pss}]};
 }else if(b.action==='save'){
  if(!p.canEdit)fail('Borang telah dihantar atau disahkan. Minta penyemak membuka semula.',409);
  if(typeof b.mutationId!=='string'||!/^[a-f0-9-]{16,80}$/i.test(b.mutationId))fail('Pengecam simpanan tidak sah.');
  try{r.data=cleanAchievementData(aspect,b.data);}catch(e){fail((e as Error).message);}
  r.status='draft';r.feedback='';r.lastMutationId=b.mutationId;r.lastMutationActor=m.id;(r as unknown as Row).lastEditorId=m.id;
 }else if(b.action==='submit'){
  if(!p.canEdit)fail('Borang tidak berada dalam status draf.',409);
  if(!p.canAdmin&&(!r.assigneeId||!assignedMember(d,r.assigneeId)))fail('Admin perlu menetapkan pegawai penilai yang dipautkan kepada akaun aktif dahulu.');
  let clean;try{clean=cleanAchievementData(aspect,r.data);}catch(e){fail((e as Error).message);}const issues=achievementIssues(aspect,clean!);if(issues.length)fail(issues[0],400,{issues});
  r.status='submitted';r.submittedAt=now();r.feedback='';r.verifiedAt=null;r.verifiedBy=null;r.verifiedName=null;
 }else if(b.action==='verify'){
  if(!p.canReview)fail('Borang mesti dihantar dan disahkan oleh orang lain daripada pengisi serta penyunting terakhir.',403);
  let clean;try{clean=cleanAchievementData(aspect,r.data);}catch(e){fail((e as Error).message);}const issues=achievementIssues(aspect,clean!);if(issues.length)fail(issues[0]);r.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;r.feedback='';
 }else{
  if(b.action==='return'&&r.status!=='submitted'||b.action==='reopen'&&!['submitted','verified'].includes(r.status))fail('Status borang tidak membenarkan tindakan ini.',409);
  if(typeof b.feedback!=='string'||b.feedback.trim().length<5||b.feedback.length>1500)fail('Nyatakan sebab atau pembetulan sekurang-kurangnya 5 aksara.');
  r.status='returned';r.feedback=b.feedback.trim();r.verifiedAt=null;r.verifiedBy=null;r.verifiedName=null;
 }
 r.revision++;r.updatedAt=now();r.updatedBy=m.id;
 store.achievement??={};store.achievement[String(year)]??={};store.achievement[String(year)][aspect]=r;
 audit(d,m,'achievement_'+b.action,aspect+':'+year,{status:before.status,revision:before.revision,assigneeId:before.assigneeId,pssIds:before.pssIds,reviewerId:before.reviewerId,...(b.action==='save'?{data:before.data}:{})},{status:r.status,revision:r.revision,assigneeId:r.assigneeId,pssIds:r.pssIds,reviewerId:r.reviewerId,...(b.action==='save'?{data:r.data}:{}),...(r.feedback?{feedback:r.feedback}:{})});
 return achievementView(d,m,year);
}
