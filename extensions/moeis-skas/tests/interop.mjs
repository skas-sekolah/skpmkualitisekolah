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
