import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';
const compile=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const scoring=compile(fs.readFileSync('migration/backend/scoring.ts','utf8').replace("import source from './rubric.json' with {type:'json'};",'const source='+fs.readFileSync('migration/backend/rubric.json','utf8')+';'));
const domain=compile(fs.readFileSync('migration/backend/domain.ts','utf8').replace("'./scoring.ts'",JSON.stringify(scoring))),strength=compile(fs.readFileSync('migration/backend/strength-model.ts','utf8')),management=compile(fs.readFileSync('migration/backend/management-model.ts','utf8'));
const sa=compile(fs.readFileSync('migration/backend/strength-api.ts','utf8').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./strength-model.ts'",JSON.stringify(strength)));
const ma=compile(fs.readFileSync('migration/backend/management-api.ts','utf8').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./management-model.ts'",JSON.stringify(management)).replace("'./scoring.ts'",JSON.stringify(scoring)));
const achievement=compile(fs.readFileSync('migration/backend/achievement-model.ts','utf8'));
const aa=compile(fs.readFileSync('migration/backend/achievement-api.ts','utf8').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./achievement-model.ts'",JSON.stringify(achievement)));
let source=fs.readFileSync('migration/backend/resources-api.ts','utf8');for(const [key,value] of Object.entries({'./scoring.ts':scoring,'./resources-model.ts':compile(fs.readFileSync('migration/backend/resources-model.ts','utf8')),'./achievement-api.ts':aa,'./achievement-model.ts':achievement,'./domain.ts':domain,'./strength-model.ts':strength,'./management-model.ts':management,'./strength-api.ts':sa,'./management-api.ts':ma}))source=source.replace(JSON.stringify(key),JSON.stringify(value)).replace("'"+key+"'",JSON.stringify(value));
const R=await import(compile(source)),M=await import(management),S=await import(strength),A=await import(ma);
const fixture=()=>({school:{id:'fixture-school',code:'UJI',name:'Sekolah Fixture'},teachers:[],assessments:[],members:[{id:'admin',role:'admin',active:1},{id:'p1',role:'member',active:1},{id:'p2',role:'member',active:1},{id:'review',role:'member',active:1},{id:'inactive',role:'member',active:0}],audit:[],sessions:[],invitations:[],imports:[]});
const d=fixture();for(const member of d.members.filter(m=>m.role!=='admin'&&m.active===1)){member.teacherId='t-'+member.id;d.teachers.push({id:member.teacherId,name:member.id,type:'perdana',position:'PK HEM'});}const originalTeachers=structuredClone(d.teachers);const who=id=>d.members.find(m=>m.id===id),call=(id,b)=>R.resourcesCommand(d,who(id),{year:2026,...b});const denied=(id,b,status)=>{const before=structuredClone(d);assert.throws(()=>call(id,b),e=>e.status===status);assert.deepEqual(d,before);};
const settings={folderUrl:'https://drive.google.com/drive/folders/FOLDER_FIXTURE_123',clientId:'fixture.apps.googleusercontent.com',apiKey:'fixture_key_for_browser_restricted',projectNumber:'123456789012'};
denied('p1',{action:'settings',revision:0,settings},403);denied('inactive',{action:'load'},403);denied('admin',{action:'settings',revision:0,settings:{...settings,folderUrl:'https://evil.test/folders/AAAAAAAAAA'}},400);call('admin',{action:'settings',revision:0,settings});denied('admin',{action:'settings',revision:0,settings},409);
const rows=[{aspect:'1.1.1',revision:0,assigneeId:'p1',pssIds:['p1','p2'],reviewerId:'review'},{aspect:'1.1.2',revision:0,assigneeId:'p1',pssIds:['p1'],reviewerId:'review'}];
denied('p1',{action:'assign-all',module:'management',rows},403);denied('admin',{action:'assign-all',module:'management',rows:[rows[0],{...rows[1],reviewerId:'foreign'}]},400);assert.equal(d.management,undefined,'Batch cannot partially commit');call('admin',{action:'assign-all',module:'management',rows});assert.equal(d.management[2026]['1.1.1'].pssIds.length,2);
assert.ok(A.managementView(d,who('p2'),2026).records.find(r=>r.aspect==='1.1.1').canEdit,'All assigned PSS can edit');assert.equal(A.managementView(d,who('review'),2026).records[0].canEdit,false);
denied('admin',{action:'assign-all',module:'management',rows},409);denied('admin',{action:'assign-all',module:'management',rows:[{...rows[0],revision:1,pssIds:['p1','review']}]},400);
const reserve={action:'reserve-upload',module:'management',aspect:'1.1.1',actionId:'a',extension:'pdf',size:100};const u1=call('p2',reserve).upload,u2=call('p1',reserve).upload;assert.equal(u1.name,'1.1.1.A(1).pdf');assert.equal(u2.name,'1.1.1.A(2).pdf');denied('p1',{...reserve,year:2027},403);assert.equal(call('admin',{...reserve,year:2027}).upload.name,'1.1.1.A(1).pdf','Admin can upload without a PPS assignment');call('admin',{action:'assign-all',module:'management',year:2027,rows:[{aspect:'1.1.1',revision:0,assigneeId:'p1',pssIds:['p1'],reviewerId:'review'}]});assert.equal(call('p1',{...reserve,year:2027}).upload.name,'1.1.1.A(2).pdf');
denied('review',reserve,403);denied('p1',{...reserve,extension:'exe'},400);denied('p1',{...reserve,size:20*1024*1024+1},400);
call('admin',{action:'assign-all',module:'strength',rows:[{aspect:'A2',revision:0,assigneeId:'p1',reviewerId:'review'}]});assert.equal(call('p1',{...reserve,module:'strength',aspect:'A2',actionId:''}).upload.name,'A2-001.pdf');assert.equal(call('p1',{...reserve,module:'strength',aspect:'A2',actionId:'',extension:'jpg'}).upload.name,'A2-002.jpg');
const marks={...M.emptyManagementData(),scores:{a:4,b:3,c:2,d:1},notes:'Fixture without evidence'};assert.ok(M.managementIssues('1.1.1',marks).some(s=>s.includes('evidens')));assert.deepEqual(M.managementIssues('1.1.1',{...marks,evidence:['https://example.test/proof']}),[]);
const multi=M.cleanManagementData('1.1.1',{...marks,actionEvidence:{a:{document:'',documents:['DOKUMEN PEMANTAUAN','Lain-lain'],notes:'Nyatakan fixture',url:'',urls:['https://example.test/1','https://example.test/2']}}});assert.equal(multi.actionEvidence.a.documents.length,2);assert.equal(multi.actionEvidence.a.urls.length,2);assert.ok(M.managementIssues('1.1.1',multi).length,'Other actions still require evidence');assert.ok(M.managementIssues('1.1.1',{...multi,evidence:['https://example.test/common'],actionEvidence:{a:{...multi.actionEvidence.a,notes:''}}}).some(s=>s.includes('lain-lain')));
assert.ok(S.strengthIssues('A2',{...S.emptyStrengthData(),values:{previousStandard4:80},notes:'Rujukan lengkap'}).some(s=>s.includes('evidens')));
const pss=[{id:'r1',standard:'5.1',title:'Tajuk rekaan',memberIds:['p1','p2']}];call('admin',{action:'pss',revision:0,rows:pss});assert.equal(R.resourcesView(d,who('p1'),2026).pss,undefined);denied('p1',{action:'pss',revision:1,rows:pss},403);denied('admin',{action:'pss',revision:0,rows:pss},409);denied('admin',{action:'pss',revision:1,rows:[{...pss[0],memberIds:['foreign']}]},400);assert.equal(call('p1',{...reserve,module:'achievement',aspect:'5.1.1',actionId:''}).upload.name,'5.1.1(1).pdf');
const other=fixture();assert.equal(R.resourcesView(other,other.members[0],2026).settings.folderUrl,'');assert.ok(d.audit.some(e=>e.action==='assignments_confirmed'));assert.ok(d.audit.some(e=>e.action==='evidence_upload_reserved'));assert.deepEqual(d.teachers,originalTeachers);assert.deepEqual(d.assessments,[]);
console.log('PASS resources: atomic bulk assignments, multi-PSS access/revocation boundaries, tenant/year isolation, admin-only settings/PSS, safe Drive folders, monotonic file names across extensions, required evidence and multi-document links. Local fixtures only.');
const ticket=call('p1',reserve).upload;const moduleFolder=call('p1',{action:'folder-id',uploadId:ticket.id,level:'module',candidate:'GOOGLE_FOLDER_ID_A'});assert.equal(moduleFolder.parent,'FOLDER_FIXTURE_123');assert.equal(call('p1',{action:'folder-id',uploadId:ticket.id,level:'module',candidate:'GOOGLE_FOLDER_ID_B'}).id,'GOOGLE_FOLDER_ID_A','Concurrent folder requests keep one canonical ID');denied('p2',{action:'folder-id',uploadId:ticket.id,level:'module',candidate:'GOOGLE_FOLDER_ID_C'},403);denied('p1',{action:'folder-id',uploadId:ticket.id,level:'aspect',candidate:'GOOGLE_FOLDER_ID_C'},409);call('p1',{action:'folder-id',uploadId:ticket.id,level:'year',candidate:'GOOGLE_YEAR_FOLDER'});const af=call('p1',{action:'folder-id',uploadId:ticket.id,level:'aspect',candidate:'GOOGLE_ASPECT_FOLDER'});assert.equal(af.parent,'GOOGLE_YEAR_FOLDER');assert.equal(af.name,'1.1.1');
console.log('PASS canonical Drive folder IDs, parent chain and upload-reservation ownership.');
const rubrics=JSON.parse(fs.readFileSync('app/management-rubric.json','utf8'));for(const u of M.MANAGEMENT_UNITS)for(const a of u.actions)for(const n of [0,1,2,3,4])assert.ok(rubrics[u.id]?.[a.id]?.[n]?.length>20,`${u.id}.${a.id} score ${n} needs its rubric`);assert.equal(rubrics['1.1.1'].a[2],'Dengan mengambil kira perkara (i).','Use PDF score 2, not conflicting workbook text');assert.equal(rubrics['1.3.2'].a[2],'Dengan mengambil kira perkara (ii) dan (iii).','Do not apply a universal score rule');assert.ok(rubrics['3.1.2.1'].a[4].includes('arahan yang berkuat kuasa'));console.log('PASS all 178 complete rubrics, including different score-2 conditions and aggregate-unit standards.');
{
 const doc=fixture(),boss=doc.members.find(m=>m.role==='admin'),v=R.resourcesView(doc,boss,2026);const command=b=>R.resourcesCommand(doc,boss,{year:2026,...b});
 command({action:'lists',revision:0,classes:['4 Dedikasi','5 Nilam'],subjects:['Matematik','Bahasa Melayu']});assert.deepEqual(R.resourcesView(doc,boss,2026).lists.classes,['4 Dedikasi','5 Nilam']);assert.equal(R.resourcesView(doc,boss,2025).lists.classes.length,0);
 const saved=structuredClone(doc);assert.throws(()=>command({action:'lists',revision:0,classes:['X'],subjects:[]}),e=>e.status===409);assert.deepEqual(doc,saved);
 assert.throws(()=>R.resourcesCommand(doc,doc.members.find(m=>m.role!=='admin'),{year:2026,action:'lists',revision:1,classes:[],subjects:[]}),e=>e.status===403);
 assert.throws(()=>command({action:'verify-standard4',signature:''}),e=>e.status===403);
 boss.teacherId='head';doc.teachers.push({id:'head',position:'GURU BESAR'});doc.assessments=['kendiri','pertama','kedua'].map((stage,i)=>({id:'qa-'+i,teacherId:'head',year:2026,stage,status:'submitted',revision:1}));
 const before=R.resourcesView(doc,boss,2026);assert.equal(before.standard4.status,'submitted');command({action:'verify-standard4',signature:before.standard4.signature});assert.equal(R.resourcesView(doc,boss,2026).standard4.status,'verified');doc.assessments[0].revision++;assert.equal(R.resourcesView(doc,boss,2026).standard4.status,'submitted');doc.assessments[0].status='draft';assert.equal(R.resourcesView(doc,boss,2026).standard4.status,'draft');
 console.log('PASS school lists and Standard 4: admin authorization, stale revision, year isolation, PGB identity and invalidation after assessment changes.');
}

{
 const doc=fixture(),boss=doc.members[0],cmd=b=>R.resourcesCommand(doc,boss,{year:2026,...b});
 const modules={strength:'https://drive.google.com/drive/folders/STRENGTH_ROOT_123',management:'https://drive.google.com/drive/folders/MANAGEMENT_ROOT_123',achievement:'https://drive.google.com/drive/folders/ACHIEVEMENT_ROOT_123',standard4:'https://drive.google.com/drive/folders/PDPC_ROOT_123'};
 cmd({action:'settings',revision:0,settings:{...settings,clientId:'',apiKey:'',projectNumber:'',moduleFolders:modules}});
 assert.deepEqual(R.resourcesView(doc,boss,2026).settings.moduleFolders,modules,'Folder-only settings need no Google credentials');
 const before=structuredClone(doc);assert.throws(()=>cmd({action:'settings',revision:1,settings:{...settings,moduleFolders:{...modules,standard4:'javascript:alert(1)'}}}),e=>e.status===400);assert.deepEqual(doc,before,'Invalid module must leave all folders unchanged');
 cmd({action:'settings',revision:1,settings:{...settings,moduleFolders:modules}});
 doc.teachers=[{id:'boss-pps',name:'Admin PPS',position:'PK',type:'perdana'},{id:'review-fixture',name:'Reviewer',position:'PK HEM',type:'perdana'}];boss.teacherId='boss-pps';doc.members.find(m=>m.id==='review').teacherId='review-fixture';
 for(const [module,aspect] of [['strength','A1'],['management','1.1.1'],['achievement','5.1.1']]){
  cmd({action:'assign-all',module,rows:[{aspect,revision:0,assigneeId:'admin',pssIds:['admin'],reviewerId:'review'}]});const ticket=cmd({action:'reserve-upload',module,aspect,extension:'pdf',size:5}).upload;
  assert.equal(ticket.root,new URL(modules[module]).pathname.split('/').pop());assert.equal(ticket.moduleRoot,true);
  const year=cmd({action:'folder-id',uploadId:ticket.id,level:'year',candidate:'YEAR_FOLDER_'+module});assert.equal(year.parent,ticket.root);
  const part=cmd({action:'folder-id',uploadId:ticket.id,level:'aspect',candidate:'ASPECT_FOLDER_'+module});assert.equal(part.parent,year.id);
 }
 doc.teachers=[{id:'test-teacher',name:'Fixture Teacher',position:'GAB',type:'perdana'},{id:'leader',name:'Fixture Leader',position:'PK',type:'perdana'}];doc.members[1].teacherId='leader';doc.members[2].teacherId='test-teacher';doc.pdpc={version:2,epoch:'current-fixture',revision:1,assignments:{2026:[{teacherId:'test-teacher',observerId:'teacher:leader',reviewerId:null}]}};
 const upload={action:'reserve-upload',year:2026,module:'standard4',aspect:'test-teacher',stage:'pertama',epoch:'current-fixture',extension:'jpg',size:10};
 const observer=doc.members[1],teacher=doc.members[2],ticket=R.resourcesCommand(doc,observer,upload).upload;const secondTicket=R.resourcesCommand(doc,observer,{...upload,stage:'kedua'}).upload;assert.ok(secondTicket.name.includes('.kedua('));assert.notEqual(secondTicket.name,ticket.name);assert.equal(secondTicket.root,ticket.root);assert.equal(ticket.root,'PDPC_ROOT_123');assert.ok(ticket.name.startsWith('4.test-teacher.pertama('));
 for(const [actor,extra,status] of [[boss,{},403],[teacher,{},403],[observer,{epoch:'old'},409],[observer,{stage:'foreign'},403],[observer,{year:2025},403]]){const snapshot=structuredClone(doc);assert.throws(()=>R.resourcesCommand(doc,actor,{...upload,...extra}),e=>e.status===status);assert.deepEqual(doc,snapshot);}
 assert.equal(R.resourcesCommand(doc,teacher,{...upload,stage:'kendiri'}).upload.root,'PDPC_ROOT_123');
 doc.assessments.push({id:'submitted',teacherId:'test-teacher',stage:'pertama',year:2026,status:'submitted'});assert.throws(()=>R.resourcesCommand(doc,observer,upload),e=>e.status===409);assert.throws(()=>R.resourcesCommand(doc,observer,{action:'folder-id',year:2026,uploadId:ticket.id,level:'year',candidate:'LATE_YEAR_FOLDER'}),e=>e.status===409);
 cmd({action:'settings',revision:2,settings:{...settings,moduleFolders:{...modules,management:'https://drive.google.com/drive/folders/CHANGED_ROOT_123'}}});
 const old=doc.resources.reservations.find(r=>r.module==='management');assert.throws(()=>cmd({action:'folder-id',uploadId:old.id,level:'year',candidate:'OLD_YEAR_FOLDER'}),e=>e.status===409);
 console.log('PASS four module roots: folder-only saves, atomic validation, direct year/aspect routing, stale-root rejection, Standard 4 observer/self permissions, locked records, reset epoch and year boundaries.');
}

{
 const Gate=await import(compile(fs.readFileSync('app/submission-state.ts','utf8')));
 const ready={saved:true,dirty:false,pending:false,online:true,uploading:false};
 const data={...M.emptyManagementData(),scores:{a:0,b:0,c:0,d:0},notes:'',evidence:[]};
 const check=(v,state={})=>Gate.submissionBlocker({...ready,...state,issues:Gate.validatedSubmissionIssues(v,x=>M.cleanManagementData('1.1.1',x),x=>M.managementIssues('1.1.1',x))});
 assert.ok(check(data),'Complete zero scores cannot bypass missing evidence');
 assert.ok(check({...data,evidence:['  ']}),'Whitespace evidence cannot enable Send');
 assert.ok(check({...data,evidence:['javascript:alert(1)']}),'Invalid URLs cannot enable Send');
 const partial={...data,actionEvidence:{a:{documents:[],notes:'',urls:['https://example.test/action-a']}}};assert.ok(check(partial),'All required actions need supporting evidence');
 const complete={...data,evidence:['https://example.test/common-proof']};assert.equal(check(complete),'','Saved general evidence explicitly supports all actions');
 for(const state of [{saved:false},{dirty:true},{pending:true},{online:false},{uploading:true}])assert.ok(check(complete,state),'Evidence completion alone cannot bypass draft/sync/upload state');
 assert.ok(check({...complete,evidence:[]}),'Deleting the last evidence disables Send again');
 console.log('PASS submission gating: complete zero scores, missing/blank/invalid/partial evidence, saved general evidence, unsaved changes, offline queue, upload in progress and deleted evidence.');
}

{
 const doc=fixture(),boss=doc.members[0];doc.teachers=Array.from({length:141},(_,i)=>({id:'teacher-'+i,name:'Fixture Teacher '+i,type:'perdana'}));doc.pdpc={version:2,epoch:'fixture-current',revision:1,assignments:{}};
 doc.assessments=doc.teachers.flatMap(t=>['kendiri','pertama'].map(stage=>({id:t.id+stage,teacherId:t.id,year:2026,stage,status:'verified',revision:1})));
 const incomplete=R.resourcesView(doc,boss,2026).standard4;assert.equal(incomplete.expected,423);assert.equal(incomplete.count,282);assert.equal(incomplete.status,'draft','Two completed sessions cannot complete a three-session year');
 doc.assessments.push(...doc.teachers.map(t=>({id:t.id+'kedua',teacherId:t.id,year:2026,stage:'kedua',status:'verified',revision:1})));assert.equal(R.resourcesView(doc,boss,2026).standard4.status,'verified');assert.equal(R.resourcesView(doc,boss,2026).standard4.count,423);
 doc.assessments.find(a=>a.stage==='kedua').status='submitted';assert.equal(R.resourcesView(doc,boss,2026).standard4.status,'submitted');doc.assessments.find(a=>a.stage==='kedua').status='draft';assert.equal(R.resourcesView(doc,boss,2026).standard4.status,'draft');
 console.log('PASS Standard 4 progress: 141 teachers need 423 records; both rounds included, all verified/submitted/draft states remain independent.');
}

{
 const aspect='3.2.4.1';
 A.managementCommand(d,who('admin'),{action:'assign-units',year:2026,aspect,revision:0,rows:[{id:'football',name:'Bola sepak',memberIds:['p1']},{id:'badminton',name:'Badminton',memberIds:['p2']}]});
 const upload={action:'reserve-upload',module:'management',aspect,unitId:'football',actionId:'a',size:10,extension:'pdf'};
 denied('p2',upload,403);denied('p1',{...upload,unitId:'badminton'},403);denied('p1',{...upload,unitId:undefined},403);
 const ticket=call('p1',upload);assert.equal(ticket.upload.unitId,'football');
 A.managementCommand(d,who('admin'),{action:'assign-units',year:2026,aspect,revision:1,rows:[{id:'football',name:'Bola sepak',memberIds:['p2']},{id:'badminton',name:'Badminton',memberIds:['p2']}]});
 denied('p1',{action:'folder-id',uploadId:ticket.upload.id,candidate:'FOLDER_FIXTURE_UNIT_123',level:'year'},403);
 console.log('PASS unit evidence: upload reservations require the assigned unit, forged/missing unit IDs fail, ticket folder access is revoked immediately after reassignment.');
}
{
 const aspect='3.2.4.1',revision=A.managementView(d,who('admin'),2026).records.find(r=>r.aspect===aspect).revision;
 call('admin',{action:'pps-assignments',groups:[{module:'management',rows:[{aspect,revision,units:[{id:'football',name:'Bola sepak',memberIds:['p1']},{id:'badminton',name:'Badminton',memberIds:['p2']}]}]}]});
 const visible=A.managementView(d,who('p1'),2026).records.find(r=>r.aspect===aspect);
 assert.deepEqual(visible.data.rows.map(r=>r.id),['football']);
 denied('admin',{action:'pps-assignments',groups:[{module:'management',rows:[{aspect,revision,units:[]}]}]},409);
 console.log('PASS central PPS unit assignment: atomic unit dispatch, persisted unit members, immediate read permissions and stale revision rejection.');
}
