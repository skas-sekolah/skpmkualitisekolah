(()=>{
function totals(records,results){
 const sourceScores=records.reduce((n,r)=>n+ReliableCore.scores(r).length,0);
 const confirmed=results.filter(r=>['server-confirmed','already-matched'].includes(r.status));
 const confirmedScores=confirmed.reduce((n,r)=>n+r.scoreCount,0);
 return {totalRecords:records.length,sourceScores,confirmedScores,confirmedRecords:confirmed.length,percent:sourceScores?Math.round(confirmedScores/sourceScores*10000)/100:0,processed:results.length};
}
function uniqueRoutes(targets){const map=new Map();for(const t of targets){if(!map.has(t.id))map.set(t.id,new Map());map.get(t.id).set(t.url,t);}return map;}
function fatal(message){return /Sesi|sekolah|Tahun|No tab with id|tab was closed/i.test(String(message));}
globalThis.ReliableBatchCore={totals,uniqueRoutes,fatal};
})();
