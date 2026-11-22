const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const base='https://moeisins.moe.gov.my/SJN/penilaian-kendiri/kekuatan-kami/',url=a=>base+'aspek3-9?sek=fictional&tahun=2026&id_serahan=1&no_aspek='+a;
function documentFor(aspect,{mismatch=false,login=false}={}){
 if(login)return {body:{textContent:'Log masuk'},querySelectorAll:()=>[]};
 const scores=aspect==='A1'?[2,2,2.93,2.49]:[0],numbers=aspect==='A1'?[[142,141],[139,142],[141,138],[53,44]]:[[0,0]],total=aspect==='A1'?9.42:0;
 const cell=(textContent,input=false)=>({textContent,querySelector:()=>input?{}:null});const rows=[];
 scores.forEach((score,i)=>numbers[i].forEach((n,j)=>{const input={value:String(n)};rows.push({cells:[cell('Bilangan '+i+'-'+j),cell('',true),...(j===0?[cell((score+(mismatch&&i===0?1:0)).toFixed(2)+'%')]:[])],querySelectorAll:s=>s.startsWith('input')?[input]:[]});}));
 const header={textContent:`ASPEK ${aspect} : GURU PERNYATAAN KUALITI SKOR ${total}%`,querySelectorAll:()=>[cell(total.toFixed(2)+'%')]};
 const table={textContent:'BIL DESKRIPSI BILANGAN SKOR (%)',querySelectorAll:s=>s==='tr'?rows:[]};
 const nav=Array.from({length:9},(_,i)=>({textContent:'ASPEK : A'+(i+1),getAttribute:()=>url('A'+(i+1))}));
 return {body:{textContent:`${aspect} : GURU`},querySelectorAll:s=>s==='table'?[header,table]:s==='a[href]'?nav:[]};
}
function setup(mode){let state={},gets=[];const ctx=vm.createContext({URL,AbortSignal,Date,location:{origin:'https://moeisins.moe.gov.my',href:url('A1')},chrome:{storage:{session:{async set(o){state=structuredClone({...state,...o});}}}},fetch:async(u,options)=>{assert.equal(options.credentials,'same-origin');assert.equal(options.method,undefined);gets.push(u);return {ok:true,text:async()=>u};},DOMParser:class{parseFromString(u){return documentFor(new URL(u).searchParams.get('no_aspek'),mode);}}});vm.runInContext(fs.readFileSync(__dirname+'/../strength-auto.js','utf8'),ctx);return {A:ctx.SKASStrengthAuto,state:()=>state,gets};}
const options={school:'TRY001',year:'2026'};
async function finish(f){for(let i=0;i<100;i++){if(f.state().strengthAuto?.running===false)return f.state().strengthAuto;await new Promise(r=>setTimeout(r,1));}throw Error('Timeout');}
test('A1 reads displayed 9.42 and criterion 2.00 / 2.00 / 2.93 / 2.49 with independent denominators',()=>{const f=setup(),r=f.A.parse(documentFor('A1'),url('A1'),options);assert.equal(r.score,9.42);assert.deepEqual(Array.from(r.criteria,c=>c.score),[2,2,2.93,2.49]);assert.equal(r.criteria[1].fields[1].value,142);assert.equal(r.criteria[0].fields[1].value,141);assert.equal(r.criteria[2].fields[1].value,138);});
test('reads all nine linked aspects with GET only; preserves zero',async()=>{const f=setup();f.A.start(options);const s=await finish(f);assert.equal(s.failed,false);assert.equal(s.rows.length,9);assert.equal(s.rows[8].score,0);assert.equal(f.gets.length,9);});
test('mismatch, login and unsafe URLs fail closed',async()=>{const f=setup({mismatch:true});assert.throws(()=>f.A.safe('https://evil.test/',url('A1')));assert.throws(()=>f.A.safe(base+'save',url('A1')));assert.throws(()=>f.A.parse(documentFor('A1'),url('A1'),{...options,year:'2025'}));f.A.start(options);assert.equal((await finish(f)).failed,true);const login=setup({login:true});login.A.start(options);assert.equal((await finish(login)).failed,true);});
