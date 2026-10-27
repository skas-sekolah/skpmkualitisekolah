// Browser holds only its own short-lived session in sessionStorage. Private
// service keys and operational school documents never enter the public bundle.
const API='https://zuyapvltmvkdgifvhhkj.supabase.co/functions/v1/standard4-api';
const key='standard4-online-session-v1';
type Tokens={accessToken:string;refreshToken:string;sid:string;schoolId:string};
let current:Tokens|null=null;
try{current=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
function save(t:Tokens|null){current=t;try{if(t)sessionStorage.setItem(key,JSON.stringify(t));else sessionStorage.removeItem(key);}catch{}}
let refresh:Promise<Response>|null=null;
async function send(path:string,init:RequestInit={},retry=true):Promise<Response>{
 const headers=new Headers(init.headers);const body=typeof init.body==='string'?JSON.parse(init.body):undefined;
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',...(current?{Authorization:'Bearer '+current.accessToken}:{})},body:JSON.stringify({path,method:init.method||'GET',body,expected:headers.get('x-s4-member'),schoolId:current?.schoolId,sid:current?.sid,...(path==='/api/session'&&(!body||body.action==='logout')?{refreshToken:current?.refreshToken}:{})}),cache:'no-store',signal:init.signal});
 const d=await r.clone().json().catch(()=>({})) as {tokens?:Tokens;clearTokens?:boolean};if(r.ok&&d.tokens)save(d.tokens);if(r.ok&&d.clearTokens)save(null);
 if(r.status===401&&retry&&path!=='/api/session'&&current){if(!refresh)refresh=send('/api/session',{},false).finally(()=>{refresh=null;});const refreshed=await refresh;if(refreshed.ok)return send(path,init,false);}
 if(r.status===401&&path==='/api/session')save(null);return r;
}
export function installCloudTransport(){const native=globalThis.fetch.bind(globalThis);globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{const path=typeof input==='string'?input:'';return ['/api/owner','/api/session','/api/data','/api/school','/api/strength','/api/management','/api/resources','/api/achievement'].includes(path)?send(path,init):native(input,init);}) as typeof fetch;}
