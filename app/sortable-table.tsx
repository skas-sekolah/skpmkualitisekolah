import {Children,Fragment,cloneElement,isValidElement,useState,type ReactNode,type ReactElement,type TableHTMLAttributes} from 'react';
import {stableTableSort,type TableSort} from './table-sort';
import './sortable-table.css';
type Node=ReactElement<Record<string,any>>;
function flatten(children:ReactNode):ReactNode[]{return Children.toArray(children).flatMap(n=>isValidElement(n)&&n.type===Fragment?flatten((n as Node).props.children):[n]);}
function text(node:ReactNode):string{if(node===null||node===undefined||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join(' ');if(!isValidElement(node))return '';const p=(node as Node).props;if(p['data-sort-value']!==undefined)return String(p['data-sort-value']);if(node.type==='input'||node.type==='textarea')return String(p.type==='checkbox'?(p.checked?'1':'0'):p.value??p.defaultValue??'');if(node.type==='select'){const choice=flatten(p.children).find(c=>isValidElement(c)&&(c as Node).props.value===(p.value??p.defaultValue));return choice?text(choice):String(p.value??'');}return text(p.children);}
function interactive(node:ReactNode):boolean{return flatten(node).some(n=>isValidElement(n)&&(['button','input','select','textarea','a'].includes(String(n.type))||interactive((n as Node).props.children)));}
function rowCells(row:ReactNode):Node[]{return isValidElement(row)?flatten((row as Node).props.children).filter((n):n is Node=>isValidElement(n)&&['td','th'].includes(String(n.type))):[];}
export default function SortableTable({children,...props}:TableHTMLAttributes<HTMLTableElement>){
 const [sort,setSort]=useState<TableSort>(null),sections=flatten(children),head=sections.find(n=>isValidElement(n)&&n.type==='thead') as Node|undefined;
 const headerRows=head?flatten(head.props.children).filter(isValidElement) as Node[]:[],header=headerRows.at(-1),cells=header?rowCells(header):[],labels=cells.map(c=>text(c.props.children));
 // Existing React-controlled header sorting keeps its original handler and semantics.
 const custom=cells.some(c=>c.props['aria-sort']!==undefined),enabled=headerRows.length===1&&!!cells.length&&!custom&&cells.every(c=>(c.props.colSpan??1)===1&&(c.props.rowSpan??1)===1);
 const rendered=sections.map(section=>{
  if(!isValidElement(section))return section;const node=section as Node;
  if(enabled&&node.type==='thead')return cloneElement(node,{},headerRows.map(row=>row!==header?row:cloneElement(row,{},cells.map((cell,index)=>{
   if(interactive(cell.props.children)||!labels[index].trim()||/^(tindakan|pilih|pilihan)$/i.test(labels[index].trim()))return cell;
   const active=sort?.column===index,direction=active&&sort.direction==='asc'?'desc':'asc';
   return cloneElement(cell,{'aria-sort':active?(sort.direction==='asc'?'ascending':'descending'):'none'},<button type="button" className="skas-sort-header" aria-label={'Susun '+labels[index]+(direction==='asc'?' menaik':' menurun')} onClick={()=>setSort({column:index,direction})}>{cell.props.children}<span aria-hidden="true" className="skas-sort-icon">{active?(sort.direction==='asc'?'↑':'↓'):'↕'}</span></button>);
  }))));
  if(enabled&&sort&&node.type==='tbody'){
   const rows=flatten(node.props.children),result:ReactNode[]=[];let group:ReactNode[]=[];
   const flush=()=>{result.push(...stableTableSort(group,r=>{const c=rowCells(r)[sort.column];return c?.props['data-sort-value']!==undefined?String(c.props['data-sort-value']):text(c?.props.children);},labels[sort.column],sort.direction));group=[];};
   for(const row of rows){const cs=rowCells(row);if(cs.length===cells.length&&cs.every(c=>(c.props.colSpan??1)===1&&(c.props.rowSpan??1)===1))group.push(row);else{flush();result.push(row);}}flush();return cloneElement(node,{},result);
  }
  return node;
 });
 return <table {...props}>{rendered}</table>;
}
