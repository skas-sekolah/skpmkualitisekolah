import guides from './management-standard-guide.json';
import type {ManagementUnitId} from '../migration/backend/management-model';

/** The instrument's standard description, available as a disclosure before score controls. */
export function StandardGuide({aspect}:{aspect:ManagementUnitId}){
 const guide=guides[aspect];
 return <details key={aspect} className="mg-criteria mg-standard-guide" aria-label={'Penerangan standard '+aspect}>
  <summary>Penerangan standard {aspect} · Kriteria, standard kualiti &amp; tindakan</summary>
  <div className="mg-guide-content">
  <p className="mg-guide-aspect">{guide.aspectTitle}</p>
  <dl>
   <div><dt>Kriteria Kritikal</dt><dd>{guide.criticalCriteria}</dd></div>
   <div><dt>Standard Kualiti</dt><dd>{guide.qualityStandard}</dd></div>
   <div><dt>Tindakan untuk Mencapai Standard</dt><dd>{guide.standardActions}</dd></div>
  </dl>
  </div>
 </details>;
}
export const standardGuideStyles=`.mg-standard-guide{margin:24px 0;padding:20px;border:1px solid #b4d5cd;border-radius:10px;background:#f2faf7;color:#243e36;font-size:1rem;line-height:1.7}.mg-standard-guide summary{cursor:pointer;font-weight:700;color:#006c62;font-size:1rem}.mg-standard-guide summary:focus-visible{outline:2px solid #006c62;outline-offset:4px}.mg-guide-content{padding-top:18px}.mg-guide-aspect{margin:0 0 16px;font-weight:700;color:#006c62;font-size:1.05rem;overflow-wrap:anywhere}.mg-standard-guide dl{margin:0;display:grid;gap:18px}.mg-standard-guide dt{font-size:1rem;font-weight:700;color:#234d42;margin-bottom:4px}.mg-standard-guide dd{margin:0;white-space:normal;overflow-wrap:anywhere}@media(max-width:650px){.mg-standard-guide{padding:16px}}`;
