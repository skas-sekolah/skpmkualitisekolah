import type {ReactNode} from 'react';
import SortableTable from './sortable-table';
import TableScroller from './table-scroller';
import {observationOfficer,stages,type Stage,type Teacher} from './scoring';
import type {PdpcAssignment} from './pdpc-ui';
export default function PdpcTeacherTable({teachers,offset=0,assignment,person,assessmentButton}:{teachers:Teacher[];offset?:number;assignment:(id:string)=>PdpcAssignment|undefined;person:(id:string|null)=>string;assessmentButton:(teacher:Teacher,stage:Stage)=>ReactNode}){
 return <TableScroller label="Senarai ringkas penilaian Standard 4"><SortableTable className="pdpc-compact-table"><thead><tr><th>Bil.</th><th>Nama guru</th><th>Kategori</th><th>Penilaian Kendiri</th><th>Pencerapan 1</th><th>Pencerapan 2</th></tr></thead><tbody>{teachers.map((t,i)=>{const r=assignment(t.id);return <tr key={t.id} data-teacher-id={t.id}><td>{offset+i+1}</td><td className="pdpc-teacher-name" data-sort-value={t.name}><b>{t.name}</b></td><td>{t.type==='khas'?'Pendidikan Khas':'Perdana'}</td>{stages.map(s=><td key={s}>{s!=='kendiri'&&<small className="pdpc-observer" title={person(observationOfficer(r,s))}>{person(observationOfficer(r,s))}</small>}<div className="pdpc-score-actions">{assessmentButton(t,s)}</div></td>)}</tr>;})}</tbody></SortableTable></TableScroller>;
}
