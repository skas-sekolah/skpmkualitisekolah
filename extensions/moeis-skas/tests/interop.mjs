import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {compile,read,scoring} from '../../../scripts/achievement-fixtures.mjs';
vm.runInThisContext(fs.readFileSync(new URL('../core.js',import.meta.url),'utf8'));
const M=await import(compile(read('app/transfer-model.ts').replace("'./scoring'",JSON.stringify(scoring))));
const C=globalThis.SKASCore;
for(const stage of ['kendiri','pertama','kedua']){
 const r={teacherId:'fixture',teacherName:'GURU UJIAN',schoolCode:'TRY001',year:2026,stage,type:'perdana',scores:Array.from({length:38},(_,i)=>i===1?null:i%5),date:'',subject:'MATEMATIK',classroom:'UJIAN'};
 const decoded=C.decode(M.scoresCsv([r]));
 assert.deepEqual(C.items.map(([c,i])=>decoded.scores[c+':'+i]),r.scores);
 const back=M.parseScoreCsv(C.csv(decoded),'test.csv')[0];
 assert.deepEqual(back.scores,r.scores);assert.equal(back.stage,stage);assert.equal(back.teacherId,'');assert.equal(back.teacherName,r.teacherName);
}
console.log('PASS: CSV SK@S ↔ extension; all 3 sessions, zero/null preserved.');
const batches=Array.from({length:50},(_,i)=>({meta:{kod_sekolah:'TRY001',tahun:'2026',nama_guru:'GURU UJIAN '+i,sesi:i%2?'pertama':'kedua',kategori:'',mata_pelajaran:'MATEMATIK',kelas:'UJIAN'},scores:Object.fromEntries(C.items.map(([c,k],j)=>[c+':'+k,j%7===0?null:j%5]))}));
const csv=C.csvMany(batches),imported=M.parseScoreCsv(csv,'SKAS_MOEIS_TRY001_2026.csv');assert.equal(imported.length,50);
for(let i=0;i<50;i++){assert.equal(imported[i].teacherName,batches[i].meta.nama_guru);assert.equal(imported[i].stage,batches[i].meta.sesi);assert.deepEqual(imported[i].scores,C.items.map(([c,k])=>batches[i].scores[c+':'+k]));}
console.log('PASS: auto CSV batch of 50 records imports into the current SK@S parser with all 1900 items and identity/session preserved.');
