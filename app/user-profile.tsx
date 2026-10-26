import {useEffect,useRef} from 'react';
import {ChevronDown,LockKeyhole,LogOut,UserRound} from 'lucide-react';
import type {AppSession} from './app-types';
export default function UserProfile({session,offline,busy,onPassword,onLogout}:{session:AppSession;offline:boolean;busy:boolean;onPassword:()=>void;onLogout:()=>void}){
 const ref=useRef<HTMLDetailsElement>(null),trigger=useRef<HTMLElement|null>(null);
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))ref.current?.removeAttribute('open');};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 const close=()=>ref.current?.removeAttribute('open');
 return <details ref={ref} className="user-profile" onKeyDown={e=>{if(e.key==='Escape'){close();trigger.current?.focus();}}}><summary ref={e=>{trigger.current=e;}} aria-label={'Profil '+session.displayName}><UserRound size={20}/><span>{session.displayName}</span><ChevronDown size={15}/></summary><div className="user-profile-panel"><div className="user-profile-info"><b>{session.displayName}</b><small>{session.isAdmin?'Admin':session.isSchoolLeader?'Pentadbir sekolah':'Pengguna sekolah'}</small><small>{session.schoolName} · {session.schoolCode}</small></div>{!session.legacyOwner&&<button type="button" disabled={offline} onClick={()=>{close();onPassword();}}><LockKeyhole size={17}/> Tukar kata laluan</button>}<div className="user-profile-divider"/><button type="button" className="user-profile-logout" disabled={busy} onClick={()=>{close();onLogout();}}><LogOut size={17}/>{offline?'Kunci peranti':'Log keluar'}</button></div></details>;
}
