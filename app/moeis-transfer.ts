import {emptyTransfer,TRANSFER_ITEMS,previewTransfer,type TransferBundle,type TransferPreview,type TransferRecord} from './transfer-model';
import {normalized} from './scoring';
export function moeisPreviews(payload:unknown,bundle:TransferBundle):{previews:TransferPreview[];excluded:number}{
 if(!payload||typeof payload!=='object')throw Error('Hantaran MOEIS tidak sah.');
 const p=payload as Record<string,unknown>;
 if(p.kind!=='SKAS_MOEIS_PREVIEW_V1'||typeof p.id!=='string'||p.id.length>100||!['all','perdana','khas'].includes(String(p.category))||!Array.isArray(p.records)||!p.records.length||p.records.length>50||JSON.stringify(p).length>300000)throw Error('Hantaran MOEIS perlu 1–50 rekod.');
 const previews:TransferPreview[]=[];let excluded=0;
 for(const input of p.records){
  if(!input||typeof input!=='object'||!input.meta||typeof input.meta!=='object'||!input.scores||typeof input.scores!=='object')throw Error('Struktur skor MOEIS tidak sah.');
  const m=input.meta as Record<string,unknown>,scores=input.scores as Record<string,unknown>;
  for(const k of ['nama_guru','kod_sekolah','tahun','sesi','mata_pelajaran','kelas'])if(typeof m[k]!=='string'||String(m[k]).length>180)throw Error('Metadata MOEIS tidak sah.');
  if(normalized(m.kod_sekolah as string)!==normalized(bundle.school.code)||String(bundle.year)!==m.tahun)throw Error('Sekolah / tahun MOEIS berbeza daripada pilihan SK@S.');
  if(!['kendiri','pertama','kedua'].includes(String(m.sesi)))throw Error('Sesi MOEIS tidak dikenali.');
  if(Object.keys(scores).length!==38)throw Error('Setiap rekod perlu tepat 38 item.');
  const values=TRANSFER_ITEMS.map(({code,item})=>{const key=code+':'+item;if(!Object.hasOwn(scores,key))throw Error('Item MOEIS tidak lengkap.');const v=scores[key];if(v!==null&&(typeof v!=='number'||!Number.isInteger(v)||v<0||v>4))throw Error('Skor MOEIS mesti 0–4 atau kosong.');return v as number|null;});
  const matches=bundle.teachers.filter(t=>normalized(t.name)===normalized(m.nama_guru as string));
  const teacher=matches.length===1?matches[0]:undefined;
  if(p.category!=='all'&&teacher&&teacher.type!==p.category){excluded++;continue;}
  const record:TransferRecord={...emptyTransfer(),teacherName:m.nama_guru as string,teacherId:teacher?.id??'',schoolCode:bundle.school.code,year:bundle.year,stage:m.sesi as 'kendiri'|'pertama'|'kedua',type:teacher?.type??'',scores:values,subject:m.mata_pelajaran as string,classroom:m.kelas as string};
  const preview=previewTransfer(record,bundle,'MOEIS · '+record.teacherName);
  previews.push({...preview,selected:preview.errors.length===0});
 }
 return {previews,excluded};
}
