import assert from 'node:assert/strict';
import {domain,scoring,fixture,R,compile,read} from './achievement-fixtures.mjs';
const D=await import(domain),S=await import(scoring);
const M=await import(compile(read('migration/backend/management-api.ts').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./scoring.ts'",JSON.stringify(scoring)).replace("'./management-model.ts'",JSON.stringify(compile(read('migration/backend/management-model.ts'))))));
const d=fixture(),admin=d.members[0],writer=d.members[1];
d.teachers=[{id:'t',name:'GURU CONTOH',type:'perdana',position:'GAB'},{id:'o',name:'PENCERAP CONTOH',type:'perdana',position:'PK HEM'},{id:'r',name:'PENYEMAK CONTOH',type:'perdana',position:'PK KOKU'}];
d.staff=[{id:'s',name:'AKP CONTOH',status:'AKP',session:'PEJABAT'}];writer.teacherId='t';d.members[2].teacherId='o';d.members[3].teacherId='r';
d.pdpc={version:2,epoch:'fixture',revision:0,assignments:{2026:[{teacherId:'t',observerId:'teacher:o',reviewerId:'teacher:r'}]}};
d.assessments=[{id:'saved',teacherId:'t',year:2026,stage:'kendiri',status:'draft',scores:Array(38).fill(2),revision:1}];
d.resources={pss:{2026:{revision:1,rows:[{id:'pps',standard:'1.1.1',memberIds:['staff:s'],title:'Contoh'}]}}};
const preserved=structuredClone({marks:d.assessments,members:d.members,pdpc:d.pdpc,resources:d.resources});
const body={action:'roster-lifecycle',mode:'deactivate',references:['teacher:t','staff:s'],fromYear:2027,reason:'Berpindah'};
function command(overrides={},actor=admin){return D.dataCommand(d,actor,{...body,rosterRevision:d.rosterRevision??0,...overrides});}
function denied(overrides,status,actor=admin){const before=structuredClone(d);assert.throws(()=>command(overrides,actor),e=>e.status===status);assert.deepEqual(d,before);}
denied({},403,writer);denied({rosterRevision:99},409);denied({references:['teacher:t','staff:missing']},404);denied({references:['teacher:t','teacher:t']},400);denied({references:[]},400);denied({fromYear:2026.5},400);denied({reason:''},400);
assert.equal(command().updated,2);assert.equal(d.rosterRevision,1);
assert.deepEqual({marks:d.assessments,members:d.members,pdpc:d.pdpc,resources:d.resources},preserved);
assert.equal(S.rosterActive(d.teachers[0],2026),true);assert.equal(S.rosterActive(d.teachers[0],2027),false);assert.equal(S.rosterActive(d.staff[0],2027),false);
assert.equal(D.eligiblePPSAssignee(d,'staff:s',2026),true);assert.equal(D.eligiblePPSAssignee(d,'staff:s',2027),false);assert.equal(D.eligibleScoreAssignee(d,'teacher:t',false,2027),false);assert.equal(D.eligibleStrengthAssignee(d,'staff:s',2027),false);
assert.equal(D.mayWrite(d,writer,d.teachers[0],'kendiri',2026),false);assert.equal(D.mayWrite(d,admin,d.teachers[0],'kendiri',2026),true);assert.equal(D.mayWrite(d,writer,d.teachers[0],'kendiri',2027),false);
assert.equal(D.assignmentPeople(d,2027).find(p=>p.id==='teacher:t').available,false);assert.equal(D.assignmentPeople(d,2027).find(p=>p.id===writer.id).available,false);
assert.equal(R.resourcesView(d,admin,2026).standard4.expected,9);assert.equal(R.resourcesView(d,admin,2027).standard4.expected,6);
assert.equal(M.scoringReport(d,2026).pdpc.all.all.expectedCount,9);assert.equal(D.getData(d,admin).assessments.length,1);
const before=structuredClone(d);assert.throws(()=>R.resourcesCommand(d,admin,{action:'assign-all',module:'management',year:2027,rows:[{aspect:'1.1.1',revision:0,assigneeId:'staff:s',pssIds:['staff:s'],reviewerId:'reviewer'}]}),e=>e.status===400);assert.deepEqual(d,before);
assert.throws(()=>D.dataCommand(d,admin,{action:'pdpc-assignments',year:2027,revision:0,rows:[{teacherId:'t',observerId:'teacher:o',reviewerId:'teacher:r'}]}),e=>e.status===400);assert.deepEqual(d,before);
// Reimport updates fields without erasing lifecycle settings or old assessments.
D.dataCommand(d,admin,{action:'import-roster',rosterRevision:1,teachers:[{id:'t',name:'GURU CONTOH DIKEMAS KINI',type:'perdana',status:'GURU'}]});assert.equal(d.teachers[0].inactiveFromYear,2027);assert.deepEqual(d.assessments,preserved.marks);
command({mode:'reactivate'});assert.equal(S.rosterActive(d.teachers[0],2027),true);assert.equal(S.rosterActive(d.staff[0],2027),true);assert.equal(d.audit.at(-1).action,'roster_reactivate');
const duplicates=S.rosterDuplicates([{id:'a',name:'Nama Sama',type:'perdana',ic:'001122334455'},{id:'b',name:' NAMA SAMA ',type:'khas'},{id:'c',name:'AKP lain',status:'AKP',type:'',ic:'001122-33-4455'}]);assert.equal(duplicates.size,3);assert.ok(duplicates.has('staff:c'));assert.equal(JSON.stringify([...duplicates]).includes('001122'),false);
console.log('PASS lifecycle: admin/CAS/atomic validation, Guru and AKP, effective-year boundary, assignment and observation filtering, historical records preserved, import retains inactive status, reactivation, duplicate name/IC review without disclosure. Fictional records only.');

// Saving the active-year assignment grid must preserve hidden historical rows.
const history=structuredClone(before);history.pdpc.assignments[2027]=structuredClone(history.pdpc.assignments[2026]);history.assessments.push({...history.assessments[0],id:'saved-year',year:2027});
D.dataCommand(history,history.members[0],{action:'pdpc-assignments',year:2027,revision:0,rows:history.teachers.filter(t=>S.rosterActive(t,2027)).map(t=>({teacherId:t.id,observerId:null,reviewerId:null}))});
assert.ok(history.pdpc.assignments[2027].some(r=>r.teacherId==='t'&&r.observerId==='teacher:o'));assert.equal(M.scoringReport(history,2027).pdpc.all.all.expectedCount,9);assert.equal(history.assessments.length,2);
console.log('PASS inactive historical assignments and same-year report records survive active-grid save.');
