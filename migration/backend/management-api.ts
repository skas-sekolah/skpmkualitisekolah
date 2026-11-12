import {calculate,rosterActive,stages,type TeacherType} from './scoring.ts';
import {scoreEntry,isPGB,admin,audit,fail,now,assignmentPeople,eligibleReviewAssignee,assignmentIdentity,assignedMember,assignedTo,eligiblePPSAssignee,type Row,type SchoolDoc} from './domain.ts';
import {MANAGEMENT_UNITS,emptyManagementRecord,cleanManagementData,managementIssues,validManagementUnit,validYear,defaultReportNotes,cleanReportNotes,mean,type ReportNotes,type SchoolReport,type PdpcSummary,type ManagementRecord,type ManagementBundle,type ManagementUnitId} from './management-model.ts';
type Store=SchoolDoc&{management?:Record<string,Partial<Record<ManagementUnitId,ManagementRecord>>>;managementReports?:Record<string,ReportNotes>};
function permissions(d:SchoolDoc,m:Row,r:ManagementRecord){const canAdmin=m.role==='admin',writer=[r.assigneeId,...(r.pssIds??[])].some(id=>eligiblePPSAssignee(d,id,r.year)&&assignedTo(d,id,m.id)),reviewer=isPGB(d,m);return {canAdmin,canRead:canAdmin||writer||reviewer,canWrite:canAdmin||writer,canEdit:(canAdmin||writer)&&['draft','returned'].includes(r.status),canReopen:reviewer&&!writer&&(r as unknown as Row).lastEditorId!==m.id&&['submitted','verified'].includes(r.status),canReview:reviewer&&r.status==='submitted'&&!writer&&(r as unknown as Row).lastEditorId!==m.id};}
function record(d:Store,aspect:ManagementUnitId,year:number):ManagementRecord{return structuredClone(d.management?.[String(year)]?.[aspect]??emptyManagementRecord(aspect,year));}
export function scoringReport(d:SchoolDoc,year:number):SchoolReport{
 const teachers=new Map(d.teachers.filter(t=>rosterActive(t,year)||d.assessments.some(a=>a.teacherId===t.id&&a.year===year)).map(t=>[t.id,t]));
 const pdpc={} as SchoolReport['pdpc'];
 for(const scope of ['submitted','all'] as const){
  pdpc[scope]={} as SchoolReport['pdpc']['all'];
  for(const stage of ['all',...stages] as const){
   const selected=d.assessments.filter(a=>a.year===year&&teachers.has(a.teacherId)&&stages.includes(a.stage)&&(stage==='all'||a.stage===stage)&&(scope==='all'||['submitted','verified'].includes(a.status)));
   // A school document normally has one assessment per teacher/year/stage. Keep the latest if a legacy import duplicated one.
   const latest=new Map<string,Row>();for(const a of selected){const key=a.teacherId+':'+a.stage,old=latest.get(key);if(!old||String(a.updatedAt??'')>String(old.updatedAt??''))latest.set(key,a);}
   const results=[...latest.values()].flatMap(a=>{const teacher=teachers.get(a.teacherId)!;if(!['perdana','khas'].includes(teacher.type)||!Array.isArray(a.scores)||a.scores.length!==38)return [];const result=calculate(a.scores,teacher.type as TeacherType);return result.total===null?[]:[result];});
   const codes=['4.1.1','4.2.1','4.2.2','4.3.1','4.4.1','4.4.2','4.5.1','4.6.1'];
   pdpc[scope][stage]={count:results.length,expectedCount:teachers.size*(stage==='all'?stages.length:1),overall:mean(results.map(r=>r.total!)),aspects:codes.map(code=>{const values=results.flatMap(r=>{const a=r.aspects.find(a=>a.code===code);return a?.score===null||a?.score===undefined?[]:[a.score];});return {code,value:mean(values),count:values.length};})} satisfies PdpcSummary;
  }
 }
 return {notes:structuredClone((d as Store).managementReports?.[String(year)]??defaultReportNotes()),pdpc};
}
export function managementView(d:SchoolDoc,m:Row,year:number):ManagementBundle{
 if(!d.members.some(x=>x.id===m.id&&x.active===1))fail('Akses akaun tidak aktif.',403);
 if(!validYear(year))fail('Pilih tahun antara 2020–2100.');
 return {year,isPGB:isPGB(d,m),records:MANAGEMENT_UNITS.map(a=>{const r=record(d,a.id,year),p=permissions(d,m,r),hasEntry=scoreEntry(r.data);if(!p.canRead){r.data=emptyManagementRecord(a.id,year).data;r.feedback='';}delete r.lastMutationId;delete r.lastMutationActor;return {...r,...p,hasEntry};}),people:assignmentPeople(d,year),school:{code:d.school.code,name:d.school.name},sessionId:m.id,...(m.role==='admin'?{report:scoringReport(d,year)}:{})};
}
export function managementCommand(d:SchoolDoc,m:Row,b:Row):ManagementBundle{
 if(!d.members.some(x=>x.id===m.id&&x.active===1))fail('Akses akaun tidak aktif.',403);
 if(!validYear(b.year))fail('Pilih tahun antara 2020–2100.');
 if(b.action==='verify-standard'){
  if(!isPGB(d,m))fail('Hanya PGB yang dipautkan kepada senarai guru boleh mengesahkan standard.',403);
  const units=MANAGEMENT_UNITS.filter(u=>u.group===b.group);if(!units.length)fail('Standard tidak sah.');
  const copy=structuredClone(d),rows=units.map(u=>record(copy,u.id,b.year));
  if(!Array.isArray(b.revisions)||b.revisions.length!==rows.length||rows.some(r=>!b.revisions.some((v:Row)=>v.aspect===r.aspect&&v.revision===r.revision)))fail('Rekod standard berubah. Muat semula dahulu.',409);
  for(const r of rows){if(r.status==='verified')continue;if(r.status!=='submitted')fail('Semua borang perlu dihantar dahulu.',409);if(assignedTo(d,r.assigneeId,m.id)||(r.pssIds??[]).some(id=>assignedTo(d,id,m.id))||(r as unknown as Row).lastEditorId===m.id)fail('PGB tidak boleh mengesahkan pengisian sendiri.',403);
   const issues=managementIssues(r.aspect,r.data);if(issues.length)fail(issues[0]);r.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;r.feedback='';r.updatedAt=now();r.updatedBy=m.id;r.revision++;(copy as Store).management??={};(copy as Store).management![String(b.year)]??={};(copy as Store).management![String(b.year)][r.aspect]=r;
  }
  (d as Store).management=(copy as Store).management;audit(d,m,'management_verify_standard',b.group+':'+b.year,null,{aspects:rows.map(r=>r.aspect)});return managementView(d,m,b.year);
 }
 if(b.action==='report-notes'){
  admin(m);const store=d as Store,old=store.managementReports?.[String(b.year)]??defaultReportNotes();
  if(!Number.isInteger(b.revision)||b.revision!==old.revision)fail('Catatan laporan telah berubah. Muat semula sebelum menyimpan.',409);
  let clean:ReturnType<typeof cleanReportNotes>;try{clean=cleanReportNotes(b.notes);}catch(e){fail((e as Error).message);}
  if(clean!.date&&Number(clean!.date.slice(0,4))!==b.year)fail('Tarikh laporan mesti dalam tahun pelaporan.');
  const next={...clean!,revision:old.revision+1,updatedAt:now()};store.managementReports??={};store.managementReports[String(b.year)]=next;
  audit(d,m,'management_report_notes',String(b.year),old,next);return managementView(d,m,b.year);
 }
 if(!validManagementUnit(b.aspect))fail('Aspek tidak sah.');
 const store=d as Store,year=b.year,aspect=b.aspect as ManagementUnitId,r=record(store,aspect,year),before=structuredClone(r),p=permissions(d,m,r);
 if(b.action==='assign')admin(m);else if(b.action==='save'||b.action==='submit'){if(!p.canWrite)fail('Hanya Admin atau PPS yang ditugaskan boleh mengisi skor ini.',403);}else if(['verify','return','reopen'].includes(b.action)){if(!isPGB(d,m)||[r.assigneeId,...(r.pssIds??[])].some(id=>assignedTo(d,id,m.id))||(r as unknown as Row).lastEditorId===m.id)fail('Hanya PGB boleh menyemak borang yang diisi oleh orang lain.',403);}else fail('Tindakan modul tidak sah.');
 if(b.action==='save'&&typeof b.mutationId==='string'&&r.lastMutationId===b.mutationId&&r.lastMutationActor===m.id)return managementView(d,m,year);
 if(!Number.isInteger(b.revision)||b.revision!==r.revision)fail('Rekod telah berubah. Muat semula dan semak perubahan sebelum menyimpan.',409,{record:{...r,...p}});
 if(b.action==='assign'){
  if(['submitted','verified'].includes(r.status))fail('Buka semula borang sebelum menukar penugasan.',409);
  const eligible=(id:unknown)=>id===null||typeof id==='string'&&eligibleReviewAssignee(d,id,b.year);
  if(b.assigneeId!==null&&!eligiblePPSAssignee(d,b.assigneeId,b.year))fail('Pilih pengisi daripada senarai guru dan AKP sekolah.');if(!eligible(b.reviewerId))fail('Pilih penyemak daripada barisan pentadbir sekolah.',400);
  if(b.assigneeId&&b.reviewerId&&assignmentIdentity(d,b.assigneeId)===assignmentIdentity(d,b.reviewerId))fail('Pengisi dan penyemak mesti orang yang berbeza.');
  const pss=b.pssIds??(b.assigneeId?[b.assigneeId]:[]);if(!Array.isArray(pss)||pss.length>50||new Set(pss.map((id:string)=>typeof id==='string'?assignmentIdentity(d,id):id)).size!==pss.length||pss.some((id:unknown)=>!eligiblePPSAssignee(d,id,b.year))||pss.some((id:string)=>b.reviewerId&&assignmentIdentity(d,id)===assignmentIdentity(d,b.reviewerId))||b.assigneeId&&!pss.includes(b.assigneeId))fail('Pilih PPS daripada senarai guru / AKP dan penyemak yang berbeza.');r.assigneeId=b.assigneeId;r.pssIds=pss;r.reviewerId=b.reviewerId;
 }else if(b.action==='save'){
  if(!p.canEdit)fail('Borang telah dihantar atau disahkan. Minta penyemak membuka semula.',409);
  if(typeof b.mutationId!=='string'||!/^[a-f0-9-]{16,80}$/i.test(b.mutationId))fail('Pengecam simpanan tidak sah.');
  try{r.data=cleanManagementData(aspect,b.data);}catch(e){fail((e as Error).message);}
  r.status='draft';r.feedback='';r.lastMutationId=b.mutationId;r.lastMutationActor=m.id;(r as unknown as Row).lastEditorId=m.id;
 }else if(b.action==='submit'){
  if(!p.canEdit)fail('Borang tidak berada dalam status draf.',409);
  if(!p.canAdmin&&(!r.assigneeId||!assignedMember(d,r.assigneeId)))fail('Admin perlu menetapkan pegawai penilai yang dipautkan kepada akaun aktif dahulu.');
  const issues=managementIssues(aspect,r.data);if(issues.length)fail(issues[0],400,{issues});
  r.status='submitted';r.submittedAt=now();r.feedback='';r.verifiedAt=null;r.verifiedBy=null;r.verifiedName=null;
 }else if(b.action==='verify'){
  if(!p.canReview)fail('Borang mesti dihantar dan disahkan oleh orang lain daripada pengisi serta penyunting terakhir.',403);
  const issues=managementIssues(aspect,r.data);if(issues.length)fail(issues[0]);r.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;r.feedback='';
 }else{
  if(b.action==='return'&&r.status!=='submitted'||b.action==='reopen'&&!['submitted','verified'].includes(r.status))fail('Status borang tidak membenarkan tindakan ini.',409);
  if(typeof b.feedback!=='string'||b.feedback.trim().length<5||b.feedback.length>1500)fail('Nyatakan sebab atau pembetulan sekurang-kurangnya 5 aksara.');
  r.status='returned';r.feedback=b.feedback.trim();r.verifiedAt=null;r.verifiedBy=null;r.verifiedName=null;
 }
 r.revision++;r.updatedAt=now();r.updatedBy=m.id;
 store.management??={};store.management[String(year)]??={};store.management[String(year)][aspect]=r;
 audit(d,m,'management_'+b.action,aspect+':'+year,{status:before.status,revision:before.revision,assigneeId:before.assigneeId,pssIds:before.pssIds,reviewerId:before.reviewerId,...(b.action==='save'?{data:before.data}:{})},{status:r.status,revision:r.revision,assigneeId:r.assigneeId,pssIds:r.pssIds,reviewerId:r.reviewerId,...(b.action==='save'?{data:r.data}:{}),...(r.feedback?{feedback:r.feedback}:{})});
 return managementView(d,m,year);
}
