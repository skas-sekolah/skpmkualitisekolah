import {rubric,stages,stageNames,normalized,type Stage,type TeacherType} from './scoring';
export type TransferRecord={teacherId:string;teacherName:string;schoolCode:string;year:number;stage:Stage|'';type:TeacherType|'';scores:(number|null)[];date:string;subject:string;classroom:string};
export type TransferBundle={moeisStrength?:import('../migration/backend/strength-model').MoeisStrengthSnapshot[];moeisStrengthRevision?:number;school:{id:string;code:string;name:string};year:number;epoch:string;teachers:{id:string;name:string;type:TeacherType;canImport:Stage[]}[];assessments:import('./scoring').Assessment[]};
export type TransferPreview={file:string;record:TransferRecord;errors:string[];warnings:string[];existingRevision:number;existingId:string;replace:boolean;selected:boolean};
export const TRANSFER_ITEMS=rubric.perdana.groups.flatMap(g=>g.items.map((_,i)=>({code:g.code,item:String.fromCharCode(97+i)})));
export function cleanStage(value:string):Stage|''{const v=normalized(value).replace(/[_-]+/g,' ');return /^(KENDIRI|PENILAIAN KENDIRI)$/.test(v)?'kendiri':/^(PERTAMA|PENCERAPAN 1|PENCERAPAN PERTAMA|CERAPAN 1)$/.test(v)?'pertama':/^(KEDUA|PENCERAPAN 2|PENCERAPAN KEDUA|CERAPAN 2)$/.test(v)?'kedua':'';}
export const emptyTransfer=():TransferRecord=>({teacherId:'',teacherName:'',schoolCode:'',year:0,stage:'',type:'',scores:Array(38).fill(null),date:'',subject:'',classroom:''});
export function parseCsv(text:string):string[][]{
 if(text.length>2_000_000)throw Error('Had kandungan CSV ialah 2 MB.');
 const rows:string[][]=[];let row:string[]=[],cell='',quote=false,closed=false;
 const push=()=>{row.push(cell);cell='';closed=false;if(row.length>30)throw Error('Maksimum 30 lajur CSV.');};
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else if(!quote&&cell===' '){cell='';quote=true;}else if(!quote&&cell!=='')throw Error('Petikan CSV tidak sah.');else if(quote){quote=false;closed=true;}else quote=true;}else if(c===','&&!quote)push();else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;push();if(row.some(v=>v.trim()))rows.push(row);row=[];if(rows.length>2000)throw Error('Maksimum 2000 baris CSV.');}else{if(closed&&c.trim())throw Error('Petikan CSV tidak sah.');cell+=c;}}
 if(quote)throw Error('Petikan CSV tidak ditutup.');push();if(row.some(v=>v.trim()))rows.push(row);return rows;
}
function score(value:string){if(value.trim()==='')return null;if(!/^[0-4](?:\.0+)?$/.test(value.trim()))throw Error('Skor mesti nombor bulat 0 hingga 4 atau kosong.');return Number(value);}
export function parseScoreCsv(text:string,filename:string):TransferRecord[]{
 const rows=parseCsv(text.replace(/^\uFEFF/,''));if(rows.length<2)throw Error('CSV tiada skor.');
 const headers=rows[0].map(h=>h.trim().toLowerCase());if(new Set(headers).size!==headers.length)throw Error('Tajuk lajur CSV berulang.');
 for(const h of ['sub_aspek','item','skor'])if(!headers.includes(h))throw Error('CSV perlu lajur sub_aspek,item,skor.');
 const at=(r:string[],h:string)=>r[headers.indexOf(h)]?.trim()??'';
 const groups=new Map<string,{record:TransferRecord;seen:Set<number>}>();
 for(const r of rows.slice(1)){
  const record=emptyTransfer();record.teacherId=at(r,'teacher_id');record.teacherName=at(r,'nama_guru');record.schoolCode=at(r,'kod_sekolah');record.year=at(r,'tahun')?Number(at(r,'tahun')):0;record.stage=cleanStage(at(r,'sesi'));record.type=at(r,'kategori')==='khas'?'khas':at(r,'kategori')==='perdana'?'perdana':'';
  if(at(r,'tahun')&&(!Number.isInteger(record.year)||record.year<2020||record.year>2100))throw Error('Tahun CSV tidak sah.');
  if(at(r,'sesi')&&!record.stage)throw Error('Sesi CSV tidak dikenali.');if(at(r,'kategori')&&!record.type)throw Error('Kategori CSV mestilah perdana atau khas.');
  record.date=at(r,'tarikh');record.subject=at(r,'mata_pelajaran');record.classroom=at(r,'kelas');
  const key=JSON.stringify([record.teacherId,record.teacherName,record.schoolCode,record.year,record.stage,record.type]);let group=groups.get(key);if(!group){group={record,seen:new Set()};groups.set(key,group);}
  if(['date','subject','classroom'].some(k=>group!.record[k as 'date']!==record[k as 'date']))throw Error('Maklumat penilaian tidak seragam dalam rekod yang sama.');
  const index=TRANSFER_ITEMS.findIndex(x=>x.code===at(r,'sub_aspek')&&x.item===at(r,'item').replace(/[).]$/,'').toLowerCase());if(index<0)throw Error('Kod subaspek / item tidak dikenali.');if(group.seen.has(index))throw Error('Skor item berulang: '+at(r,'sub_aspek')+' '+at(r,'item'));group.seen.add(index);group.record.scores[index]=score(at(r,'skor'));
 }
 if(groups.size>50)throw Error('Maksimum 50 penilaian setiap kelompok.');
 return [...groups.values()].map(g=>{if(g.seen.size!==38)throw Error('Setiap penilaian perlu 38 baris item; skor boleh dikosongkan.');if(!g.record.teacherName&&!g.record.teacherId){const match=filename.replace(/\.csv$/i,'').match(/^(KENDIRI|PENILAIAN KENDIRI|PENCERAPAN [12]|PERTAMA|KEDUA)[-_](.+)$/i);if(match){g.record.stage=cleanStage(match[1]);g.record.teacherName=match[2];}}return g.record;});
}
export function previewTransfer(record:TransferRecord,b:TransferBundle,file:string):TransferPreview{
 const r={...record,scores:[...record.scores]},errors:string[]=[],warnings:string[]=[];
 if(r.schoolCode&&normalized(r.schoolCode)!==normalized(b.school.code))errors.push('Kod sekolah fail berbeza daripada sekolah dipilih.');
 if(r.year&&r.year!==b.year)errors.push('Tahun fail berbeza daripada tahun dipilih.');
 if(r.teacherId){const t=b.teachers.find(t=>t.id===r.teacherId);if(!t)errors.push('ID guru tidak ditemui di sekolah ini.');else if(r.teacherName&&normalized(r.teacherName)!==normalized(t.name))errors.push('Nama dan ID guru tidak sepadan.');}
 else if(r.teacherName){const ts=b.teachers.filter(t=>normalized(t.name)===normalized(r.teacherName));if(ts.length===1)r.teacherId=ts[0].id;else errors.push(ts.length?'Nama guru berulang; pilih ID guru secara manual.':'Nama guru tidak ditemui. Pilih guru yang betul.');}
 const t=b.teachers.find(t=>t.id===r.teacherId);if(!t)errors.push('Pilih guru untuk rekod ini.');
 if(!stages.includes(r.stage as Stage))errors.push('Pilih sesi penilaian.');
 if(t&&r.type&&r.type!==t.type)errors.push('Kategori guru fail tidak sepadan.');
 if(t&&r.stage&&!t.canImport.includes(r.stage))errors.push('Akaun ini tidak ditugaskan mengisi sesi tersebut. Import Kendiri dibenarkan untuk Admin; pencerapan mengikut penugasan sedia ada.');
 if(r.scores.length!==38||r.scores.some(v=>v!==null&&(!Number.isInteger(v)||v<0||v>4)))errors.push('38 skor 0–4 / kosong diperlukan.');
 if(r.scores.every(v=>v===null))errors.push('Fail masih kosong; isi sekurang-kurangnya satu skor.');
 if(r.scores.every(v=>v===4))warnings.push('Semua 38 skor bernilai 4. Pastikan ini penilaian sebenar, bukan nilai awal templat.');
 if(r.scores.some(v=>v===null))warnings.push('Skor belum lengkap; rekod hanya boleh disimpan sebagai draf.');
 if(r.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||Number(r.date.slice(0,4))!==b.year||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date))errors.push('Tarikh penilaian tidak sah untuk tahun dipilih.');
 const previous=b.assessments.find(a=>a.teacherId===r.teacherId&&a.year===b.year&&a.stage===r.stage&&(!b.epoch||a.epoch===b.epoch));
 if(previous&&previous.status!=='draft')errors.push('Rekod sudah dihantar / disahkan dan dikunci.');
 if(previous?.localPending)errors.push('Terdapat draf peranti belum diselaraskan. Selaraskan dahulu.');
 if(previous)warnings.push('Draf sedia ada ditemui. Penggantian 38 skor memerlukan pengesahan; ulasan dan evidens dikekalkan.');
 r.year=r.year||b.year;r.schoolCode=r.schoolCode||b.school.code;if(t){r.type=r.type||t.type;r.teacherName=r.teacherName||t.name;}
 return {file,record:r,errors:[...new Set(errors)],warnings,existingRevision:previous?.revision??0,existingId:previous?.id??'',replace:false,selected:false};
}
const quote=(v:unknown)=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,s=>"'"+s).replaceAll('"','""')+'"';
export function scoresCsv(records:TransferRecord[],helper=false){const headers=helper?['sub_aspek','item','skor']:['kod_sekolah','teacher_id','nama_guru','tahun','sesi','kategori','sub_aspek','item','skor','tarikh','mata_pelajaran','kelas'];return '\uFEFF'+[headers,...records.flatMap(r=>TRANSFER_ITEMS.map((x,i)=>helper?[x.code,x.item,r.scores[i]??'']:[r.schoolCode,r.teacherId,r.teacherName,r.year,r.stage,r.type,x.code,x.item,r.scores[i]??'',r.date,r.subject,r.classroom]))].map(row=>row.map(quote).join(',')).join('\r\n');}
export function transferFilename(r:TransferRecord){return (stageNames[r.stage as Stage]||'KENDIRI').replace('Penilaian ','').toUpperCase()+'-'+r.teacherName.normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim().slice(0,100)+'.csv';}
