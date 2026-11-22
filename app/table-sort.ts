export type TableSort={column:number;direction:'asc'|'desc'}|null;
const collator=new Intl.Collator('ms-MY',{numeric:true,sensitivity:'base'});
export function compareTableValues(a:string,b:string,heading:string,direction:'asc'|'desc'){
 const clean=(s:string)=>s.replace(/\s+/g,' ').trim(),x=clean(a),y=clean(b),empty=(s:string)=>!s||/^[—–-]$/.test(s);
 if(empty(x)||empty(y))return empty(x)===empty(y)?0:empty(x)?1:-1;
 let result=0;
 const status:Record<string,number>={'belum mengisi':0,'belum diisi':0,'belum dihantar':0,'draf':1,'sedang mengisi':1,'perlu pembetulan':1,'dihantar':2,'menunggu semakan':2,'selesai':3,'disahkan':4};
 const first=x.toLocaleLowerCase('ms-MY'),second=y.toLocaleLowerCase('ms-MY');
 if(/status/i.test(heading)&&first in status&&second in status)result=status[first]-status[second];
 else if(/tarikh|masa|dikemas|dikemaskini|kemas kini/i.test(heading)){
  const date=(s:string)=>{const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:,?\s*(\d{1,2})[:.](\d{2})(?:\s*(PG|PTG|AM|PM))?)?/i);if(!m)return /^\d{4}-\d{2}-\d{2}/.test(s)?Date.parse(s):NaN;let h=Number(m[4]||0);if(m[6])h=h%12+(/PTG|PM/i.test(m[6])?12:0);const year=Number(m[3])+(m[3].length===2?2000:0);return Date.UTC(year,Number(m[2])-1,Number(m[1]),h,Number(m[5]||0));};
  const dx=date(x),dy=date(y);result=Number.isFinite(dx)&&Number.isFinite(dy)?dx-dy:collator.compare(x,y);
 }else{
  const numeric=(s:string)=>{const m=s.replace(/,/g,'').match(/^(-?\d+(?:\.\d+)?)\s*(?:%|\/\s*\d+(?:\.\d+)?)?$/);return m?Number(m[1]):NaN;};
  const nx=numeric(x),ny=numeric(y);result=Number.isFinite(nx)&&Number.isFinite(ny)?nx-ny:collator.compare(x,y);
 }
 return direction==='asc'?result:-result;
}
export function stableTableSort<T>(rows:T[],value:(row:T)=>string,heading:string,direction:'asc'|'desc'){return rows.map((row,index)=>({row,index})).sort((a,b)=>compareTableValues(value(a.row),value(b.row),heading,direction)||a.index-b.index).map(x=>x.row);}
