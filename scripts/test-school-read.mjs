import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
const src=fs.readFileSync('migration/backend/index.ts','utf8');const ast=ts.createSourceFile('index.ts',src,ts.ScriptTarget.Latest,true);
const names=['isReadOnlySchoolRequest','load','commit'];
const code=names.map(name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(ast)).join('\n');
const row={id:'school',enabled:true,data:{audit:[],members:[],sessions:[],invitations:[]}};
let rpc=0,full=0,updates=0;
const db={rpc:async(name,args)=>{assert.equal(name,'s4_read_school');assert.equal(args.p_id,'school');rpc++;return {data:structuredClone(row)}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{full++;return {data:structuredClone(row)}}})}),update:()=>{updates++;throw Error('unexpected write')}})};
const {isReadOnlySchoolRequest:read,load,commit}=new Function('db','fail','now','Retry',ts.transpile(code,{target:ts.ScriptTarget.ES2022})+';return {isReadOnlySchoolRequest,load,commit}')(db,(message)=>{throw Error(message)},()=>'',Error);
for(const path of ['/api/strength','/api/management','/api/achievement','/api/resources']){assert.equal(read({path,method:'POST',body:{action:'load'}}),true);for(const action of ['save','submit','assign','verify','delete','script-upload'])assert.equal(read({path,method:'POST',body:{action}}),false);}
assert.equal(read({path:'/api/management',method:'POST',body:{action:'status'}}),true);
assert.equal(read({path:'/api/data',method:'GET'}),true);
for(const path of ['/api/session','/api/school','/api/owner','/api/ppd'])assert.equal(read({path,method:'GET'}),false);
const light=await load('school',false,true);assert.equal(light.readOnly,true);assert.equal(rpc,1);assert.equal(full,0);
await assert.rejects(()=>commit(light),/read-only/);assert.equal(updates,0);
const complete=await load('school');assert.equal(complete.readOnly,false);assert.equal(full,1);
console.log('PASS: server-only lightweight reads, full-document mutation routing and fail-closed projection persistence guard');
