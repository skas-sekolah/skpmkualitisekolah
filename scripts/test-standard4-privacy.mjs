import assert from 'node:assert/strict';
import {domain,client} from './achievement-fixtures.mjs';
const D=await import(domain),C=await import(client);
const teachers=[{id:'t1',name:'Guru biasa',type:'perdana',position:'GAB'},{id:'t2',name:'Pentadbir',type:'perdana',position:'PK HEM'},{id:'t3',name:'PGB',type:'perdana',position:'GURU BESAR'}];
const members=[{id:'guru',role:'member',teacherId:'t1',active:1},{id:'pk',role:'member',teacherId:'t2',active:1},{id:'pgb',role:'member',teacherId:'t3',active:1},{id:'admin',role:'admin',active:1}];
const record={id:'a',teacherId:'t1',year:2026,stage:'kendiri',scores:Array(38).fill(3),status:'draft',epoch:'e'};
for(const modern of [false,true]){
 const d={school:{id:'school',code:'TRY001'},teachers,assessments:[record],members,imports:[],sessions:[],invitations:[],audit:[],...(modern?{pdpc:{version:2,epoch:'e',revision:1,assignments:{2026:[{teacherId:'t1',observerId:'guru',observer2Id:'pk'}]}}}:{})};
 const guru=members[0];assert.equal(D.canAccessStandard4(d,guru),false);assert.equal(D.mayView(d,guru,teachers[0]),false);assert.equal(D.mayWrite(d,guru,teachers[0],'kendiri',2026),false);
 const view=D.getData(d,guru);assert.deepEqual(view.assessments,[]);assert.deepEqual(view.teachers,[]);assert.equal(view.pdpc,undefined);
 for(const action of ['save','reopen','pdpc-review','pdpc-claim-observation','pdpc-delete-assessment'])assert.throws(()=>D.dataCommand(d,guru,{action,assessment:record}),e=>e.status===403);
 for(const m of members.slice(1))assert.equal(D.canAccessStandard4(d,m),true);
 assert.equal(D.getData(d,members[3]).assessments.length,1);
}
for(const role of ['isAdmin','isSuperAdmin','isSchoolLeader','isPGB'])assert.equal(C.canAccessStandard4({[role]:true}),true);
assert.equal(C.canAccessStandard4({}),false);assert.equal(C.canAccessStandard4({isPPD:true}),false);
const session={memberId:'guru',schoolId:'school',isAdmin:false,teacherId:'t1'};
const engine=new C.OfflineEngine(session,()=>false);engine.key={};engine.snapshot={data:{session,teachers,assessments:[record],pdpc:{version:2},rosterInfo:null},pending:[{assessment:record}],offlineUntil:'2099-01-01',savedAt:''};
assert.deepEqual((await engine.load()).assessments,[]);assert.equal((await engine.load()).pdpc,undefined);assert.deepEqual(engine.state().pending,[]);
await assert.rejects(()=>engine.call({action:'save',assessment:record}),e=>e.status===403);
C.configureClient(engine);assert.deepEqual(C.pdpcPending(),[]);C.configureClient(null);
console.log('PASS Standard 4 privacy: ordinary teachers denied read/write, privileged roles retained, legacy and offline protected.');
