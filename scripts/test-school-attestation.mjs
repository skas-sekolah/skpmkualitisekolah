import assert from 'node:assert/strict';
import {compile,read,domain,scoring,strength,management,model,api,scoreFixture,complete} from './achievement-fixtures.mjs';
const sm=await import(strength),mm=await import(management),am=await import(model);
const sa=compile(read('migration/backend/strength-api.ts').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./strength-model.ts'",JSON.stringify(strength)));
const ma=compile(read('migration/backend/management-api.ts').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./scoring.ts'",JSON.stringify(scoring)).replace("'./management-model.ts'",JSON.stringify(management)));
let source=read('migration/backend/school-attestation.ts');for(const [k,v] of Object.entries({'./domain.ts':domain,'./scoring.ts':scoring,'./strength-model.ts':strength,'./strength-api.ts':sa,'./management-model.ts':management,'./management-api.ts':ma,'./achievement-model.ts':model,'./achievement-api.ts':api}))source=source.replaceAll("'"+k+"'",JSON.stringify(v));
const {schoolAttestation:call}=await import(compile(source));
const d=scoreFixture(),pgb=d.members.find(m=>m.id==='reviewer'),admin=d.members[0];
const body={action:'final-load',year:2026};
await assert.rejects(()=>call(d,d.members[4],body),e=>e.status===403);assert.equal((await call(d,admin,body)).canAttest,false);
await assert.rejects(()=>call(d,admin,{...body,action:'final-attest'}),e=>e.status===403);await assert.rejects(()=>call(d,pgb,{...body,action:'final-attest'}),e=>e.status===409);
d.strength={2026:{}};for(const a of sm.ASPECTS){const r=sm.emptyStrengthRecord(a.id,2026);r.status='submitted';r.data.notes='Sumber rekaan lengkap';r.data.evidence=['https://example.test/evidence'];for(const f of sm.FIELDS[a.id]??[])r.data.values[f.key]=0;if(sm.HAS_INVENTORY.includes(a.id))r.data.none=true;d.strength[2026][a.id]=r;}
d.management={2026:{}};for(const u of mm.MANAGEMENT_UNITS){const r=mm.emptyManagementRecord(u.id,2026);r.status='submitted';const data=mm.emptyManagementData();data.evidence=['https://example.test/evidence'];for(const a of u.actions)data.scores[a.id]=4;if(mm.aggregateUnit(u.id)){r.data={...data,mode:'unit-actions',rows:[{id:'row',name:'UNIT REKAAN',memberIds:[],status:'submitted',data}]};}else r.data=data;d.management[2026][u.id]=r;}
d.achievement={2026:{}};for(const a of am.ACHIEVEMENT_ITEMS){const r=am.emptyAchievementRecord(a.id,2026);r.status='submitted';r.data=complete(a.id);d.achievement[2026][a.id]=r;}
for(const t of d.teachers)for(const stage of ['kendiri','pertama','kedua'])d.assessments.push({id:t.id+stage,teacherId:t.id,stage,year:2026,status:'submitted',scores:Array(38).fill(3),revision:1});
let view=await call(d,pgb,body);assert.equal(view.ready,true,JSON.stringify(view.rows.filter(r=>!r.ready)));assert.equal(view.current,false);assert.ok(view.rows.every(r=>r.ready));
const snapshot=JSON.stringify({strength:d.strength,management:d.management,achievement:d.achievement,assessments:d.assessments});
await assert.rejects(()=>call(d,pgb,{...body,action:'final-attest',fingerprint:view.fingerprint,revision:view.revision}),e=>e.status===400);
view=await call(d,pgb,{...body,action:'final-attest',confirmed:true,fingerprint:view.fingerprint,revision:view.revision});assert.equal(view.current,true);assert.equal(view.declaration.by,pgb.id);assert.equal(JSON.stringify({strength:d.strength,management:d.management,achievement:d.achievement,assessments:d.assessments}),snapshot);
await assert.rejects(()=>call(d,pgb,{...body,action:'final-attest',confirmed:true,fingerprint:view.fingerprint,revision:0}),e=>e.status===409);
d.strength[2026].A1.revision++;assert.equal((await call(d,pgb,body)).current,false);await assert.rejects(()=>call(d,pgb,{...body,action:'final-attest',confirmed:true,fingerprint:view.fingerprint,revision:view.revision}),e=>e.status===409);
view=await call(d,pgb,body);await call(d,pgb,{...body,action:'final-attest',confirmed:true,fingerprint:view.fingerprint,revision:view.revision});d.assessments[0].status='draft';assert.equal((await call(d,pgb,body)).ready,false);assert.equal((await call(d,pgb,body)).current,false);
pgb.active=0;await assert.rejects(()=>call(d,pgb,body),e=>e.status===403);
console.log('PASS school final attestation: PGB-only, active membership, all modules submitted without individual verification, completeness, confirmation, stale/duplicate conflicts, invalidation after changes, audit and no source-score mutations.');

// Module verification is independent of all other modules and updates statuses atomically.
pgb.active=1;d.management[2026]['1.1.1'].status='draft';d.achievement[2026]['5.1.1'].status='draft';
const moduleBody={action:'final-load',year:2026,module:'strength'};
let moduleView=await call(d,pgb,moduleBody);assert.equal(moduleView.ready,true);assert.equal(moduleView.rows.length,9);assert.ok(moduleView.rows.every(r=>r.module==='Kekuatan Kami'));
const beforeData=JSON.stringify(Object.values(d.strength[2026]).map(r=>r.data)),otherBefore=JSON.stringify(d.management);
moduleView=await call(d,pgb,{...moduleBody,action:'final-attest',fingerprint:moduleView.fingerprint,revision:moduleView.revision,confirmed:true});assert.equal(moduleView.current,true);assert.ok(Object.values(d.strength[2026]).every(r=>r.status==='verified'&&r.verifiedBy===pgb.id));assert.equal(JSON.stringify(Object.values(d.strength[2026]).map(r=>r.data)),beforeData);assert.equal(JSON.stringify(d.management),otherBefore);
d.achievement[2026]['5.1.1'].revision++;assert.equal((await call(d,pgb,moduleBody)).current,true);d.strength[2026].A1.revision++;assert.equal((await call(d,pgb,moduleBody)).current,false);
// Existing prohibition on certifying one's own entered scores also applies to a batch.
d.strength[2026].A1.status='submitted';d.strength[2026].A1.lastEditorId=pgb.id;const atomic=JSON.stringify(d.strength);moduleView=await call(d,pgb,moduleBody);assert.equal(moduleView.ready,false);await assert.rejects(()=>call(d,pgb,{...moduleBody,action:'final-attest',confirmed:true,fingerprint:moduleView.fingerprint,revision:moduleView.revision}),e=>e.status===409);assert.equal(JSON.stringify(d.strength),atomic);
console.log('PASS independent module verification: all A1–A9 in one batch, unrelated incomplete modules allowed, status updates, preserved values/other modules, isolated invalidation and no self-verification.');
d.strength[2026].A1.lastEditorId=admin.id;
const hostel=d.strength[2026].A8;hostel.status='submitted';hostel.data={...sm.emptyStrengthData(),applicable:false};hostel.lastEditorId=admin.id;
moduleView=await call(d,pgb,moduleBody);const hostelRow=moduleView.rows.find(r=>r.id==='A8');assert.equal(hostelRow.ready,true);assert.deepEqual(hostelRow.issues,[]);assert.match(hostelRow.score,/Tidak berkenaan/);assert.equal(moduleView.ready,true);
const noHostelData=JSON.stringify(hostel.data);await call(d,pgb,{...moduleBody,action:'final-attest',confirmed:true,fingerprint:moduleView.fingerprint,revision:moduleView.revision});assert.equal(d.strength[2026].A8.status,'verified');assert.equal(JSON.stringify(d.strength[2026].A8.data),noHostelData);
console.log('PASS grouped PGB verification: submitted no-hostel declaration does not block A1–A9 confirmation and no hostel scores/evidence are invented.');
