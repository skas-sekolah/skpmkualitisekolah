import assert from 'node:assert/strict';
import {compile,read,scoring,domain,fixture,strength} from './achievement-fixtures.mjs';
const modelURL=compile(read('app/transfer-model.ts').replace("'./scoring'",JSON.stringify(scoring)));
const M=await import(modelURL),S=await import(scoring),D=await import(domain);
const API=await import(compile(read('migration/backend/transfer-api.ts').replace("'./domain.ts'",JSON.stringify(domain)).replace("'./scoring.ts'",JSON.stringify(scoring)).replace("'./strength-model.ts'",JSON.stringify(strength))));
const teacher={id:'fictional-teacher',name:'GURU UJIAN',type:'perdana',position:'GAB'},bundle={school:{id:'fixture-school',code:'UJI-STD5',name:'Fictional'},year:2026,epoch:'test-epoch',teachers:[{...teacher,canImport:['kendiri']}],assessments:[]};
const record={...M.emptyTransfer(),teacherId:teacher.id,teacherName:teacher.name,schoolCode:bundle.school.code,year:2026,stage:'kendiri',type:'perdana',scores:Array.from({length:38},(_,i)=>i%5),date:'2026-11-22',subject:'Matematik',classroom:'4 Ujian'};
assert.equal(M.TRANSFER_ITEMS.length,38);
assert.deepEqual(M.parseScoreCsv(M.scoresCsv([record]),'test.csv'),[record]);
const zero={...record,scores:Array(38).fill(0)};assert.deepEqual(M.parseScoreCsv(M.scoresCsv([zero]),'test.csv')[0].scores,zero.scores);
assert.equal(M.previewTransfer(zero,bundle,'zero').errors.length,0);
assert.equal(M.parseScoreCsv(M.scoresCsv([record],true),'KENDIRI-GURU UJIAN.csv')[0].stage,'kendiri');
assert.throws(()=>M.parseScoreCsv('sub_aspek,item,skor\n4.1.1,a,5','bad.csv'),/0 hingga 4/);
assert.throws(()=>M.parseScoreCsv('sub_aspek,item,skor\n4.1.1,a,1\n4.1.1,a,2','bad.csv'),/berulang/);
assert.throws(()=>M.parseScoreCsv('sub_aspek,item,skor\n4.1.1,a,1','bad.csv'),/38/);
assert.throws(()=>M.parseCsv('a,b\n"unfinished'),/ditutup/);
assert.ok(M.previewTransfer({...record,schoolCode:'FOREIGN'},bundle,'foreign').errors.length);
assert.ok(M.previewTransfer({...record,year:2025},bundle,'year').errors.length);
assert.ok(M.previewTransfer({...record,teacherName:'WRONG'},bundle,'name').errors.length);
assert.ok(M.previewTransfer({...record,stage:'kedua'},bundle,'observer').errors.some(e=>e.includes('ditugaskan')));
assert.ok(M.previewTransfer({...record,scores:Array(38).fill(4)},bundle,'all4').warnings.some(w=>w.includes('Semua 38')));
assert.ok(M.previewTransfer({...record,scores:Array(38).fill(null)},bundle,'empty').errors.length);
const duplicateNames={...bundle,teachers:[{...teacher,canImport:['kendiri']},{...teacher,id:'other',canImport:['kendiri']}]};assert.ok(M.previewTransfer({...record,teacherId:''},duplicateNames,'ambiguous').errors.some(e=>e.includes('berulang')));
const d=fixture();d.teachers=[teacher];d.pdpc={version:2,epoch:'test-epoch',revision:0,assignments:{}};const admin=d.members[0];
const command={year:2026,epoch:'test-epoch',schoolCode:d.school.code,rows:[{...record,revision:0,replace:false}]};
const view=API.transferView(d,admin,2026);assert.deepEqual(view.teachers[0].canImport,['kendiri']);assert.equal(view.teachers[0].ic,undefined);
const saved=API.transferImport(d,admin,command);assert.equal(saved.saved,1);assert.equal(d.assessments[0].status,'draft');assert.deepEqual(d.assessments[0].scores,record.scores);
let before=structuredClone(d);assert.throws(()=>API.transferImport(d,d.members[1],command),e=>e.status===403);assert.deepEqual(d,before);
for(const patch of [{schoolCode:'FOREIGN'},{epoch:'old'},{rows:[{...command.rows[0],stage:'kedua'}]},{rows:[{...command.rows[0],revision:0,replace:true}]}]){before=structuredClone(d);assert.throws(()=>API.transferImport(d,admin,{...command,...patch}));assert.deepEqual(d,before);}
// Original metadata and evidence stay intact when replacing a draft.
d.assessments[0].notes='Keep this note';d.assessments[0].evidence=['https://example.test/proof'];
API.transferImport(d,admin,{...command,rows:[{...command.rows[0],scores:Array(38).fill(0),revision:1,replace:true}]});assert.equal(d.assessments[0].notes,'Keep this note');assert.deepEqual(d.assessments[0].evidence,['https://example.test/proof']);assert.equal(d.assessments[0].revision,2);
// A later invalid row must not leave the earlier row mutated.
before=structuredClone(d);assert.throws(()=>API.transferImport(d,admin,{...command,rows:[{...command.rows[0],revision:2,replace:true},{...command.rows[0],teacherId:'missing'}]}));assert.deepEqual(d,before);
d.assessments[0].status='verified';before=structuredClone(d);assert.throws(()=>API.transferImport(d,admin,{...command,rows:[{...command.rows[0],revision:2,replace:true}]}),e=>e.status===409);assert.deepEqual(d,before);
assert.ok(M.previewTransfer(record,{...bundle,assessments:d.assessments},'locked').errors.some(e=>e.includes('dikunci')));
// Spreadsheet formula injection is escaped in metadata, never in numeric scores.
assert.ok(M.scoresCsv([{...record,teacherName:'=HYPERLINK("bad")'}]).includes("'=HYPERLINK"));
console.log('PASS transfer: 38-item CSV round trip, zero/blank, metadata scope, duplicate names/items, invalid scores, locked/stale/foreign/unauthorized rejection, atomic batch, draft-only save and preserved evidence/notes');
// Exercise real workbook creation and extraction using fictional data only.
const {createRequire}=await import('node:module'),{pathToFileURL}=await import('node:url');
const require=createRequire(import.meta.url),excelURL=pathToFileURL(require.resolve('exceljs')).href;
const transform=s=>s.replaceAll("'./scoring'",JSON.stringify(scoring)).replaceAll("await import('exceljs')",'await import('+JSON.stringify(excelURL)+').then(m=>m.default)');
const teacherBook=compile(transform(read('app/teacher-workbook.ts')));
const W=await import(compile(transform(read('app/transfer-workbook.ts')).replace("'./teacher-workbook'",JSON.stringify(teacherBook)).replace("'./transfer-model'",JSON.stringify(modelURL))));
for(const type of ['perdana','khas']){
 const input={...record,type,scores:record.scores.map((s,i)=>i===0?null:s)},wb=await W.scoreTemplateWorkbook(input),file=new File([await wb.xlsx.writeBuffer()],'fictional.xlsx');
 const back=await W.readScoreWorkbook(file);assert.deepEqual(back,[input]);
 wb.getWorksheet('STANDARD 4').getCell(12,2).value=5;await assert.rejects(async()=>W.readScoreWorkbook(new File([await wb.xlsx.writeBuffer()],'bad.xlsx')),/0–4/);
}
const macroExtension=await W.scoreTemplateWorkbook(record);assert.deepEqual(await W.readScoreWorkbook(new File([await macroExtension.xlsx.writeBuffer()],'fixture.xlsm')),[record]);
const {Workbook}=await import(excelURL).then(m=>m.default),foreign=new Workbook();foreign.addWorksheet('Other');await assert.rejects(async()=>W.readScoreWorkbook(new File([await foreign.xlsx.writeBuffer()],'foreign.xlsx')),/MUKA DEPAN/);
// Formula-linked option controls preserve the intended score, including zero.
const radio=await W.scoreTemplateWorkbook(record),sheet=radio.getWorksheet('STANDARD 4');
// Shift 4.1.1 to column D, leave other seven labels unchanged.
sheet.getCell(10,2).value=null;sheet.getCell(10,3).value='Aspek 4.1.1';
// This ordinary-cell fixture verifies cached formulas independently of macros.
sheet.getCell(11,3).value={formula:'1+1',result:2};sheet.getCell(12,3).value=0;sheet.getCell(13,3).value=4;
const cached=await W.readScoreWorkbook(new File([await radio.xlsx.writeBuffer()],'formula.xlsx'));assert.deepEqual(cached[0].scores.slice(0,3),[2,0,4]);
console.log('PASS workbook: generated Excel round trip for Perdana/PKhas, real zero/blank, .xlsm file container, cached formula values, malformed/foreign template rejection');
