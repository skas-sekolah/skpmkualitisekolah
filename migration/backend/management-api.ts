import {calculate,rosterActive,stages,type TeacherType} from './scoring.ts';
import {scoreEntry,isPGB,admin,audit,fail,now,assignmentPeople,eligibleReviewAssignee,assignmentIdentity,assignedMember,assignedTo,eligiblePPSAssignee,type Row,type SchoolDoc} from './domain.ts';
import {MANAGEMENT_UNITS,SUBJECT_STANDARDS,subjectStandard,aggregateUnit,unitActionData,emptyManagementData,emptyManagementRecord,cleanManagementData,managementIssues,validManagementUnit,validYear,defaultReportNotes,cleanReportNotes,mean,type ReportNotes,type SchoolReport,type PdpcSummary,type ManagementRecord,type ManagementBundle,type ManagementUnitId} from './management-model.ts';
type Store=SchoolDoc&{management?:Record<string,Partial<Record<ManagementUnitId,ManagementRecord>>>;managementReports?:Record<string,ReportNotes>};
function unitWriter(d:SchoolDoc,m:Row,row:NonNullable<ManagementRecord['data']['rows']>[number],year:number){return (row.memberIds??[]).some(id=>eligiblePPSAssignee(d,id,year)&&assignedTo(d,id,m.id));}
function permissions(d:SchoolDoc,m:Row,r:ManagementRecord){
 if(aggregateUnit(r.aspect)){
 const rows=r.data.rows??[],canAdmin=m.role==='admin',reviewer=isPGB(d,m),own=rows.filter(row=>unitWriter(d,m,row,r.year)),self=own.length>0||rows.some(row=>row.lastEditorId===m.id),canReview=reviewer&&!self&&r.status==='submitted';
 return {canAdmin,canRead:canAdmin||reviewer||own.length>0,canWrite:canAdmin||own.length>0,canEdit:canAdmin?rows.length===0||rows.some(row=>['draft','returned'].includes(row.status??'draft')):own.some(row=>['draft','returned'].includes(row.status??'draft')),canReview,canReopen:reviewer&&!self&&['submitted','verified'].includes(r.status)};
 }
const canAdmin=m.role==='admin',writer=[r.assigneeId,...(r.pssIds??[])].some(id=>eligiblePPSAssignee(d,id,r.year)&&assignedTo(d,id,m.id)),reviewer=isPGB(d,m);return {canAdmin,canRead:canAdmin||writer||reviewer,canWrite:canAdmin||writer,canEdit:(canAdmin||writer)&&['draft','returned'].includes(r.status),canReopen:reviewer&&!writer&&(r as unknown as Row).lastEditorId!==m.id&&['submitted','verified'].includes(r.status),canReview:reviewer&&r.status==='submitted'&&!writer&&(r as unknown as Row).lastEditorId!==m.id};}
function record(d:Store,aspect:ManagementUnitId,year:number):ManagementRecord{const r=structuredClone(d.management?.[String(year)]?.[aspect]??emptyManagementRecord(aspect,year));r.data=unitActionData(aspect,r.data);if(aggregateUnit(aspect)){r.status=unitStatus(r);r.pssIds=[...new Set((r.data.rows??[]).flatMap(row=>row.memberIds??[]))];r.assigneeId=r.pssIds[0]??null;}return r;}
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
 return {year,isPGB:isPGB(d,m),records:MANAGEMENT_UNITS.map(a=>{const r=record(d,a.id,year),p=permissions(d,m,r),hasEntry=aggregateUnit(a.id)?(r.data.rows??[]).some(row=>scoreEntry(row.data)):scoreEntry(r.data);if(aggregateUnit(a.id)){r.data.rows=(r.data.rows??[]).filter(row=>p.canAdmin||isPGB(d,m)||unitWriter(d,m,row,year)).map(row=>({...row,canEdit:(p.canAdmin||unitWriter(d,m,row,year))&&['draft','returned'].includes(row.status??'draft')}));if(!p.canAdmin&&!isPGB(d,m)){r.data.notes='';r.data.evidence=[];r.data.scores={};r.data.actionEvidence={};r.feedback='';r.pssIds=(r.pssIds??[]).filter(id=>assignedTo(d,id,m.id));r.assigneeId=r.pssIds[0]??null;}}if(!p.canRead){r.data=emptyManagementRecord(a.id,year).data;r.feedback='';}if(m.role!=='admin'&&!isPGB(d,m)){r.pssIds=(r.pssIds??[]).filter(id=>assignedTo(d,id,m.id));r.assigneeId=r.pssIds[0]??null;r.reviewerId=null;}delete r.lastMutationId;delete r.lastMutationActor;return {...r,...p,hasEntry};}),people:assignmentPeople(d,year).filter(person=>m.role==='admin'||isPGB(d,m)||assignedTo(d,person.id,m.id)),school:{code:d.school.code,name:d.school.name},sessionId:m.id,...(m.role==='admin'?{report:scoringReport(d,year)}:{})};
}
export function managementCommand(d:SchoolDoc,m:Row,b:Row):ManagementBundle{
 if(!d.members.some(x=>x.id===m.id&&x.active===1))fail('Akses akaun tidak aktif.',403);
 if(!validYear(b.year))fail('Pilih tahun antara 2020–2100.');
 if(b.action==='verify-standard'){
  if(!isPGB(d,m))fail('Hanya PGB yang dipautkan kepada senarai guru boleh mengesahkan standard.',403);
  const units=MANAGEMENT_UNITS.filter(u=>u.group===b.group);if(!units.length)fail('Standard tidak sah.');
  const copy=structuredClone(d),rows=units.map(u=>record(copy,u.id,b.year));
  if(!Array.isArray(b.revisions)||b.revisions.length!==rows.length||rows.some(r=>!b.revisions.some((v:Row)=>v.aspect===r.aspect&&v.revision===r.revision)))fail('Rekod standard berubah. Muat semula dahulu.',409);
  for(const r of rows){if(r.status==='verified')continue;if(r.status!=='submitted')fail('Semua borang perlu dihantar dahulu.',409);if((aggregateUnit(r.aspect)&&r.data.rows?.some(row=>unitWriter(d,m,row,r.year)||row.lastEditorId===m.id))||assignedTo(d,r.assigneeId,m.id)||(r.pssIds??[]).some(id=>assignedTo(d,id,m.id))||(r as unknown as Row).lastEditorId===m.id)fail('PGB tidak boleh mengesahkan pengisian sendiri.',403);
   const issues=managementIssues(r.aspect,r.data);if(issues.length)fail(issues[0]);r.status='verified';if(aggregateUnit(r.aspect))for(const row of r.data.rows??[])row.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;r.feedback='';r.updatedAt=now();r.updatedBy=m.id;r.revision++;(copy as Store).management??={};(copy as Store).management![String(b.year)]??={};(copy as Store).management![String(b.year)][r.aspect]=r;
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
 if(subjectStandard(b.aspect)&&b.action==='assign-units')return sharedSubjects(d,m,b);
 if(aggregateUnit(b.aspect))return unitCommand(d,m,b);
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
  const issues=managementIssues(aspect,r.data);if(issues.length)fail(issues[0]);r.status='verified';if(aggregateUnit(r.aspect))for(const row of r.data.rows??[])row.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;r.feedback='';
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

function unitStatus(r:ManagementRecord):ManagementRecord['status']{
 const rows=r.data.rows??[];
 return rows.length&&rows.every(row=>row.status==='verified')?'verified':rows.length&&rows.every(row=>['submitted','verified'].includes(row.status??'draft'))?'submitted':'draft';
}
function unitCommand(d:SchoolDoc,m:Row,b:Row):ManagementBundle{
 const aspect=b.aspect as ManagementUnitId,year=b.year,r=record(d as Store,aspect,year),p=permissions(d,m,r),before=structuredClone(r),rows=r.data.rows??[];
 if(b.action==='save'&&r.lastMutationId===b.mutationId&&r.lastMutationActor===m.id)return managementView(d,m,year);
 if(!['save','submit','assign','assign-units','verify','return','reopen'].includes(b.action))fail('Tindakan unit tidak sah.');
 if(['assign','assign-units'].includes(b.action))admin(m);
 else if(['save','submit'].includes(b.action)){if(!p.canWrite)fail('Anda hanya boleh mengisi unit yang ditetapkan.',403);}
 else if(!isPGB(d,m)||rows.some(row=>unitWriter(d,m,row,year)||row.lastEditorId===m.id))fail('PGB tidak boleh mengesahkan pengisian sendiri.',403);
 if(!Number.isInteger(b.revision)||b.revision!==r.revision)fail('Rekod telah berubah. Muat semula sebelum menyimpan.',409);
 if(b.action==='assign'){
  // A standard-level PPS list grants no unit access. Existing assignment screen remains compatible.
  const ids=b.pssIds??(b.assigneeId?[b.assigneeId]:[]);
  if(!Array.isArray(ids)||ids.some(id=>!eligiblePPSAssignee(d,id,year)))fail('Pilih PPS sekolah yang sah.');
  r.pssIds=ids;r.assigneeId=b.assigneeId??null;r.reviewerId=null;
 }else if(b.action==='assign-units'){
  if(!Array.isArray(b.rows)||b.rows.length>50)fail('Maksimum 50 unit.');
  const ids=new Set<string>(),names=new Set<string>();
  const next=b.rows.map((input:Row)=>{
   if(typeof input.id!=='string'||!input.id||input.id.length>80||ids.has(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.length>180||names.has(input.name.trim().toUpperCase()))fail('Nama dan ID unit diperlukan tanpa pendua.');
   ids.add(input.id);names.add(input.name.trim().toUpperCase());
   if(!Array.isArray(input.memberIds)||input.memberIds.length>50||new Set(input.memberIds).size!==input.memberIds.length||input.memberIds.some((id:unknown)=>!eligiblePPSAssignee(d,id,year)))fail('Pilih PPS daripada warga sekolah.');
   const old=rows.find(row=>row.id===input.id);
   if(old&&['submitted','verified'].includes(old.status??'draft')&&(old.name!==input.name.trim()||JSON.stringify(old.memberIds)!==JSON.stringify(input.memberIds)))fail('Buka semula unit sebelum menukar penugasan.',409);
   return {...(old??{percent:null,notes:'',url:'',data:emptyManagementData(),status:'draft' as const}),id:input.id,name:input.name.trim(),memberIds:input.memberIds};
  });
  if(rows.some(row=>!ids.has(row.id)&&['submitted','verified'].includes(row.status??'draft')))fail('Buka semula unit sebelum memadamnya.',409);
  r.data.rows=next;
 }else if(b.action==='save'){
  if(typeof b.mutationId!=='string'||!/^[a-f0-9-]{16,80}$/i.test(b.mutationId))fail('Pengecam simpanan tidak sah.');
  if(b.data?.mode!=='unit-actions'||!Array.isArray(b.data.rows))fail('Gunakan skor tindakan 0–4 setiap unit.');
  const visible=rows.filter(row=>p.canAdmin||unitWriter(d,m,row,year));
  if(b.data.rows.length!==visible.length||new Set(b.data.rows.map((row:Row)=>row.id)).size!==visible.length||b.data.rows.some((input:Row)=>!visible.some(row=>row.id===input.id)))fail('Akses unit tidak sah.',403);
  const next=rows.map(row=>{
   const input=b.data.rows.find((v:Row)=>v.id===row.id);if(!input)return row;
   if(input.name!==row.name)fail('Hanya penugasan Admin boleh menukar nama unit.',403);
   if(input.data?.mode&&input.data.mode!=='actions'||input.data?.rows?.length)fail('Setiap unit hanya menerima skor tindakan 0–4.');
   let data;try{data=cleanManagementData(aspect,input.data);}catch(e){fail((e as Error).message);}
   if(JSON.stringify(data)===JSON.stringify(cleanManagementData(aspect,row.data??emptyManagementData())))return row;
   if(!['draft','returned'].includes(row.status??'draft'))fail('Unit telah dihantar atau disahkan.',409);
   return {...row,data:data!,status:'draft' as const,lastEditorId:m.id};
  });
  r.data.rows=next;r.lastMutationId=b.mutationId;r.lastMutationActor=m.id;
 }else if(b.action==='submit'){
  const selected=rows.filter(row=>(p.canAdmin||unitWriter(d,m,row,year))&&['draft','returned'].includes(row.status??'draft'));
  if(!selected.length)fail('Tiada draf unit untuk dihantar.',409);
  for(const row of selected){const issues=managementIssues(aspect,row.data??emptyManagementData());if(issues.length)fail(row.name+': '+issues[0]);if(!row.memberIds?.length)fail('Admin perlu menetapkan PPS bagi '+row.name);}
  for(const row of selected)row.status='submitted';r.submittedAt=now();
 }else if(b.action==='verify'){
  if(!p.canReview)fail('Semua unit perlu dihantar dan disemak oleh PGB yang berbeza.',403);
  const issues=managementIssues(aspect,r.data);if(issues.length)fail(issues[0]);for(const row of rows)row.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;
 }else{
  if(!p.canReopen&&!p.canReview)fail('Status unit tidak membenarkan tindakan ini.',409);
  if(typeof b.feedback!=='string'||b.feedback.trim().length<5||b.feedback.length>1500)fail('Nyatakan sebab pembetulan.');
  for(const row of rows)row.status='returned';r.feedback=b.feedback.trim();r.verifiedAt=null;r.verifiedBy=null;r.verifiedName=null;
 }
 r.status=unitStatus(r);r.revision++;r.updatedAt=now();r.updatedBy=m.id;
 const store=d as Store;store.management??={};store.management[String(year)]??={};store.management[String(year)][aspect]=r;
 audit(d,m,'management_'+b.action,aspect+':'+year,before,r);return managementView(d,m,year);
}

function sharedSubjects(d:SchoolDoc,m:Row,b:Row):ManagementBundle{
 admin(m);const source=record(d as Store,b.aspect,b.year);
 if(!Number.isInteger(b.revision)||b.revision!==source.revision)fail('Tetapan mata pelajaran telah berubah. Muat semula.',409);
 if(!Array.isArray(b.rows))fail('Senarai mata pelajaran tidak sah.');
 const copy=structuredClone(d),key=(name:unknown)=>typeof name==='string'?name.trim().toLocaleUpperCase('ms-MY'):'';
 // Only assignment fields are shared. Each standard retains its own scores, evidence, IDs and locks.
 for(const aspect of SUBJECT_STANDARDS){
  const target=record(copy as Store,aspect,b.year),oldRows=target.data.rows??[];
  const rows=b.rows.map((input:Row)=>{
   const sourceOld=source.data.rows?.find(row=>row.id===input.id);
   const old=aspect===b.aspect?oldRows.find(row=>row.id===input.id):oldRows.find(row=>sourceOld&&key(row.name)===key(sourceOld.name))??oldRows.find(row=>key(row.name)===key(input.name??''));
   return {id:old?.id??input.id,name:input.name,memberIds:input.memberIds};
  });
  unitCommand(copy,m,{...b,aspect,revision:target.revision,rows});
 }
 (d as Store).management=(copy as Store).management;d.audit=copy.audit;
 return managementView(d,m,b.year);
}
