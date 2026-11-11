import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const compile=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const scoring=compile(fs.readFileSync('migration/backend/scoring.ts','utf8').replace("import source from './rubric.json' with {type:'json'};",'const source='+fs.readFileSync('migration/backend/rubric.json','utf8')+';'));
const domain=compile(fs.readFileSync('migration/backend/domain.ts','utf8').replace("'./scoring.ts'",JSON.stringify(scoring)));
const model=compile(fs.readFileSync('migration/backend/strength-model.ts','utf8'));
const M=await import(model),S=await import(compile(fs.readFileSync('migration/backend/strength-api.ts','utf8').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./strength-model.ts'",JSON.stringify(model))));
const fixture=()=>({school:{id:'school-a',code:'TEST-A',name:'Sekolah Contoh'},teachers:[{id:'original-teacher',name:'Fixture leader',position:'PK'},{id:'review-teacher',name:'Fixture reviewer',position:'GURU BESAR'},{id:'other-teacher',name:'Fixture other leader',position:'PK HEM'}],assessments:[{id:'original-mark',total:91}],members:[{id:'admin',active:1,role:'admin',displayName:'Pentadbir'},{id:'writer',teacherId:'original-teacher',active:1,role:'member',displayName:'Pengisi'},{id:'reviewer',teacherId:'review-teacher',active:1,role:'member',displayName:'Penyemak'},{id:'other',teacherId:'other-teacher',active:1,role:'member',displayName:'Pengguna lain'},{id:'inactive',active:0,role:'member'}],audit:[],sessions:[],invitations:[],imports:[]});
const member=(d,id)=>d.members.find(m=>m.id===id);
const call=(d,id,body)=>S.strengthCommand(d,member(d,id),{year:2026,aspect:'A4',...body});
const current=(d,aspect='A4',year=2026)=>S.strengthView(d,member(d,'admin'),year).records.find(r=>r.aspect===aspect);
const denied=(d,id,body,status)=>{const old=structuredClone(d);assert.throws(()=>call(d,id,body),e=>e.status===status);assert.deepEqual(d,old,'Rejected command must be atomic');};
const d=fixture();
assert.equal(S.strengthView(d,member(d,'other'),2026).records.length,9);
assert.ok(S.strengthView(d,member(d,'other'),2026).records.every(r=>!r.canRead&&!r.canEdit));
assert.throws(()=>S.strengthView(d,member(d,'admin'),'2026'),e=>e.status===400);
denied(d,'writer',{action:'assign',revision:0,assigneeId:'writer',reviewerId:'reviewer'},403);
denied(d,'admin',{action:'assign',revision:0,assigneeId:'writer',reviewerId:'writer'},400);
denied(d,'admin',{action:'assign',revision:0,assigneeId:'foreign-school-member',reviewerId:'reviewer'},400);
denied(d,'admin',{action:'assign',revision:0,assigneeId:'writer',reviewerId:'inactive'},400);
call(d,'admin',{action:'assign',revision:0,assigneeId:'writer',reviewerId:null});
const data=M.emptyStrengthData();data.rows=[{id:'inventory-1',name:M.CATALOG.A4[0],existing:10,working:8}];data.notes='Semakan inventori sekolah';data.evidence=['https://example.test/inventory'];
denied(d,'other',{action:'save',revision:1,data,mutationId:'aaaaaaaa-1111-2222'},403);
denied(d,'writer',{action:'save',revision:0,data,mutationId:'aaaaaaaa-1111-2222'},409);
denied(d,'writer',{action:'save',revision:1,data:{...data,rows:[{...data.rows[0],working:11}]},mutationId:'aaaaaaaa-1111-2222'},400);
call(d,'writer',{action:'save',revision:1,data,mutationId:'aaaaaaaa-1111-2222'});
const audits=d.audit.length;call(d,'writer',{action:'save',revision:1,data,mutationId:'aaaaaaaa-1111-2222'});assert.equal(d.audit.length,audits);assert.equal(current(d).revision,2);
const hidden=S.strengthView(d,member(d,'other'),2026).records.find(r=>r.aspect==='A4');assert.equal(hidden.data.rows.length,0);assert.equal(hidden.canRead,false);
assert.equal(M.strengthMetrics('A4',current(d).data)[2].value,80);
call(d,'writer',{action:'submit',revision:2});assert.equal(current(d).status,'submitted');
denied(d,'writer',{action:'verify',revision:3},403);denied(d,'other',{action:'verify',revision:3},403);
denied(d,'writer',{action:'save',revision:3,data,mutationId:'bbbbbbbb-1111-2222'},409);
denied(d,'admin',{action:'assign',revision:3,assigneeId:'other',reviewerId:'reviewer'},409);
call(d,'reviewer',{action:'return',revision:3,feedback:'Sila semak bilangan sekali lagi.'});assert.equal(current(d).status,'returned');assert.equal(S.strengthView(d,member(d,'other'),2026).records.find(r=>r.aspect==='A4').feedback,'');
call(d,'writer',{action:'save',revision:4,data,mutationId:'bbbbbbbb-1111-2222'});call(d,'writer',{action:'submit',revision:5});call(d,'reviewer',{action:'verify',revision:6});assert.equal(current(d).status,'verified');assert.equal(current(d).verifiedBy,'reviewer');assert.equal(current(d).verifiedName,'Penyemak');
denied(d,'writer',{action:'save',revision:7,data,mutationId:'cccccccc-1111-2222'},409);
denied(d,'reviewer',{action:'reopen',revision:7,feedback:''},400);
call(d,'reviewer',{action:'reopen',revision:7,feedback:'Buka untuk kemas kini inventori.'});assert.equal(current(d).verifiedAt,null);
assert.equal(current(d,'A4',2025).revision,0);assert.equal(current(d,'A5').revision,0);
assert.deepEqual(d.assessments,[{id:'original-mark',total:91}]);assert.deepEqual(d.teachers,fixture().teachers);
// An admin who edits cannot verify their own work, even with admin privileges.
call(d,'writer',{action:'save',revision:8,data,mutationId:'dddddddd-1111-2222'});call(d,'writer',{action:'submit',revision:9});denied(d,'admin',{action:'verify',revision:10},403);call(d,'reviewer',{action:'verify',revision:10});
// Revoked membership / assignments take effect on the next server check.
member(d,'writer').active=0;const view=S.strengthView(d,member(d,'writer'),2026);assert.equal(view.records.find(r=>r.aspect==='A4').canRead,false);
denied(d,'writer',{action:'save',revision:11,data,mutationId:'eeeeeeee-1111-2222'},403);
for(const [n,expected] of [[0,0],[1,25],[3,25],[4,50],[6,50],[7,75],[9,75],[10,100]])assert.equal(M.parentBand(n),expected);
for(const [n,expected] of [[0,0],[1,25],[2,50],[3,50],[4,75],[5,75],[6,100]])assert.equal(M.communityBand(n),expected);
assert.equal(M.ratio(null,10),null);assert.equal(M.ratio(0,10),0);assert.equal(M.ratio(0,0),null);
const blank=M.emptyStrengthData();assert.ok(M.strengthIssues('A1',blank).length);assert.ok(M.strengthIssues('A2',{...blank,values:{previousStandard4:89}}).some(s=>s.includes('sumber')));
assert.equal(M.strengthMetrics('A1',blank)[0].value,null);
const na={...blank,applicable:false,notes:'Sekolah tidak mempunyai asrama.',evidence:['https://example.test/not-applicable']};assert.deepEqual(M.strengthIssues('A8',na),[]);assert.equal(M.cleanStrengthData('A4',na).applicable,true);
const a9={...M.emptyStrengthData(),values:{parentSupport:4,communitySupport:2},programs:[{id:'a',name:'Program 1',held:true,attendance:50,parents:100},{id:'b',name:'Program 2',held:true,attendance:0,parents:100},{id:'c',name:'Program 3',held:false,attendance:null,parents:null}]};
assert.equal(M.strengthMetrics('A9',a9)[0].value,50,'Source formula excludes zero attendance');assert.equal(M.strengthMetrics('A9',a9)[1].value,50);assert.equal(M.strengthMetrics('A9',a9)[2].value,50);
a9.programs[0].attendance=150;assert.equal(M.strengthMetrics('A9',a9)[0].value,100,'Source formula caps each attendance percentage');
for(const n of [-1,1.5,NaN,Infinity])assert.throws(()=>M.cleanStrengthData('A1',{...blank,values:{teachers:n}}));
assert.throws(()=>M.cleanStrengthData('A2',{...blank,values:{previousStandard4:100.1}}));
assert.throws(()=>M.cleanStrengthData('A4',{...data,rows:[data.rows[0],{...data.rows[0],id:'other'}]}));
assert.throws(()=>M.cleanStrengthData('A4',{...data,rows:[{...data.rows[0],name:'unlisted inventory'}]}));
assert.throws(()=>M.cleanStrengthData('A4',{...data,evidence:['javascript:alert(1)']}));
assert.throws(()=>M.cleanStrengthData('A4',{...data,evidence:['https://user:password@example.com']}));
for(const names of Object.values(M.CATALOG)){assert.equal(new Set(names).size,names.length);assert.ok(names.every(n=>n===n.trim()));}
console.log('PASS: nine aspects, atomic authorization, tenant-safe assignments, optimistic concurrency, idempotent drafts, submission/review/reopening, no self-verification, revocation, unchanged Standard 4, source formulas, blanks/zero, validation, catalog and evidence URLs.');
// Reset is admin-only, revision-checked, audited and isolated to one year/module.
{
 const resetDoc=fixture();const boss=resetDoc.members.find(m=>m.role==='admin');const before=structuredClone(resetDoc);
 assert.throws(()=>S.strengthCommand(resetDoc,resetDoc.members.find(m=>m.id!==boss.id),{action:'reset-all',year:2026,revisions:[]}),e=>e.status===403);assert.deepEqual(resetDoc,before);
 const rows=S.strengthView(resetDoc,boss,2026).records;assert.throws(()=>S.strengthCommand(resetDoc,boss,{action:'reset-all',year:2026,revisions:[]}),e=>e.status===409);assert.deepEqual(resetDoc,before);
 const result=S.strengthCommand(resetDoc,boss,{action:'reset-all',year:2026,revisions:rows.map(r=>({aspect:r.aspect,revision:r.revision}))});assert.ok(result.records.every(r=>r.status==='draft'&&r.revision===1&&r.verifiedAt===null));assert.deepEqual(resetDoc.assessments,before.assessments);assert.ok(resetDoc.audit.some(r=>r.action==='strength_reset_all'));
 console.log('PASS reset: authorization, stale revisions, all nine records, audit and Standard 4 preservation.');
}

assert.ok(M.strengthIssues('A8',{...na,evidence:[]}).some(s=>s.includes('evidens')),'Not-applicable still requires evidence');
