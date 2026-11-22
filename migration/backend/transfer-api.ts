import {admin,fail,getData,mayWrite,dataCommand,audit,type SchoolDoc,type Row} from './domain.ts';
import {stages,rosterActive} from './scoring.ts';
export function transferView(d:SchoolDoc,m:Row,year:number){
 admin(m);if(!Number.isInteger(year)||year<2020||year>2100)fail('Tahun tidak sah.');
 const view=getData(d,m);return {school:{id:d.school.id,code:d.school.code,name:d.school.name},year,epoch:d.pdpc?.epoch??'',teachers:d.teachers.filter(t=>rosterActive(t,year)).map(t=>({id:t.id,name:t.name,type:t.type,canImport:stages.filter(s=>mayWrite(d,m,t,s,year))})),assessments:view.assessments.filter(a=>a.year===year&&(!d.pdpc?.epoch||a.epoch===d.pdpc.epoch))};
}
export function transferImport(d:SchoolDoc,m:Row,b:Row){
 admin(m);if(!Number.isInteger(b.year)||b.year<2020||b.year>2100)fail('Tahun tidak sah.');
 if(b.schoolCode!==d.school.code)fail('Kod sekolah import tidak sepadan.',403);
 if((d.pdpc?.epoch??'')!==b.epoch)fail('Tetapan penilaian telah berubah. Muat semula pratonton.',409);
 if(!Array.isArray(b.rows)||!b.rows.length||b.rows.length>50)fail('Pilih antara 1 hingga 50 rekod untuk import.');
 const draft=structuredClone(d),keys=new Set<string>(),saved:string[]=[];
 for(const r of b.rows){
  if(!r||typeof r!=='object'||!stages.includes(r.stage))fail('Sesi import tidak sah.');
  const t=draft.teachers.find(t=>t.id===r.teacherId);if(!t||!rosterActive(t,b.year))fail('Guru aktif tidak ditemui.',404);
  if(r.teacherName!==t.name||r.type!==t.type)fail('Nama / kategori guru telah berubah. Muat semula pratonton.',409);
  if(!mayWrite(draft,m,t,r.stage,b.year))fail('Akaun ini tidak ditugaskan mengisi sesi tersebut.',403);
  const key=t.id+':'+r.stage;if(keys.has(key))fail('Penilaian yang sama berulang dalam kelompok.');keys.add(key);
  const old=draft.assessments.find(a=>a.teacherId===t.id&&a.year===b.year&&a.stage===r.stage&&(!b.epoch||a.epoch===b.epoch));
  if(old&&old.status!=='draft')fail('Rekod telah dihantar / disahkan dan dikunci.',409);
  if(old&&r.replace!==true)fail('Sahkan penggantian draf sedia ada.',409);
  if((old?.revision??0)!==r.revision)fail('Draf telah berubah. Muat semula pratonton.',409);
  if(!Array.isArray(r.scores)||r.scores.length!==38||r.scores.every((v:unknown)=>v===null)||r.scores.some((v:unknown)=>v!==null&&(!Number.isInteger(v)||Number(v)<0||Number(v)>4)))fail('38 skor 0–4 / kosong diperlukan; sekurang-kurangnya satu skor mesti diisi.');
  if(r.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||Number(r.date.slice(0,4))!==b.year||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date))fail('Tarikh penilaian tidak sah.');
  const result=dataCommand(draft,m,{action:'save',assessment:{...old,teacherId:t.id,year:b.year,stage:r.stage,epoch:b.epoch,status:'draft',revision:r.revision,scores:r.scores,evaluator:old?.evaluator??m.displayName??'',date:r.date||old?.date||'',subject:r.subject||old?.subject||'',classroom:r.classroom||old?.classroom||'',notes:old?.notes??'',evidence:old?.evidence??[],mutationId:crypto.randomUUID()}}) as Row;
  saved.push(result.assessment.id);
 }
 audit(draft,m,'pdpc_transfer_import',d.school.id,null,{year:b.year,count:saved.length,assessmentIds:saved});Object.assign(d,draft);return {saved:saved.length,...transferView(d,m,b.year)};
}
