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
