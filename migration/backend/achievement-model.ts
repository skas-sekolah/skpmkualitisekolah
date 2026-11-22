// Source: user-supplied Instrumen SKPM Kualiti@Sekolah Edisi 2026, printed pp.91–93.
// Standard 5 records outcomes in their original units; it has no invented 0–4 scale or overall weighting.
export const ACHIEVEMENT_GROUPS=[{id:'5.1',name:'Akademik'},{id:'5.2',name:'Kokurikulum'},{id:'5.3',name:'Sahsiah'},{id:'5.4',name:'Guru & sekolah'}] as const;
export type ValueKind='percent'|'gps'|'pngk'|'count';
type Field={key:string;label:string;kind:ValueKind;guide:string};
const field=(key:string,label:string,kind:ValueKind,guide:string):Field=>({key,label,kind,guide});
const gps=(key:string,label:string)=>field(key,label,'gps','Salin GPS daripada laporan rasmi yang berkaitan. GPS ialah nilai gred purata, bukan peratus dan tidak ditukar kepada skor 0–4.');
const levels=['Daerah','Negeri','Kebangsaan','Antarabangsa'];
export const ACHIEVEMENT_ITEMS=[
 {id:'5.1.1',group:'5.1',name:'Penguasaan murid dalam PBD dan UASA',guide:'Rekodkan taburan peratus TP1–TP6 bagi PBD berterusan dan gred A–F bagi UASA, mengikut mata pelajaran serta tahun/tingkatan. Jumlah satu taburan perlu 100% (toleransi pembundaran 0.1 mata peratus).',fields:[] as Field[],distribution:true},
 {id:'5.1.2',group:'5.1',name:'Pencapaian MBPK dalam pentaksiran alternatif',guide:'Gunakan laporan pentaksiran alternatif tahun akhir. Tandakan ukuran yang tidak berkenaan dan nyatakan sebab dalam catatan.',fields:[field('sasm','MBPK tahun akhir layak menerima SASM','percent','Masukkan peratus MBPK tahun akhir yang layak menerima Sijil Alternatif Sekolah Menengah (SASM).'),field('papr','MBPK tahun akhir layak menerima pelaporan PAPR','percent','Masukkan peratus MBPK tahun akhir yang layak menerima Pelaporan Pentaksiran Alternatif Pendidikan Rendah (PAPR).')]},
 {id:'5.1.3',group:'5.1',name:'Pencapaian murid dalam peperiksaan awam',guide:'Isi ukuran peperiksaan yang dilaksanakan di sekolah. Sekolah rendah boleh menandakan item ini tidak berkenaan dengan sebab dan evidens.',fields:[field('lms','Murid layak menerima sijil SPM','percent','Masukkan peratus murid yang layak menerima sijil (LMS) SPM daripada laporan rasmi.'),gps('spm','GPS SPM'),field('stpm','PNGK STPM','pngk','Salin Purata Nilai Gred Kumulatif (PNGK) STPM daripada laporan rasmi, bukan peratus.'),field('stam','Murid mencapai sekurang-kurangnya Makbul dalam STAM','percent','Masukkan peratus murid yang memperoleh sekurang-kurangnya keputusan Makbul dalam STAM.')]},
 ...(['Kelab/Persatuan','Badan Beruniform','Sukan/Permainan','Keseluruhan kokurikulum']).map((name,i)=>({id:'5.2.'+(i+1),group:'5.2',name:'GPS '+name,guide:'Gunakan GPS daripada laporan kokurikulum rasmi bagi tahun pelaporan. GPS keseluruhan disalin daripada laporan, bukan purata automatik tiga komponen.',fields:[gps('gps','GPS '+name)]})),
 {id:'5.3.1',group:'5.3',name:'Kehadiran murid',guide:'Gunakan rumusan kehadiran murid bagi tahun pelaporan.',fields:[field('attendance','Purata peratus kehadiran murid','percent','Masukkan purata peratus kehadiran murid daripada laporan kehadiran rasmi. Nilai antara 0 hingga 100; nyatakan tempoh dan sumber dalam catatan.')]},
 ...(['guru','sekolah']).map((subject,i)=>({id:'5.4.'+(i+1),group:'5.4',name:'Pencapaian '+subject,guide:'Rekodkan butiran program/aktiviti/pencapaian '+subject+' dan evidens bagi setiap rekod. Bilangan ringkasan dijana daripada rekod mengikut peringkat; semak kategori dan pencapaian dengan dokumen rasmi.',fields:levels.map((label,n)=>field('level'+n,label,'count','Masukkan bilangan pencapaian '+subject+' yang diiktiraf oleh KPM pada peringkat '+label.toLowerCase()+'. Gunakan nombor bulat; 0 bermaksud tiada pencapaian dan perlu disokong rekod.'))})),
];
export type AchievementId=string;
export type AchievementStatus='draft'|'submitted'|'returned'|'verified';
export const ACHIEVEMENT_STATUS:Record<AchievementStatus,string>={draft:'Draf',submitted:'Menunggu semakan',returned:'Perlu pembetulan',verified:'Disahkan'};
export const DISTRIBUTIONS={pbd:['TP1','TP2','TP3','TP4','TP5','TP6'],uasa:['A','B','C','D','E','F']} as const;
export type DistributionRow={id:string;subject:string;level:string;type:'pbd'|'uasa';values:Record<string,number|null>};
export const ACHIEVEMENT_LEVELS=[{id:'district',label:'Daerah'},{id:'state',label:'Negeri'},{id:'national',label:'Kebangsaan'},{id:'international',label:'Antarabangsa'}] as const;
export type AchievementProgram={id:string;program:string;teacherNames:string[];organizer:string;category:string;level:string;achievement:string;date:string;notes:string;evidence:string[]};
export const detailedAchievement=(aspect:string)=>aspect==='5.4.1'||aspect==='5.4.2';
export type AchievementData={achievementMode?:'records';programs?:AchievementProgram[];noAchievements?:boolean;legacyCounts?:Record<string,number|null>;applicable:boolean;values:Record<string,number|null>;excluded:string[];rows:DistributionRow[];notes:string;evidence:string[]};
export type AchievementRecord={aspect:string;year:number;revision:number;status:AchievementStatus;assigneeId:string|null;pssIds:string[];reviewerId:string|null;data:AchievementData;feedback:string;updatedAt:string|null;updatedBy:string|null;submittedAt:string|null;verifiedAt:string|null;verifiedBy:string|null;verifiedName:string|null;lastEditorId?:string|null;lastMutationId?:string;lastMutationActor?:string;canAdmin:boolean;canRead:boolean;canEdit:boolean;canReview:boolean;canReopen?:boolean};
export type AchievementBundle={year:number;records:AchievementRecord[];people:{id:string;name:string}[];school:{code:string;name:string};sessionId:string};
export type PendingAchievement={year:number;aspect:string;revision:number;data:AchievementData;mutationId:string;error?:string};
export function emptyAchievementData():AchievementData{return {applicable:true,values:{},excluded:[],rows:[],notes:'',evidence:[]};}
export function emptyAchievementRecord(aspect:string,year:number):AchievementRecord{return {aspect,year,revision:0,status:'draft',assigneeId:null,pssIds:[],reviewerId:null,data:emptyAchievementData(),feedback:'',updatedAt:null,updatedBy:null,submittedAt:null,verifiedAt:null,verifiedBy:null,verifiedName:null,canAdmin:false,canRead:false,canEdit:false,canReview:false};}
export const validAchievement=(id:unknown):id is string=>typeof id==='string'&&ACHIEVEMENT_ITEMS.some(a=>a.id===id);
export const validAchievementYear=(y:unknown):y is number=>typeof y==='number'&&Number.isInteger(y)&&y>=2020&&y<=2100;
export const achievementUnit=(kind:ValueKind)=>kind==='percent'?'%':kind==='count'?'Bilangan':kind==='gps'?'GPS':'PNGK';
export function effectiveAchievementPSS(rows:{standard:string;memberIds:string[]}[],aspect:string){return [...(rows.filter(r=>r.standard===aspect||aspect.startsWith(r.standard+'.')).sort((a,b)=>b.standard.length-a.standard.length)[0]?.memberIds??[])];}
function text(v:unknown,max:number){if(typeof v!=='string'||v.length>max)throw Error('Teks tidak sah atau terlalu panjang.');return v.trim();}
function numeric(v:unknown,kind:ValueKind){if(v===null||v===undefined||v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>(kind==='percent'?100:1000000)||kind==='count'&&!Number.isInteger(v))throw Error(kind==='percent'?'Peratus mesti antara 0 hingga 100.':kind==='count'?'Bilangan mesti nombor bulat antara 0 hingga 1,000,000.':'Nilai gred purata mesti nombor tidak negatif.');return v;}
export function cleanAchievementData(aspect:string,input:unknown):AchievementData{
 const item=ACHIEVEMENT_ITEMS.find(a=>a.id===aspect);if(!item||!input||typeof input!=='object'||Array.isArray(input))throw Error('Maklumat Standard 5 tidak sah.');const v=input as AchievementData,out=emptyAchievementData();out.applicable=v.applicable!==false;out.notes=text(v.notes??'',2000);
 if(!Array.isArray(v.evidence)||v.evidence.length>20)throw Error('Maksimum 20 pautan evidens.');out.evidence=v.evidence.map(s=>text(s,500)).filter(Boolean).map(s=>{let u:URL;try{u=new URL(s);}catch{throw Error('Gunakan pautan evidens http atau https yang lengkap.');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Pautan evidens tidak sah.');return u.href;});
 const allowed=item.id==='5.1.1'?['pbd','uasa']:item.fields.map(f=>f.key);if(!Array.isArray(v.excluded)||new Set(v.excluded).size!==v.excluded.length||v.excluded.some(k=>!allowed.includes(k)))throw Error('Pilihan tidak berkenaan tidak sah.');out.excluded=[...v.excluded];for(const f of item.fields)out.values[f.key]=numeric(v.values?.[f.key],f.kind);
 if(!Array.isArray(v.rows)||v.rows.length>100)throw Error('Maksimum 100 baris mata pelajaran.');if(item.id==='5.1.1'){
  const ids=new Set(),names=new Set();out.rows=v.rows.map(r=>{if(!r||!['pbd','uasa'].includes(r.type))throw Error('Jenis pentaksiran tidak sah.');const id=text(r.id,80),subject=text(r.subject,140),level=text(r.level,80);if(!id||ids.has(id))throw Error('Pengecam baris berulang.');ids.add(id);const key=[r.type,subject,level].join(':').toLocaleLowerCase().replace(/\s+/g,' ');if(subject&&level&&names.has(key))throw Error('Mata pelajaran dan tahun/tingkatan berulang bagi pentaksiran yang sama.');names.add(key);const values:Record<string,number|null>={};for(const key of DISTRIBUTIONS[r.type])values[key]=numeric(r.values?.[key],'percent');return {id,subject,level,type:r.type,values};});
 }
 if(detailedAchievement(aspect)&&v.achievementMode==='records'){
  out.achievementMode='records';out.noAchievements=v.noAchievements===true;out.programs=cleanAchievementPrograms(aspect,v.programs??[]);out.legacyCounts={};for(const f of item.fields)if(v.legacyCounts&&Object.hasOwn(v.legacyCounts,f.key))out.legacyCounts[f.key]=numeric(v.legacyCounts[f.key],'count');
  if(out.noAchievements&&out.programs.length)throw Error('Kosongkan rekod sebelum mengesahkan tiada pencapaian.');
  out.excluded=[];out.values=achievementProgramCounts(out);
  if(JSON.stringify(out).length>250000)throw Error('Rekod terlalu besar. Kurangkan pautan atau teks sebelum menyimpan.');
 }return out;
}
export function achievementIssues(aspect:string,data:AchievementData){const item=ACHIEVEMENT_ITEMS.find(a=>a.id===aspect);if(!item)return ['Standard tidak sah.'];const issues:string[]=[];if(!achievementEvidence(data).length)issues.push('Masukkan sekurang-kurangnya satu evidens sebelum menghantar.');if(!data.applicable){if(data.notes.length<10)issues.push('Nyatakan sebab tidak berkenaan, sekurang-kurangnya 10 aksara.');return issues;}
 if(detailedAchievement(aspect)&&data.achievementMode==='records'){
  if(data.noAchievements){if(data.notes.trim().length<10)issues.push('Nyatakan pengesahan tiada pencapaian, sekurang-kurangnya 10 aksara.');return issues;}
  if(!data.programs?.length)issues.push('Tambah rekod pencapaian atau sahkan tiada pencapaian.');
  for(const [i,r]of (data.programs??[]).entries()){if(!r.program||!r.organizer||!r.category||!r.level||!r.achievement||aspect==='5.4.1'&&!r.teacherNames.length)issues.push('Lengkapkan program, guru (5.4.1), anjuran, kategori, peringkat dan tahap pencapaian rekod '+(i+1)+'.');if(!r.evidence.length)issues.push('Tambah evidens khusus bagi rekod '+(i+1)+'.');}
  return issues;
 }
 if(data.excluded.length&&data.notes.length<10)issues.push('Nyatakan sebab ukuran/pentaksiran tidak berkenaan dalam catatan.');
 if(aspect==='5.1.1'){
  if(data.excluded.length===2)issues.push('Tandakan seluruh item tidak berkenaan jika kedua-dua pentaksiran tidak digunakan.');
  for(const type of ['pbd','uasa'] as const){if(data.excluded.includes(type))continue;const rows=data.rows.filter(r=>r.type===type);if(!rows.length)issues.push('Tambah sekurang-kurangnya satu mata pelajaran '+type.toUpperCase()+'.');for(const row of rows){if(!row.subject||!row.level||DISTRIBUTIONS[type].some(k=>row.values[k]===null||row.values[k]===undefined))issues.push('Lengkapkan mata pelajaran, tahun/tingkatan dan semua peratus '+type.toUpperCase()+'.');else if(Math.abs(Object.values(row.values).reduce<number>((a,b)=>a+(b??0),0)-100)>0.100001)issues.push('Jumlah taburan setiap mata pelajaran mesti 100% (toleransi 0.1 mata peratus).');}}
 }else{if(item.fields.every(f=>data.excluded.includes(f.key)))issues.push('Tandakan seluruh item tidak berkenaan jika tiada ukuran digunakan.');for(const f of item.fields)if(!data.excluded.includes(f.key)&&data.values[f.key]==null)issues.push('Lengkapkan '+f.label+'.');}return issues;
}
export function achievementEntries(aspect:string,data:AchievementData){const item=ACHIEVEMENT_ITEMS.find(a=>a.id===aspect);if(!item||!data.applicable)return [];if(aspect==='5.1.1')return data.rows.filter(r=>!data.excluded.includes(r.type)).flatMap(r=>DISTRIBUTIONS[r.type].map(k=>({label:r.type.toUpperCase()+' · '+r.subject+' · '+r.level+' · '+k,value:r.values[k]??null,unit:'%'})));return item.fields.filter(f=>!data.excluded.includes(f.key)).map(f=>({label:f.label,value:data.values[f.key]??null,unit:achievementUnit(f.kind)}));}

export function achievementEvidence(data:AchievementData){return [...new Set([...data.evidence,...(data.programs??[]).flatMap(r=>r.evidence)])];}
export function achievementProgramCounts(data:AchievementData):Record<string,number|null>{const ready=data.noAchievements===true||!!data.programs?.length;return Object.fromEntries(ACHIEVEMENT_LEVELS.map((level,i)=>['level'+i,ready?(data.programs??[]).filter(r=>r.level===level.id).length:null]));}
function cleanAchievementPrograms(aspect:string,input:unknown):AchievementProgram[]{
 if(!Array.isArray(input)||input.length>100)throw Error('Maksimum 100 rekod pencapaian setiap item dan tahun.');const ids=new Set<string>();return input.map(r=>{
  if(!r||typeof r!=='object')throw Error('Rekod pencapaian tidak sah.');const id=text(r.id,80);if(!id||ids.has(id))throw Error('Pengecam rekod pencapaian berulang.');ids.add(id);
  const level=text(r.level??'',30);if(level&&!ACHIEVEMENT_LEVELS.some(l=>l.id===level))throw Error('Peringkat pencapaian tidak sah.');
  const date=text(r.date??'',10);if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw Error('Tarikh pencapaian tidak sah.');
  if(!Array.isArray(r.teacherNames)||r.teacherNames.length>50||!Array.isArray(r.evidence)||r.evidence.length>10)throw Error('Maksimum 50 nama guru dan 10 pautan evidens setiap rekod.');
  const teacherNames=aspect==='5.4.1'?[...new Set(r.teacherNames.map((n:unknown)=>text(n,180)).filter(Boolean))] as string[]:[];
  const evidence=[...new Set(r.evidence.map((u:unknown)=>{const value=text(u,500);if(!value)return '';let url:URL;try{url=new URL(value);}catch{throw Error('Pautan evidens rekod tidak sah.');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Pautan evidens rekod tidak sah.');return url.href;}).filter(Boolean))] as string[];
  return {id,program:text(r.program??'',250),teacherNames,organizer:text(r.organizer??'',180),category:text(r.category??'',120),level,achievement:text(r.achievement??'',180),date,notes:text(r.notes??'',1000),evidence};
 });
}
export function achievementProgramRows(aspect:string,data:AchievementData){return (data.programs??[]).map(r=>[aspect,r.program,r.teacherNames.join('; '),r.organizer,r.category,ACHIEVEMENT_LEVELS.find(l=>l.id===r.level)?.label??'',r.achievement,r.date,r.notes,r.evidence.join('\n')]);}
