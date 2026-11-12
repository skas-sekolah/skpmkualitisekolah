// Field definitions follow Instrumen SKPM Kualiti@Sekolah Edisi 2026.
// A9 bands and positive-only attendance average follow the supplied Excel tapak.
export const ASPECTS = [
  {id:'A1',name:'Guru',short:'Guru',description:'Perjawatan, opsyen, kepakaran dan pengalaman guru.'},
  {id:'A2',name:'Kualiti Pengajaran dan Pembelajaran',short:'Kualiti PdP',description:'Rumusan Standard 4 yang disahkan bagi tahun sebelumnya.'},
  {id:'A3',name:'Staf Bukan Guru',short:'Staf bukan guru',description:'Kecukupan AKP, pengalaman dan pekerja swasta.'},
  {id:'A4',name:'Prasarana Akademik',short:'Akademik',description:'Kemudahan akademik sedia ada dan yang berfungsi.'},
  {id:'A5',name:'Prasarana Sukan dan Kokurikulum',short:'Sukan & kokurikulum',description:'Kemudahan sukan dan kokurikulum yang berfungsi.'},
  {id:'A6',name:'Prasarana Hal Ehwal Murid',short:'Hal ehwal murid',description:'Kemudahan yang menyokong kesejahteraan murid.'},
  {id:'A7',name:'Persekitaran Digital',short:'Digital',description:'Pengguna aktif DELIMa tahun sebelumnya dan peranti berfungsi.'},
  {id:'A8',name:'Asrama',short:'Asrama',description:'Prasarana dan kecukupan sumber manusia asrama.'},
  {id:'A9',name:'Sokongan Ibu Bapa/Penjaga, Komuniti dan Pihak Swasta',short:'Ibu bapa & komuniti',description:'Kehadiran program, kepakaran dan sumbangan PIBKS.'},
] as const;
export type AspectId=typeof ASPECTS[number]['id'];
export type StrengthStatus='draft'|'submitted'|'returned'|'verified';
export const STATUS_NAMES:Record<StrengthStatus,string>={draft:'Draf',submitted:'Menunggu semakan',returned:'Perlu pembetulan',verified:'Disahkan'};
export type InventoryRow={id:string;name:string;existing:number|null;working:number|null};
export type ParentProgram={id:string;name:string;held:boolean;attendance:number|null;parents:number|null};
export type StrengthData={values:Record<string,number|null>;rows:InventoryRow[];programs:ParentProgram[];none:boolean;applicable:boolean;notes:string;evidence:string[]};
export type StrengthRecord={aspect:AspectId;year:number;revision:number;status:StrengthStatus;assigneeId:string|null;reviewerId:string|null;data:StrengthData;canRead:boolean;canEdit:boolean;canReview:boolean;canReopen?:boolean;updatedAt:string|null;updatedBy:string|null;submittedAt:string|null;verifiedAt:string|null;verifiedBy:string|null;verifiedName?:string|null;feedback:string;lastMutationId?:string;lastMutationActor?:string};
export type StrengthBundle={year:number;records:StrengthRecord[];people:{id:string;name:string}[];school:{code:string;name:string};sessionId:string};
export type PendingStrength={year:number;aspect:AspectId;revision:number;data:StrengthData;mutationId:string;error?:string};
export type FieldSpec={key:string;label:string;percent?:boolean};
export const FIELDS:Partial<Record<AspectId,FieldSpec[]>>={
 A1:[{key:'teachers',label:'Jumlah guru sedia ada'},{key:'teacherABM',label:'Jumlah guru mengikut perjawatan ABM'},{key:'optionTeachers',label:'Guru memenuhi keperluan opsyen'},{key:'expertTeachers',label:'Guru mempunyai kepakaran yang diiktiraf'},{key:'experiencedTeachers',label:'Guru berkhidmat melebihi 17 tahun'},{key:'strategicTeachers',label:'Guru melebihi 17 tahun yang memegang jawatan strategik'}],
 A2:[{key:'previousStandard4',label:'Skor rumusan Standard 4 tahun sebelumnya',percent:true}],
 A3:[{key:'akp',label:'Jumlah AKP sedia ada'},{key:'akpABM',label:'Jumlah AKP mengikut perjawatan ABM'},{key:'experiencedAKP',label:'AKP berpengalaman 3 tahun dan ke atas'},{key:'privateWorkers',label:'Jumlah pekerja swasta sedia ada'},{key:'eligibleWorkers',label:'Jumlah pekerja swasta mengikut kelayakan sebenar'}],
 A7:[{key:'delima',label:'Pengguna aktif DELIMa tahun sebelumnya',percent:true}],
 A8:[{key:'hostelStaff',label:'Jumlah sumber manusia asrama sedia ada'},{key:'eligibleHostelStaff',label:'Jumlah sumber manusia asrama mengikut kelayakan sebenar'}],
 A9:[{key:'parentSupport',label:'Bilangan ibu bapa terlibat dalam khidmat kepakaran / sumbangan'},{key:'communitySupport',label:'Bilangan komuniti / pihak swasta terlibat'}],
};
export const HAS_INVENTORY:AspectId[]=['A4','A5','A6','A7','A8'];
export function emptyStrengthData():StrengthData{return {values:{},rows:[],programs:['Mesyuarat Agung PIBG','Gotong Royong Perdana','Hari Terbuka / Hari Kad Laporan / Hari Bertemu Waris','Hari Penetapan Target'].map((name,i)=>({id:'p'+i,name,held:false,attendance:null,parents:null})),none:false,applicable:true,notes:'',evidence:[]};}
export function emptyStrengthRecord(aspect:AspectId,year:number):StrengthRecord{return {aspect,year,revision:0,status:'draft',assigneeId:null,reviewerId:null,data:emptyStrengthData(),canRead:false,canEdit:false,canReview:false,updatedAt:null,updatedBy:null,submittedAt:null,verifiedAt:null,verifiedBy:null,feedback:''};}
export function validYear(year:unknown):year is number{return typeof year==='number'&&Number.isInteger(year)&&year>=2020&&year<=2100;}
export function validAspect(id:unknown):id is AspectId{return ASPECTS.some(a=>a.id===id);}
const number=(v:unknown,percent=false):number|null=>{if(v===null||v===undefined||v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>(percent?100:1000000)||(!percent&&!Number.isInteger(v)))throw Error(percent?'Peratus mesti antara 0 hingga 100.':'Bilangan mesti nombor bulat antara 0 hingga 1,000,000.');return v;};
function string(v:unknown,max:number){if(typeof v!=='string'||v.length>max)throw Error('Teks terlalu panjang atau tidak sah.');return v.trim();}
export function cleanStrengthData(aspect:AspectId,input:unknown):StrengthData{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Maklumat aspek tidak sah.');const v=input as StrengthData;
 const result=emptyStrengthData();result.applicable=aspect==='A8'?v.applicable!==false:true;result.none=v.none===true;result.notes=string(v.notes??'',2000);
 if(v.evidence!==undefined&&(!Array.isArray(v.evidence)||v.evidence.length>20))throw Error('Maksimum 20 pautan evidens.');
 result.evidence=(v.evidence??[]).map(s=>string(s,500)).filter(Boolean).map(value=>{let u:URL;try{u=new URL(value);}catch{throw Error('Gunakan pautan evidens http atau https yang lengkap.');}if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Pautan evidens tidak sah.');return u.href;});
 for(const f of FIELDS[aspect]??[])result.values[f.key]=number(v.values?.[f.key],f.percent);
 if(HAS_INVENTORY.includes(aspect)){
  if(!Array.isArray(v.rows)||v.rows.length>150)throw Error('Maksimum 150 baris prasarana bagi setiap aspek.');
  const names=new Set<string>(),ids=new Set<string>();result.rows=v.rows.map(r=>{if(!r||typeof r!=='object')throw Error('Baris prasarana tidak sah.');const name=string(r.name,180),id=string(r.id,80);if(!id||ids.has(id))throw Error('ID baris prasarana berulang.');ids.add(id);if(name&&(!CATALOG[aspect]?.includes(name)||names.has(name)))throw Error('Pilih prasarana daripada senarai dan elakkan nama berulang.');if(name)names.add(name);const existing=number(r.existing),working=number(r.working);if(existing!==null&&working!==null&&working>existing)throw Error('Bilangan berfungsi tidak boleh melebihi bilangan sedia ada.');return {id,name,existing,working};});
  if(result.none&&result.rows.length)throw Error('Kosongkan senarai sebelum memilih tiada prasarana.');
 }
 if(aspect==='A9'){
  if(!Array.isArray(v.programs)||v.programs.length>30)throw Error('Maksimum 30 program.');const ids=new Set<string>();result.programs=v.programs.map(p=>{if(!p||typeof p!=='object')throw Error('Program tidak sah.');const id=string(p.id,80);if(!id||ids.has(id))throw Error('ID program berulang.');ids.add(id);return {id,name:string(p.name,180),held:p.held===true,attendance:number(p.attendance),parents:number(p.parents)};});
 }
 const n=result.values;for(const [child,parent] of (aspect==='A1'?[['optionTeachers','teachers'],['expertTeachers','teachers'],['experiencedTeachers','teachers'],['strategicTeachers','experiencedTeachers']]:aspect==='A3'?[['experiencedAKP','akp']]:[]))if(n[child]!=null&&n[parent]!=null&&n[child]!>n[parent]!)throw Error('Bilangan kumpulan kecil tidak boleh melebihi jumlah kumpulan induk.');
 return result;
}
export function strengthIssues(aspect:AspectId,d:StrengthData):string[]{
 const issues:string[]=[];if(!d.evidence.some(v=>v.trim()))issues.push('Masukkan sekurang-kurangnya satu pautan atau fail evidens sebelum menghantar.');
 if(!d.applicable){if(d.notes.trim().length<10)issues.push('Nyatakan sebab asrama tidak berkenaan, sekurang-kurangnya 10 aksara.');return issues;}
 for(const f of FIELDS[aspect]??[])if(d.values[f.key]==null)issues.push('Lengkapkan '+f.label.toLowerCase()+'.');
 if(aspect==='A2'&&d.notes.trim().length<5)issues.push('Nyatakan sumber rumusan Standard 4 tahun sebelumnya dalam catatan.');
 if(HAS_INVENTORY.includes(aspect)){
  if(!d.rows.length&&!d.none)issues.push('Tambah prasarana atau tandakan tiada prasarana.');
  if(d.rows.some(r=>!r.name||r.existing===null||r.working===null))issues.push('Lengkapkan nama, bilangan sedia ada dan berfungsi bagi setiap baris.');
  if(d.none&&d.notes.trim().length<5)issues.push('Nyatakan penjelasan apabila tiada prasarana.');
 }
 if(aspect==='A9'){
  const held=d.programs.filter(p=>p.held);if(!held.length&&d.notes.trim().length<5)issues.push('Nyatakan sebab tiada program dilaksanakan dalam catatan.');
  if(held.some(p=>!p.name||p.attendance===null||p.parents===null||p.parents===0))issues.push('Lengkapkan nama, kehadiran dan bilangan ibu bapa/penjaga (lebih daripada sifar) bagi program yang dilaksanakan.');
 }
 return issues;
}
export type StrengthMetric={label:string;value:number|null;unit:string;note?:string};
export const ratio=(n:number|null|undefined,d:number|null|undefined)=>n==null||d==null||d===0?null:Math.round(n/d*10000)/100;
export const parentBand=(n:number|null|undefined)=>n==null?null:n<=0?0:n<=3?25:n<=6?50:n<=9?75:100;
export const communityBand=(n:number|null|undefined)=>n==null?null:n<=0?0:n<=1?25:n<=3?50:n<=5?75:100;
// Aspek 3: each of the three criteria carries a maximum of 3%.
export const A3_CRITERIA=[
 {title:'Bilangan AKP yang mencukupi mengikut perjawatan ABM.',keys:['akp','akpABM'],numerator:'akp',denominator:'akpABM'},
 {title:'Bilangan AKP berpengalaman (3 tahun dan ke atas).',keys:['experiencedAKP'],numerator:'experiencedAKP',denominator:'akp'},
 {title:'Bilangan pekerja swasta yang mencukupi untuk melaksanakan tugas pembersihan dan kawalan keselamatan sekolah, dan bekalan makanan asrama.',keys:['privateWorkers','eligibleWorkers'],numerator:'privateWorkers',denominator:'eligibleWorkers'}
] as const;
export function a3Scores(d:StrengthData){return A3_CRITERIA.map(c=>{const n=d.values[c.numerator],den=d.values[c.denominator];return n==null||den==null||den===0?null:Math.round(Math.min(1,n/den)*300)/100;});}
export function strengthMetrics(aspect:AspectId,d:StrengthData):StrengthMetric[]{
 if(!d.applicable)return [{label:'Asrama',value:null,unit:'',note:'Tidak berkenaan — '+d.notes}];const v=d.values;const metric=(label:string,value:number|null,note?:string):StrengthMetric=>({label,value,unit:'%',note});
 if(aspect==='A1')return [metric('Kecukupan guru mengikut ABM',ratio(v.teachers,v.teacherABM)),metric('Guru memenuhi keperluan opsyen',ratio(v.optionTeachers,v.teacherABM)),metric('Guru dengan kepakaran diiktiraf',ratio(v.expertTeachers,v.teachers)),metric('Guru berpengalaman memegang jawatan strategik',ratio(v.strategicTeachers,v.experiencedTeachers))];
 if(aspect==='A2')return [metric('Rumusan Standard 4 tahun sebelumnya',v.previousStandard4??null)];
 if(aspect==='A3'){const scores=a3Scores(d);return [...A3_CRITERIA.flatMap((c,i)=>[metric(['Kecukupan AKP mengikut ABM','AKP berpengalaman','Kecukupan pekerja swasta'][i],ratio(v[c.numerator],v[c.denominator])),metric('Skor kriteria '+(i+1),scores[i],'Maksimum 3%. Bilangan ÷ rujukan × 3%; dihadkan kepada 3%.')]),metric('Jumlah skor Aspek 3',scores.every(x=>x!==null)?Math.round(scores.reduce<number>((s,x)=>s+(x??0),0)*100)/100:null,'Maksimum 9%. Jumlah dipaparkan selepas ketiga-tiga kriteria lengkap dan mempunyai pembahagi melebihi sifar.')];}
 const out:StrengthMetric[]=[];
 if(aspect==='A7')out.push(metric('Pengguna aktif DELIMa tahun sebelumnya',v.delima??null));
 if(HAS_INVENTORY.includes(aspect)){const complete=d.none||d.rows.length>0&&d.rows.every(r=>r.name&&r.existing!==null&&r.working!==null);const existing=complete?d.rows.reduce((s,r)=>s+(r.existing??0),0):null,working=complete?d.rows.reduce((s,r)=>s+(r.working??0),0):null;out.push({label:'Jumlah sedia ada',value:existing,unit:'unit'},{label:'Jumlah berfungsi',value:working,unit:'unit'},metric('Prasarana / peranti berfungsi',ratio(working,existing),'Peratus berfungsi daripada jumlah sedia ada. Jumlah sifar tidak menghasilkan peratus.'));}
 if(aspect==='A8')out.push(metric('Kecukupan sumber manusia asrama',ratio(v.hostelStaff,v.eligibleHostelStaff)));
 if(aspect==='A9'){const held=d.programs.filter(p=>p.held),complete=held.every(p=>p.attendance!==null&&p.parents!==null&&p.parents>0),positive=held.filter(p=>p.attendance!==null&&p.parents!==null&&p.parents>0).map(p=>Math.min(100,p.attendance!/p.parents!*100)).filter(x=>x>0);out.push(metric('Purata kehadiran ibu bapa/penjaga',complete&&positive.length?Math.round(positive.reduce((s,x)=>s+x,0)/positive.length*100)/100:null,'Mengikut tapak Excel: purata peratus positif sahaja; kehadiran 0% dikecualikan dan setiap program dihadkan kepada 100%.'),metric('Pelibatan kepakaran / sumbangan ibu bapa',parentBand(v.parentSupport),'Tahap tapak Excel: 0=0%, 1–3=25%, 4–6=50%, 7–9=75%, 10 ke atas=100%.'),metric('Pelibatan komuniti / pihak swasta',communityBand(v.communitySupport),'Tahap tapak Excel: 0=0%, 1=25%, 2–3=50%, 4–5=75%, 6 ke atas=100%.'));}
 return out;
}
export const valueText=(n:number|null|undefined,unit='')=>n==null?'Belum tersedia':new Intl.NumberFormat('ms-MY',{maximumFractionDigits:2}).format(n)+(unit==='%'?'%':unit?' '+unit:'');
export const CATALOG:Partial<Record<AspectId,string[]>>={
 "A4": [
  "3PK - Bilik Audiologi",
  "3PK - Bilik Orientasi & Mobiliti / Low Vision",
  "3PK - Bilik Psikologi",
  "3PK - Bilik Terapi Fisio",
  "3PK - Bilik Terapi Pertuturan Individu",
  "3PK - Bilik Terapi Pertuturan Kumpulan",
  "3PK - Common Rehab",
  "3PK - Multisensori SpaceRoom",
  "3PK - Sensory Integration",
  "3PK - Toy Library",
  "Bengkel Pertanian (RBT SM)",
  "Bengkel Amalan Bengkel Mesin",
  "Bengkel Artis Multimedia Visual",
  "Bengkel Artist Desktop Publishing (DTP)",
  "Bengkel Atendan Lanskap",
  "Bengkel Automotif",
  "Bengkel Bakeri",
  "Bengkel Binaan Bangunan",
  "Bengkel Elektrik",
  "Bengkel Elektrik dan Elektronik (RBT SM)",
  "Bengkel Elektronik",
  "Bengkel Jahitan",
  "Bengkel Jahitan Pakaian Lelaki",
  "Bengkel Jentera Pertanian",
  "Bengkel Kejuruteraan Mekanikal",
  "Bengkel Kimpalan",
  "Bengkel Kostum",
  "Bengkel Masakan",
  "Bengkel Mata Pelajaran Vokasional (MPV)",
  "Bengkel Mereka Bentuk dan Pengeluaran Jahitan Kreatif",
  "Bengkel Motosikal - Penyelenggaraan dan Perkhidmatan",
  "Bengkel Operasi Pengeluaran Batik",
  "Bengkel Operasi Pengeluaran Tanaman",
  "Bengkel Operasi Pengemasan",
  "Bengkel Operasi Perkhidmatan Dobi",
  "Bengkel Operasi Servis Makanan dan Minuman",
  "Bengkel Operator Akuakultur",
  "Bengkel Operator Pengeluaran dan Pemprosesan Makanan",
  "Bengkel Pekerja Ladang Poltri",
  "Bengkel Pekerja Ladang Ruminan",
  "Bengkel Pelancongan",
  "Bengkel Pembinaan Lanskap",
  "Bengkel Pembuat Perabot",
  "Bengkel Pembuatan (RBT SM)",
  "Bengkel Pembuatan Pakaian Wanita",
  "Bengkel Pembuatan Pastri",
  "Bengkel Pembuatan Roti",
  "Bengkel Pendandan Rambut Muda",
  "Bengkel Penyediaan dan Pembuatan Makanan",
  "Bengkel Penyejukan & Penyamanan Udara",
  "Bengkel Peralatan Penyaman Udara (HVAC) \n1 Fasa",
  "Bengkel Perkembangan dan Perkhidmatan Kanak-Kanak",
  "Bengkel Perkhidmatan Estetik (Seni Kecantikan)",
  "Bengkel RBT (Sekolah Menengah)",
  "Bengkel Refleksologi",
  "Bengkel Rekacipta",
  "Bengkel Seni Kecantikan",
  "Bengkel Single Phase Electrical Installation and Maintenance",
  "Bengkel Tanaman",
  "Bengkel Teknologi Kejuruteraan",
  "Bilik Aktiviti Kelas Agama/ Bilik Pendidikan Islam",
  "Bilik Alat Bantu Mengajar (ABM)",
  "Bilik Amalan Perdagangan",
  "Bilik APD",
  "Bilik Audiologi",
  "Bilik Bahasa",
  "Bilik Busana",
  "Bilik Darjah < Daripada 750 kps / Kurang 3 bay",
  "Bilik Darjah > Daripada 750 kaki persegi / Lebih \n3 bay",
  "Bilik Darjah 750 kaki persegi / sama 3 bay",
  "Bilik Darjah Pemulihan",
  "Bilik Darjah PPKI",
  "Bilik Darjah Prasekolah",
  "Bilik Geografi",
  "Bilik Intervensi (Pendidikan Khas)",
  "Bilik J-Qaf",
  "Bilik Kajian Tempatan",
  "Bilik Komputer",
  "Bilik Low Vision",
  "Bilik Lukisan Kejuruteraan",
  "Bilik Masakan (RBT SM)",
  "Bilik Matematik",
  "Bilik Muzik",
  "Bilik Pendidikan Seni dan Kemahiran Hidup Asas (Pendidikan Khas)",
  "Bilik Pendidikan Seni Visual",
  "Bilik Pengurusan Diri (Pendidikan Khas)",
  "Bilik Pengurusan Kehidupan - Tempat Tinggal (Pendidikan Khas)",
  "Bilik Persediaan Makmal",
  "Bilik RBT (Sekolah Rendah)",
  "Bilik Resos Pendidikan Khas",
  "Bilik Sains (Sekolah Rendah)",
  "Bilik Sejarah",
  "Bilik Self Access Learning (SAL)",
  "Bilik Server",
  "Bilik Teknologi Maklumat",
  "Kabin (Kontena)",
  "Makmal Bahasa, bilik rakaman dan bilik kerja",
  "Makmal Biologi",
  "Makmal Biologi T6",
  "Makmal Fizik",
  "Makmal Fizik T6",
  "Makmal Kimia",
  "Makmal Kimia T6",
  "Makmal Komputer",
  "Makmal MPV",
  "Makmal Sains (Am)/Integrasi",
  "Makmal Sains (Sekolah Rendah)",
  "Makmal Sains Am - Menengah Atas",
  "Makmal Sains Am - Menengah Rendah",
  "Makmal Sains Sukan",
  "Makmal Sains Tambahan",
  "Panggung Eksperimen",
  "Pusat Akses",
  "Pusat Sumber/Perpustakaan",
  "Ruang Kebuk Wasap",
  "Studio Catan",
  "Studio Cetakan",
  "Studio Grafik Dan Visual",
  "Studio Kerja Kayu dan Logam",
  "Studio Keyboard",
  "Studio Latihan Alat Muzik Tradisional",
  "Studio Latihan Individu",
  "Studio Latihan Tari",
  "Studio Latihan Teater (black box)",
  "Studio Lukisan",
  "Studio Rekabentuk (RBT SM)",
  "Studio Seramik",
  "Studio Tekstil",
  "Studio Wayang Kulit"
 ],
 "A5": [
  "Astaka - Kapasiti kurang 500",
  "Astaka - Kapasiti melebihi 500",
  "Badminton - Gelanggang Dalam Dewan",
  "Badminton - Gelanggang Terbuka",
  "Badminton - Gelanggang Terbuka Berbumbung",
  "Bilik Gerakan Ko-kurikulum",
  "Bilik Pendidikan Jasmani",
  "Bilik Pengurusan Sukan",
  "Bilik Peralatan Sukan - Stor 1 Bay",
  "Bilik Peralatan Sukan - Stor 2 Bay",
  "Bilik Peralatan Sukan - Stor 3 Bay",
  "Bilik Persalinan - Murid Lelaki",
  "Bilik Persalinan - Murid Perempuan",
  "Bilik Persatuan",
  "Bola Baling - Gelanggang Dalam Dewan",
  "Bola Baling - Gelanggang Terbuka (Berumput)",
  "Bola Baling - Gelanggang Terbuka (Hardcourt)",
  "Bola Baling - Gelanggang Terbuka Berbumbung",
  "Bola Jaring - Gelanggang Dalam dewan",
  "Bola Jaring - Gelanggang Terbuka (Berumput)",
  "Bola Jaring - Gelanggang Terbuka (Hardcourt)",
  "Bola Jaring - Gelanggang Terbuka Berbumbung",
  "Bola Keranjang - Gelanggang Dalam Dewan",
  "Bola Keranjang - Gelanggang Terbuka",
  "Bola Keranjang - Gelanggang Terbuka Berbumbung",
  "Bola Tampar - Gelanggang Dalam Dewan",
  "Bola Tampar - Gelanggang Terbuka",
  "Bola Tampar - Gelanggang Terbuka Berbumbung",
  "Boling Tenpin - 12 Lorong",
  "Boling Tenpin - 8 Lorong",
  "Boling Tenpin - Lain-lain Lorong",
  "Dewan - Dewan Besar",
  "Dewan - Dewan Khas Untuk Sukan",
  "Dewan Sukan",
  "Dewan Terbuka",
  "Futsal - Gelanggang Dalam Dewan",
  "Futsal - Gelanggang Terbuka",
  "Futsal - Gelanggang Terbuka Berbumbung",
  "Gelanggang Serbaguna - Terbuka",
  "Gelanggang Serbaguna - Terbuka Berbumbung",
  "Gimnasium",
  "Gimnastik Artistik - Dewan Standard Pertandingan",
  "Gimnastik Artistik - Dewan Untuk Latihan Sahaja",
  "Gimnastik Berirama - Dewan Standard Pertandingan",
  "Gimnastik Berirama - Dewan Untuk Latihan Sahaja",
  "Kriket - Saiz Padang Standard Pertandingan",
  "Kriket - Saiz Padang Untuk Latihan Sahaja",
  "Lain-lain - Lain-lain Kemudahan Sukan",
  "Lain-lain - Saiz Padang Standard Pertandingan",
  "Lain-lain - Saiz Padang Untuk Latihan Sahaja",
  "Memanah - Lapang Sasar Standard Pertandingan",
  "Memanah - Lapang Sasar Untuk Latihan Sahaja",
  "Padang Bola Sepak - Saiz Padang Standard Pertandingan",
  "Padang Bola Sepak - Saiz Padang Untuk Latihan Sahaja",
  "Padang Hoki - Padang Rumput Standard Pertandingan",
  "Padang Hoki - Padang Rumput Untuk Latihan Sahaja",
  "Padang Hoki - Padang Sintetik Standard Pertandingan",
  "Padang Hoki - Padang Sintetik Untuk Latihan Sahaja",
  "Padang Sekolah - Keluasan Trek 200M",
  "Padang Sekolah - Keluasan Trek 300M",
  "Padang Sekolah - Keluasan Trek 400M",
  "Padang Sekolah - Keluasan Trek Kurang 200M",
  "Ping Pong - Dalam Dewan Tertutup",
  "Ping Pong - Dewan Serbaguna Terbuka Berbumbung",
  "Ragbi - Saiz Padang Berumput",
  "Ragbi - Saiz Padang Standard Pertandingan",
  "Ragbi - Saiz Padang Standard Sintetik",
  "Ragbi - Saiz Padang Untuk Latihan Sahaja",
  "Sepak Takraw - Gelanggang Dalam Dewan",
  "Sepak Takraw - Gelanggang Terbuka",
  "Sepak Takraw - Gelanggang Terbuka Berbumbung",
  "Skuasy - Gelanggang Dalam Dewan",
  "Sofbol - Saiz Padang Standard Pertandingan",
  "Sofbol - Saiz Padang Untuk Latihan Sahaja",
  "Stadium Mini",
  "Tenis - Gelanggang Terbuka",
  "Trek Sintetik - Lain-lain",
  "Trek Sintetik - Trek 120m",
  "Trek Sintetik - Trek 400m"
 ],
 "A6": [
  "Auditorium",
  "Bilik / Kedai Koperasi",
  "Bilik Bimbingan dan Kaunseling",
  "Bilik Ibadat (Bukan Muslim)",
  "Bilik Keselamatan",
  "Bilik Kesihatan",
  "Bilik Khas",
  "Bilik Kuliah (Theatrette)",
  "Bilik Operasi Buku Teks (Daerah)",
  "Bilik Operasi Skim Pinjaman Buku Teks Sekolah (BOSS)",
  "Bilik Pengawas",
  "Bilik Pengurusan Disiplin",
  "Bilik Persalinan",
  "Bilik Sakit",
  "Bilik Seminar",
  "Bilik Serbaguna",
  "Bilik Solat",
  "Bilik SPBT Daerah/Negeri",
  "Bilik Wuduk",
  "Dewan Sekolah",
  "Kantin",
  "Kedai Buku",
  "Klinik",
  "Ruang Serbaguna",
  "Surau (Sekolah)",
  "Tandas Murid Lelaki",
  "Tandas Murid Perempuan",
  "Tandas OKU"
 ],
 "A7": [
  "Pencetak Hitam Putih",
  "Pencetak Warna",
  "Pencetak Multifunction",
  "Charging Cart",
  "Netbook",
  "VDI Thin Client",
  "Multiseat",
  "Chromebook",
  "Projektor LCD",
  "Komputer (pengajaran dan pembelajaran)",
  "NoteBook (pengajaran dan pembelajaran)",
  "Tablet PC",
  "Pelayan (Server)",
  "Pengimbas (Scanner)",
  "VSAT (School-net)",
  "ADSL (School-net)",
  "Pencetak",
  "Smart TV (pengajaran dan pembelajaran)",
  "Smart Board (pengajaran dan pembelajaran)"
 ],
 "A8": [
  "Ampaian baju",
  "Bilik Air OKU",
  "Bilik Asrama 750 kaki persegi",
  "Bilik Asrama < Daripada 750 kaki persegi",
  "Bilik Asrama > Daripada 750 kaki persegi",
  "Bilik Bacaan",
  "Bilik Bagasi",
  "Bilik Basuhan",
  "Bilik Elektrik (Asrama)",
  "Bilik Ketua Warden - (Rehat/Penginapan)",
  "Bilik Mandi",
  "Bilik Matron",
  "Bilik Menggosok",
  "Bilik Pantry",
  "Bilik Pejabat Matron",
  "Bilik Pekerja Dewan Makan",
  "Bilik Pelawat",
  "Bilik Pembantu Pengurusan Murid Pendidikan Khas",
  "Bilik Pengawas",
  "Bilik Permainan Dalam",
  "Bilik Pesakit",
  "Bilik Rehat",
  "Bilik Solat",
  "Bilik Stor Asrama",
  "Bilik Warden - (Rehat/Penginapan)",
  "Dapur (Dewan Makan)",
  "Dewan Makan Asrama",
  "Pejabat Ketua Warden",
  "Pejabat Pengusaha Dewan Makan",
  "Pejabat Penyelia Asrama",
  "Pejabat Warden",
  "Pondok Pengawal (Asrama)",
  "Ruang Masak",
  "Rumah Warden",
  "Stor (Dewan Makan)",
  "Stor Tabung Gas (Dewan Makan)",
  "Surau (Asrama)",
  "Tandas Murid Lelaki (Asrama)",
  "Tandas Murid Perempuan (Asrama)"
 ]
};
