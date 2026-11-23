import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const text=fs.readFileSync('app/skas-portal.tsx','utf8'),ast=ts.createSourceFile('portal.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const component=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='SKASPortal');
const effects=component.body.statements.filter(s=>ts.isExpressionStatement(s)&&ts.isCallExpression(s.expression)&&s.expression.expression.getText(ast)==='useEffect').map(s=>s.getText(ast)).filter(s=>s.includes('appApi<AppData>()')&&s.includes('setAccess')||s.includes('managementApi(')&&s.includes('setOtherTasks'));
assert.equal(effects.length,2);
const compiled=ts.transpileModule(`export function mount(ctx){const {useEffect,window,year,session,page,taskModule,appApi,managementApi,achievementApi,setAccess,setOtherTasks,setTaskLoading,setTaskError}=ctx;${effects.join('\n')}}`,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {mount}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
export async function harness(failures=[],year=2026){const calls={data:0,management:0,achievement:0},listeners=new Map(),cleanups=[],pending=[];let access={},tasks=null,error='',loading=false;
 const load=kind=>()=>{calls[kind]++;if(failures.includes(kind))return Promise.reject(Error('offline'));return new Promise(resolve=>pending.push(()=>resolve(kind==='data'?{teachers:[{id:'fixture'}]}:{isPGB:true,records:[{canRead:true,id:kind}]})));};
 mount({year,session:{memberId:'fixture'},page:'home',taskModule:'mine',useEffect:f=>cleanups.push(f()),window:{addEventListener:(event,f)=>{if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(f);},removeEventListener:(event,f)=>listeners.get(event)?.delete(f)},appApi:load('data'),managementApi:load('management'),achievementApi:load('achievement'),setAccess:f=>access=typeof f==='function'?f(access):f,setOtherTasks:v=>tasks=v,setTaskLoading:v=>loading=v,setTaskError:v=>error=v});
 return {calls,flush:async()=>{pending.splice(0).forEach(f=>f());await tick();},emit:event=>listeners.get(event)?.forEach(f=>f()),stop:()=>cleanups.forEach(f=>f()),state:()=>({access,tasks,error,loading}),listeners};}
const h=await harness();assert.deepEqual(h.calls,{data:1,management:1,achievement:1});await h.flush();assert.equal(h.state().tasks.management[0].id,'management');assert.equal(h.state().access.standard4,true);assert.equal(h.state().access.management,true);assert.equal(h.state().access.achievement,true);assert.equal(h.state().loading,false);
h.emit('online');assert.deepEqual(h.calls,{data:2,management:2,achievement:2});await h.flush();h.emit('s4-data-changed');assert.deepEqual(h.calls,{data:3,management:3,achievement:3});h.stop();await h.flush();assert.ok([...h.listeners.values()].every(s=>s.size===0));
const failed=await harness(['achievement']);await failed.flush();assert.equal(failed.state().access.management,true,'Successful module access survives another module failing');assert.equal(failed.state().access.achievement,false);assert.ok(failed.state().error);assert.equal(failed.state().tasks,null);assert.equal(failed.state().loading,false);failed.stop();
console.log('PASS startup loading: one read per module, shared access/tasks, reconnect/change refresh, cleanup and independent access on partial failure.');

// Render the dashboard against the same bundles as the task/access loader.
const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const fixtures=await import('./achievement-fixtures.mjs'),S=await import(fixtures.strength),M=await import(fixtures.management),A=await import(fixtures.model);
const previousWindow=globalThis.window;globalThis.window=new EventTarget();
let reads=0;globalThis.__startupSummary={useEffect:f=>f(),useState:v=>[v,()=>{}],resourcesAPI:async()=>{reads++;return {};}};
let summary="import React from 'react';\n"+fs.readFileSync('app/progress-summary.tsx','utf8');
summary=summary.replace("import {resourcesAPI} from './drive-evidence';",'const {resourcesAPI}=globalThis.__startupSummary;').replace("import {useEffect,useState} from 'react';",'const {useEffect,useState}=globalThis.__startupSummary;').replace(/import \{managementPending[^\n]+from '.\/app-client';/, 'const managementPending=()=>[],achievementPending=()=>[],strengthPending=()=>[];');
summary=summary.replaceAll("'react'",JSON.stringify(import.meta.resolve('react'))).replaceAll("'../migration/backend/strength-model'",JSON.stringify(fixtures.strength)).replaceAll("'../migration/backend/management-model'",JSON.stringify(fixtures.management)).replaceAll("'../migration/backend/achievement-model'",JSON.stringify(fixtures.model));
const code=ts.transpileModule(summary,{fileName:'summary.tsx',compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {default:Summary}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const bundles={management:[{...M.emptyManagementRecord('1.1.1',2026),canRead:true}],achievement:[{...A.emptyAchievementRecord('5.4.1',2026),canRead:true}]},before=structuredClone(bundles);
const props={moduleData:bundles,year:2026,strength:{records:[{...S.emptyStrengthRecord('A1',2026),canRead:true}]},onOpen:()=>{}};
const html=renderToStaticMarkup(Summary(props));assert.ok(html.includes('1.1.1'));assert.ok(html.includes('5.4.1'));assert.deepEqual(bundles,before);assert.equal(reads,1,'Only the separate resources summary is read; management/achievement use parent bundles');
assert.ok(renderToStaticMarkup(Summary({...props,moduleData:null,moduleError:'Fixture network error'})).includes('Fixture network error'));
globalThis.window=previousWindow;delete globalThis.__startupSummary;
console.log('PASS shared dashboard bundles: both modules rendered without extra reads, error state and source records unchanged.');
