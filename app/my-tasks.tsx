import type {AppSession} from './app-types';
export type TaskRow={module:'strength'|'management'|'achievement';id:string;title:string;role:string;status:string};
type RecordTask={aspect:string;status:string;assigneeId:string|null;reviewerId:string|null;pssIds?:string[];canRead:boolean;canReview:boolean};
export function collectMyTasks(session:AppSession,groups:{module:TaskRow['module'];records:RecordTask[];titles:Record<string,string>}[]):TaskRow[]{
 const ids=new Set([session.memberId,...(session.teacherId?['teacher:'+session.teacherId]:[]),...(session.staffId?['staff:'+session.staffId]:[])]);
 return groups.flatMap(g=>{
  const individual=g.records.filter(r=>r.canRead).flatMap(r=>{const assigned=!!r.assigneeId&&ids.has(r.assigneeId)||(r.pssIds??[]).some(id=>ids.has(id));const fill=assigned&&['draft','returned'].includes(r.status);const review=!session.isPGB&&!!r.reviewerId&&ids.has(r.reviewerId)&&r.status==='submitted'&&r.canReview;return fill||review?[{module:g.module,id:r.aspect,title:g.titles[r.aspect]||r.aspect,role:review?'Penyemak':'Pengisi / PPS',status:r.status}]:[];});
  if(session.isPGB&&g.records.some(r=>r.canRead&&r.status==='submitted'))individual.push({module:g.module,id:'module-summary',title:g.module==='strength'?'Rumusan A1–A9':g.module==='management'?'Rumusan Pengurusan Kami':'Rumusan Pencapaian Kami',role:'Pengesahan modul',status:'submitted'});
  return individual;
 });
}
const modules={strength:'Kekuatan Kami',management:'Pengurusan Kami',achievement:'Pencapaian Kami'};
export function MyTasks({rows,loading,error,onOpen}:{rows:TaskRow[];loading:boolean;error:string;onOpen:(module:TaskRow['module'],id:string)=>void}){return <section className="skas-panel"><h2>Tugasan saya ({rows.length})</h2><p>Senarai ini sepadan dengan angka pada menu: pengisian draf / pembetulan dan borang yang menunggu semakan anda, bagi tiga modul di bawah.</p>{loading?<p role="status">Memuatkan tugasan…</p>:error?<p role="alert">{error}</p>:!rows.length?<p>Tiada tugasan memerlukan tindakan anda.</p>:<div className="skas-task-list">{rows.map(r=><article key={r.module+r.id} className="skas-panel"><small>{modules[r.module]} · {r.role}</small><h3>{r.id==='module-summary'?r.title:r.id+' · '+r.title}</h3><p>Status: {r.status==='submitted'?'Menunggu semakan anda':r.status==='returned'?'Perlu pembetulan':'Draf / belum dihantar'}</p><button className="primary" onClick={()=>onOpen(r.module,r.id)}>{r.id==='module-summary'?'Buka rumusan modul':'Buka tugasan'}</button></article>)}</div>}</section>}
