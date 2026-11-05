import {PPD_MODULES,type PpdCounts,type PpdModule,type PpdSchool} from '../migration/backend/ppd-types';
export type PpdScope=PpdModule|'all';
export const emptyCounts=():PpdCounts=>({expected:0,empty:0,draft:0,returned:0,submitted:0,verified:0});
export function countsFor(s:PpdSchool,scope:PpdScope){return (scope==='all'?PPD_MODULES.map(m=>m.id):[scope]).reduce((c,key)=>{const n=s.modules[key];for(const k of Object.keys(c) as (keyof PpdCounts)[])c[k]+=n[k];return c;},emptyCounts());}
export const percent=(n:number,total:number)=>total?Math.round(n/total*1000)/10:null;
export const started=(c:PpdCounts)=>c.expected-c.empty;
export const sent=(c:PpdCounts)=>c.submitted+c.verified;
export function fillingStage(c:PpdCounts){if(!c.expected||!started(c))return 'empty';if(c.verified===c.expected)return 'verified';if(sent(c)===c.expected)return 'submitted';return 'draft';}
export type PpdFilters={search:string;status:string;stage:string;sort:string};
export function filteredSchools(schools:PpdSchool[],scope:PpdScope,f:PpdFilters){
 return schools.filter(s=>{const c=countsFor(s,scope);return (f.status==='all'||s.enabled===(f.status==='active'))&&(!f.search||(s.code+' '+s.name).toLocaleLowerCase('ms').includes(f.search.trim().toLocaleLowerCase('ms')))&&(f.stage==='all'||(f.stage==='returned'?c.returned>0:f.stage==='submitted'?c.expected>0&&sent(c)===c.expected:fillingStage(c)===f.stage));}).sort((a,b)=>{
  const ca=countsFor(a,scope),cb=countsFor(b,scope),pa=percent(started(ca),ca.expected)??-1,pb=percent(started(cb),cb.expected)??-1;
  if(f.sort==='progress-up')return pa-pb||a.code.localeCompare(b.code);if(f.sort==='progress-down')return pb-pa||a.code.localeCompare(b.code);if(f.sort==='sent-up')return (percent(sent(ca),ca.expected)??-1)-(percent(sent(cb),cb.expected)??-1)||a.code.localeCompare(b.code);if(f.sort==='updated')return String(b.updatedAt??'').localeCompare(String(a.updatedAt??''))||a.code.localeCompare(b.code);return a.code.localeCompare(b.code);
 });
}
