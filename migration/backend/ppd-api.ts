import {ApiError,fail,hash,secret,now,password,type Row} from './domain.ts';
import {ppdSchool,ppdYears} from './ppd-model.ts';

export function ppdApi(db:any,signIn:(uid:string,pw:string)=>Promise<Row>,auth:(path:string,b:Row)=>Promise<Row>,limit:(key:string,max:number,seconds:number)=>Promise<void>){
 const session=(a:Row)=>({memberId:a.id,schoolId:'PPD',schoolCode:'PPD',schoolName:'Pemantauan Semua Sekolah',username:a.username,displayName:a.display_name,isAdmin:false,isSuperAdmin:false,isPPD:true,mustChangePassword:a.must_change_password,teacherId:null,legacyOwner:false});
 async function account(column:string,value:string){const r=await db.from('s4_ppd_accounts').select('*').eq(column,value).eq('enabled',true).maybeSingle();if(r.error)fail('Pengesahan PPD belum tersedia.',503);if(!r.data)fail('Akaun atau sesi PPD tidak sah.',401);return r.data as Row;}
 async function capability(a:Row,b:Row){if(typeof b.sid!=='string'||!/^[a-f0-9]{64}$/.test(b.sid))fail('Sesi tidak sah.',401);const r=await db.from('s4_ppd_sessions').select('hash').eq('hash',await hash(b.sid)).eq('account_id',a.id).gt('expires_at',now()).maybeSingle();if(r.error)fail('Pengesahan sesi belum tersedia.',503);if(!r.data||b.expected&&b.expected!==a.id)fail('Sesi PPD telah tamat. Log masuk semula.',401);}
 async function requirePPD(req:Request,b:Row,temporary=false){const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)fail('Sila log masuk dahulu.',401);const r=await db.auth.getUser(token);if(r.error||!r.data.user)fail('Sesi PPD telah tamat. Log masuk semula.',401);const a=await account('auth_user_id',r.data.user.id);await capability(a,b);if(a.must_change_password&&!temporary)fail('Tukar kata laluan sementara dahulu.',403);return a;}
 async function issue(a:Row,t:Row){const sid=secret(),r=await db.from('s4_ppd_sessions').insert({hash:await hash(sid),account_id:a.id,expires_at:new Date(Date.now()+3600000).toISOString()});if(r.error)fail('Sesi PPD belum dapat disediakan.',503);return {session:session(a),tokens:{accessToken:t.access_token,refreshToken:t.refresh_token,sid,schoolId:'PPD'}};}
 async function login(username:unknown,pw:unknown){
  await limit('ppd-login',10,600);const u=typeof username==='string'?username.trim().toUpperCase():'';
  if(!/^[A-Z0-9][A-Z0-9@._-]{2,63}$/.test(u))fail('ID pengguna atau kata laluan tidak betul.',401);
  const p=password(pw);let a=await account('username',u);
  if(!a.auth_user_id){
   if(!a.bootstrap_hash||!a.bootstrap_salt)fail('Akaun PPD belum disediakan.',503);
   const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']),bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:600000,salt:Uint8Array.from(a.bootstrap_salt.match(/../g).map((x:string)=>parseInt(x,16)))},k,256),actual=[...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');let diff=0;for(let i=0;i<64;i++)diff|=actual.charCodeAt(i)^a.bootstrap_hash.charCodeAt(i);if(diff)fail('ID pengguna atau kata laluan tidak betul.',401);
   const alias='skas-ppd-'+a.id+'@standard4.invalid',created=await db.auth.admin.createUser({email:alias,password:p,email_confirm:true});let uid=created.data?.user?.id;
   if(!uid){for(let page=1;page<=100;page++){const r=await db.auth.admin.listUsers({page,perPage:1000});if(r.error)break;const match=r.data.users.find((x:Row)=>x.email===alias);if(match){uid=match.id;break;}if(r.data.users.length<1000)break;}}
   if(!uid)fail('Akaun PPD belum dapat disediakan.',503);await signIn(uid,p);
   const r=await db.from('s4_ppd_accounts').update({auth_user_id:uid,bootstrap_hash:null,bootstrap_salt:null}).eq('id',a.id).is('auth_user_id',null);if(r.error)fail('Akaun PPD belum dapat dipautkan.',503);a=await account('username',u);
  }
  return issue(a,await signIn(a.auth_user_id,p));
 }
 async function sessionRoute(req:Request,b:Row){
  const v=b.body||{};
  if(v.action==='logout'){if(typeof b.sid==='string'&&/^[a-f0-9]{64}$/.test(b.sid)){const r=await db.from('s4_ppd_sessions').delete().eq('hash',await hash(b.sid));if(r.error)fail('Log keluar belum selesai.',503);}return {ok:true,clearTokens:true};}
  if(b.method==='GET'){
   try{return {session:session(await requirePPD(req,b,true))};}catch(e){if(!(e instanceof ApiError)||e.status!==401||!b.refreshToken)throw e;}
   const t=await auth('token?grant_type=refresh_token',{refresh_token:b.refreshToken}),a=await account('auth_user_id',t.user.id);await capability(a,b);return {session:session(a),tokens:{accessToken:t.access_token,refreshToken:t.refresh_token,sid:b.sid,schoolId:'PPD'}};
  }
  if(v.action==='password'){
   const a=await requirePPD(req,b,true);await limit('ppd-password:'+a.id,10,600);await signIn(a.auth_user_id,String(v.oldPassword||''));const p=password(v.password);if(p===v.oldPassword)fail('Gunakan kata laluan baharu yang berbeza.');const changed=await db.auth.admin.updateUserById(a.auth_user_id,{password:p});if(changed.error)fail('Kata laluan belum dapat ditukar.',503);
   const revoked=await db.from('s4_ppd_sessions').delete().eq('account_id',a.id);if(revoked.error)fail('Log masuk semula dengan kata laluan baharu.',401);const r=await db.from('s4_ppd_accounts').update({must_change_password:false}).eq('id',a.id);if(r.error)fail('Log masuk semula untuk melengkapkan pertukaran kata laluan.',401);a.must_change_password=false;return issue(a,await signIn(a.auth_user_id,p));
  }
  fail('Akaun PPD hanya untuk pemantauan.',403);
 }
 async function route(req:Request,b:Row){
  const a=await requirePPD(req,b);const v=b.body||{};if(b.method!=='GET'&&!(b.method==='POST'&&v.action==='load'))fail('Akaun PPD tidak boleh mengubah data sekolah.',403);
  const current=new Date().getUTCFullYear(),year=v.year??current;if(!Number.isInteger(year)||year<2020||year>2100)fail('Pilih tahun antara 2020–2100.');await limit('ppd-read:'+a.id,120,600);
  const rows:Row[]=[];for(let start=0;;start+=100){const r=await db.from('s4_schools').select('id,code,enabled,data').order('id').range(start,start+99);if(r.error)fail('Pemantauan sekolah belum tersedia. Cuba muat semula.',503);rows.push(...r.data);if(r.data.length<100)break;}
  // Raw school documents stay on the server. Only counts/statuses and school
  // identifiers enter the response; no names/ICs of teachers, scores or tokens.
  return {year,years:[...new Set([year,...ppdYears(rows,current)])].sort((a,b)=>b-a),schools:rows.map(r=>ppdSchool(r,year)).sort((a,b)=>a.code.localeCompare(b.code)),fetchedAt:now()};
 }
 return {login,sessionRoute,route,requirePPD};
}
