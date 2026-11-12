import {cleanAchievementData,validAchievement,validAchievementYear,type AchievementBundle,type PendingAchievement} from '../migration/backend/achievement-model';
import type {AppData,AppSession,OfflineSnapshot,PendingDraft} from './app-types';
import type {Assessment} from './scoring';
import {cleanStrengthData,validAspect,validYear,type StrengthBundle,type PendingStrength} from '../migration/backend/strength-model';
import {cleanManagementData,validManagementUnit,validYear as validManagementYear,type ManagementBundle,type PendingManagement} from '../migration/backend/management-model';
import {readVault,writeVault,decryptSnapshot,encryptSnapshot,deriveVaultKey,vaultMeta,type VaultRecord} from './offline-vault';
export class RequestError extends Error{constructor(message:string,public status:number,public data:Record<string,unknown>={}){super(message);}}
export async function requestJSON<T>(path:string,body?:unknown,expected?:string,retry=true):Promise<T>{let r:Response;try{r=await fetch(path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(expected?{'X-S4-Member':expected}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(path==='/api/resources'&&['script-upload','script-test'].includes((body as Record<string,unknown>)?.action as string)?150000:25000)});}catch{throw new RequestError('Sambungan tidak tersedia. Draf belum dihantar ke pelayan.',0);}
 if(r.status===401&&retry&&path!=='/api/session'){const session=await requestJSON<{session:AppSession|null}>('/api/session');if(session.session&&(!expected||session.session.memberId===expected))return requestJSON(path,body,expected,false);}
 const d=await r.json() as T&{error?:string};if(!r.ok)throw new RequestError(d.error||'Permintaan gagal.',r.status,d as Record<string,unknown>);return d;}
