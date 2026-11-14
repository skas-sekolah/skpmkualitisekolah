import type {CSSProperties} from 'react';
import source from './score-print-templates.json';
import rubrics from './management-rubric.json';
import {MANAGEMENT_UNITS,managementTotals,type ManagementRecord,type ManagementBundle} from '../migration/backend/management-model';
type Cell={r:number;c:number;text:string;s:number};
type Sheet={start:number;end:number;cols:number;widths:number[];rows:{r:number;height:number;cells:Cell[]}[];merges:number[][]};
const templates=source.sheets as Record<string,Sheet>;
const unitSheets:Record<string,string>={'3.1.2.1':'Panitia MP','3.1.2.2':'Panitia MP','3.1.2.3':'Panitia MP','3.1.2.4':'Panitia MP','3.2.2.1':'Kelab_Persatuan','3.2.3.1':'Badan_Beruniform','3.2.4.1':'Sukan_Permainan'};
const format=(n:number|null|undefined)=>typeof n==='number'?n.toLocaleString('ms-MY',{maximumFractionDigits:2}):'';
export function TemplatePrint({records,bundle,year}:{records:ManagementRecord[];bundle:ManagementBundle;year:number}){
 records=records.flatMap(r=>r.data.mode==='unit-actions'?(r.data.rows??[]).map(row=>({...r,aspect:r.aspect,data:{...(row.data??{scores:{},notes:'',evidence:[]}),mode:'actions' as const},unitName:row.name})): [r]);
 const seen=new Set<string>();
 return <div className="score-template-print"><style>{printStyles}</style>{records.map(record=>{
  const isUnits=record.data.mode==='units',name=isUnits?unitSheets[record.aspect]:record.aspect,sheet=templates[name];
  if(isUnits&&seen.has(name))return null;seen.add(name);
  const related=isUnits?records.filter(r=>unitSheets[r.aspect]===name):[record];
  const people=[...new Set(related.flatMap(r=>r.pssIds??(r.assigneeId?[r.assigneeId]:[])))].map(id=>bundle.people.find(p=>p.id===id)?.name||'').filter(Boolean);
  return <section className="score-template-sheet" key={record.aspect+('unitName' in record?record.unitName:'')}><header><b>{bundle.school.name} · {bundle.school.code}</b><span>Tahun {year}</span>{'unitName' in record&&<h2>{String(record.unitName)}</h2>}<p>Pegawai Penilai Standard: {people.join(', ')||'Belum ditetapkan'}</p></header>{sheet&&(!unitSheets[record.aspect]||isUnits)?<SheetTable sheet={sheet} name={name} records={related}/>:<Fallback record={record}/>}
  <footer><b>Catatan dan evidens</b>{related.map(r=><div key={r.aspect}><b>{r.aspect}</b>{r.data.notes&&<p>{r.data.notes}</p>}{r.data.evidence.map(url=><p key={url}>{url}</p>)}{Object.entries(r.data.actionEvidence??{}).map(([action,e])=><div key={action}><p>{action.toUpperCase()}: {(e.documents??(e.document?[e.document]:[])).join(', ')}{e.notes?' — '+e.notes:''}</p>{(e.urls??(e.url?[e.url]:[])).map(url=><p key={url}>{url}</p>)}</div>)}{r.data.rows?.filter(row=>row.notes||row.url).map(row=><p key={row.id}>{row.name}: {row.notes} {row.url}</p>)}</div>)}</footer></section>;
 })}</div>;
}
function SheetTable({sheet,name,records}:{sheet:Sheet;name:string;records:ManagementRecord[]}){
 const record=records[0],isUnits=record.data.mode==='units',cells=new Map(sheet.rows.flatMap(row=>row.cells).map(c=>[c.r+':'+c.c,c]));
 const starts=new Map(sheet.merges.map(m=>[m[0]+':'+m[1],m])),covered=new Set<string>();
 for(const [r,c,er,ec] of sheet.merges)for(let rr=r;rr<=er;rr++)for(let cc=c;cc<=ec;cc++)if(rr!==r||cc!==c)covered.add(rr+':'+cc);
 const scoreRows=sheet.rows.filter(row=>row.cells.some(c=>c.text==='SKOR SEKOLAH')).map(row=>row.r),actions=MANAGEMENT_UNITS.find(u=>u.id===record.aspect)!.actions,scoreCols=[4,6,7,8,9];
 const unitStart=name==='Panitia MP'?6:name==='Sukan_Permainan'?8:7,unitEnd=name==='Panitia MP'?21:name==='Sukan_Permainan'?21:46;
 const unitNames=[...new Set(records.flatMap(r=>r.data.rows?.map(row=>row.name)||[]))],extra=Math.max(0,unitNames.length-(unitEnd-unitStart+1));
 // Additional units repeat the template's row style before its total row.
 const rowList=sheet.rows.flatMap(row=>row.r===unitEnd?[row,...Array.from({length:extra},(_,i)=>({...row,r:unitEnd+i+1,sourceRow:unitEnd}))]:[row]);
 function value(r:number,c:number,original:string,unitIndex?:number){
  if(isUnits){
   if(unitIndex!==undefined){const label=unitNames[unitIndex]??'';if(c===2)return String(unitIndex+1);if(c===3)return label;const col=name==='Panitia MP'?c-9:0,target=name==='Panitia MP'?records.find(r=>r.aspect==='3.1.2.'+(col+1)):record;if(c>=9&&(name==='Panitia MP'?c<=12:c===9))return label?format(target?.data.rows?.find(row=>row.name===label)?.percent):'';return '';}
   if(r===sheet.end){if(c===3)return 'RUMUSAN';if(c>=9){const target=name==='Panitia MP'?records.find(r=>r.aspect==='3.1.2.'+(c-8)):record;return target?format(managementTotals(target.aspect,target.data).percentage):'';}}
   return original;
  }
  const i=scoreRows.indexOf(r);if(i>=0&&c>=4){const n=record.data.scores[actions[i]?.id];return typeof n==='number'&&scoreCols[n===4?0:n===3?1:n===2?2:n===1?3:4]===c?'1':'';}
  if(r===sheet.end-2&&scoreCols.includes(c)){const n=[4,3,2,1,0][scoreCols.indexOf(c)];return String(actions.filter(a=>record.data.scores[a.id]===n).length);}
  if(r===sheet.end-1&&scoreCols.includes(c)){const n=[4,3,2,1,0][scoreCols.indexOf(c)];return String(n*actions.filter(a=>record.data.scores[a.id]===n).length);}
  if(r===sheet.end&&c===4)return format(managementTotals(record.aspect,record.data).total);
  return original;
 }
 if(!isUnits)return <ActionSheet sheet={sheet} record={record}/>;
 return <table className="source-score-table"><colgroup>{sheet.widths.map((width,i)=><col key={i} style={{width:(width/sheet.widths.reduce((a,b)=>a+b,0)*100)+'%'}}/>)}</colgroup><tbody>{rowList.map((row,i)=>{
  const src='sourceRow' in row?row.sourceRow as number:row.r,unitIndex=isUnits&&(src>=unitStart&&src<=unitEnd)?row.r-unitStart:undefined;
  return <tr key={i}>{Array.from({length:sheet.cols},(_,i)=>i+1).map(c=>{
   if(covered.has(src+':'+c))return null;const cell=cells.get(src+':'+c),merge=starts.get(src+':'+c),style=source.styles[cell?.s??0] as CSSProperties;
   return <td key={c} rowSpan={merge?merge[2]-merge[0]+1:undefined} colSpan={merge?merge[3]-merge[1]+1:undefined} style={style}>{value(src,c,cell?.text??'',unitIndex)}</td>;
  })}</tr>;
 })}</tbody></table>;
}
function ActionSheet({sheet,record}:{sheet:Sheet;record:ManagementRecord}){
 const unit=MANAGEMENT_UNITS.find(u=>u.id===record.aspect)!,headerEnd=sheet.rows.find(row=>row.cells.some(c=>c.c===4&&['4','4.0'].includes(c.text)))?.r??18,header={...sheet,end:headerEnd,rows:sheet.rows.filter(r=>r.r<=headerEnd),merges:sheet.merges.filter(m=>m[2]<=headerEnd)},starts=new Map(header.merges.map(m=>[m[0]+':'+m[1],m])),covered=new Set<string>();
 for(const [r,c,er,ec] of header.merges)for(let rr=r;rr<=er;rr++)for(let cc=c;cc<=ec;cc++)if(rr!==r||cc!==c)covered.add(rr+':'+cc);
 const criteria=rubrics as Record<string,Record<string,Record<string,string>>>;
 return <table className="source-score-table"><colgroup>{sheet.widths.map((w,i)=><col key={i} style={{width:(w/sheet.widths.reduce((a,b)=>a+b,0)*100)+'%'}}/>)}</colgroup><tbody>{header.rows.map(row=><tr key={row.r}>{Array.from({length:9},(_,i)=>i+1).map(c=>{if(covered.has(row.r+':'+c))return null;const cell=row.cells.find(v=>v.c===c),m=starts.get(row.r+':'+c);return <td key={c} rowSpan={m?m[2]-m[0]+1:undefined} colSpan={m?m[3]-m[1]+1:undefined} style={source.styles[cell?.s??0] as CSSProperties}>{cell?.text}</td>;})}</tr>)}
 {unit.actions.map(a=><ActionRows key={a.id} id={a.id} label={a.label} rubric={criteria[record.aspect]?.[a.id]} score={record.data.scores[a.id]}/>)}
 <tr><th colSpan={3}>Jumlah Frekuensi Aspek {record.aspect}</th>{[4,3,2,1,0].map(n=><td colSpan={n===4?2:1} key={n}>{unit.actions.filter(a=>record.data.scores[a.id]===n).length}</td>)}</tr>
 <tr><th colSpan={3}>Skor</th>{[4,3,2,1,0].map(n=><td colSpan={n===4?2:1} key={n}>{n*unit.actions.filter(a=>record.data.scores[a.id]===n).length}</td>)}</tr>
 <tr><th colSpan={3}>Jumlah Skor Aspek {record.aspect}</th><td colSpan={6}>{format(managementTotals(record.aspect,record.data).total)}</td></tr></tbody></table>;
}
function ActionRows({id,label,rubric,score}:{id:string;label:string;rubric?:Record<string,string>;score:number|null|undefined}){return <><tr><td>{id})</td><td colSpan={2}>{label}</td>{[4,3,2,1,0].map(n=><td colSpan={n===4?2:1} key={n}>{rubric?.[String(n)]??''}</td>)}</tr><tr><th colSpan={3}>SKOR SEKOLAH</th>{[4,3,2,1,0].map(n=><td colSpan={n===4?2:1} key={n}>{score===n?'1':''}</td>)}</tr></>;}
function Fallback({record:r}:{record:ManagementRecord}){const unit=MANAGEMENT_UNITS.find(u=>u.id===r.aspect)!,criteria=rubrics as Record<string,Record<string,Record<string,string>>>;return <><h2>{r.aspect} · {unit.name}</h2><table className="source-score-table"><colgroup>{[5,15,10,5,25,10,10,10,10].map((n,i)=><col key={i} style={{width:n+'%'}}/>)}</colgroup><thead><tr><th colSpan={3}>TINDAKAN</th>{[4,3,2,1,0].map(n=><th colSpan={n===4?2:1} key={n}>{n}</th>)}</tr></thead><tbody>{unit.actions.map(a=><ActionRows key={a.id} id={a.id} label={a.label} rubric={criteria[r.aspect]?.[a.id]} score={r.data.scores[a.id]}/>)}<tr><th colSpan={3}>Jumlah Skor Aspek {r.aspect}</th><td colSpan={6}>{format(managementTotals(r.aspect,r.data).total)}</td></tr></tbody></table></>;}

export const printStyles=`.score-template-print{display:none}@media print{@page{size:A4 portrait;margin:8mm}.management-module:has(.score-template-print)>:not(.score-template-print){display:none!important}.score-template-print{display:block!important;color:#000!important;background:#fff!important}.score-template-sheet{break-before:page;font:10pt Arial,sans-serif}.score-template-sheet:first-child{break-before:auto}.score-template-sheet>header{font:10pt Arial,sans-serif;margin-bottom:5mm}.score-template-sheet>header>span{float:right}.score-template-sheet>header p{font-size:9pt;margin-top:2mm}.source-score-table{border-collapse:collapse!important;table-layout:fixed!important;width:100%!important;margin:0!important}.source-score-table td,.source-score-table th{padding:2px 3px!important;white-space:pre-wrap!important;overflow-wrap:anywhere;line-height:1.2!important;print-color-adjust:exact;-webkit-print-color-adjust:exact;border:1px solid #333;font-size:8pt!important}.source-score-table tr{break-inside:avoid}.score-template-sheet>footer{font:9pt Arial,sans-serif;margin-top:6mm;overflow-wrap:anywhere}.score-template-sheet>footer p{font-size:9pt;white-space:pre-wrap;margin:2mm 0}}`;
