import SortableTable from './sortable-table';
import TableScroller from './table-scroller';
import {useEffect,useState} from 'react';
import {strengthApi,managementApi,achievementApi} from './app-client';
import {ASPECTS} from '../migration/backend/strength-model';
import {MANAGEMENT_UNITS} from '../migration/backend/management-model';
import {ACHIEVEMENT_ITEMS} from '../migration/backend/achievement-model';
export type TaskModule='strength'|'management'|'achievement';
export function ReviewQueue({year,onOpen}:{year:number;onOpen:(module:TaskModule,id:string)=>void}){
 const [rows,setRows]=useState<{module:TaskModule;id:string;title:string;submittedAt:string|null}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);setError('');void Promise.all([strengthApi({action:'load',year}),managementApi({action:'load',year}),achievementApi({action:'load',year})]).then(([s,m,a])=>{if(!active)return;setRows([...s.records.filter(r=>r.canReview).map(r=>({module:'strength' as const,id:r.aspect,title:ASPECTS.find(a=>a.id===r.aspect)!.name,submittedAt:r.submittedAt})),...m.records.filter(r=>r.canReview).map(r=>({module:'management' as const,id:r.aspect,title:MANAGEMENT_UNITS.find(a=>a.id===r.aspect)!.name,submittedAt:r.submittedAt})),...a.records.filter(r=>r.canReview).map(r=>({module:'achievement' as const,id:r.aspect,title:ACHIEVEMENT_ITEMS.find(a=>a.id===r.aspect)!.name,submittedAt:r.submittedAt}))]);}).catch(e=>{if(active)setError((e as Error).message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[year]);
 return <section className="skas-panel"><h2>Menunggu pengesahan saya</h2><p>Semak skor dan evidens setiap borang sebelum mengesahkan. Senarai ini hanya menunjukkan borang yang anda dibenarkan sahkan.</p>{loading?<p>Memuatkan senarai semakan…</p>:error?<p role="alert" className="inline-error">{error}</p>:!rows.length?<p>Tiada borang menunggu pengesahan anda.</p>:<TableScroller label="Borang menunggu pengesahan"><SortableTable><thead><tr><th>Modul / item</th><th>Tajuk</th><th>Tarikh dihantar</th><th>Tindakan</th></tr></thead><tbody>{rows.map(r=><tr key={r.module+r.id}><td>{r.module==='strength'?'Kekuatan Kami':r.module==='management'?'Pengurusan Kami':'Pencapaian Kami'} · {r.id}</td><td>{r.title}</td><td>{r.submittedAt?new Date(r.submittedAt).toLocaleDateString('ms-MY',{timeZone:'Asia/Kuala_Lumpur'}):'—'}</td><td><button className="secondary" onClick={()=>onOpen(r.module,r.id)}>Buka & semak</button></td></tr>)}</tbody></SortableTable></TableScroller>}</section>;
}
