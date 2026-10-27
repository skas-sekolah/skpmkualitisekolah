import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Exercise the real Edge request handler with an in-memory Auth/Data API.
const compile=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const modules=new Map();
function moduleURL(file){
 if(modules.has(file))return modules.get(file);
 let source=fs.readFileSync(file,'utf8');
 source=source.replace(/import source from '\.\/rubric.json' with \{type:'json'\};/,'const source='+fs.readFileSync('migration/backend/rubric.json','utf8')+';');
 source=source.replace(/from '(\.\/[^']+\.ts)'/g,(_,rel)=>'from '+JSON.stringify(moduleURL(path.resolve(path.dirname(file),rel))));
 source=source.replace("import {createClient} from 'npm:@supabase/supabase-js@2.102.0';",'const createClient=()=>globalThis.__schoolTestDB;');
 const url=compile(source);modules.set(file,url);return url;
}
const rows=new Map(),users=new Map();let handler,conflict=false,writes=0,insertedConfig;
const clone=x=>structuredClone(x);
const db={
 from(table){
  assert.equal(table,'s4_schools');let mode='read',value,filters=[];
  const query={
   select(){return query;},eq(k,v){filters.push([k,v]);return query;},
   insert(v){mode='insert';value=v;return query;},update(v){mode='update';value=v;return query;},delete(){mode='delete';return query;},
   maybeSingle(){return query.then(r=>({...r,data:r.data[0]??null}));},
   then(resolve,reject){return Promise.resolve().then(()=>{
    if(mode==='insert'){
     if([...rows.values()].some(r=>r.code===value.code))return {data:null,error:{code:'23505'}};
     insertedConfig=clone(value.data.pdpc);rows.set(value.id,clone(value));writes++;return {data:null,error:null};
    }
    const matching=[...rows.values()].filter(r=>filters.every(([k,v])=>r[k]===v));
    if(mode==='update'&&conflict&&matching.length){conflict=false;matching[0].revision++;matching[0].data.concurrentChange='preserved';return {data:[],error:null};}
    if(mode==='update')for(const row of matching){Object.assign(row,clone(value));writes++;}
    if(mode==='delete')for(const row of matching){rows.delete(row.id);writes++;}
    return {data:clone(matching),error:null};
   }).then(resolve,reject);}
  };return query;
 },
 async rpc(){return {data:true,error:null};},
 auth:{
  async getUser(token){return {data:{user:users.has(token)?{id:token}:null},error:null};},
  admin:{
   async createUser({email,password}){const id=crypto.randomUUID();users.set(id,{email,password});return {data:{user:{id}},error:null};},
   async getUserById(id){return {data:{user:users.get(id)},error:null};}
  }
 }
};
const oldFetch=globalThis.fetch;
globalThis.__schoolTestDB=db;
globalThis.Deno={env:{get:key=>key==='SUPABASE_URL'?'https://fixture.invalid':'fixture-key'},serve:h=>{handler=h;}};
globalThis.fetch=async(url,init)=>{
 assert.ok(String(url).startsWith('https://fixture.invalid/auth/v1/token?grant_type=password'));
 const b=JSON.parse(init.body),user=[...users.entries()].find(([,u])=>u.email===b.email&&u.password===b.password);
 return Response.json(user?{user:{id:user[0]},access_token:user[0],refresh_token:'fixture-refresh'}:{error:'invalid'}, {status:user?200:401});
};
await import(moduleURL(path.resolve('migration/backend/index.ts')));
const D=await import(moduleURL(path.resolve('migration/backend/domain.ts')));
async function request({path='/api/data',method='GET',body,schoolId,sid,token,expected}){
 const response=await handler(new Request('https://fixture.invalid/standard4-api',{method:'POST',headers:{'content-type':'application/json',origin:'https://skas-sekolah.github.io',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({path,method,body,schoolId,sid,expected})}));
 return {status:response.status,data:await response.json()};
}
function school(code,{pdpc,assessments=[]}={}){
 const id=crypto.randomUUID(),uid=crypto.randomUUID(),sid=D.secret(),memberId=crypto.randomUUID();
 users.set(uid,{email:uid+'@fixture.invalid',password:'fixture-password'});
 const d={school:{id,code,name:'Fixture school'},teachers:[{id:'t',name:'Guru Rekaan',type:'perdana',position:'GAB'},{id:'o',name:'Pencerap Rekaan',type:'perdana',position:'PK HEM'}],assessments,members:[{id:memberId,schoolId:id,authUserId:uid,username:'admin',displayName:'Admin Rekaan',role:'admin',active:1,teacherId:null}],sessions:[],invitations:[],imports:[],audit:[],...(pdpc?{pdpc}:{}),strength:{2026:{fixture:'unchanged'}}};
 const context={schoolId:id,token:uid,sid,expected:memberId};
 return {d,context,async save(){d.sessions=[{hash:await D.hash(sid),memberId,expiresAt:'2100-01-01'}];rows.set(id,{id,code,enabled:true,revision:9,data:clone(d)});}};
}
try{
 const reserved=await request({path:'/api/session',method:'POST',body:{action:'register-school',schoolCode:'SUPERADMIN',schoolName:'Fixture reserved',displayName:'Fixture',username:'superadmin',password:'fixture-password'}});assert.equal(reserved.status,403);assert.equal(rows.size,0,'Public registration must not claim owner identity');
 const wrongOwnerID=await request({path:'/api/session',method:'POST',body:{action:'login',schoolCode:'SUPERADMIN',username:'somebody',password:'fixture-password'}});assert.equal(wrongOwnerID.status,401);
 const registered=await request({path:'/api/session',method:'POST',body:{action:'register-school',schoolCode:'NEW001',schoolName:'Sekolah Rekaan Baharu',displayName:'Admin Rekaan',username:'admin',password:'fixture-password'}});
 assert.equal(registered.status,200);assert.equal(insertedConfig.version,2,'Config must exist on the first INSERT');
 const t=registered.data.tokens,context={schoolId:t.schoolId,sid:t.sid,token:t.accessToken,expected:registered.data.session.memberId};
 const data=await request(context);assert.equal(data.status,200);assert.equal(data.data.pdpc.version,2);assert.deepEqual(data.data.teachers,[]);
 assert.equal((await request({...context,method:'POST',body:{action:'pdpc-assignments',year:2026,revision:0,rows:[]}})).status,200);
 const saved=clone(rows.get(context.schoolId)),repeat=await request(context);assert.equal(repeat.data.pdpc.epoch,saved.data.pdpc.epoch);assert.deepEqual(rows.get(context.schoolId),saved,'Repeat reads must not write');

 const missing=school('FIX001');await missing.save();const before=clone(rows.get(missing.context.schoolId));
 const invalid=await request({...missing.context,expected:'other-member'});assert.equal(invalid.status,409);assert.deepEqual(rows.get(missing.context.schoolId),before,'Rejected identity cannot initialize a school');
 const foreign=await request({...missing.context,token:t.accessToken});assert.equal(foreign.status,401);assert.deepEqual(rows.get(missing.context.schoolId),before,'Another school cannot initialize this school');
 const repaired=await request(missing.context);assert.equal(repaired.status,200);assert.equal(repaired.data.pdpc.version,2);assert.equal(rows.get(missing.context.schoolId).revision,10);
 const after=clone(rows.get(missing.context.schoolId));delete after.data.pdpc;assert.deepEqual(after.data,before.data,'Recovery preserves roster, marks, members and other modules');
 const assignment=await request({...missing.context,method:'POST',body:{action:'pdpc-assignments',year:2026,revision:0,rows:[{teacherId:'t',observerId:'teacher:o',observer2Id:'teacher:o',reviewerId:'teacher:o'}]}});assert.equal(assignment.status,200,'Recovered settings must accept assignments');assert.equal(rows.get(missing.context.schoolId).revision,11,'Recovery must advance the local CAS revision before a later write');

 const concurrent=school('FIX002');await concurrent.save();conflict=true;
 const retry=await request(concurrent.context);assert.equal(retry.status,200);assert.equal(rows.get(concurrent.context.schoolId).data.concurrentChange,'preserved');assert.equal(rows.get(concurrent.context.schoolId).revision,11);
 const login=school('FIX003');await login.save();
 const signedIn=await request({path:'/api/session',method:'POST',body:{action:'login',schoolCode:'FIX003',username:'admin',password:'fixture-password'}});assert.equal(signedIn.status,200);assert.equal(rows.get(login.context.schoolId).data.pdpc.version,2);

 const existing=school('FIX004',{pdpc:{version:2,epoch:'existing',revision:7,assignments:{2026:[{teacherId:'t',observerId:'teacher:o',reviewerId:'teacher:o'}]}},assessments:[{id:'existing-record',teacherId:'t',year:2026,stage:'pertama',epoch:'existing',total:'88.00',status:'verified'}]});await existing.save();const preserved=clone(rows.get(existing.context.schoolId));assert.equal((await request(existing.context)).status,200);assert.deepEqual(rows.get(existing.context.schoolId),preserved);
 const legacy=school('FIX005',{assessments:[{id:'legacy-record',teacherId:'t',year:2026,total:'72.00'}]});await legacy.save();const legacyBefore=clone(rows.get(legacy.context.schoolId));assert.equal((await request(legacy.context)).status,200);assert.deepEqual(rows.get(legacy.context.schoolId),legacyBefore,'Legacy assessments require an explicit migration; never reset them during login');
 const archived=school('FIX006');await archived.save();rows.get(archived.context.schoolId).enabled=false;const archivedBefore=clone(rows.get(archived.context.schoolId));assert.equal((await request(archived.context)).status,423);assert.deepEqual(rows.get(archived.context.schoolId),archivedBefore);
 assert.ok(writes>0);
 console.log('PASS school registration and recovery: initial config, active-session/login recovery, assignment save, idempotency, CAS retry, school isolation, rejected/disabled access, existing settings/marks and legacy preservation.');
}finally{globalThis.fetch=oldFetch;delete globalThis.Deno;delete globalThis.__schoolTestDB;}
