import {assignmentPeople,fail,now,session,type SchoolDoc,type Row} from './domain.ts';
import {MANAGEMENT_UNITS,aggregateUnit,emptyManagementData,subjectStandard,validYear,type ManagementData} from './management-model.ts';
import {rosterActive,stages} from './scoring.ts';
import type {FillingState,FillingTab,FillingRow,FillingSchool,FillingBundle} from './filling-status-types.ts';
const tabFor=(id:string):FillingTab=>subjectStandard(id)?'subjects':id==='3.2.2.1'?'clubs':id==='3.2.3.1'?'uniforms':'sports';
export function evidencePresent(data:ManagementData){const link=(s:unknown)=>typeof s==='string'&&/^https?:\/\//i.test(s.trim());return (data.evidence??[]).some(link)||Object.values(data.actionEvidence??{}).some(e=>link(e.url)||(e.urls??[]).some(link));}
export function fillingState(status:string,filled:number,expected:number,entry=false):FillingState{return expected>0&&filled===expected&&['submitted','verified'].includes(status)?'done':filled>0||entry||status==='returned'||status==='submitted'||status==='verified'?'working':'empty';}
const references={subjects:['BAHASA MELAYU','BAHASA INGGERIS','MATEMATIK','PENDIDIKAN JASMANI DAN KESIHATAN','PENDIDIKAN ISLAM','PENDIDIKAN MORAL','PENDIDIKAN MUZIK','PENDIDIKAN SENI VISUAL','BAHASA ELEKTIF','RBT','SAINS','SEJARAH','(MASALAH PEMBELAJARAN) KEMAHIRAN HIDUP ASAS','(MASALAH PEMBELAJARAN) PENGURUSAN KEHIDUPAN'],clubs:['BAHASA MELAYU','BAHASA INGGERIS','MATEMATIK','SAINS','PENDIDIKAN ISLAM','SENI VISUAL','KEBUDAYAAN','SPBT','KITAR SEMULA','LANDSKAP','DOKTOR MUDA','KERJAYA','RUKUN NEGARA','PENCEGAHAN JENAYAH','STEM','KEMAHIRAN HIDUP'],uniforms:['BULAN SABIT MERAH MALAYSIA (BSMM)','PANDU PUTERI TUNAS','PENGAKAP','PUTERI ISLAM','TUNAS KADET REMAJA SEKOLAH'],sports:['BOLA SEPAK','RAGBI RIMAU','KRIKET','BOLA BALING','OLAHRAGA','HOKI','BADMINTON','BOLA JARING','PING PONG','CATUR','LOMPAT TALI','STACKING SPORTS']};
const key=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase();
export function schoolFillingStatus(d:SchoolDoc,year:number):FillingBundle{
 if(!validYear(year))fail('Pilih tahun antara 2020–2100.');
 const store=d as SchoolDoc&{management?:Record<string,Record<string,Row>>},records=store.management?.[String(year)]??{},people=new Map(assignmentPeople(d,year).map(p=>[p.id,p.name]));
 const names=(ids:(string|null|undefined)[])=>[...new Set(ids.filter((s):s is string=>!!s).map(id=>people.get(id)||'PPS tidak lagi tersenarai'))];
 const rows:FillingRow[]=[];
 for(const u of MANAGEMENT_UNITS){
  const r=records[u.id],data=r?.data as ManagementData|undefined;
  const info=(v:ManagementData,status:string,unit='',ids:(string|null|undefined)[]=[],legacyPercent?:number|null):FillingRow=>{const filled=legacyPercent!=null?1:u.actions.filter(a=>typeof v.scores?.[a.id]==='number').length,expected=legacyPercent!==undefined?1:u.actions.length;return {id:u.id+':'+unit,tab:aggregateUnit(u.id)?tabFor(u.id):'management',aspect:u.id,title:u.name,unit,pps:names(ids),state:fillingState(status,filled,expected,!!v.notes?.trim()||evidencePresent(v)||Object.values(v.actionEvidence??{}).some(e=>!!e.notes?.trim()||!!e.document)),evidence:evidencePresent(v),filled,expected,updatedAt:r?.updatedAt??null,workflow:status};};
  if(!aggregateUnit(u.id)){rows.push(info(data??emptyManagementData(),r?.status??'draft','',[r?.assigneeId,...(r?.pssIds??[])]));continue;}
  const peers=MANAGEMENT_UNITS.filter(p=>aggregateUnit(p.id)&&tabFor(p.id)===tabFor(u.id));
  const configured=peers.flatMap(p=>(records[p.id]?.data?.rows??[]).map((v:Row)=>v.name as string)).filter(Boolean);
  const expectedNames=[...new Map((configured.length?configured:d.school.code==='BBA8284'&&year===2026?references[tabFor(u.id) as keyof typeof references]:[]).map(n=>[key(n),n])).values()];
  const own=data?.rows??[];
  if(!expectedNames.length)expectedNames.push('Unit belum ditetapkan');
  for(const name of expectedNames){const row=own.find(v=>key(v.name)===key(name)),legacy=data?.mode==='units',v=row?.data??{...emptyManagementData(),evidence:row?.url?[row.url]:[]};const item=info(v,row?.status??(legacy?r?.status:'draft')??'draft',name,row?.memberIds??[],legacy?row?.percent??null:undefined);if(!row)item.configurationMissing=true;if(row?.url&&/^https?:\/\//i.test(row.url))item.evidence=true;rows.push(item);}
 }
 for(const u of MANAGEMENT_UNITS.filter(u=>aggregateUnit(u.id))){const children=rows.filter(r=>r.aspect===u.id),done=children.filter(r=>r.state==='done').length;rows.push({id:u.id,tab:'management',aspect:u.id,title:u.name,unit:'',pps:[...new Set(children.flatMap(r=>r.pps))],state:fillingState(done===children.length?'submitted':'draft',done,children.length,children.some(r=>r.state!=='empty')),evidence:children.some(r=>r.evidence),filled:done,expected:children.length,updatedAt:records[u.id]?.updatedAt??null,workflow:records[u.id]?.status??'draft'});}
 rows.sort((a,b)=>a.aspect.localeCompare(b.aspect,'en',{numeric:true}));
 // Summary of all expected teacher/stage records, without exposing teacher marks.
 const teachers=d.teachers.filter(t=>rosterActive(t,year)),ids=new Set(teachers.map(t=>t.id));
 const latest=new Map<string,Row>();for(const a of d.assessments.filter(a=>a.year===year&&ids.has(a.teacherId)&&stages.includes(a.stage))){const k=a.teacherId+':'+a.stage;if(!latest.has(k)||String(a.updatedAt)>String(latest.get(k)!.updatedAt))latest.set(k,a);}
 const assessments=[...latest.values()],expected=teachers.length*stages.length,complete=assessments.filter(a=>a.scores?.length===38&&a.scores.every((n:unknown)=>typeof n==='number')&&['submitted','verified'].includes(a.status)).length;
 rows.push({id:'standard4',tab:'management',aspect:'4',title:'Standard 4 · PdPc (3 penilaian setiap guru)',unit:'',pps:['Semua guru'],state:fillingState(expected>0&&complete===expected?'submitted':'draft',complete,expected,assessments.some(a=>a.scores?.some((n:unknown)=>typeof n==='number')||a.notes||a.evidence?.length)),evidence:assessments.some(a=>a.evidence?.some((s:unknown)=>typeof s==='string'&&/^https?:\/\//i.test(s))),filled:complete,expected,updatedAt:assessments.map(a=>a.updatedAt).filter(Boolean).sort().at(-1)??null,workflow:''});
 return {year,school:{id:d.school.id,code:d.school.code,name:d.school.name},rows,fetchedAt:now()};
}
export function memberFillingStatus(d:SchoolDoc,m:Row,year:number){const s=session(d,m);if(m.active!==1||!d.members.some(p=>p.id===m.id&&p.active===1)||!(s.isAdmin||s.isSchoolLeader||s.isPGB))fail('Halaman status hanya untuk Admin, PGB dan pentadbir sekolah.',403);return schoolFillingStatus(d,year);}
export async function platformFillingStatus(db:any,v:Row){
 if(!validYear(v.year))fail('Pilih tahun antara 2020–2100.');
 if(v.schoolId){if(typeof v.schoolId!=='string')fail('Sekolah tidak sah.');const r=await db.from('s4_schools').select('id,code,data').eq('id',v.schoolId).maybeSingle();if(r.error)fail('Status sekolah belum dapat dimuatkan.',503);if(!r.data)fail('Sekolah tidak ditemui.',404);return schoolFillingStatus(r.data.data,v.year);}
 const schools:FillingSchool[]=[];for(let start=0;;start+=100){const r=await db.from('s4_schools').select('id,code,school:data->school').order('code').range(start,start+99);if(r.error)fail('Senarai sekolah belum dapat dimuatkan.',503);schools.push(...r.data.map((r:Row)=>({id:r.id,code:r.code,name:r.school?.name??r.code})));if(r.data.length<100)break;}return {schools};
}
