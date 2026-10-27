import {ownerApi} from './owner-api.ts';
import {achievementCommand,achievementView} from './achievement-api.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.102.0';
import {ApiError,fail,text,code,username,password,secret,hash,now,actor,session,audit,getData,dataCommand,getSchool,schoolCommand,initializePdpc,type SchoolDoc,type Row} from './domain.ts';
import {resourcesCommand,resourcesView} from './resources-api.ts';
import {strengthCommand,strengthView} from './strength-api.ts';
import {managementCommand,managementView} from './management-api.ts';
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(['https://skas-sekolah.github.io','https://cikgu-khairil-matematik.github.io','https://standard-4-sktd-2026.krel-adam.chatgpt.site']);
class Retry extends Error{}
async function load(value:string,byCode=false){const {data,error}=await db.from('s4_schools').select('*').eq(byCode?'code':'id',value).maybeSingle();if(error)fail('Pangkalan data belum dapat dihubungi.',503);if(!data)return null;if(!data.enabled)fail('Akses sekolah ini tidak aktif. Hubungi pemilik sistem.',423);return data as Row;}
async function commit(row:Row){row.data.sessions=row.data.sessions.filter((s:Row)=>s.expiresAt>now());row.data.invitations=row.data.invitations.filter((i:Row)=>i.expiresAt>now());const {data,error}=await db.from('s4_schools').update({data:row.data,code:row.data.school.code,revision:row.revision+1,updated_at:now()}).eq('id',row.id).eq('revision',row.revision).eq('enabled',true).select('id');if(error)fail('Rekod tidak dapat disimpan.',503);if(!data?.length)throw new Retry();}
async function limit(key:string,max:number,seconds:number){const {data,error}=await db.rpc('s4_rate_limit',{p_key:key,p_max:max,p_seconds:seconds});if(error)fail('Pengesahan permintaan belum tersedia.',503);if(!data)fail('Terlalu banyak percubaan. Cuba semula kemudian.',429);}
async function auth(path:string,b:Row,access?:string){const r=await fetch(url+'/auth/v1/'+path,{method:path==='user'?'PUT':'POST',headers:{apikey:anon,'Content-Type':'application/json',...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify(b),signal:AbortSignal.timeout(15000)});if(!r.ok)fail('Kod sekolah, ID atau kata laluan tidak betul.',401);return await r.json();}
async function email(uid:string){const {data,error}=await db.auth.admin.getUserById(uid);if(error||!data.user?.email)fail('Akaun belum dapat disahkan.',401);return data.user.email;}
async function signIn(uid:string,pw:string){return auth('token?grant_type=password',{email:await email(uid),password:pw});}
function tokens(t:Row,sid:string,d:SchoolDoc,m:Row){return {accessToken:t.access_token,refreshToken:t.refresh_token,sid,schoolId:d.school.id};}
async function newSession(row:Row,m:Row,t:Row){const sid=secret();initializePdpc(row.data);row.data.sessions.push({hash:await hash(sid),memberId:m.id,expiresAt:new Date(Date.now()+604800000).toISOString()});await commit(row);return {session:session(row.data,m),tokens:tokens(t,sid,row.data,m)};}
async function requireUser(req:Request,b:Row){const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)fail('Sila log masuk dahulu.',401);const {data,error}=await db.auth.getUser(token);if(error||!data.user)fail('Sesi telah tamat. Log masuk semula.',401);if(typeof b.schoolId!=='string'||typeof b.sid!=='string'||!/^[a-f0-9]{64}$/.test(b.sid))fail('Sesi tidak sah.',401);const row=await load(b.schoolId);if(!row)fail('Akaun tidak ditemui.',401);const m=actor(row.data,data.user.id,await hash(b.sid));if(b.expected&&m.id!==b.expected)fail('Akaun pada pelayar telah berubah. Log masuk semula.',409);if(initializePdpc(row.data)){await commit(row);row.revision++;}return {row,m,uid:data.user.id,token};}
const owners=ownerApi(db,signIn,auth,limit);
async function sessionRoute(req:Request,b:Row){const v=b.body||{},action=v.action;
 if(b.schoolId==='SUPERADMIN'&&(b.method==='GET'||['logout','password'].includes(action)))return owners.sessionRoute(req,b);
 if(action==='login'&&String(v.schoolCode).trim().toUpperCase()==='SUPERADMIN'){if(String(v.username).trim().toUpperCase()!=='SUPERADMIN')fail('Kod sekolah, ID atau kata laluan tidak betul.',401);return owners.login(v.password);}
 if(['register-school','activate'].includes(action)&&String(v.schoolCode).trim().toUpperCase()==='SUPERADMIN')fail('Kod ini dikhaskan untuk pemilik sistem.',403);
 if(b.method==='GET'){
  if(!b.schoolId||!b.sid)return {session:null,configured:true};
  try{const {row,m}=await requireUser(req,b);return {session:session(row.data,m),configured:true};}catch(e){if(!(e instanceof ApiError)||e.status!==401||!b.refreshToken)throw e;}
  const t=await auth('token?grant_type=refresh_token',{refresh_token:b.refreshToken}),row=await load(b.schoolId);if(!row)fail('Sesi tamat.',401);const m=actor(row.data,t.user.id,await hash(b.sid));return {session:session(row.data,m),configured:true,tokens:tokens(t,b.sid,row.data,m)};
 }
 if(action==='logout'){if(!b.schoolId||!b.sid)return {ok:true,clearTokens:true};try{const row=await load(b.schoolId);if(row){const h=await hash(b.sid);row.data.sessions=row.data.sessions.filter((s:Row)=>s.hash!==h);await commit(row);}}catch(e){if(e instanceof Retry)throw e;if(!(e instanceof ApiError)||e.status!==423)throw e;}return {ok:true,clearTokens:true};}
 if(action==='password'){
  const {row,m,uid}=await requireUser(req,b);await limit('password:'+m.id,10,600);await signIn(uid,password(v.oldPassword));const pw=password(v.password),{error}=await db.auth.admin.updateUserById(uid,{password:pw});if(error)fail('Kata laluan belum dapat ditukar.',503);row.data.sessions=row.data.sessions.filter((s:Row)=>s.memberId!==m.id);audit(row.data,m,'password_changed',m.id,null,null);return newSession(row,m,await signIn(uid,pw));
 }
 if(!['login','register-school','activate'].includes(action))fail('Tindakan tidak sah.');
 const c=code(v.schoolCode),u=username(v.username),pw=password(v.password);await limit('login:'+c+':'+u,15,600);
 if(action==='login'){const row=await load(c,true),m=row?.data.members.find((m:Row)=>m.username===u&&m.active===1);if(!m?.authUserId)fail('Kod sekolah, ID atau kata laluan tidak betul.',401);const t=await signIn(m.authUserId,pw);if(t.user.id!==m.authUserId)fail('Akaun tidak dibenarkan.',403);return newSession(row!,m,t);}
 if(action==='register-school'){
  const id=crypto.randomUUID(),m={id:crypto.randomUUID(),schoolId:id,username:u,authUserId:null as string|null,teacherId:null,displayName:text(v.displayName),role:'admin',active:1,mustChangePassword:0,createdAt:now()};
  const d:SchoolDoc={school:{id,code:c,name:text(v.schoolName,5,160),createdAt:now()},teachers:[],assessments:[],members:[m],invitations:[],imports:[],audit:[],sessions:[]};
  initializePdpc(d);
  const {error}=await db.from('s4_schools').insert({id,code:c,data:d,revision:1,enabled:true});if(error){if(error.code==='23505')fail('Kod sekolah telah digunakan.',409);fail('Ruang sekolah belum dapat disediakan.',503);}
  const created=await db.auth.admin.createUser({email:crypto.randomUUID()+'@standard4.invalid',password:pw,email_confirm:true});if(created.error||!created.data.user){await db.from('s4_schools').delete().eq('id',id).eq('revision',1);fail('Akaun belum dapat disediakan.',503);}
  const uid=created.data.user.id as string;m.authUserId=uid;const row={id,revision:1,data:d};audit(d,m,'school_registered',id,null,{code:c,name:d.school.name});return newSession(row,m,await signIn(uid,pw));
 }
 // Claim an invitation with CAS before changing Auth. A crashed claim expires
 // after two minutes; retries cannot consume a different member's invitation.
 const row=await load(c,true),d=row?.data as SchoolDoc,m=d?.members.find(m=>m.username===u&&m.active===1);if(!m||typeof v.invitation!=='string'||!/^[a-f0-9]{64}$/.test(v.invitation))fail('Kod pengaktifan tidak sah.',403);
 const h=await hash(v.invitation),i=d.invitations.find(i=>i.hash===h&&i.memberId===m.id&&i.expiresAt>now()&&!i.consumedAt);if(!i||i.claimUntil&&i.claimUntil>now())fail('Kod pengaktifan tidak sah, sedang digunakan atau telah tamat.',403);
 const claim=secret();i.claimId=claim;i.claimUntil=new Date(Date.now()+120000).toISOString();await commit(row!);
 try{
  let uid=m.authUserId;
  if(uid){const result=await db.auth.admin.updateUserById(uid,{password:pw});if(result.error)fail('Akaun belum dapat diaktifkan.',503);}else{
   // Stable email allows a crashed first activation to recover its orphan Auth
   // user without exposing or accepting an arbitrary Auth user ID.
   const alias=await hash('standard4-invitation:'+m.id)+'@standard4.invalid',created=await db.auth.admin.createUser({email:alias,password:pw,email_confirm:true});
   if(created.error){
    // Recover only this member's deterministic alias if a prior invocation
    // created Auth successfully but failed before committing its member link.
    let found:string|null=null;
    for(let page=1;page<=100;page++){const listed=await db.auth.admin.listUsers({page,perPage:1000});if(listed.error)fail('Akaun belum dapat disahkan.',503);const match=listed.data.users.find((user:Row)=>user.email===alias);if(match){found=match.id;break;}if(listed.data.users.length<1000)break;}
    if(!found)fail('Pengaktifan belum dapat disiapkan. Cuba semula kemudian.',503);
    const updated=await db.auth.admin.updateUserById(found,{password:pw});if(updated.error)fail('Kata laluan belum dapat disediakan.',503);uid=found;
   }else uid=created.data.user!.id;
  }
  for(let attempt=0;attempt<5;attempt++){
   const fresh=await load(c,true);if(!fresh)fail('Sekolah tidak ditemui.',404);const member=fresh.data.members.find((x:Row)=>x.id===m.id&&x.active===1),inv=fresh.data.invitations.find((x:Row)=>x.hash===h&&x.claimId===claim&&!x.consumedAt);if(!member||!inv)fail('Kod pengaktifan telah dibatalkan.',403);
   member.authUserId=uid;fresh.data.invitations=fresh.data.invitations.filter((x:Row)=>x.memberId!==m.id);fresh.data.sessions=fresh.data.sessions.filter((x:Row)=>x.memberId!==m.id);audit(fresh.data,member,'account_activated',m.id,null,null);
   try{return await newSession(fresh,member,await signIn(uid,pw));}catch(e){if(!(e instanceof Retry)||attempt===4)throw e;}
  }
 }catch(e){for(let attempt=0;attempt<3;attempt++){const fresh=await load(c,true),inv=fresh?.data.invitations.find((x:Row)=>x.hash===h&&x.claimId===claim);if(!inv)break;delete inv.claimId;delete inv.claimUntil;try{await commit(fresh!);break;}catch(x){if(!(x instanceof Retry))break;}}throw e;}
 fail('Akaun belum dapat disediakan.',503);
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin'),headers:Record<string,string>={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 if(origin&&allowed.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(d:unknown,status=200)=>new Response(JSON.stringify(d),{status,headers});
 if(origin&&!allowed.has(origin))return reply({error:'Asal permintaan tidak dibenarkan.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'Gunakan POST.'},405);
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))fail('Gunakan JSON.',415);const raw=await req.text();if(raw.length>350000)fail('Permintaan terlalu besar.',413);let b:Row;try{b=JSON.parse(raw);}catch{fail('Maklumat tidak sah.');}
  if(!b!||typeof b!=='object'||Array.isArray(b))fail('Maklumat tidak sah.');
  if(!['/api/owner','/api/session','/api/data','/api/school','/api/strength','/api/management','/api/resources','/api/achievement'].includes(b!.path)||!['GET','POST'].includes(b!.method))fail('Laluan tidak sah.',404);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'shared';await limit('ip:'+await hash(ip),300,600);if(b!.body?.action==='register-school')await limit('register:'+await hash(ip),10,3600);
  for(let attempt=0;attempt<6;attempt++)try{
   if(b!.path==='/api/session')return reply(await sessionRoute(req,b!));
   if(b!.path==='/api/owner')return reply(await owners.route(req,b!));
   const {row,m}=await requireUser(req,b!);
   if(b!.path==='/api/resources'){
    if(b!.body?.action==='load')return reply(resourcesView(row.data,m,b!.body.year));
    if(b!.method!=='POST')fail('Gunakan POST.',405);await limit('write:'+m.id,300,600);const result=resourcesCommand(row.data,m,b!.body||{});await commit(row);return reply(result);
   }
   if(b!.path==='/api/strength'){
    if(b!.body?.action==='load')return reply(strengthView(row.data,m,b!.body.year));
    if(b!.method!=='POST')fail('Gunakan POST.',405);await limit('write:'+m.id,300,600);const result=strengthCommand(row.data,m,b!.body||{});await commit(row);return reply(result);
   }
   if(b!.path==='/api/achievement'){
    if(b!.body?.action==='load')return reply(achievementView(row.data,m,b!.body.year));
    if(b!.method!=='POST')fail('Gunakan POST.',405);await limit('write:'+m.id,300,600);const result=achievementCommand(row.data,m,b!.body||{});await commit(row);return reply(result);
   }
   if(b!.path==='/api/management'){
    if(b!.body?.action==='load')return reply(managementView(row.data,m,b!.body.year));
    if(b!.method!=='POST')fail('Gunakan POST.',405);await limit('write:'+m.id,300,600);const result=managementCommand(row.data,m,b!.body||{});await commit(row);return reply(result);
   }
   if(b!.method==='GET')return reply(b!.path==='/api/data'?getData(row.data,m):getSchool(row.data,m));
   await limit('write:'+m.id,300,600);const result=b!.path==='/api/data'?dataCommand(row.data,m,b!.body||{}):await schoolCommand(row.data,m,b!.body||{});await commit(row);return reply(result);
  }catch(e){if(e instanceof Retry){if(attempt<5)continue;fail('Rekod sedang berubah. Cuba semula.',409);}throw e;}
  fail('Permintaan belum selesai.',503);
 }catch(e){if(e instanceof ApiError)return reply({error:e.message,...e.details},e.status);console.error('Standard4 API request failed');return reply({error:'Permintaan belum dapat diselesaikan. Semak rekod sebelum mencuba semula.'},503);}
});
