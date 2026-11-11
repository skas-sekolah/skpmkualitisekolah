import source from './rubric.json' with {type:'json'};
export type TeacherType = 'perdana'|'khas';
export type Stage = 'kendiri'|'pertama'|'kedua';
export type Teacher = {id:string;name:string;type:TeacherType;pp1:string;pp2:string;position:string;grade:string;session:string;sourceNumber:number;gender?:string;ic?:string;status?:string;whereabouts?:string;inactiveFromYear?:number;inactiveReason?:string};
export type TeacherRosterRow=Pick<Teacher,'name'|'type'>&Partial<Pick<Teacher,'id'|'position'|'grade'|'session'|'sourceNumber'|'gender'|'ic'|'status'|'whereabouts'|'inactiveFromYear'|'inactiveReason'>>;
export type WargaRosterRow=Omit<TeacherRosterRow,'type'>&{type:TeacherType|'';status?:string};
export function rosterActive(row:{inactiveFromYear?:number},year?:number){return year===undefined||!Number.isInteger(row.inactiveFromYear)||year<row.inactiveFromYear!;}
export function rosterDuplicates(rows:WargaRosterRow[]){const matches=new Map<string,string[]>();for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j],reasons:string[]=[];if(normalized(a.name)===normalized(b.name))reasons.push('Nama sama');if(a.ic&&b.ic&&a.ic.replace(/[-\s]/g,'')===b.ic.replace(/[-\s]/g,''))reasons.push('No. IC sama');if(reasons.length){for(const [x,y] of [[a,b],[b,a]]){const key=(x.status==='AKP'?'staff:':'teacher:')+x.id;matches.set(key,[...(matches.get(key)??[]),y.name+' ('+reasons.join(', ')+')']);}}}return matches;}
export function cleanWargaRosterRow(input:unknown):WargaRosterRow{
 if(!input||typeof input!=='object')throw new Error('Baris Guru / AKP tidak sah.');
 const v=input as Record<string,unknown>,status=String(v.status??'').trim().toUpperCase()||'GURU';
 if(!['GURU','AKP'].includes(status))throw new Error('STATUS mestilah GURU atau AKP.');
 if(status==='GURU')return {...cleanTeacherRosterRow({...v,status}),status};
 if(v.type!==undefined&&v.type!=='')throw new Error('Kategori AKP perlu dikosongkan atau Tidak berkenaan.');
 const session=String(v.session??'').trim().toUpperCase();
 if(session&&!['PAGI','PETANG','PEJABAT'].includes(session))throw new Error('Sesi AKP mestilah PAGI, PETANG atau PEJABAT.');
 return {...cleanTeacherRosterRow({...v,type:'perdana',session:session==='PEJABAT'?'':session,status}),type:'',session,status};
}
export function cleanTeacherRosterRow(input:unknown):TeacherRosterRow{
 if(!input||typeof input!=='object')throw new Error('Baris guru tidak sah.');
 const v=input as Record<string,unknown>,r:Record<string,unknown>={};
 for(const f of ['id','name','position','grade','session','gender','ic','status','whereabouts'])if(v[f]!==undefined){if(typeof v[f]!=='string'||(v[f] as string).length>180)throw new Error('Maklumat '+f+' tidak sah.');r[f]=(v[f] as string).trim().replace(/\s+/g,' ');}
 if(typeof r.name!=='string'||r.name.length<3||/^\d+$/.test(r.name))throw new Error('Nama guru perlu sekurang-kurangnya 3 aksara.');
 if(!['perdana','khas'].includes(String(v.type)))throw new Error('Pilih kategori Perdana atau Pendidikan Khas.');r.type=v.type;
 if(r.ic){r.ic=String(r.ic).replace(/[-\s]/g,'');if(!/^\d{12}$/.test(String(r.ic)))throw new Error('No. IC perlu 12 digit.');}
 if(r.gender){r.gender=String(r.gender).toUpperCase();if(!['L','P'].includes(String(r.gender)))throw new Error('Jantina mestilah L atau P.');}
 if(r.session){r.session=String(r.session).toUpperCase();if(!['PAGI','PETANG'].includes(String(r.session)))throw new Error('Sesi mestilah PAGI atau PETANG.');}
 if(v.sourceNumber!==undefined){if(!Number.isInteger(v.sourceNumber)||Number(v.sourceNumber)<0||Number(v.sourceNumber)>10000)throw new Error('Bilangan tidak sah.');r.sourceNumber=v.sourceNumber;}
 return r as TeacherRosterRow;
}
export type RosterInput={name:string;type:TeacherType;pp1?:string;pp2?:string;position?:string;grade?:string;session?:string;sourceNumber?:number};
export type Assessment = {id:string;teacherId:string;year:number;stage:Stage;status:'draft'|'submitted'|'verified';epoch?:string;feedback?:string;verifiedAt?:string;verifiedBy?:string;scores:(number|null)[];evaluator:string;date:string;subject:string;classroom:string;notes:string;evidence?:string[];total:string|null;revision:number;updatedAt:string;updatedBy?:string;mutationId?:string;localPending?:boolean};
export const stages:Stage[]=['kendiri','pertama','kedua'];
export const stageNames:Record<Stage,string>={kendiri:'Penilaian Kendiri',pertama:'Pencerapan 1',kedua:'Pencerapan 2'};
export function assignedEvaluator(teacher:Pick<Teacher,'name'|'pp1'|'pp2'>,stage:Stage){return stage==='kendiri'?teacher.name:stage==='pertama'?(teacher.pp1||''):(teacher.pp2||'');}
export const rubric=source;
export const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function calculate(scores:(number|null)[],type:TeacherType){
 let index=0;
 const aspects=rubric[type].groups.map(g=>{const values=scores.slice(index,index+g.items.length);index+=g.items.length;const complete=values.length===g.items.length&&values.every(x=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=4);const sum=values.reduce<number>((a,b)=>a+(typeof b==='number'?b:0),0);return {code:g.code,weight:g.weight,complete,score:complete?round(sum/(g.items.length*4)*g.weight):null,percentage:complete?(g.code==='4.4.2'?Math.floor((sum/(g.items.length*4)*100+1e-9)*100)/100:round(sum/(g.items.length*4)*100)):null};});
 return {aspects,total:aspects.every(a=>a.complete)?round(aspects.reduce((s,a)=>s+(a.score??0),0)):null,filled:scores.filter(x=>x!==null&&x!==undefined).length};
}
export function grade(n:number){return n>=85?'Cemerlang':n>=70?'Baik':n>=55?'Sederhana':'Perlu tindakan segera';}
export function normalized(name:string){return name.trim().replace(/\s+/g,' ').normalize('NFKC').toLocaleUpperCase('ms-MY');}
export function filterTeachers(teachers:Teacher[],filters:{query:string;category:string;completion:string;session:string;pp1:string;pp2:string;issue:string},done:(id:string)=>number){
 const f=filters;
 return teachers.filter(t=>(f.category==='all'||t.type===f.category)&&normalized(t.name).includes(normalized(f.query))&&(f.completion==='all'||(f.completion==='complete'?done(t.id)===3:f.completion==='partial'?done(t.id)>0&&done(t.id)<3:done(t.id)===0))&&(f.session==='all'||t.session===f.session)&&(f.pp1==='all'||(f.pp1==='missing'?!t.pp1:t.pp1===f.pp1))&&(f.pp2==='all'||(f.pp2==='missing'?!t.pp2:t.pp2===f.pp2))&&(f.issue==='all'||(f.issue==='pp1'?!t.pp1:f.issue==='pp2'?!t.pp2:!t.pp1||!t.pp2))).sort((a,b)=>(a.sourceNumber||99999)-(b.sourceNumber||99999)||a.name.localeCompare(b.name));
}
export function parseRoster(text:string):RosterInput[]{
 const delimiter=text.includes('\t')?'\t':','; const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(s=>s.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 row.push(cell);if(row.some(s=>s.trim()))rows.push(row);
 if(!rows.length)return [];
 const headers=rows[0].map(x=>normalized(x).replace(/^\uFEFF/,''));const col=headers.findIndex(x=>['NAMA','NAMA PYD','NAMA GURU','NAMA PENUH','NAME'].includes(x));const typeCol=headers.findIndex(x=>['JENIS','KATEGORI','TYPE','ALIRAN'].includes(x));
 const fields={pp1:headers.findIndex(h=>/^PP1\b/.test(h)),pp2:headers.findIndex(h=>/^PP2\b/.test(h)),position:headers.indexOf('JAWATAN'),grade:headers.indexOf('GRED'),session:headers.findIndex(h=>['SESI','SESI SEKOLAH'].includes(h))};
 return (col>=0?rows.slice(1):rows).map(r=>{const name=(r[col>=0?col:0]??'').trim();const kind=r[typeCol>=0?typeCol:1]??'';const entry:RosterInput={name:name.replace(/\s+/g,' '),type:/khas|ppki/i.test(kind)?'khas':'perdana'};if(col>=0)for(const [field,index] of Object.entries(fields))if(index>=0)(entry as unknown as Record<string,unknown>)[field]=(r[index]??'').trim();return entry;}).filter(t=>t.name.length>=3&&t.name.length<=180&&!/^\d+$/.test(t.name));
}

// Legacy assignments use one observer for both rounds until explicitly changed.
export function observationOfficer(row:{observerId?:string|null;observer2Id?:string|null}|undefined,stage:string){return stage==='kedua'&&row?.observer2Id!==undefined?row.observer2Id:row?.observerId??null;}
