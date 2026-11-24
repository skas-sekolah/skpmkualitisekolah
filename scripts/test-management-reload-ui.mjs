import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import * as icons from 'lucide-react';
import {management as modelURL} from './achievement-fixtures.mjs';
const model=await import(modelURL);
let states=[],refs=[],cursor=0,refCursor=0,confirmed=true,uploading=false,loads=0,failLoad=false;
const effects=[];
const context={React,...Object.fromEntries(['BookOpen','ClipboardList','CheckCircle2','Clock3','FileText','RefreshCw','Save','Send','Printer','Download','ShieldCheck','ArrowRight','Info','ExternalLink','X'].map(k=>[k,icons[k]])),...model,
 useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},
 useRef(initial){const i=refCursor++;return refs[i]??=( {current:initial} );},useEffect(){},
 resourcesAPI:async()=>({}),managementPending:()=>[],subscribeManagement:()=>()=>{},uploadsActive:()=>uploading,
 managementApi:async body=>{loads++;assert.equal(body.fresh,true);if(failLoad)throw Error('Server unavailable');return bundle;},
};
for(const name of ['TemplatePrint','AssignmentBoard','UnitAssignmentFields','ScoreFields','ScoreResult','ScoreReport','SchoolSummary','PilotLegend','EvidenceInput'])context[name]=()=>null;
context.standardGuideStyles='';context.scoringStyles='';context.percent=v=>v+'%';
const source=fs.readFileSync('app/management-ui.tsx','utf8').replace(/^import .*;\n/gm,'');
const js=ts.transpileModule(source,{fileName:'reload.tsx',compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};new Function('exports',...Object.keys(context),js)(exports,...Object.values(context));
const session={isAdmin:true,memberId:'admin',schoolCode:'TEST'};
const record={...model.emptyManagementRecord('1.1.1',2026),canRead:true,canEdit:true};
const bundle={school:{code:'TEST',name:'Fixture'},records:[record],people:[]};
globalThis.window={confirm:()=>confirmed};
function render(){cursor=0;refCursor=0;return exports.default({session,year:2026,onDirty:v=>effects.push(v),onStandard4(){},initialView:'form'});}
function nodes(n){return !n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];}
function reload(){return nodes(render()).find(n=>n.type==='button'&&React.Children.toArray(n.props.children).some(c=>c===' Muat semula'));}
render();states[3]=bundle;states[4]=false;states[8]=true;
const draft={...model.emptyManagementData(),scores:{a:0,b:4},notes:'Unsaved note',evidence:['https://example.test/evidence']};refs[0].current=draft;
assert.equal(reload().props.disabled,false,'Unsaved edits must not disable recovery');
confirmed=false;await reload().props.onClick();assert.equal(loads,0);assert.equal(states[8],true);assert.equal(states[15].length,0);
confirmed=true;uploading=true;await reload().props.onClick();assert.equal(loads,0);assert.equal(states[8],true);
uploading=false;states[10]=false;await reload().props.onClick();assert.equal(loads,0);assert.equal(states[8],true);
states[10]=true;failLoad=true;await reload().props.onClick();assert.equal(loads,1);assert.equal(states[8],true,'Failure retains editable draft');assert.equal(states[15][0].data.scores.a,0);
failLoad=false;await reload().props.onClick();assert.equal(loads,2);assert.equal(states[8],false);assert.equal(states[5],false);assert.equal(states[15].length,2,'Earlier recovery copies are retained');assert.deepEqual(states[15][1].data,draft);draft.notes='changed later';assert.equal(states[15][1].data.notes,'Unsaved note');assert.equal(effects.at(-1),false);
assert.ok(nodes(render()).some(n=>n.props?.['aria-label']==='Salinan sebelum muat semula'));
states[5]=true;assert.equal(reload().props.disabled,true);
delete globalThis.window;
console.log('PASS management reload: dirty button enabled; cancel, upload and offline guards; failed fetch retains edits; successful fetch clears dirty only after backup; zeros, notes, evidence and prior copies retained.');
