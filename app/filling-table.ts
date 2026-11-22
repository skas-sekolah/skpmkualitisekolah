import type {FillingRow} from '../migration/backend/filling-status-types';
export type FillingColumn='aspect'|'unit'|'pps'|'state'|'evidence'|'filled'|'updatedAt';
export type ScoreFilter='all'|'empty'|'partial'|'full'|'unconfigured';
export type FillingFilters={query:string;state:string;evidence:string;units:string[];aspects:string[];pps:string[];score:ScoreFilter};
export type FillingSort={column:FillingColumn;direction:'asc'|'desc'}|null;
export const unitLabel=(r:FillingRow)=>r.unit||r.title;
export function filterFillingRows(rows:FillingRow[],f:FillingFilters,sort:FillingSort){
 const search=f.query.trim().toLocaleLowerCase('ms-MY'),rank={empty:0,working:1,done:2};
 const selected=rows.filter(r=>(f.state==='all'||r.state===f.state)&&(f.evidence==='all'||String(r.evidence)===f.evidence)&&(!f.units.length||f.units.includes(unitLabel(r)))&&(!f.aspects.length||f.aspects.includes(r.aspect))&&(!f.pps.length||r.pps.some(name=>f.pps.includes(name)))&&[r.aspect,r.title,r.unit,...r.pps].join(' ').toLocaleLowerCase('ms-MY').includes(search)&&(f.score==='all'||f.score==='empty'&&r.expected>0&&r.filled===0||f.score==='partial'&&r.expected>0&&r.filled>0&&r.filled<r.expected||f.score==='full'&&r.expected>0&&r.filled>=r.expected||f.score==='unconfigured'&&r.expected===0));
 if(!sort)return selected;
 const compareText=(a:string,b:string)=>a.localeCompare(b,'ms-MY',{numeric:true,sensitivity:'base'});
 return selected.map((row,index)=>({row,index})).sort((a,b)=>{const x=a.row,y=b.row;let c=0;
  switch(sort.column){
   case 'aspect':c=compareText(x.aspect,y.aspect);break;
   case 'unit':c=compareText(unitLabel(x),unitLabel(y));break;
   case 'pps':c=compareText(x.pps.join('; '),y.pps.join('; '));break;
   case 'state':c=rank[x.state]-rank[y.state];break;
   case 'evidence':c=Number(x.evidence)-Number(y.evidence);break;
   case 'filled':c=x.filled-y.filled||x.expected-y.expected;break;
   case 'updatedAt':{
    const tx=x.updatedAt?Date.parse(x.updatedAt):NaN,ty=y.updatedAt?Date.parse(y.updatedAt):NaN;
    // Missing / invalid dates always follow known dates, in either direction.
    if(!Number.isFinite(tx)||!Number.isFinite(ty)){if(!Number.isFinite(tx)&&!Number.isFinite(ty))return a.index-b.index;return Number.isFinite(tx)?-1:1;}
    c=tx-ty;break;
   }
  }
  return (sort.direction==='asc'?c:-c)||a.index-b.index;
 }).map(v=>v.row);
}
