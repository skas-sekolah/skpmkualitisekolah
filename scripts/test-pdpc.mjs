import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const compile=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const scoring=compile(fs.readFileSync('migration/backend/scoring.ts','utf8').replace("import source from './rubric.json' with {type:'json'};",'const source='+fs.readFileSync('migration/backend/rubric.json','utf8')+';'));
const D=await import(compile(fs.readFileSync('migration/backend/domain.ts','utf8').replace("'./scoring.ts'",JSON.stringify(scoring))));
const d={school:{id:'test',code:'TEST',name:'Test'},teachers:[{id:'t',name:'Guru',type:'perdana',position:'GAB'},{id:'o',name:'Pencerap',type:'perdana',position:'PK HEM'},{id:'r',name:'Penyemak',type:'perdana',position:'GURU BESAR'}],members:[{id:'a',role:'admin',active:1},{id:'mt',teacherId:'t',active:1},{id:'mo',teacherId:'o',active:1},{id:'mr',teacherId:'r',active:1}],assessments:[],sessions:[],audit:[],invitations:[],imports:[],pdpc:{version:2,epoch:'epoch-test',revision:0,assignments:{}}};
const call=(id,b)=>D.dataCommand(d,d.members.find(m=>m.id===id),b),denied=(id,b,status)=>{const before=structuredClone(d);assert.throws(()=>call(id,b),e=>e.status===status);assert.deepEqual(d,before);};
const assign={action:'pdpc-assignments',year:2026,revision:0,rows:[{teacherId:'t',observerId:'teacher:o',reviewerId:'teacher:r'}]};
denied('mt',assign,403);denied('a',{...assign,revision:9},409);denied('a',{...assign,rows:[{teacherId:'t',observerId:'teacher:t',reviewerId:'teacher:r'}]},400);call('a',{...assign,rows:assign.rows.map(row=>({...row,reviewerId:null}))});
const assessment={id:'',teacherId:'t',year:2026,stage:'pertama',epoch:'epoch-test',status:'draft',revision:0,mutationId:'aaaaaaaa-bbbb-cccc-1111',scores:Array(38).fill(4),evaluator:'Pencerap',date:'2026-10-21',subject:'Matematik',classroom:'4 Contoh',notes:'',evidence:['https://example.test/pdpc-proof']};
denied('mr',{action:'save',assessment},403);denied('mo',{action:'save',assessment:{...assessment,epoch:'old'}},409);denied('mo',{action:'save',assessment:{...assessment,stage:'foreign'}},400);denied('mo',{action:'save',assessment:{...assessment,year:2025}},403);
denied('mo',{action:'save',assessment:{...assessment,evidence:['javascript:alert(1)']}},400);
denied('mo',{action:'save',assessment:{...assessment,status:'submitted'}},400);
let result=call('mo',{action:'save',assessment});assert.deepEqual(result.assessment.evidence,assessment.evidence);assert.equal(result.assessment.total,'100.00');assert.equal(result.assessment.epoch,'epoch-test');
denied('mo',{action:'save',assessment:{...assessment,revision:1,status:'submitted',mutationId:'eeeeeeee-bbbb-cccc-1111',evidence:[]}},400);
denied('mo',{action:'save',assessment:{...assessment,revision:1,status:'submitted',mutationId:'eeeeeeee-bbbb-cccc-2222',evidence:['https://example.test/new-unsaved-proof']}},400);
result=call('mo',{action:'save',assessment:{...assessment,revision:1,mutationId:'aaaaaaaa-bbbb-cccc-2222',status:'submitted'}});const id=result.assessment.id;
denied('mo',{action:'pdpc-review',id,revision:2,decision:'verify'},403);denied('mr',{action:'pdpc-review',id,revision:1,decision:'verify'},409);call('mr',{action:'pdpc-review',id,revision:2,decision:'verify'});assert.equal(d.assessments[0].status,'verified');denied('mo',{action:'save',assessment:{...assessment,revision:3,mutationId:'aaaaaaaa-bbbb-cccc-3333'}},409);
call('mr',{action:'pdpc-review',id,revision:3,decision:'reopen',feedback:'Betulkan maklumat kelas'});assert.equal(d.assessments[0].status,'draft');assert.equal(d.assessments[0].verifiedAt,null);
const firstBefore=structuredClone(d.assessments[0]);
const second={...assessment,stage:'kedua',scores:Array(38).fill(0),evaluator:'Forged reviewer',evidence:['https://example.test/second-proof'],mutationId:'bbbbbbbb-bbbb-cccc-1111'};
for(const actor of ['a','mt','mr'])denied(actor,{action:'save',assessment:second},403);
denied('mo',{action:'save',assessment:{...second,epoch:'old'}},409);
const secondDraft=call('mo',{action:'save',assessment:second}).assessment;assert.equal(secondDraft.total,'0.00');assert.equal(secondDraft.evaluator,'Pencerap','Both observations use the same observer identity');assert.notEqual(secondDraft.id,firstBefore.id);assert.deepEqual(d.assessments.find(a=>a.id===firstBefore.id),firstBefore,'Second observation must not overwrite first');
denied('mo',{action:'save',assessment:{...second,revision:1,status:'submitted',mutationId:'bbbbbbbb-bbbb-cccc-2221',evidence:[]}},400);
const secondSubmitted=call('mo',{action:'save',assessment:{...second,revision:1,status:'submitted',mutationId:'bbbbbbbb-bbbb-cccc-2222'}}).assessment;
denied('mo',{action:'pdpc-review',id:secondSubmitted.id,revision:2,decision:'verify'},403);
call('mr',{action:'pdpc-review',id:secondSubmitted.id,revision:2,decision:'verify'});assert.equal(d.assessments.find(a=>a.id===secondSubmitted.id).status,'verified');assert.deepEqual(d.assessments.find(a=>a.id===firstBefore.id),firstBefore);
const self={...assessment,stage:'kendiri',evidence:['https://example.test/self-proof'],mutationId:'cccccccc-bbbb-cccc-1111'};call('mt',{action:'save',assessment:self});call('mt',{action:'save',assessment:{...self,revision:1,status:'submitted',mutationId:'cccccccc-bbbb-cccc-2222'}});assert.equal(new Set(d.assessments.map(a=>a.id)).size,3);
assert.equal(D.getData(d,d.members.find(m=>m.id==='mo')).teachers.some(t=>t.id==='t'),true);d.pdpc.assignments['2026']=[];assert.equal(D.mayWrite(d,d.members.find(m=>m.id==='mo'),d.teachers[0],'pertama',2026),false);assert.equal(D.mayWrite(d,d.members.find(m=>m.id==='mo'),d.teachers[0],'kedua',2026),false);assert.equal(D.mayWrite(d,d.members.find(m=>m.id==='mt'),d.teachers[0],'kendiri',2026),true);
console.log('PASS PdPc v2: leader-only observer and assigned reviewer, stable IDs, year isolation, stale/reset epoch rejection, zero-safe scoring, submit/verify/reopen, independent review and immediate revocation.');

