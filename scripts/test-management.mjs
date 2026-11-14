import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const compile=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const scoring=compile(fs.readFileSync('migration/backend/scoring.ts','utf8').replace("import source from './rubric.json' with {type:'json'};",'const source='+fs.readFileSync('migration/backend/rubric.json','utf8')+';'));
const domain=compile(fs.readFileSync('migration/backend/domain.ts','utf8').replace("'./scoring.ts'",JSON.stringify(scoring))),model=compile(fs.readFileSync('migration/backend/management-model.ts','utf8'));
const M=await import(model),A=await import(compile(fs.readFileSync('migration/backend/management-api.ts','utf8').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./management-model.ts'",JSON.stringify(model)).replace("'./scoring.ts'",JSON.stringify(scoring))));
const fixture=()=>({school:{id:'fictional-a',code:'TEST-A',name:'Sekolah Contoh'},teachers:[{id:'original-teacher',name:'Fixture leader',position:'PK'},{id:'review-teacher',name:'Fixture reviewer',position:'GURU BESAR'},{id:'other-teacher',name:'Fixture other leader',position:'PK HEM'}],assessments:[{id:'original-mark',total:91}],strength:{2026:{A1:{unchanged:true}}},members:[{id:'admin',active:1,role:'admin',displayName:'Pentadbir'},{id:'writer',teacherId:'original-teacher',active:1,role:'member',displayName:'Pengisi'},{id:'reviewer',teacherId:'review-teacher',active:1,role:'member',displayName:'Penyemak'},{id:'other',teacherId:'other-teacher',active:1,role:'member'},{id:'inactive',active:0,role:'member'}],audit:[],sessions:[],invitations:[],imports:[]});
const member=(d,id)=>d.members.find(m=>m.id===id),view=(d,id='admin',year=2026)=>A.managementView(d,member(d,id),year),current=(d,aspect='1.1.1',year=2026)=>view(d,'admin',year).records.find(r=>r.aspect===aspect);
const call=(d,id,b)=>A.managementCommand(d,member(d,id),{year:2026,aspect:'1.1.1',...b}),denied=(d,id,b,status)=>{const before=structuredClone(d);assert.throws(()=>call(d,id,b),e=>e.status===status);assert.deepEqual(d,before,'Rejected command must not mutate data or audit');};
assert.equal(M.MANAGEMENT_UNITS.length,42);assert.equal(M.MANAGEMENT_UNITS.reduce((n,u)=>n+u.actions.length,0),178);
assert.deepEqual(M.MANAGEMENT_GROUPS.map(g=>M.MANAGEMENT_UNITS.filter(u=>u.group===g.id).length),[12,9,7,7,7]);
assert.equal(M.MANAGEMENT_UNITS.find(u=>u.id==='3.2.6.1').actions.length,8,'Include continuation e–h');
assert.equal(M.MANAGEMENT_UNITS.find(u=>u.id==='2.6.1').actions.length,5,'Include continuation e');
assert.equal(new Set(M.MANAGEMENT_UNITS.map(u=>u.id)).size,42);
for(const unit of M.MANAGEMENT_UNITS){assert.ok(unit.pages.every(p=>p>=11&&p<=61));assert.equal(new Set(unit.actions.map(a=>a.id)).size,unit.actions.length);const empty=M.emptyManagementData();assert.equal(M.managementTotals(unit.id,empty).total,null);const zeros={...empty,scores:Object.fromEntries(unit.actions.map(a=>[a.id,0])),notes:'Rujukan fail sekolah',evidence:['https://example.test/source']};assert.equal(M.managementTotals(unit.id,zeros).total,0);assert.deepEqual(M.managementIssues(unit.id,M.cleanManagementData(unit.id,zeros)),[]);}
const d=fixture();assert.ok(view(d,'other').records.every(r=>!r.canRead&&!r.canEdit&&!r.canReview));assert.throws(()=>view(d,'inactive'),e=>e.status===403);assert.throws(()=>view(d,'admin','2026'),e=>e.status===400);
denied(d,'writer',{action:'assign',revision:0,assigneeId:'writer',reviewerId:'reviewer'},403);
for(const [w,r] of [['writer','writer'],['foreign-school-person','reviewer'],['writer','inactive']])denied(d,'admin',{action:'assign',revision:0,assigneeId:w,reviewerId:r},400);
call(d,'admin',{action:'assign',revision:0,assigneeId:'writer',reviewerId:null});
const data={scores:{a:0,b:2,c:3,d:4},notes:'Rujukan evidens sekolah contoh',evidence:['https://example.test/evidens']};
denied(d,'other',{action:'save',revision:1,data,mutationId:'aaaaaaaa-1111-2222'},403);
denied(d,'writer',{action:'save',revision:0,data,mutationId:'aaaaaaaa-1111-2222'},409);
for(const n of [-1,1.5,5,NaN,Infinity,'4'])denied(d,'writer',{action:'save',revision:1,data:{...data,scores:{...data.scores,a:n}},mutationId:'aaaaaaaa-1111-2222'},400);
denied(d,'writer',{action:'save',revision:1,data:{...data,scores:{...data.scores,unknown:4}},mutationId:'aaaaaaaa-1111-2222'},400);
call(d,'writer',{action:'save',revision:1,data,mutationId:'aaaaaaaa-1111-2222'});const beforeRetry=structuredClone(d);call(d,'writer',{action:'save',revision:1,data,mutationId:'aaaaaaaa-1111-2222'});assert.deepEqual(d,beforeRetry,'Idempotent retry must not create another audit or revision');
assert.equal(M.managementTotals('1.1.1',current(d).data).total,9);assert.equal(view(d,'other').records[0].data.notes,'');assert.deepEqual(view(d,'other').records[0].data.scores,{});
assert.equal(current(d,'1.1.2').revision,0);assert.equal(current(d,'1.1.1',2025).revision,0);
call(d,'writer',{action:'submit',revision:2});denied(d,'writer',{action:'verify',revision:3},403);denied(d,'other',{action:'verify',revision:3},403);denied(d,'writer',{action:'save',revision:3,data,mutationId:'bbbbbbbb-1111-2222'},409);denied(d,'admin',{action:'assign',revision:3,assigneeId:'other',reviewerId:'reviewer'},409);
call(d,'reviewer',{action:'return',revision:3,feedback:'Semak semula rujukan evidens.'});assert.equal(current(d).status,'returned');assert.equal(view(d,'other').records[0].feedback,'');
call(d,'writer',{action:'save',revision:4,data,mutationId:'bbbbbbbb-1111-2222'});call(d,'writer',{action:'submit',revision:5});call(d,'reviewer',{action:'verify',revision:6});assert.equal(current(d).verifiedName,'Penyemak');assert.equal(current(d).status,'verified');
denied(d,'reviewer',{action:'reopen',revision:7,feedback:''},400);call(d,'reviewer',{action:'reopen',revision:7,feedback:'Buka untuk kemas kini.'});assert.equal(current(d).verifiedBy,null);assert.equal(current(d).verifiedAt,null);
call(d,'writer',{action:'save',revision:8,data,mutationId:'cccccccc-1111-2222'});call(d,'writer',{action:'submit',revision:9});denied(d,'admin',{action:'verify',revision:10},403);call(d,'reviewer',{action:'verify',revision:10});
call(d,'reviewer',{action:'reopen',revision:11,feedback:'Kemas kini untuk ujian akses.'});member(d,'writer').active=0;denied(d,'writer',{action:'save',revision:12,data,mutationId:'dddddddd-1111-2222'},403);member(d,'writer').active=1;
call(d,'admin',{action:'assign',revision:12,assigneeId:'other',reviewerId:'reviewer'});denied(d,'writer',{action:'save',revision:13,data,mutationId:'dddddddd-1111-2222'},403);
const otherSchool=fixture();assert.equal(current(otherSchool).revision,0,'Separate school documents never share management records');assert.deepEqual(d.teachers,fixture().teachers);assert.deepEqual(d.assessments,[{id:'original-mark',total:91}]);assert.deepEqual(d.strength,{2026:{A1:{unchanged:true}}});
for(const value of ['javascript:alert(1)','data:text/html,x','https://user:password@example.test'])assert.throws(()=>M.cleanManagementData('1.1.1',{...data,evidence:[value]}));assert.throws(()=>M.cleanManagementData('1.1.1',{...data,evidence:Array(21).fill('https://example.test')}));
const incomplete=fixture();call(incomplete,'admin',{action:'assign',revision:0,assigneeId:'writer',reviewerId:'reviewer'});call(incomplete,'writer',{action:'save',revision:1,data:{scores:{a:0},notes:'',evidence:[]},mutationId:'eeeeeeee-1111-2222'});denied(incomplete,'writer',{action:'submit',revision:2},400);
assert.ok(d.audit.some(x=>x.action==='management_verify'));assert.ok(d.audit.some(x=>x.action==='management_save'&&JSON.parse(x.after).data.scores.a===0));
console.log('PASS management: 42 source standards / 178 actions, continuation pages, blanks vs zero, validation, source totals, tenant-safe assignment/read/write, revision/idempotency, submission locks, independent verification, return/reopen, immediate revocation, audit and unchanged existing modules. Fictional local fixtures only.');
// Workbook scoring rules: no workbook records or identities are used in these fixtures.
const raw=(aspect,score)=>({...M.emptyManagementData(),scores:Object.fromEntries(M.MANAGEMENT_UNITS.find(u=>u.id===aspect).actions.map(a=>[a.id,score])),notes:'Rujukan fixture'});
for(const [aspect,max] of [['1.1.6',16],['1.1.7',20],['3.3.1.1',16]]){const t=M.managementTotals(aspect,raw(aspect,4));assert.equal(t.maximum,max);assert.equal(t.percentage,100);assert.equal(M.managementTotals(aspect,raw(aspect,0)).percentage,0);}
const unitData={...M.emptyManagementData(),mode:'units',evidence:['https://example.test/units'],rows:[{id:'u1',name:'Unit Contoh A',percent:0,notes:'Rujukan A',url:''},{id:'u2',name:'Unit Contoh B',percent:90,notes:'Rujukan B',url:''}]};
assert.equal(M.managementTotals('3.1.2.1',unitData).percentage,45);assert.deepEqual(M.managementIssues('3.1.2.1',M.cleanManagementData('3.1.2.1',unitData)),[]);
const partial={...unitData,rows:[...unitData.rows,{id:'u3',name:'Unit Contoh C',percent:null,notes:'',url:''}]};assert.equal(M.managementTotals('3.1.2.1',partial).percentage,null);assert.equal(M.managementTotals('3.1.2.1',partial).preview,45);assert.ok(M.managementIssues('3.1.2.1',partial).length);
assert.throws(()=>M.cleanManagementData('1.1.1',unitData));
for(const percent of [-1,101,NaN,Infinity,'90'])assert.throws(()=>M.cleanManagementData('3.1.2.1',{...unitData,rows:[{...unitData.rows[0],percent}]}));
assert.throws(()=>M.cleanManagementData('3.1.2.1',{...unitData,rows:[unitData.rows[0],{...unitData.rows[1],name:'  unit contoh a '}]}));
for(const url of ['javascript:alert(1)','https://u:p@example.test']){assert.throws(()=>M.cleanManagementData('3.1.2.1',{...unitData,rows:[{...unitData.rows[0],url}]}));assert.throws(()=>M.cleanManagementData('1.1.1',{...raw('1.1.1',4),actionEvidence:{a:{document:'Lain-lain',notes:'Fixture',url}}}));}
const reportD=fixture();reportD.teachers=[{id:'ta',type:'perdana'},{id:'tb',type:'khas'}];reportD.assessments=[{id:'a',teacherId:'ta',year:2026,stage:'kendiri',status:'submitted',scores:Array(38).fill(0),updatedAt:'2026-01-01'},{id:'b',teacherId:'ta',year:2026,stage:'pertama',status:'draft',scores:Array(38).fill(4)},{id:'c',teacherId:'tb',year:2026,stage:'kedua',status:'submitted',scores:Array(38).fill(4)},{id:'outside',teacherId:'foreign',year:2026,stage:'kendiri',status:'submitted',scores:Array(38).fill(4)},{id:'year',teacherId:'ta',year:2025,stage:'kendiri',status:'submitted',scores:Array(38).fill(4)},{id:'incomplete',teacherId:'tb',year:2026,stage:'kendiri',status:'submitted',scores:Array(38).fill(null)}];
const summary=view(reportD).report;assert.equal(summary.pdpc.submitted.all.overall,50);assert.equal(summary.pdpc.submitted.all.count,2);assert.equal(summary.pdpc.submitted.all.expectedCount,6);assert.equal(summary.pdpc.all.all.overall,200/3);assert.equal(summary.pdpc.submitted.kendiri.overall,0);assert.equal(summary.pdpc.submitted.pertama.overall,null);assert.equal(summary.pdpc.all.pertama.overall,100);assert.equal(summary.pdpc.submitted.all.aspects[0].value,5,'Aspect column is weighted contribution, not normalized percent');
assert.equal(view(reportD,'writer').report,undefined,'Whole-school summary and PGB notes are admin only');assert.equal(view(reportD,'admin',2025).report.pdpc.submitted.all.count,1);
const notes={principal:'PGB Contoh',schoolType:'Jenis contoh',date:'2026-10-20',strengths:'Kekuatan fixture',improvements:'Penambahbaikan fixture'};
denied(reportD,'writer',{action:'report-notes',revision:0,notes},403);denied(reportD,'admin',{action:'report-notes',revision:1,notes},409);denied(reportD,'admin',{action:'report-notes',revision:0,notes:{...notes,date:'2025-01-01'}},400);denied(reportD,'admin',{action:'report-notes',revision:0,notes:{...notes,date:'2026-02-30'}},400);
call(reportD,'admin',{action:'report-notes',revision:0,notes});assert.equal(view(reportD).report.notes.revision,1);assert.equal(view(fixture()).report.notes.principal,'');assert.ok(reportD.audit.some(a=>a.action==='management_report_notes'));
const avBundle=view(reportD);for(const r of avBundle.records){r.data=raw(r.aspect,r.aspect==='1.1.1'?0:4);r.status='verified';}
const categories=M.schoolCategories(avBundle,true);assert.equal(categories.find(c=>c.name==='Sekolah').value,2000/21,'School average weights each of 21 aspects equally');assert.equal(categories.find(c=>c.name==='Sekolah').covered,21);assert.equal(M.schoolCategories(avBundle,true,['1.1.1']).find(c=>c.name==='Sekolah').covered,20);assert.equal(M.schoolCategories(avBundle,false,['1.1.1']).find(c=>c.name==='Sekolah').covered,21);
console.log('PASS workbook refinement: dynamic action maxima, exact normalized percentages, zero vs blank, unit averages/validation, detailed evidence validation, equal aspect averages, coverage/pending exclusion, PdPc year/stage/status/roster aggregation, weighted contributions, admin-only notes, revision and audit.');
{
 const doc=fixture(),pgb=doc.members.find(m=>m.id==='reviewer');doc.teachers.find(t=>t.id===pgb.teacherId).position='GURU BESAR';
 assert.equal(A.managementView(doc,pgb,2026).isPGB,true);const units=M.MANAGEMENT_UNITS.filter(u=>u.group==='1');doc.management={2026:Object.fromEntries(units.map(u=>[u.id,{...M.emptyManagementRecord(u.id,2026),status:'submitted',revision:1,assigneeId:'writer',reviewerId:pgb.id,data:{scores:Object.fromEntries(u.actions.map(a=>[a.id,4])),notes:'Evidens contoh',evidence:['https://example.test/evidence']}}]))};
 const revisions=units.map(u=>({aspect:u.id,revision:1})),before=structuredClone(doc);
 assert.throws(()=>A.managementCommand(doc,doc.members[0],{action:'verify-standard',year:2026,group:'1',revisions}),e=>e.status===403);assert.deepEqual(doc,before);
 assert.throws(()=>A.managementCommand(doc,pgb,{action:'verify-standard',year:2026,group:'1',revisions:[]}),e=>e.status===409);assert.deepEqual(doc,before);
 A.managementCommand(doc,pgb,{action:'verify-standard',year:2026,group:'1',revisions});assert.ok(A.managementView(doc,pgb,2026).records.filter(r=>r.aspect.startsWith('1.')).every(r=>r.status==='verified'));assert.deepEqual(doc.assessments,before.assessments);
 console.log('PASS standard verification: linked PGB only, stale revisions, atomic group verification and preserved PdPc.');
}

reportD.pdpc={version:2,epoch:'existing-rounds',revision:1,assignments:{}};
const modernReport=view(reportD).report;assert.equal(modernReport.pdpc.submitted.kedua.count,1,'Round 2 must appear in modern-school reports');assert.equal(modernReport.pdpc.submitted.kedua.overall,100);assert.equal(modernReport.pdpc.submitted.all.expectedCount,6);assert.equal(modernReport.pdpc.submitted.all.count,2);assert.equal(modernReport.pdpc.submitted.all.overall,50,'Second observation contributes to the existing report formula');
console.log('PASS modern Standard 4 reports include the second observation in the stage filter, totals, coverage and existing averages.');

// Unit-specific action scores, server projection, lifecycle and revocation.
{
 const doc=fixture(),aspect='3.1.2.1';
 call(doc,'admin',{action:'assign-units',aspect,revision:0,rows:[{id:'math',name:'Matematik',memberIds:['writer']},{id:'science',name:'Sains',memberIds:['other']}]});
 const rec=id=>view(doc,id).records.find(r=>r.aspect===aspect),command=(id,b)=>call(doc,id,{aspect,...b});
 assert.deepEqual(rec('writer').data.rows.map(r=>r.id),['math']);assert.deepEqual(rec('other').data.rows.map(r=>r.id),['science']);assert.equal(rec('admin').data.rows.length,2);assert.equal(rec('reviewer').data.rows.length,2);
 assert.equal(rec('writer').data.mode,'unit-actions');
 const payload=id=>structuredClone(rec(id).data);
 let input=payload('writer');input.rows[0].data={...raw(aspect,4),evidence:['https://example.test/math']};
 command('writer',{action:'save',revision:1,data:input,mutationId:'aaaa1111-bbbb-cccc'});
 assert.equal(rec('admin').data.rows[1].data.scores.a,undefined,'Saving math never overwrites science');
 const before=structuredClone(doc);command('writer',{action:'save',revision:1,data:input,mutationId:'aaaa1111-bbbb-cccc'});assert.deepEqual(doc,before);
 denied(doc,'writer',{aspect,action:'save',revision:2,mutationId:'aaaa2222-bbbb-cccc',data:payload('admin')},403);
 const bad=payload('writer');bad.rows[0].data={...bad.rows[0].data,mode:'units',rows:unitData.rows};denied(doc,'writer',{aspect,action:'save',revision:2,mutationId:'aaaa2222-bbbb-cccc',data:bad},400);
 command('writer',{action:'submit',revision:2});assert.equal(rec('writer').canEdit,false);assert.equal(rec('other').canEdit,true);assert.equal(rec('admin').status,'draft');
 input=payload('other');input.rows[0].data={...raw(aspect,0),evidence:['https://example.test/science']};command('other',{action:'save',revision:3,data:input,mutationId:'aaaa3333-bbbb-cccc'});command('other',{action:'submit',revision:4});
 assert.equal(rec('admin').status,'submitted');assert.equal(M.managementTotals(aspect,rec('admin').data).percentage,50);command('reviewer',{action:'verify',revision:5});assert.ok(rec('admin').data.rows.every(r=>r.status==='verified'));
 command('reviewer',{action:'reopen',revision:6,feedback:'Semak skor tindakan unit.'});
 command('admin',{action:'assign-units',revision:7,rows:[{id:'math',name:'Matematik',memberIds:['other']},{id:'science',name:'Sains',memberIds:['other']}]});
 assert.equal(rec('writer').canRead,false);assert.deepEqual(rec('writer').data.rows,undefined);assert.equal(rec('writer').data.evidence.length,0);
 denied(doc,'writer',{aspect,action:'save',revision:8,data:input,mutationId:'aaaa4444-bbbb-cccc'},403);
 const legacy=fixture();legacy.management={2026:{[aspect]:{...M.emptyManagementRecord(aspect,2026),data:unitData}}};assert.ok(view(legacy).records.find(r=>r.aspect===aspect).data.rows.every(row=>Object.keys(row.data.scores).length===0),'Legacy percentages are never converted into invented action scores');
 console.log('PASS unit actions: per-unit PPS read/write isolation, forged cross-unit save rejection, no manual percentage mode, independent submissions, zero scores, report totals, PGB verification/reopening, immediate revocation and preserved legacy data.');
}
{
 const d=fixture(),aspect='3.1.2.1',subjects=M.SUBJECT_STANDARDS;
 call(d,'admin',{action:'assign-units',aspect,revision:0,rows:[{id:'bm',name:'Bahasa Melayu',memberIds:['writer']},{id:'mt',name:'Matematik',memberIds:['other']}]});
 for(const id of subjects){const r=current(d,id);assert.deepEqual(r.data.rows.map(row=>row.memberIds),[['writer'],['other']]);assert.equal(view(d,'writer').records.find(r=>r.aspect===id).data.rows.length,1);}
 let r=view(d,'writer').records.find(r=>r.aspect==='3.1.2.2');r.data.rows[0].data={...raw('3.1.2.2',3),evidence:['https://example.test/unit-existing']};call(d,'writer',{action:'save',aspect:'3.1.2.2',revision:r.revision,data:r.data,mutationId:'aaaa9999-bbbb-cccc'});
 const stored=current(d,'3.1.2.2').data.rows[0].data;
 call(d,'admin',{action:'assign-units',aspect,revision:current(d,aspect).revision,rows:[{id:'bm',name:'Bahasa Melayu',memberIds:['other']},{id:'mt',name:'Matematik',memberIds:['other']}]});
 assert.deepEqual(current(d,'3.1.2.2').data.rows[0].data,stored,'Shared PPS changes must preserve each standard scores/evidence');
 assert.equal(view(d,'writer').records.find(r=>r.aspect===aspect).canRead,false,'Changing one subject assignment revokes all four standards');
 d.management[2026]['3.1.2.4'].data.rows[0].status='submitted';
 denied(d,'admin',{action:'assign-units',aspect,revision:current(d,aspect).revision,rows:[{id:'mt',name:'Matematik',memberIds:['other']}]},409);
 d.management[2026]['3.1.2.4'].data.rows[0].status='draft';
 call(d,'admin',{action:'assign-units',aspect,revision:current(d,aspect).revision,rows:[{id:'mt',name:'Matematik',memberIds:['other']}]});
 for(const id of subjects)assert.deepEqual(current(d,id).data.rows.map(row=>row.id),['mt']);
 assert.ok(d.audit.some(a=>a.action==='management_assign-units'&&a.entityId==='3.1.2.2:2026'&&JSON.parse(a.before).data.rows.some(row=>row.name==='Bahasa Melayu'&&row.data.scores.a===3)),'Deleted scores are retained in audit');
 const own=view(d,'other');assert.ok(own.records.filter(r=>subjects.includes(r.aspect)).every(r=>r.pssIds.every(id=>id==='other')));assert.ok(own.people.every(p=>p.id==='other'||p.id==='teacher:other-teacher'),'PPS responses exclude other staff names');
 assert.equal(M.unitEvidenceCode('BAHASA MELAYU','3.2.2.1','a'),'BahasaMelayu3.2.2.1(a)');
 console.log('PASS shared subject PPS: one assignment across four standards, score/evidence preservation, atomic locked deletion rejection, audited deletion, revocation and own-person response.');
}
