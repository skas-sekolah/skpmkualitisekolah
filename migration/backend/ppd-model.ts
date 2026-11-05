import {scoreEntry,type Row} from './domain.ts';
import {rosterActive,stages} from './scoring.ts';
import {ASPECTS} from './strength-model.ts';
import {MANAGEMENT_UNITS} from './management-model.ts';
import {ACHIEVEMENT_ITEMS} from './achievement-model.ts';
import type {PpdCounts,PpdSchool,PpdState} from './ppd-types.ts';

const blank=():PpdCounts=>({expected:0,empty:0,draft:0,returned:0,submitted:0,verified:0});
// Uses the same entry rule as the existing portal: numeric zero and explicit
// not-applicable count; assignment-only edits do not count as filling.
function state(record:Row|undefined,pdpc=false):PpdState{
 if(!record)return 'empty';if(['submitted','verified','returned'].includes(record.status))return record.status;
 return pdpc||scoreEntry(record.data)?'draft':'empty';
}
export function ppdSchool(row:Row,year:number):PpdSchool{
 const d=row.data,modules={strength:blank(),management:blank(),achievement:blank(),standard4:blank()};let updatedAt:string|null=null;
 function add(module:keyof typeof modules,r:Row|undefined,pdpc=false){const s=state(r,pdpc);modules[module].expected++;modules[module][s]++;if(s!=='empty'&&typeof r?.updatedAt==='string'&&(!updatedAt||r.updatedAt>updatedAt))updatedAt=r.updatedAt;}
 for(const a of ASPECTS)add('strength',d.strength?.[String(year)]?.[a.id]);
 for(const a of MANAGEMENT_UNITS)add('management',d.management?.[String(year)]?.[a.id]);
 for(const a of ACHIEVEMENT_ITEMS)add('achievement',d.achievement?.[String(year)]?.[a.id]);
 const teachers=(d.teachers??[]).filter((t:Row)=>['perdana','khas'].includes(t.type)&&rosterActive(t,year)),ids=new Set(teachers.map((t:Row)=>t.id)),latest=new Map<string,Row>();
 for(const a of d.assessments??[]){if(a.year!==year||!ids.has(a.teacherId)||!stages.includes(a.stage)||d.pdpc?.version===2&&a.epoch!==d.pdpc.epoch)continue;const key=a.teacherId+':'+a.stage,old=latest.get(key);if(!old||String(a.updatedAt??'')>String(old.updatedAt??''))latest.set(key,a);}
 // Legacy PdPc uses a school-level signature confirmation rather than
 // per-record verified status. Preserve that existing verification meaning.
 const legacyRows=(d.assessments??[]).filter((a:Row)=>a.year===year&&ids.has(a.teacherId)&&stages.includes(a.stage)),legacyExpected=teachers.length*stages.length;
 const signature=JSON.stringify(legacyRows.map((a:Row)=>[a.id,a.revision,a.status]).sort((a:Row[],b:Row[])=>String(a[0]).localeCompare(String(b[0]))));
 const legacyVerified=d.pdpc?.version!==2&&legacyExpected>0&&legacyRows.length===legacyExpected&&legacyRows.every((a:Row)=>a.status==='submitted')&&d.resources?.pdpcConfirmations?.[String(year)]?.signature===signature;
 for(const t of teachers)for(const stage of stages){const r=latest.get(t.id+':'+stage);add('standard4',legacyVerified&&r?{...r,status:'verified'}:r,true);}
 return {id:row.id,code:row.code,name:String(d.school.name),enabled:row.enabled===true,teachers:teachers.length,updatedAt,modules};
}
export function ppdYears(rows:Row[],current:number){const years=new Set([current]);for(const r of rows){for(const key of ['strength','management','achievement'])for(const y of Object.keys(r.data[key]??{})){const n=Number(y);if(Number.isInteger(n)&&n>=2020&&n<=2100)years.add(n);}for(const a of r.data.assessments??[])if(Number.isInteger(a.year)&&a.year>=2020&&a.year<=2100)years.add(a.year);}return [...years].sort((a,b)=>b-a);}
