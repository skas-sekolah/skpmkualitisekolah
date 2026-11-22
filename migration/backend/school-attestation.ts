import {audit,fail,hash,isPGB,now,type Row,type SchoolDoc} from './domain.ts';
import {strengthView} from './strength-api.ts';
import {strengthIssues,validYear,ASPECTS} from './strength-model.ts';
import {managementView} from './management-api.ts';
import {managementIssues,managementTotals,MANAGEMENT_UNITS} from './management-model.ts';
import {achievementView} from './achievement-api.ts';
import {achievementIssues,ACHIEVEMENT_ITEMS} from './achievement-model.ts';
import {rosterActive,stages,calculate,type TeacherType} from './scoring.ts';
import type {FinalRow,SchoolAttestation} from './school-attestation-model.ts';
export async function schoolAttestation(d:SchoolDoc,m:Row,b:Row):Promise<SchoolAttestation>{
 if(!d.members.some(x=>x.id===m.id&&x.active===1)||(m.role!=='admin'&&!isPGB(d,m)))fail('Rumusan akhir hanya untuk Admin dan PGB.',403);
 if(!validYear(b.year))fail('Tahun tidak sah.');const year=b.year,key=String(year),store=d as any;
 const strength=strengthView(d,m,year),management=managementView(d,m,year),achievement=achievementView(d,m,year),rows:FinalRow[]=[];
 const add=(module:string,r:any,title:string,issues:string[],score:string)=>{const submitted=['submitted','verified'].includes(r.status);rows.push({module,id:r.aspect,title,status:r.status,ready:submitted&&!issues.length,score,issues:[...(!submitted?['Pengisi belum menghantar borang lengkap.']:[]),...issues]});};
 for(const r of strength.records)add('Kekuatan Kami',r,ASPECTS.find(a=>a.id===r.aspect)!.name,strengthIssues(r.aspect,r.data),r.moeis?'MOEIS '+r.moeis.score.toFixed(2)+'%':'Rujuk rumusan aspek');
 for(const r of management.records){const p=managementTotals(r.aspect,r.data).percentage;add('Pengurusan Kami',r,MANAGEMENT_UNITS.find(a=>a.id===r.aspect)!.name,managementIssues(r.aspect,r.data),p===null?'Belum lengkap':p.toFixed(2)+'%');}
 for(const r of achievement.records)add('Pencapaian Kami',r,ACHIEVEMENT_ITEMS.find(a=>a.id===r.aspect)!.name,achievementIssues(r.aspect,r.data),'Rujuk rumusan pencapaian');
 const teachers=d.teachers.filter(t=>rosterActive(t,year));
 for(const stage of stages){const results:number[]=[],issues:string[]=[];for(const teacher of teachers){const matches=d.assessments.filter(a=>a.teacherId===teacher.id&&a.year===year&&a.stage===stage&&(!d.pdpc?.epoch||a.epoch===d.pdpc.epoch));if(matches.length!==1||!['submitted','verified'].includes(matches[0].status)||!Array.isArray(matches[0].scores)||matches[0].scores.length!==38||matches[0].scores.some((n:unknown)=>typeof n!=='number'||!Number.isInteger(n)||n<0||n>4)||!['perdana','khas'].includes(teacher.type)){issues.push(teacher.name+': penilaian belum lengkap / belum dihantar.');continue;}const total=calculate(matches[0].scores,teacher.type as TeacherType).total;if(total===null)issues.push(teacher.name+': skor belum lengkap.');else results.push(total);}
 if(!teachers.length)issues.push('Senarai guru belum tersedia.');rows.push({module:'Standard 4',id:stage,title:stage==='kendiri'?'Penilaian Kendiri':stage==='pertama'?'Pencerapan 1':'Pencerapan 2',ready:!issues.length,status:!issues.length?'submitted':'draft',score:results.length?(results.reduce((a,b)=>a+b,0)/results.length).toFixed(2)+'%':'Belum lengkap',issues});}
 const scopes={strength:'Kekuatan Kami',management:'Pengurusan Kami',achievement:'Pencapaian Kami'} as const;
 const scope=b.module as keyof typeof scopes|undefined;
 if(scope!==undefined&&!Object.hasOwn(scopes,scope))fail('Modul pengesahan tidak sah.');
 const selected=scope?rows.filter(r=>r.module===scopes[scope]):rows;
 if(scope&&isPGB(d,m)){const sourceRecords=scope==='strength'?strength.records:scope==='management'?management.records:achievement.records;for(const row of selected){const r=sourceRecords.find(r=>r.aspect===row.id);if(r?.status==='submitted'&&!r.canReview){row.ready=false;row.issues.push('PGB tidak boleh mengesahkan pengisian sendiri. Minta pengisi lain menyemak dan menghantar semula.');}}}
 const source=()=>scope==='strength'?{year,school:d.school.code,strength:store.strength?.[key]??{},moeis:store.moeisStrength?.[key]??[]}:scope==='management'?{year,school:d.school.code,management:store.management?.[key]??{},notes:store.managementReports?.[key]??null}:scope==='achievement'?{year,school:d.school.code,achievement:store.achievement?.[key]??{}}:{year,school:d.school,strength:store.strength?.[key]??{},management:store.management?.[key]??{},achievement:store.achievement?.[key]??{},moeis:store.moeisStrength?.[key]??[],teachers,assessments:d.assessments.filter(a=>a.year===year),pdpc:d.pdpc??null,notes:store.managementReports?.[key]??null};
 let fingerprint=await hash(JSON.stringify(source()));
 const old=scope?store.moduleAttestations?.[key]?.[scope]??null:store.schoolAttestations?.[key]??null,revision=old?.revision??0,ready=selected.every(r=>r.ready),canAttest=isPGB(d,m);
 if(b.action==='final-attest'){
  if(!canAttest)fail('Hanya Guru Besar / Pengetua boleh membuat perakuan akhir sekolah.',403);
  if(!ready)fail('Lengkapkan dan hantar semua borang dalam modul ini sebelum pengesahan.',409);
  if(b.confirmed!==true)fail('Sahkan perakuan akhir dahulu.');
  if(b.fingerprint!==fingerprint||b.revision!==revision)fail('Data rumusan telah berubah. Muat semula dan semak rumusan terkini.',409);
  if(scope){
   const records=store[scope]?.[key]??{};
   for(const item of selected){const r=records[item.id];if(!r)fail('Rekod modul telah berubah. Muat semula.',409);
    r.status='verified';r.verifiedAt=now();r.verifiedBy=m.id;r.verifiedName=m.displayName||m.username;r.revision=(r.revision??0)+1;r.updatedAt=now();r.updatedBy=m.id;
    if(scope==='management'&&['unit-actions','units'].includes(r.data?.mode))for(const row of r.data.rows??[])row.status='verified';
   }
   fingerprint=await hash(JSON.stringify(source()));
   store.moduleAttestations??={};store.moduleAttestations[key]??={};store.moduleAttestations[key][scope]={revision:revision+1,at:now(),by:m.id,name:m.displayName||m.username,fingerprint};
   audit(d,m,'module_group_verification',scope+':'+key,old,store.moduleAttestations[key][scope]);
   return schoolAttestation(d,m,{action:'final-load',year,module:scope});
  }
  store.schoolAttestations??={};store.schoolAttestations[key]={revision:revision+1,at:now(),by:m.id,name:m.displayName||m.username,fingerprint};
  audit(d,m,'school_final_attestation',key,old,store.schoolAttestations[key]);
 }else if(b.action!=='final-load')fail('Tindakan perakuan tidak sah.');
 const declaration=scope?store.moduleAttestations?.[key]?.[scope]??null:store.schoolAttestations?.[key]??null;
 return {...(scope?{module:scope}:{}),year,school:{code:d.school.code,name:d.school.name},fingerprint,revision:declaration?.revision??0,canAttest,ready,rows:selected,declaration:declaration?{at:declaration.at,by:declaration.by,name:declaration.name,fingerprint:declaration.fingerprint}:null,current:!!declaration&&ready&&declaration.fingerprint===fingerprint};
}