console.log('PASS Standard 4 evidence: reject missing or newly added unsaved links at submission; allow evidence saved in a prior draft; invalid links leave records unchanged.');

console.log('PASS three Standard 4 sessions: legacy shared observer for both rounds, independent records/scores/evidence/statuses, self assessment, independent reviewer, epoch, year, saved evidence and revocation.');

{
 const {C,V}=await import('./achievement-fixtures.mjs'),doc=structuredClone(d);doc.assessments=[];doc.pdpc.assignments[2026]=assign.rows;
 const observer=doc.members.find(m=>m.id==='mo'),session={...D.session(doc,observer),username:'fixture-observer',displayName:'Fixture Observer'};
 let connected=true,encrypted;
 const transport=async(path,body)=>{if(!connected)throw new C.RequestError('Offline fixture',0);if(path==='/api/session')return {session};if(path==='/api/data'){if(!body)return {...D.getData(doc,observer),session};try{return D.dataCommand(doc,observer,body);}catch(e){throw new C.RequestError(e.message,e.status,e.details);}}throw Error('Unexpected transport');};
 const engine=new C.OfflineEngine(session,()=>connected,transport,async record=>{encrypted=record;});await engine.load();const password='fictional-observer-password';engine.meta=V.vaultMeta(session);engine.key=await V.deriveVaultKey(password,engine.meta.salt);connected=false;
 for(const stage of ['pertama','kedua'])await engine.call({action:'save',assessment:{...assessment,id:'',stage,scores:Array(38).fill(stage==='pertama'?4:0),notes:'Private fixture '+stage}});
 assert.equal(engine.state().pending.length,2);assert.equal(new Set(engine.state().pending.map(p=>p.assessment.id)).size,2);assert.ok(!JSON.stringify(encrypted).includes('Private fixture'));
 const recovered=new C.OfflineEngine(session,()=>connected,transport,async record=>{encrypted=record;});await recovered.unlock(encrypted,password);assert.deepEqual(recovered.state().pending.map(p=>p.assessment.stage).sort(),['kedua','pertama']);connected=true;await recovered.sync();assert.equal(recovered.state().pending.length,0);assert.equal(doc.assessments.length,2);assert.equal(doc.assessments.find(a=>a.stage==='pertama').total,'100.00');assert.equal(doc.assessments.find(a=>a.stage==='kedua').total,'0.00');
 console.log('PASS offline observation rounds: separate encrypted drafts, recovery and sync preserve both records and zero scores.');
}

