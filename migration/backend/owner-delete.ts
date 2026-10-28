import {fail,hash,type Row} from './domain.ts';

// School removal, revocation and the minimal deletion receipt are committed
// together by Postgres. Native Auth cleanup is resumable after network failure.
export function schoolDeletion(db:any){
 async function clean(job:Row){
  const remaining:string[]=[];
  for(const uid of job.pending_auth as string[]){
   try{
   const owners=await db.from('s4_platform_owners').select('id').eq('auth_user_id',uid).limit(1);
   const schools=await db.from('s4_schools').select('id').contains('data',{members:[{authUserId:uid}]}).limit(1);
   if(owners.error||schools.error){remaining.push(uid);continue;}
   // Never remove an identity still used by another school or the owner.
   if(owners.data?.length||schools.data?.length)continue;
   const deleted=await db.auth.admin.deleteUser(uid);
   if(deleted.error&&deleted.error.status!==404&&deleted.error.code!=='user_not_found')remaining.push(uid);
   }catch{remaining.push(uid);}
  }
  let saved=false;try{const updated=await db.from('s4_owner_deletions').update({pending_auth:remaining}).eq('id',job.id);saved=!updated.error;}catch{};
  return {ok:true,deleted:true,schoolCode:job.school_code,deletionId:job.id,cleanupPending:saved?remaining.length:job.pending_auth.length};
 }
 async function remove(o:Row,b:Row){
  const v=b.body||{};
  if(v.acknowledged!==true||typeof v.confirmation!=='string'||typeof v.schoolId!=='string'||!Number.isSafeInteger(v.revision)||v.revision<1||typeof v.operationId!=='string'||!UUID.test(v.operationId))fail('Sahkan pemadaman kekal dengan kod sekolah.');
  const r=await db.rpc('s4_delete_school',{p_school_id:v.schoolId,p_revision:v.revision,p_confirmation:v.confirmation,p_owner_id:o.id,p_sid_hash:await hash(b.sid),p_operation_id:v.operationId});
  if(r.error)fail('Pemadaman belum dapat diselesaikan. Muat semula senarai untuk menyemak.',503);
  if(!r.data?.ok)fail(r.data?.message||'Pemadaman ditolak.',r.data?.status||409);
  return clean(r.data.job);
 }
 async function retry(o:Row,b:Row){
  const v=b.body||{};if(typeof v.deletionId!=='string'||!UUID.test(v.deletionId))fail('Rekod pemadaman tidak sah.');
  const r=await db.from('s4_owner_deletions').select('*').eq('id',v.deletionId).eq('actor_id',o.id).maybeSingle();if(r.error)fail('Rekod pemadaman belum tersedia.',503);if(!r.data)fail('Rekod pemadaman tidak ditemui.',404);return clean(r.data);
 }
 return {remove,retry};
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