export type EngineState={offline:boolean;enabled:boolean;pending:PendingDraft[];savedAt:string|null;syncing:boolean;message:string;storageError:boolean};
export class OfflineEngine{
 snapshot:OfflineSnapshot|null=null;key:CryptoKey|null=null;meta:Pick<VaultRecord,'id'|'schoolCode'|'username'|'salt'>|null=null;
 syncing:Promise<void>|null=null;storageChain:Promise<unknown>=Promise.resolve();message='';storageError=false;
 strengthSyncing:Promise<void>|null=null;
 managementSyncing:Promise<void>|null=null;
 achievementSyncing:Promise<void>|null=null;
 listeners=new Set<()=>void>();
 constructor(public session:AppSession,public connected=()=>typeof navigator!=='undefined'&&navigator.onLine,public transport=requestJSON,public persistVault=writeVault){}
 subscribe=(f:()=>void)=>{this.listeners.add(f);return ()=>{this.listeners.delete(f);};};
 emit(){for(const f of this.listeners)f();}
 state():EngineState{return {offline:!this.connected(),enabled:!!this.key,pending:this.snapshot?.pending??[],savedAt:this.snapshot?.savedAt??null,syncing:!!this.syncing,message:this.message,storageError:this.storageError};}
 changed(){this.emit();if(typeof window!=='undefined')window.dispatchEvent(new Event('s4-data-changed'));}
 async persist(){if(!this.snapshot||!this.key||!this.meta)return;const copy=structuredClone(this.snapshot),key=this.key,meta=this.meta;this.storageChain=this.storageChain.catch(()=>undefined).then(async()=>{await this.persistVault(await encryptSnapshot(copy,key,meta));});try{await this.storageChain;this.storageError=false;}catch(e){this.storageError=true;this.message=(e as Error).message;this.emit();throw e;}}
 async enable(pw:string){if(this.session.legacyOwner)throw Error('Sediakan ID Admin sebelum mengaktifkan offline.');if(pw.length<10)throw Error('Gunakan kata laluan offline sekurang-kurangnya 10 aksara.');const existing=await readVault(this.session.memberId);if(existing){const opened=await decryptSnapshot(existing,pw);this.key=opened.key;this.meta=existing;const pending=opened.snapshot.pending;if(!this.snapshot)this.snapshot=opened.snapshot;else{this.snapshot.pending=pending;this.snapshot.strengthPending=opened.snapshot.strengthPending??[];this.snapshot.strengthCache={...opened.snapshot.strengthCache,...this.snapshot.strengthCache};this.snapshot.managementPending=opened.snapshot.managementPending??[];this.snapshot.managementCache={...opened.snapshot.managementCache,...this.snapshot.managementCache};this.snapshot.achievementPending=opened.snapshot.achievementPending??[];this.snapshot.achievementCache={...opened.snapshot.achievementCache,...this.snapshot.achievementCache};this.mergePending();}}else{this.meta=vaultMeta(this.session);this.key=await deriveVaultKey(pw,this.meta.salt);}
 if(!this.snapshot)await this.load();this.snapshot!.offlineUntil=new Date(Date.now()+604800000).toISOString();await this.persist();this.message='Draf offline diaktifkan untuk peranti ini.';this.emit();}
 async unlock(record:VaultRecord,pw:string){const opened=await decryptSnapshot(record,pw);if(opened.snapshot.offlineUntil<=new Date().toISOString())throw Error('Tempoh offline tamat. Log masuk secara online untuk memperbaharuinya.');if(opened.snapshot.data.session.memberId!==this.session.memberId)throw Error('Akaun peranti tidak sepadan.');this.snapshot=opened.snapshot;this.key=opened.key;this.meta=record;this.emit();}
 mergePending(){if(!this.snapshot)return;for(const p of this.snapshot.pending){const index=this.snapshot.data.assessments.findIndex(a=>a.id===p.assessment.id);const value={...p.assessment,localPending:true};if(index<0)this.snapshot.data.assessments.push(value);else this.snapshot.data.assessments[index]=value;}}
 async load():Promise<AppData>{if(!this.connected()){if(!this.snapshot||!this.key)throw Error('Log masuk online dan aktifkan mod offline pada peranti ini dahulu.');if(this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Tempoh offline tamat. Sambungkan internet dan log masuk semula.');return structuredClone(this.snapshot.data);}
 let data:AppData;try{data=await this.transport<AppData>('/api/data',undefined,this.session.memberId);}catch(e){if(e instanceof RequestError&&e.status===0&&this.key&&this.snapshot){this.message='Pelayan belum dapat dihubungi. Menggunakan salinan pada peranti.';this.emit();return structuredClone(this.snapshot.data);}throw e;}
 if(data.session.memberId!==this.session.memberId||data.session.schoolId!==this.session.schoolId)throw Error('Akaun berubah. Log masuk semula.');this.session=data.session;
 const pending=this.snapshot?.pending??[];this.snapshot={achievementCache:this.snapshot?.achievementCache,achievementPending:this.snapshot?.achievementPending,managementCache:this.snapshot?.managementCache,managementPending:this.snapshot?.managementPending,strengthCache:this.snapshot?.strengthCache,strengthPending:this.snapshot?.strengthPending,data,pending,savedAt:new Date().toISOString(),offlineUntil:new Date(Date.now()+604800000).toISOString()};
 this.snapshot.pending=this.snapshot.pending.filter(p=>!data.assessments.some(a=>a.id===p.assessment.id&&a.mutationId===p.assessment.mutationId));this.mergePending();await this.persist();this.emit();return structuredClone(this.snapshot.data);}
 async call<T>(body?:unknown):Promise<T>{if(!body)return await this.load() as T;const b=body as {action:string;assessment?:Assessment};if(b.action!=='save'){if(!this.connected())throw Error('Tindakan pentadbiran memerlukan internet.');const d=await this.transport<T>('/api/data',b,this.session.memberId);await this.load();this.changed();return d;}
 if(!this.connected()&&this.snapshot&&this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Tempoh offline tamat. Sambungkan internet dan log masuk semula.');
 const a={...b.assessment!,mutationId:crypto.randomUUID()};if(a.status==='submitted'){
  if(!this.connected())throw Error('Sambungkan internet untuk menghantar penilaian rasmi.');if(this.snapshot?.pending.some(p=>p.assessment.id===a.id))throw Error('Selaraskan draf peranti dahulu sebelum menghantar penilaian rasmi.');
  const d=await this.transport<{assessment:Assessment}>('/api/data',{action:'save',assessment:a},this.session.memberId);this.apply(d.assessment);await this.persist();this.changed();return d as T;
 }
 if(!this.key){if(!this.connected())throw Error('Aktifkan mod offline semasa online sebelum menyimpan pada peranti.');const d=await this.transport<{assessment:Assessment}>('/api/data',{action:'save',assessment:a},this.session.memberId);this.apply(d.assessment);this.changed();return d as T;}
 if(!this.snapshot)throw Error('Data peranti belum tersedia.');
 const id=a.id||[a.teacherId,a.year,a.stage,...(a.epoch?[a.epoch]:[])].join(':'),old=this.snapshot.pending.find(p=>p.assessment.id===id);const local={...a,id,revision:old?.assessment.revision??a.revision,updatedAt:new Date().toISOString(),localPending:true};
 const entry:PendingDraft={assessment:local,teacherName:this.snapshot.data.teachers.find(t=>t.id===a.teacherId)?.name||'Guru'};
 this.snapshot.pending=[...this.snapshot.pending.filter(p=>p.assessment.id!==id),entry];this.apply(local);await this.persist();this.changed();
 if(this.connected())try{await this.sync();}catch(e){this.message=(e as Error).message;this.emit();}const pending=this.snapshot.pending.find(p=>p.assessment.id===id);if(pending?.error&&pending.server)throw new RequestError(pending.error,409,{assessment:pending.server});
 return {assessment:this.snapshot.data.assessments.find(x=>x.id===id)||local} as T;
 }
 apply(a:Assessment){if(!this.snapshot)return;this.snapshot.data.assessments=[...this.snapshot.data.assessments.filter(x=>x.id!==a.id),a];}
 strengthPending(){return this.snapshot?.strengthPending??[];}
 strengthOverlay(bundle:StrengthBundle){const copy=structuredClone(bundle);for(const pending of this.strengthPending().filter(p=>p.year===bundle.year)){const r=copy.records.find(r=>r.aspect===pending.aspect);if(r&&r.canRead)r.data=structuredClone(pending.data);}return copy;}
 async rememberStrength(bundle:StrengthBundle){if(bundle.sessionId!==this.session.memberId)throw Error('Akaun berubah. Log masuk semula.');if(this.snapshot){this.snapshot.strengthCache??={};this.snapshot.strengthCache[String(bundle.year)]=structuredClone(bundle);await this.persist();}this.emit();return this.strengthOverlay(bundle);}
 async strengthCall(body:Record<string,unknown>):Promise<StrengthBundle>{
  const year=body.year;if(!validYear(year))throw Error('Tahun tidak sah.');if(!this.snapshot&&this.connected())await this.load();
  if(body.action==='load'){
   if(this.connected())try{return await this.rememberStrength(await this.transport<StrengthBundle>('/api/strength',body,this.session.memberId));}catch(e){if(!(e instanceof RequestError)||e.status!==0)throw e;}
   if(!this.key||!this.snapshot||this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Log masuk online dan aktifkan draf offline dahulu.');const cached=this.snapshot.strengthCache?.[String(year)];if(!cached)throw Error('Buka Kekuatan Kami untuk tahun ini semasa online dahulu.');return this.strengthOverlay(cached);
  }
  if(body.action!=='save'){
   if(body.action==='reset-all'&&this.strengthPending().some(p=>p.year===year))throw Error('Selaraskan semua draf tahun ini sebelum reset.');
   if(!this.connected())throw Error('Penugasan, penghantaran dan pengesahan memerlukan internet.');if(this.strengthPending().some(p=>p.year===year&&p.aspect===body.aspect))throw Error('Selaraskan draf aspek ini dahulu.');return this.rememberStrength(await this.transport<StrengthBundle>('/api/strength',body,this.session.memberId));
  }
  if(!validAspect(body.aspect))throw Error('Aspek tidak sah.');const data=cleanStrengthData(body.aspect,body.data);
  if(!this.key){if(!this.connected())throw Error('Aktifkan draf offline semasa online sebelum menyimpan pada peranti.');return this.rememberStrength(await this.transport<StrengthBundle>('/api/strength',{...body,data,mutationId:crypto.randomUUID()},this.session.memberId));}
  if(!this.snapshot||this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Tempoh offline tamat. Log masuk semula.');const cached=this.snapshot.strengthCache?.[String(year)],r=cached?.records.find(r=>r.aspect===body.aspect);if(!r?.canEdit)throw Error('Aspek ini tidak boleh diedit dalam salinan peranti.');
  const old=this.strengthPending().find(p=>p.year===year&&p.aspect===body.aspect),pending:PendingStrength={year,aspect:body.aspect,revision:old?.revision??Number(body.revision),data,mutationId:crypto.randomUUID()};this.snapshot.strengthPending=[...this.strengthPending().filter(p=>p.year!==year||p.aspect!==body.aspect),pending];await this.persist();this.emit();if(this.connected())await this.syncStrength();return this.strengthOverlay(this.snapshot.strengthCache![String(year)]);
 }
 async syncStrength(){if(this.strengthSyncing)return this.strengthSyncing;this.strengthSyncing=this.flushStrength();try{await this.strengthSyncing;}finally{this.strengthSyncing=null;}}
 async flushStrength(){
  if(!this.connected()||!this.snapshot||!this.key)return;
  for(const entry of [...this.strengthPending()]){if(entry.error)continue;try{const bundle=await this.transport<StrengthBundle>('/api/strength',{action:'save',...entry},this.session.memberId);const current=this.strengthPending().find(p=>p.year===entry.year&&p.aspect===entry.aspect);if(current?.mutationId===entry.mutationId)this.snapshot.strengthPending=this.strengthPending().filter(p=>p!==current);else if(current){const r=bundle.records.find(r=>r.aspect===entry.aspect);if(r)current.revision=r.revision;}await this.rememberStrength(bundle);}catch(e){const current=this.strengthPending().find(p=>p.mutationId===entry.mutationId);if(current&&e instanceof RequestError&&e.status!==0){current.error=e.message;await this.persist();}if(e instanceof RequestError&&e.status===0)break;this.message=(e as Error).message;}}
  this.emit();
 }
 async discardStrength(year:number,aspect:string){if(!this.snapshot)return;this.snapshot.strengthPending=this.strengthPending().filter(p=>p.year!==year||p.aspect!==aspect);await this.persist();this.emit();}
 managementPending(){return this.snapshot?.managementPending??[];}
 managementOverlay(bundle:ManagementBundle){const copy=structuredClone(bundle);for(const pending of this.managementPending().filter(p=>p.year===bundle.year)){const r=copy.records.find(r=>r.aspect===pending.aspect);if(r&&r.canRead)r.data=structuredClone(pending.data);}return copy;}
 async rememberManagement(bundle:ManagementBundle){if(bundle.sessionId!==this.session.memberId)throw Error('Akaun berubah. Log masuk semula.');if(this.snapshot){this.snapshot.managementCache??={};this.snapshot.managementCache[String(bundle.year)]=structuredClone(bundle);await this.persist();}this.emit();return this.managementOverlay(bundle);}
 async managementCall(body:Record<string,unknown>):Promise<ManagementBundle>{
  const year=body.year;if(!validManagementYear(year))throw Error('Tahun tidak sah.');if(!this.snapshot&&this.connected())await this.load();
  if(body.action==='load'){
   if(this.connected())try{return await this.rememberManagement(await this.transport<ManagementBundle>('/api/management',body,this.session.memberId));}catch(e){if(!(e instanceof RequestError)||e.status!==0)throw e;}
   if(!this.key||!this.snapshot||this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Log masuk online dan aktifkan draf offline dahulu.');const cached=this.snapshot.managementCache?.[String(year)];if(!cached)throw Error('Buka Pengurusan Kami untuk tahun ini semasa online dahulu.');return this.managementOverlay(cached);
  }
  if(body.action!=='save'){
   if(body.action==='reset-all'&&this.strengthPending().some(p=>p.year===year))throw Error('Selaraskan semua draf tahun ini sebelum reset.');
   if(!this.connected())throw Error('Penugasan, penghantaran dan pengesahan memerlukan internet.');if(this.managementPending().some(p=>p.year===year&&p.aspect===body.aspect))throw Error('Selaraskan draf aspek ini dahulu.');return this.rememberManagement(await this.transport<ManagementBundle>('/api/management',body,this.session.memberId));
  }
  if(!validManagementUnit(body.aspect))throw Error('Aspek tidak sah.');const data=cleanManagementData(body.aspect,body.data);
  if(!this.key){if(!this.connected())throw Error('Aktifkan draf offline semasa online sebelum menyimpan pada peranti.');return this.rememberManagement(await this.transport<ManagementBundle>('/api/management',{...body,data,mutationId:crypto.randomUUID()},this.session.memberId));}
  if(!this.snapshot||this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Tempoh offline tamat. Log masuk semula.');const cached=this.snapshot.managementCache?.[String(year)],r=cached?.records.find(r=>r.aspect===body.aspect);if(!r?.canEdit)throw Error('Aspek ini tidak boleh diedit dalam salinan peranti.');
  const old=this.managementPending().find(p=>p.year===year&&p.aspect===body.aspect),pending:PendingManagement={year,aspect:body.aspect,revision:old?.revision??Number(body.revision),data,mutationId:crypto.randomUUID()};this.snapshot.managementPending=[...this.managementPending().filter(p=>p.year!==year||p.aspect!==body.aspect),pending];await this.persist();this.emit();if(this.connected())await this.syncManagement();return this.managementOverlay(this.snapshot.managementCache![String(year)]);
 }
 async syncManagement(){if(this.managementSyncing)return this.managementSyncing;this.managementSyncing=this.flushManagement();try{await this.managementSyncing;}finally{this.managementSyncing=null;}}
 async flushManagement(){
  if(!this.connected()||!this.snapshot||!this.key)return;
  for(const entry of [...this.managementPending()]){if(entry.error)continue;try{const bundle=await this.transport<ManagementBundle>('/api/management',{action:'save',...entry},this.session.memberId);const current=this.managementPending().find(p=>p.year===entry.year&&p.aspect===entry.aspect);if(current?.mutationId===entry.mutationId)this.snapshot.managementPending=this.managementPending().filter(p=>p!==current);else if(current){const r=bundle.records.find(r=>r.aspect===entry.aspect);if(r)current.revision=r.revision;}await this.rememberManagement(bundle);}catch(e){const current=this.managementPending().find(p=>p.mutationId===entry.mutationId);if(current&&e instanceof RequestError&&e.status!==0){current.error=e.message;await this.persist();}if(e instanceof RequestError&&e.status===0)break;this.message=(e as Error).message;}}
  this.emit();
 }
 async discardManagement(year:number,aspect:string){if(!this.snapshot)return;this.snapshot.managementPending=this.managementPending().filter(p=>p.year!==year||p.aspect!==aspect);await this.persist();this.emit();}
 achievementPending(){return this.snapshot?.achievementPending??[];}
 achievementOverlay(bundle:AchievementBundle){const copy=structuredClone(bundle);for(const pending of this.achievementPending().filter(p=>p.year===bundle.year)){const r=copy.records.find(r=>r.aspect===pending.aspect);if(r&&r.canRead)r.data=structuredClone(pending.data);}return copy;}
 async rememberAchievement(bundle:AchievementBundle){if(bundle.sessionId!==this.session.memberId)throw Error('Akaun berubah. Log masuk semula.');if(this.snapshot){this.snapshot.achievementCache??={};this.snapshot.achievementCache[String(bundle.year)]=structuredClone(bundle);await this.persist();}this.emit();return this.achievementOverlay(bundle);}
 async achievementCall(body:Record<string,unknown>):Promise<AchievementBundle>{
  const year=body.year;if(!validAchievementYear(year))throw Error('Tahun tidak sah.');if(!this.snapshot&&this.connected())await this.load();
  if(body.action==='load'){
   if(this.connected())try{return await this.rememberAchievement(await this.transport<AchievementBundle>('/api/achievement',body,this.session.memberId));}catch(e){if(!(e instanceof RequestError)||e.status!==0)throw e;}
   if(!this.key||!this.snapshot||this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Log masuk online dan aktifkan draf offline dahulu.');const cached=this.snapshot.achievementCache?.[String(year)];if(!cached)throw Error('Buka Pencapaian Kami untuk tahun ini semasa online dahulu.');return this.achievementOverlay(cached);
  }
  if(body.action!=='save'){
   if(body.action==='reset-all'&&this.strengthPending().some(p=>p.year===year))throw Error('Selaraskan semua draf tahun ini sebelum reset.');
   if(!this.connected())throw Error('Penugasan, penghantaran dan pengesahan memerlukan internet.');if(this.achievementPending().some(p=>p.year===year&&p.aspect===body.aspect))throw Error('Selaraskan draf aspek ini dahulu.');return this.rememberAchievement(await this.transport<AchievementBundle>('/api/achievement',body,this.session.memberId));
  }
  if(!validAchievement(body.aspect))throw Error('Aspek tidak sah.');const data=cleanAchievementData(body.aspect,body.data);
  if(!this.key){if(!this.connected())throw Error('Aktifkan draf offline semasa online sebelum menyimpan pada peranti.');return this.rememberAchievement(await this.transport<AchievementBundle>('/api/achievement',{...body,data,mutationId:crypto.randomUUID()},this.session.memberId));}
  if(!this.snapshot||this.snapshot.offlineUntil<=new Date().toISOString())throw Error('Tempoh offline tamat. Log masuk semula.');const cached=this.snapshot.achievementCache?.[String(year)],r=cached?.records.find(r=>r.aspect===body.aspect);if(!r?.canEdit)throw Error('Aspek ini tidak boleh diedit dalam salinan peranti.');
  const old=this.achievementPending().find(p=>p.year===year&&p.aspect===body.aspect),pending:PendingAchievement={year,aspect:body.aspect,revision:old?.revision??Number(body.revision),data,mutationId:crypto.randomUUID()};this.snapshot.achievementPending=[...this.achievementPending().filter(p=>p.year!==year||p.aspect!==body.aspect),pending];await this.persist();this.emit();if(this.connected())await this.syncAchievement();return this.achievementOverlay(this.snapshot.achievementCache![String(year)]);
 }
 async syncAchievement(){if(this.achievementSyncing)return this.achievementSyncing;this.achievementSyncing=this.flushAchievement();try{await this.achievementSyncing;}finally{this.achievementSyncing=null;}}
 async flushAchievement(){
  if(!this.connected()||!this.snapshot||!this.key)return;
  for(const entry of [...this.achievementPending()]){if(entry.error)continue;try{const bundle=await this.transport<AchievementBundle>('/api/achievement',{action:'save',...entry},this.session.memberId);const current=this.achievementPending().find(p=>p.year===entry.year&&p.aspect===entry.aspect);if(current?.mutationId===entry.mutationId)this.snapshot.achievementPending=this.achievementPending().filter(p=>p!==current);else if(current){const r=bundle.records.find(r=>r.aspect===entry.aspect);if(r)current.revision=r.revision;}await this.rememberAchievement(bundle);}catch(e){const current=this.achievementPending().find(p=>p.mutationId===entry.mutationId);if(current&&e instanceof RequestError&&e.status!==0){current.error=e.message;await this.persist();}if(e instanceof RequestError&&e.status===0)break;this.message=(e as Error).message;}}
  this.emit();
 }
 async discardAchievement(year:number,aspect:string){if(!this.snapshot)return;this.snapshot.achievementPending=this.achievementPending().filter(p=>p.year!==year||p.aspect!==aspect);await this.persist();this.emit();}
 async sync(){if(this.syncing)return this.syncing;if(!this.connected()||!this.snapshot||!this.key)return;this.syncing=this.flush();this.emit();try{await this.syncing;}finally{this.syncing=null;this.emit();}}
 async flush(){if(!this.snapshot)return;const identity=await this.transport<{session:AppSession|null}>('/api/session');if(identity.session?.memberId!==this.session.memberId||identity.session.schoolId!==this.session.schoolId){this.message='Log masuk semula ke akaun yang sama untuk menyelaraskan draf.';this.emit();return;}
 for(const id of [...new Set(this.snapshot.pending.map(p=>p.assessment.id))]){let turns=0;while(turns++<10){const entry=this.snapshot.pending.find(p=>p.assessment.id===id);if(!entry||entry.error)break;const sent=structuredClone(entry.assessment);try{const d=await this.transport<{assessment:Assessment}>('/api/data',{action:'save',assessment:{...sent,status:'draft'}},this.session.memberId);const current=this.snapshot.pending.find(p=>p.assessment.id===id);if(current?.assessment.mutationId===sent.mutationId){this.snapshot.pending=this.snapshot.pending.filter(p=>p!==current);this.apply(d.assessment);}else if(current){current.assessment.revision=d.assessment.revision;this.apply(current.assessment);}this.snapshot.savedAt=new Date().toISOString();await this.persist();this.changed();}catch(e){const current=this.snapshot.pending.find(p=>p.assessment.id===id);if(e instanceof RequestError&&e.status!==0&&current){current.error=e.message;current.server=(e.data.assessment as Assessment|null)??null;await this.persist();}this.message=(e as Error).message;this.emit();break;}}}
 await this.syncStrength();await this.syncManagement();await this.syncAchievement();if(!this.snapshot.pending.length&&!this.strengthPending().length&&!this.managementPending().length&&!this.achievementPending().length)this.message='Semua draf telah diselaraskan.';await this.load();this.changed();}
 async resolve(id:string,useDevice:boolean){const p=this.snapshot?.pending.find(p=>p.assessment.id===id);if(!p||!this.snapshot)return;if(useDevice){if(!p.server||p.server.status==='submitted')throw Error('Rekod pelayan dikunci atau tidak tersedia. Hubungi Admin.');p.assessment={...p.assessment,revision:p.server.revision,mutationId:crypto.randomUUID()};delete p.error;delete p.server;this.apply(p.assessment);await this.persist();await this.sync();}else{this.snapshot.pending=this.snapshot.pending.filter(x=>x!==p);if(p.server)this.apply(p.server);else this.snapshot.data.assessments=this.snapshot.data.assessments.filter(x=>x.id!==id);await this.persist();await this.load();this.changed();}}
 lock(){this.key=null;this.meta=null;this.snapshot=null;this.listeners.clear();}
}
let controller:OfflineEngine|null=null;
export function configureClient(engine:OfflineEngine|null){controller=engine;}
export async function appApi<T=AppData>(body?:unknown):Promise<T>{if(!controller)throw Error('Sila log masuk dahulu.');return controller.call<T>(body);}
export function clientMayWrite(s:AppSession,teachers:AppData['teachers'],teacher:AppData['teachers'][number],stage:string){if(s.isAdmin)return true;if(stage==='kendiri')return teacher.id===s.teacherId;const own=teachers.find(t=>t.id===s.teacherId);return !!own&&(stage==='pertama'?teacher.pp1:teacher.pp2).trim().toUpperCase()===own.name.trim().toUpperCase();}

export function strengthApi(body:Record<string,unknown>):Promise<StrengthBundle>{if(!controller)throw Error('Sila log masuk dahulu.');return controller.strengthCall(body);}
export function strengthPending(){return controller?.strengthPending()??[];}
export async function discardStrengthDraft(year:number,aspect:string){if(!controller)throw Error('Sila log masuk dahulu.');await controller.discardStrength(year,aspect);}
export async function syncStrengthDrafts(){if(!controller)throw Error('Sila log masuk dahulu.');await controller.sync();}
export function subscribeStrength(listener:()=>void){return controller?.subscribe(listener)??(()=>undefined);}

export function managementApi(body:Record<string,unknown>):Promise<ManagementBundle>{if(!controller)throw Error('Sila log masuk dahulu.');return controller.managementCall(body);}
export function managementPending(){return controller?.managementPending()??[];}
export async function discardManagementDraft(year:number,aspect:string){if(!controller)throw Error('Sila log masuk dahulu.');await controller.discardManagement(year,aspect);}
export async function syncManagementDrafts(){if(!controller)throw Error('Sila log masuk dahulu.');await controller.sync();}
export function subscribeManagement(listener:()=>void){return controller?.subscribe(listener)??(()=>undefined);}

export function achievementApi(body:Record<string,unknown>):Promise<AchievementBundle>{if(!controller)throw Error('Sila log masuk dahulu.');return controller.achievementCall(body);}
export function achievementPending(){return controller?.achievementPending()??[];}
export async function discardAchievementDraft(year:number,aspect:string){if(!controller)throw Error('Sila log masuk dahulu.');await controller.discardAchievement(year,aspect);}
export async function syncAchievementDrafts(){if(!controller)throw Error('Sila log masuk dahulu.');await controller.sync();}
export function subscribeAchievement(listener:()=>void){return controller?.subscribe(listener)??(()=>undefined);}

export async function resourcesApi<T>(body:Record<string,unknown>):Promise<T>{if(!controller)throw Error('Sila log masuk dahulu.');if(!controller.connected())throw Error('Tetapan, tugasan dan muat naik evidens memerlukan internet.');return controller.transport<T>('/api/resources',body,controller.session.memberId);}
