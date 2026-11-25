const {readFileSync}=require('node:fs'),{join}=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 let listener;const calls=[];
 const ctx={console,setTimeout,importScripts(){},chrome:{runtime:{id:'extension-test',onMessage:{addListener(fn){listener=fn;}},onStartup:{addListener(){}}},scripting:{async executeScript(injection){calls.push(injection);if(injection.files)return [];assert(Array.isArray(injection.args));for(const arg of injection.args)assert.notEqual(arg,undefined,'Chrome rejects undefined injection arguments');assert.doesNotThrow(()=>JSON.parse(JSON.stringify(injection.args)));return [{result:{ok:true,data:{fields:[{name:'skor1',value:'0',current:null}],identity:[]}}}];}},storage:{local:{async set(){},async get(){return {};}}}}};
 vm.createContext(ctx);vm.runInContext(readFileSync(join(__dirname,'..','background.js'),'utf8'),ctx);
 const result=await new Promise(resolve=>{const wait=listener({type:'inspect',ctx:{tabId:7,url:'https://moeisins.moe.gov.my/SJN/penilaian-kendiri/pengurusan-kami/standard3-2/list?tahun=2026'}},{id:'extension-test'},resolve);assert.equal(wait,true);});
 assert.equal(result.ok,true);assert.equal(calls.length,2);assert.equal(calls[1].args[0],'inspect');assert.equal(calls[1].args[2],null);assert.equal(result.data.fields[0].value,'0');
 console.log('PASS: inspect sends a JSON-serializable null argument, returns preview and preserves score zero.');
})().catch(e=>{console.error(e);process.exit(1);});
