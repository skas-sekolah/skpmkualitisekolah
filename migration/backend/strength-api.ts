import {scoreEntry,admin,audit,fail,now,assignmentPeople,assignmentIdentity,isPGB,eligibleReviewAssignee,assignedMember,assignedTo,eligibleStrengthAssignee,type Row,type SchoolDoc} from './domain.ts';
import {ASPECTS,emptyStrengthRecord,cleanStrengthData,strengthIssues,validAspect,validYear,type StrengthRecord,type StrengthBundle,type AspectId} from './strength-model.ts';
type Store=SchoolDoc&{strength?:Record<string,Partial<Record<AspectId,StrengthRecord>>>};
function permissions(d:SchoolDoc,m:Row,r:StrengthRecord){const canAdmin=m.role==='admin',writer=eligibleStrengthAssignee(d,r.assigneeId,r.year)&&assignedTo(d,r.assigneeId,m.id),reviewer=isPGB(d,m);return {canAdmin,canRead:canAdmin||writer||reviewer,canWrite:writer,canEdit:writer&&['draft','returned'].includes(r.status),canReopen:reviewer&&!writer&&(r as unknown as Row).lastEditorId!==m.id&&['submitted','verified'].includes(r.status),canReview:reviewer&&r.status==='submitted'&&!writer&&(r as unknown as Row).lastEditorId!==m.id};}
function record(d:Store,aspect:AspectId,year:number):StrengthRecord{return structuredClone(d.strength?.[String(year)]?.[aspect]??emptyStrengthRecord(aspect,year));}
export function strengthView(d:SchoolDoc,m:Row,year:number):StrengthBundle{
 if(!validYear(year))fail('Pilih tahun antara 2020–2100.');
 return {year,records:ASPECTS.map(a=>{const r=record(d,a.id,year),p=permissions(d,m,r),hasEntry=scoreEntry(r.data);if(!p.canRead){r.data=emptyStrengthRecord(a.id,year).data;r.feedback='';}delete r.lastMutationId;delete r.lastMutationActor;return {...r,...p,hasEntry};}),people:assignmentPeople(d,year),school:{code:d.school.code,name:d.school.name},sessionId:m.id};
}
export function strengthCommand(d:SchoolDoc,m:Row,b:Row):StrengthBundle{
 if(b.action==='reset-all'){
  admin(m);if(!validYear(b.year))fail('Tahun tidak sah.');const store=d as Store,rows=ASPECTS.map(a=>record(store,a.id,b.year));
  if(!Array.isArray(b.revisions)||b.revisions.length!==ASPECTS.length||rows.some(r=>!b.revisions.some((v:Row)=>v.aspect===r.aspect&&v.revision===r.revision)))fail('Rekod telah berubah. Muat semula sebelum reset.',409);
  store.strength??={};store.strength[String(b.year)]??={};for(const old of rows){const r={...emptyStrengthRecord(old.aspect,b.year),assigneeId:old.assigneeId,reviewerId:old.reviewerId,revision:old.revision+1,updatedAt:now(),updatedBy:m.id};store.strength[String(b.year)][r.aspect]=r;}
  audit(d,m,'strength_reset_all',String(b.year),rows,{aspects:ASPECTS.map(a=>a.id)});return strengthView(d,m,b.year);
 }
 if(!validYear(b.year))fail('Pilih tahun antara 2020–2100.');if(!validAspect(b.aspect))fail('Aspek tidak sah.');
 const store=d as Store,year=b.year,aspect=b.aspect as AspectId,r=record(store,aspect,year),before=structuredClone(r),p=permissions(d,m,r);
 if(b.action==='assign')admin(m);else if(b.action==='save'||b.action==='submit'){if(!p.canWrite)fail('Hanya pengisi / PPS yang ditugaskan boleh mengisi skor ini.',403);}else if(['verify','return','reopen'].includes(b.action)){if(!isPGB(d,m)||assignedTo(d,r.assigneeId,m.id)||(r as unknown as Row).lastEditorId===m.id)fail('Hanya PGB boleh menyemak borang yang diisi oleh orang lain.',403);}else fail('Tindakan modul tidak sah.');
 if(b.action==='save'&&typeof b.mutationId==='string'&&r.lastMutationId===b.mutationId&&r.lastMutationActor===m.id)return strengthView(d,m,year);
 if(!Number.isInteger(b.revision)||b.revision!==r.revision)fail('Rekod telah berubah. Muat semula dan semak perubahan sebelum menyimpan.',409,{record:{...r,...p}});
 if(b.action==='assign'){
  if(['submitted','verified'].includes(r.status))fail('Buka semula borang sebelum menukar penugasan.',409);
  const eligible=(id:unknown)=>id===null||typeof id==='string'&&eligibleReviewAssignee(d,id,b.year);
  if(b.assigneeId!==null&&!eligibleStrengthAssignee(d,b.assigneeId,b.year))fail('Pilih pengisi / PPS daripada pentadbir sekolah atau AKP.');if(!eligible(b.reviewerId))fail('Pilih penyemak daripada barisan pentadbir sekolah.',400);
  if(b.assigneeId&&b.reviewerId&&assignmentIdentity(d,b.assigneeId)===assignmentIdentity(d,b.reviewerId))fail('Pengisi dan penyemak mesti orang yang berbeza.');
  r.assigneeId=b.assigneeId;r.reviewerId=b.reviewerId;
 }else if(b.action==='save'){
  if(!p.canEdit)fail('Borang telah dihantar atau disahkan. Minta penyemak membuka semula.',409);
  if(typeof b.mutationId!=='string'||!/^[a-f0-9-]{16,80}$/i.test(b.mutationId))fail('Pengecam simpanan tidak sah.');
  try{r.data=cleanStrengthData(aspect,b.data);}catch(e){fail((e as Error).message);}
  r.status='draft';r.feedback='';r.lastMutationId=b.mutationId;r.lastMutationActor=m.id;(r as unknown as Row).lastEditorId=m.id;
 }else if(b.action==='submit'){
  if(!p.canEdit)fail('Borang tidak berada dalam status draf.',409);
  if(!r.assigneeId||!assignedMember(d,r.assigneeId))fail('Admin perlu menetapkan pegawai penilai yang dipautkan kepada akaun aktif dahulu.');
  const issues=strengthIssues(aspect,r.data);if(issues.length)fail(issues[0],400,{issues});
  r.status='submitted';r.submittedAt=now();r.feedback='';r.verifiedAt=null;r.verifiedBy=null;r.verifiedName=null;
 }else if(b.action==='verify'){
  if(!p.canReview)fail('Borang mesti dihantar dan disahkan oleh orang lain daripada pengisi serta penyunting terakhir.',403);
  const issues=strengthIssues(aspect,r.data);if(issues.length)fail(issues[0]);r.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;r.feedback='';
 }else{
  if(b.action==='return'&&r.status!=='submitted'||b.action==='reopen'&&!['submitted','verified'].includes(r.status))fail('Status borang tidak membenarkan tindakan ini.',409);
  if(typeof b.feedback!=='string'||b.feedback.trim().length<5||b.feedback.length>1500)fail('Nyatakan sebab atau pembetulan sekurang-kurangnya 5 aksara.');
  r.status='returned';r.feedback=b.feedback.trim();r.verifiedAt=null;r.verifiedBy=null;r.verifiedName=null;
 }
 r.revision++;r.updatedAt=now();r.updatedBy=m.id;
 store.strength??={};store.strength[String(year)]??={};store.strength[String(year)][aspect]=r;
 audit(d,m,'strength_'+b.action,aspect+':'+year,{status:before.status,revision:before.revision,assigneeId:before.assigneeId,reviewerId:before.reviewerId,...(b.action==='save'?{data:before.data}:{})},{status:r.status,revision:r.revision,assigneeId:r.assigneeId,reviewerId:r.reviewerId,...(b.action==='save'?{data:r.data}:{}),...(r.feedback?{feedback:r.feedback}:{})});
 return strengthView(d,m,year);
}
