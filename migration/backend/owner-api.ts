import {ApiError,fail,hash,secret,now,password,code,audit,schoolCommand,type Row} from './domain.ts';

// Owner identity is a server-managed allowlist, never a school role or a
// client-editable Auth claim. Every request needs both a verified Auth user
// and an unexpired, revocable application capability.
export function ownerApi(db:any,signIn:(uid:string,pw:string)=>Promise<Row>,auth:(path:string,b:Row)=>Promise<Row>,limit:(key:string,max:number,seconds:number)=>Promise<void>){
 const session=(o:Row)=>({memberId:o.id,schoolId:'SUPERADMIN',schoolCode:'SUPERADMIN',schoolName:'Pengurusan SK@S',username:'SUPERADMIN',displayName:'Super Admin',isAdmin:false,isSuperAdmin:true,mustChangePassword:o.must_change_password,teacherId:null,legacyOwner:false});
 async function owner(){const {data,error}=await db.from('s4_platform_owners').select('*').eq('id','platform-owner').eq('enabled',true).maybeSingle();if(error)fail('Pengesahan pemilik belum tersedia.',503);if(!data)fail('Kod sekolah, ID atau kata laluan tidak betul.',401);return data as Row;}
 async function checkSession(o:Row,b:Row){if(typeof b.sid!=='string'||!/^[a-f0-9]{64}$/.test(b.sid))fail('Sesi tidak sah.',401);const {data,error}=await db.from('s4_owner_sessions').select('hash').eq('hash',await hash(b.sid)).eq('owner_id',o.id).gt('expires_at',now()).maybeSingle();if(error)fail('Pengesahan sesi belum tersedia.',503);if(!data||b.expected&&b.expected!==o.id)fail('Sesi telah tamat. Log masuk semula.',401);}
 async function requireOwner(req:Request,b:Row,allowTemporary=false){const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)fail('Sila log masuk dahulu.',401);const {data,error}=await db.auth.getUser(token);if(error||!data.user)fail('Sesi telah tamat. Log masuk semula.',401);const o=await owner();if(data.user.id!==o.auth_user_id)fail('Akses hanya untuk Super Admin.',403);await checkSession(o,b);if(o.must_change_password&&!allowTemporary)fail('Tukar kata laluan sementara dahulu.',403);return o;}
 async function issue(o:Row,t:Row){const sid=secret();const {error}=await db.from('s4_owner_sessions').insert({hash:await hash(sid),owner_id:o.id,expires_at:new Date(Date.now()+3600000).toISOString()});if(error)fail('Sesi belum dapat disediakan.',503);return {session:session(o),tokens:{accessToken:t.access_token,refreshToken:t.refresh_token,sid,schoolId:'SUPERADMIN'}};}
 async function login(pw:unknown){await limit('owner-login',10,600);if(typeof pw!=='string'||pw.length<6||pw.length>128)fail('Kod sekolah, ID atau kata laluan tidak betul.',401);let o=await owner();
  if(!o.auth_user_id){
   if(!o.bootstrap_hash||!o.bootstrap_salt)fail('Akaun pemilik belum disediakan.',503);
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
   const bytes=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:600000,salt:Uint8Array.from(o.bootstrap_salt.match(/../g).map((x:string)=>parseInt(x,16)))},key,256);
   const actual=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');let difference=0;for(let i=0;i<64;i++)difference|=actual.charCodeAt(i)^o.bootstrap_hash.charCodeAt(i);if(difference)fail('Kod sekolah, ID atau kata laluan tidak betul.',401);
   const alias='skas-platform-owner@standard4.invalid';const created=await db.auth.admin.createUser({email:alias,password:pw,email_confirm:true});let uid=created.data?.user?.id;
   if(!uid){ // Recover an interrupted first login only for this fixed alias.
    for(let page=1;page<=100;page++){const r=await db.auth.admin.listUsers({page,perPage:1000});if(r.error)break;const match=r.data.users.find((u:Row)=>u.email===alias);if(match){uid=match.id;break;}if(r.data.users.length<1000)break;}
   }
   if(!uid)fail('Akaun pemilik belum dapat disediakan.',503);
   // Verify possession before linking a recovered Auth account.
   await signIn(uid,pw);
   const {error}=await db.from('s4_platform_owners').update({auth_user_id:uid,bootstrap_hash:null,bootstrap_salt:null}).eq('id',o.id).is('auth_user_id',null);if(error)fail('Akaun belum dapat dipautkan.',503);o=await owner();
  }
  return issue(o,await signIn(o.auth_user_id,pw));
 }
 async function sessionRoute(req:Request,b:Row){
  const v=b.body||{};
  if(v.action==='logout'){if(typeof b.sid==='string'&&/^[a-f0-9]{64}$/.test(b.sid)){const {error}=await db.from('s4_owner_sessions').delete().eq('hash',await hash(b.sid));if(error)fail('Log keluar belum selesai.',503);}return {ok:true,clearTokens:true};}
  if(b.method==='GET'){
   try{return {session:session(await requireOwner(req,b,true))};}catch(e){if(!(e instanceof ApiError)||e.status!==401||!b.refreshToken)throw e;}
   const t=await auth('token?grant_type=refresh_token',{refresh_token:b.refreshToken}),o=await owner();if(t.user.id!==o.auth_user_id)fail('Akses hanya untuk Super Admin.',403);await checkSession(o,b);return {session:session(o),tokens:{accessToken:t.access_token,refreshToken:t.refresh_token,sid:b.sid,schoolId:'SUPERADMIN'}};
  }
  if(v.action==='password'){
   const o=await requireOwner(req,b,true);await limit('owner-password',10,600);await signIn(o.auth_user_id,String(v.oldPassword||''));const pw=password(v.password);if(pw===v.oldPassword)fail('Gunakan kata laluan baharu yang berbeza.');const changed=await db.auth.admin.updateUserById(o.auth_user_id,{password:pw});if(changed.error)fail('Kata laluan belum dapat ditukar.',503);
   const revoked=await db.from('s4_owner_sessions').delete().eq('owner_id',o.id);if(revoked.error)fail('Log masuk semula dengan kata laluan baharu.',401);
   const updated=await db.from('s4_platform_owners').update({must_change_password:false}).eq('id',o.id);if(updated.error)fail('Log masuk semula untuk melengkapkan pertukaran kata laluan.',401);o.must_change_password=false;return issue(o,await signIn(o.auth_user_id,pw));
  }
  fail('Tindakan tidak sah.');
 }
 async function route(req:Request,b:Row){
  const o=await requireOwner(req,b);await limit('owner-read:'+o.id,120,600);const v=b.body||{};
  if(b.method==='GET'){
   const {data,error}=await db.from('s4_schools').select('id,code,enabled,revision,updated_at,school:data->school,members:data->members,teachers:data->teachers,assessments:data->assessments,audit:data->audit').order('code');if(error)fail('Senarai sekolah belum tersedia.',503);
   return {schools:data.map((r:Row)=>({id:r.id,code:r.code,name:r.school.name,enabled:r.enabled,revision:r.revision,updatedAt:r.updated_at,accounts:(r.members||[]).length,teachers:(r.teachers||[]).length,assessments:(r.assessments||[]).length,admins:(r.members||[]).filter((m:Row)=>m.role==='admin').map((m:Row)=>({id:m.id,username:m.username,name:m.displayName,active:m.active===1}))})),events:data.flatMap((r:Row)=>(r.audit||[]).filter((a:Row)=>a.actorId===o.id).map((a:Row)=>({id:a.id,schoolCode:r.code,action:a.action,createdAt:a.createdAt}))).sort((a:Row,b:Row)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100)};
  }
  await limit('owner-write:'+o.id,30,600);
  if(!['school-code','school-status','reset-admin'].includes(v.action))fail('Tindakan tidak sah.');
  const {data:row,error}=await db.from('s4_schools').select('*').eq('id',v.schoolId).maybeSingle();if(error)fail('Sekolah belum dapat dibaca.',503);if(!row)fail('Sekolah tidak ditemui.',404);
  if(v.revision!==row.revision)fail('Rekod sekolah telah berubah. Muat semula dan cuba lagi.',409);if(v.confirmation!==row.code)fail('Taip kod sekolah semasa untuk mengesahkan.');
  const m={id:o.id,role:'admin',active:1};let enabled=row.enabled,result:Row={ok:true};
  if(v.action==='school-code'){const next=code(v.code);if(next==='SUPERADMIN')fail('Kod ini dikhaskan untuk pemilik sistem.');audit(row.data,m,'owner_school_code',row.id,{code:row.code},{code:next});row.data.school.code=next;}
  if(v.action==='school-status'){if(typeof v.enabled!=='boolean')fail('Status tidak sah.');enabled=v.enabled;row.data.sessions=[];row.data.invitations=[];audit(row.data,m,'owner_school_status',row.id,{enabled:row.enabled},{enabled});}
  if(v.action==='reset-admin'){if(!row.enabled)fail('Aktifkan sekolah dahulu.');const target=row.data.members.find((x:Row)=>x.id===v.memberId&&x.role==='admin'&&x.active===1);if(!target)fail('Admin aktif tidak ditemui.',404);result=await schoolCommand(row.data,m,{action:'reset-account',memberId:target.id});audit(row.data,m,'owner_admin_recovery',target.id,null,{username:target.username});}
  const saved=await db.from('s4_schools').update({data:row.data,code:row.data.school.code,enabled,revision:row.revision+1,updated_at:now()}).eq('id',row.id).eq('revision',row.revision).select('id');if(saved.error?.code==='23505')fail('Kod sekolah telah digunakan.',409);if(saved.error)fail('Perubahan belum dapat disimpan.',503);if(!saved.data?.length)fail('Rekod sekolah telah berubah. Muat semula dan cuba lagi.',409);return result;
 }
 return {login,sessionRoute,route,requireOwner};
}