{
 const claim={action:'pdpc-claim-observation',year:2027,stage:'pertama',teacherId:'t',revision:d.pdpc.revision};
 denied('mt',claim,403);
 denied('mo',{...claim,teacherId:'o'},400);
 call('mo',claim);
 denied('mr',claim,409);
 denied('mr',{...claim,revision:d.pdpc.revision},409);
 assert.deepEqual(d.pdpc.assignments['2027'],[{teacherId:'t',observerId:'mo',observer2Id:null,reviewerId:null}]);
 assert.deepEqual(D.getData(d,d.members.find(m=>m.id==='mr')).pdpc.occupiedObservations['2027'].pertama,['t']);
 assert.equal(D.getData(d,d.members.find(m=>m.id==='mt')).pdpc.occupiedObservations,undefined);
 assert.equal(D.mayWrite(d,d.members.find(m=>m.id==='mo'),d.teachers[0],'pertama',2027),true);
 assert.equal(D.mayWrite(d,d.members.find(m=>m.id==='mo'),d.teachers[0],'kedua',2027),false);
 console.log('PASS PdPc self-assignment: eligible leaders only, no self-observation or reassignment, independent rounds and year.');
}

{
 const kendiri={...assessment,year:2028,stage:'kendiri',mutationId:'dddddddd-bbbb-cccc-1111'};
 denied('mo',{action:'save',assessment:kendiri},403);
 const saved=call('a',{action:'save',assessment:kendiri}).assessment;
 assert.equal(saved.evaluator,'Guru');
 assert.equal(saved.updatedBy,'a');
 const remove={action:'pdpc-delete-assessment',id:saved.id,year:saved.year,stage:saved.stage,revision:saved.revision,updatedAt:saved.updatedAt,epoch:saved.epoch};
 denied('mt',remove,403);
 denied('a',{...remove,stage:'pertama'},409);
 const other=d.assessments.filter(a=>a.id!==saved.id);
 call('a',remove);
 assert.deepEqual(d.assessments,other);
 assert.equal(d.audit.at(-1).action,'pdpc_assessment_deleted');
 const recreated=call('a',{action:'save',assessment:{...kendiri,mutationId:'dddddddd-bbbb-cccc-2222'}}).assessment;
 assert.ok(recreated.revision>saved.revision);
 denied('a',remove,409);
 denied('a',{action:'save',assessment:{...saved,mutationId:'dddddddd-bbbb-cccc-3333'}},409);
 console.log('PASS Admin kendiri and scoped assessment deletion, including stale versions after recreation.');
}

{
 const observation={...assessment,year:2027,mutationId:'eeeeeeee-bbbb-cccc-1111'};
 const saved=call('mo',{action:'save',assessment:observation}).assessment;
 const remove={action:'pdpc-delete-assessment',id:saved.id,year:saved.year,stage:saved.stage,revision:saved.revision,updatedAt:saved.updatedAt,epoch:saved.epoch};
 denied('mr',remove,403);
 denied('mt',remove,403);
 saved.status='verified';
 denied('mo',remove,403);
 saved.status='draft';
 call('mo',remove);
 assert.ok(!d.assessments.some(a=>a.id===saved.id));
 assert.equal(d.pdpc.assignments['2027'][0].observerId,'mo');
 console.log('PASS assigned observer deletion with verified record protection.');
}

{
 const release={action:'pdpc-release-observation',teacherId:'t',year:2027,stage:'pertama',revision:d.pdpc.revision};
 denied('mr',release,403);
 const saved=call('mo',{action:'save',assessment:{...assessment,year:2027,mutationId:'ffffffff-bbbb-cccc-1111'}}).assessment;
 denied('mo',release,409);
 call('mo',{action:'pdpc-delete-assessment',id:saved.id,year:saved.year,stage:saved.stage,revision:saved.revision,updatedAt:saved.updatedAt,epoch:saved.epoch});
 call('mo',release);
 assert.equal(d.pdpc.assignments['2027'][0].observerId,null);
 denied('mo',release,409);
 call('mr',{...release,action:'pdpc-claim-observation',revision:d.pdpc.revision});
 assert.equal(d.pdpc.assignments['2027'][0].observerId,'mr');
 console.log('PASS observation release protects existing records and frees the slot for reassignment.');
}
