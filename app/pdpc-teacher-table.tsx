import type {ReactNode} from 'react';
import SortableTable from './sortable-table';
import TableScroller from './table-scroller';
import {stages,type Stage,type Teacher} from './scoring';
export default function PdpcTeacherTable({teachers,offset=0,assessmentButton}:{teachers:Teacher[];offset?:number;assessmentButton:(teacher:Teacher,stage:Stage)=>ReactNode}){
 return <TableScroller label="Senarai ringkas penilaian Standard 4"><SortableTable className="pdpc-compact-table"><thead><tr><th>Bil.</th><th>Nama guru</th><th>Kategori</th><th>Penilaian Kendiri</th><th>Pencerapan 1</th><th>Pencerapan 2</th></tr></thead><tbody>{teachers.map((t,i)=>{return <tr key={t.id} data-teacher-id={t.id}><td>{offset+i+1}</td><td className="pdpc-teacher-name" data-sort-value={t.name}><b>{t.name}</b></td><td>{t.type==='khas'?'Pendidikan Khas':'Perdana'}</td>{stages.map(s=><td key={s}><div className="pdpc-score-actions">{assessmentButton(t,s)}</div></td>)}</tr>;})}</tbody></SortableTable></TableScroller>;
}
