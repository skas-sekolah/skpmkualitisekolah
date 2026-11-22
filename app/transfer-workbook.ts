import {emptyTransfer,cleanStage,TRANSFER_ITEMS,type TransferRecord} from './transfer-model';
import {styleSheet,saveWorkbook} from './teacher-workbook';
import {stageNames,rubric,type Stage} from './scoring';
function value(cell:import('exceljs').Cell):string{
 const v=cell.value;if(v===null||v===undefined)return '';
 if(typeof v==='object'){
  if('richText' in v)return v.richText.map(t=>t.text).join('');
  if('error' in v)throw Error('Sel '+cell.address+' mempunyai ralat Excel.');
  if('formula' in v||'sharedFormula' in v)return cell.result===undefined?'':String(cell.result);
  if('text' in v)return String(v.text);
 }
 return String(v);
}
export async function readScoreWorkbook(file:File):Promise<TransferRecord[]>{
 if(!/\.xls[xm]$/i.test(file.name)||file.size>5_000_000)throw Error('Gunakan Excel .xlsx / .xlsm, maksimum 5 MB.');
 // Bound total declared uncompressed ZIP size before ExcelJS expands the workbook.
 const bytes=new Uint8Array(await file.arrayBuffer()),dv=new DataView(bytes.buffer);let size=0,found=false;
 for(let i=0;i+46<bytes.length;i++)if(dv.getUint32(i,true)===0x02014b50){found=true;size+=dv.getUint32(i+24,true);if(size>30_000_000)throw Error('Kandungan Excel melebihi 30 MB selepas dibuka.');i+=45+dv.getUint16(i+28,true)+dv.getUint16(i+30,true)+dv.getUint16(i+32,true);}
 if(!found)throw Error('Fail Excel tidak sah atau dilindungi kata laluan.');
 const {Workbook}=await import('exceljs'),wb=new Workbook();await wb.xlsx.load(bytes.buffer,{ignoreNodes:['dataValidations','drawing','extLst','conditionalFormatting']} as never);
 const front=wb.worksheets.find(s=>s.name.trim().toUpperCase()==='MUKA DEPAN'),sheet=wb.worksheets.find(s=>s.name.trim().toUpperCase()==='STANDARD 4');
 if(!front||!sheet)throw Error('Helaian MUKA DEPAN dan STANDARD 4 diperlukan. Gunakan templat SK@S atau borang Standard 4 yang sepadan.');
 const r=emptyTransfer();r.teacherName=value(front.getCell('G24')).trim();r.stage=cleanStage(value(front.getCell('G30')));
 const meta=wb.getWorksheet('SKAS_META');if(meta){if(value(meta.getCell('B1'))!=='SKAS-PDPC-1')throw Error('Versi templat SK@S tidak disokong.');r.schoolCode=value(meta.getCell('B2'));r.teacherId=value(meta.getCell('B3'));r.year=Number(value(meta.getCell('B4')))||0;const kind=value(meta.getCell('B5'));if(kind&&!['perdana','khas'].includes(kind))throw Error('Kategori dalam templat tidak sah.');r.type=kind as TransferRecord['type'];r.date=value(meta.getCell('B6'));r.subject=value(meta.getCell('B7'));r.classroom=value(meta.getCell('B8'));}
 let headers:{code:string;col:number;row:number}[]=[];
 for(let row=8;row<=14;row++){const found:{code:string;col:number;row:number}[]=[];for(let col=1;col<=80;col++){const match=value(sheet.getCell(row,col)).trim().match(/^(?:ASPEK\s+)?(4\.\d\.\d)$/i);if(match)found.push({code:match[1],col,row});}if(found.length===8){headers=found;break;}}
 if(headers.length!==8||new Set(headers.map(h=>h.code)).size!==8||rubric.perdana.groups.some(g=>!headers.some(h=>h.code===g.code)))throw Error('Lapan label subaspek Standard 4 tidak sepadan; fail belum diimport.');
 r.scores=TRANSFER_ITEMS.map(({code,item})=>{const h=headers.find(h=>h.code===code)!,row=h.row+1+item.charCodeAt(0)-97,cell=sheet.getCell(row,h.col);let text=value(cell).trim();
  // Some source forms store the selected option two columns before the score.
  if(h.col>2){const middle=sheet.getCell(h.row+1,h.col-1),option=sheet.getCell(row,h.col-2);const formula=middle.formula??'';if(new RegExp('\\b'+sheet.getColumn(h.col-2).letter+(h.row+1)+'\\b','i').test(formula)){const choice=value(option).trim();if(/^[1-5]$/.test(choice))text=String(5-Number(choice));}}
  if(!text)return null;if(!/^[0-4](?:\.0+)?$/.test(text))throw Error('Skor '+code+' '+item+' bukan nombor 0–4.');return Number(text);
 });return [r];
}
export async function scoreTemplateWorkbook(r:TransferRecord){
 const {Workbook}=await import('exceljs'),wb=new Workbook(),front=wb.addWorksheet('MUKA DEPAN'),sheet=wb.addWorksheet('STANDARD 4'),meta=wb.addWorksheet('SKAS_META');
 front.getCell('B2').value='TEMPLAT SKOR STANDARD 4 · SK@S';front.getCell('B4').value='Isi skor 0–4 dalam STANDARD 4. Kosong bermaksud belum diisi.';front.getCell('F24').value='Nama guru';front.getCell('G24').value=r.teacherName;front.getCell('F30').value='Sesi';front.getCell('G30').value=r.stage?stageNames[r.stage as Stage]:'';front.getColumn(2).width=30;front.getColumn(6).width=20;front.getColumn(7).width=50;
 const entries=[['format','SKAS-PDPC-1'],['kod_sekolah',r.schoolCode],['teacher_id',r.teacherId],['tahun',r.year],['kategori',r.type],['tarikh',r.date],['mata_pelajaran',r.subject],['kelas',r.classroom]];entries.forEach(e=>meta.addRow(e));meta.columns=[{width:24},{width:50}];
 sheet.getCell('A1').value='Isi skor berdasarkan rubrik sebenar. Jangan ubah label subaspek.';
 let offset=0;rubric[r.type||'perdana'].groups.forEach((g,i)=>{const col=2+i*2;sheet.getCell(10,col).value='Aspek '+g.code;sheet.getColumn(col).width=20;sheet.getColumn(col+1).width=65;g.items.forEach((item,j)=>{const c=sheet.getCell(11+j,col);c.value=r.scores[offset+j];c.dataValidation={type:'whole',operator:'between',allowBlank:true,formulae:[0,4],showErrorMessage:true,error:'Pilih nombor bulat 0 hingga 4.'};sheet.getCell(11+j,col+1).value=item.label;});offset+=g.items.length;});sheet.views=[{state:'frozen',ySplit:10}];return wb;
}
export async function downloadScoreWorkbook(r:TransferRecord,name:string){await saveWorkbook(await scoreTemplateWorkbook(r),name);}
export async function downloadScoreSummary(records:TransferRecord[],name:string){const {Workbook}=await import('exceljs'),wb=new Workbook(),sheet=wb.addWorksheet('Skor Item SKAS');sheet.addRow(['KOD SEKOLAH','ID GURU','NAMA GURU','TAHUN','SESI','KATEGORI','SUB ASPEK','ITEM','SKOR']);for(const r of records)TRANSFER_ITEMS.forEach((x,i)=>sheet.addRow([r.schoolCode,r.teacherId,r.teacherName,r.year,r.stage?r.stage:'',r.type,x.code,x.item,r.scores[i]]));styleSheet(sheet,[18,40,42,12,20,18,16,10,12]);await saveWorkbook(wb,name);}
