import {resourcesApi} from './app-client';
import {evidenceUploadExtension,evidenceFolder,googleConnectionReady,scriptConnectionReady,type DriveSettings,type EvidenceModule} from '../migration/backend/resources-model';
export type {EvidenceModule};
const g=()=>window as unknown as {google:any;gapi:any};
const loaders=new Map<string,Promise<void>>();
function script(src:string){let p=loaders.get(src);if(!p){p=new Promise<void>((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>resolve();s.onerror=()=>{loaders.delete(src);s.remove();reject(Error('Google belum dapat dimuatkan. Semak sambungan.'));};document.head.appendChild(s);});loaders.set(src,p);}return p;}
export const resourcesAPI=<T=any>(body:Record<string,unknown>)=>resourcesApi<T>(body);
export async function preloadDrive(){await Promise.all([script('https://accounts.google.com/gsi/client'),script('https://apis.google.com/js/api.js')]);}
export async function driveToken(settings:DriveSettings){if(!settings.clientId)throw Error('Admin perlu menyediakan sambungan Google Drive dahulu.');await script('https://accounts.google.com/gsi/client');return new Promise<string>((resolve,reject)=>{g().google.accounts.oauth2.initTokenClient({client_id:settings.clientId,scope:'https://www.googleapis.com/auth/drive.file',callback:(r:any)=>r.error?reject(Error('Kebenaran Google tidak diberikan.')):resolve(r.access_token),error_callback:()=>reject(Error('Sambungan Google dibatalkan atau tetingkap disekat.'))}).requestAccessToken({prompt:'select_account'});});}
async function drive(token:string,path:string,init:RequestInit={}){const r=await fetch('https://www.googleapis.com/drive/v3/'+path,{...init,headers:{Authorization:'Bearer '+token,...init.headers},signal:AbortSignal.timeout(60000)});if(!r.ok){let message='Google Drive tidak dapat melengkapkan tindakan ('+r.status+').';try{const d=await r.json();if(d.error?.message)message+=' '+d.error.message;}catch{}throw Error(message);}return r.json();}
export async function chooseDriveFolder(settings:DriveSettings,token?:string){const access=token??await driveToken(settings);await script('https://apis.google.com/js/api.js');await new Promise<void>((resolve,reject)=>g().gapi.load('picker',{callback:resolve,onerror:()=>reject(Error('Google Picker tidak dapat dimuatkan.'))}));return new Promise<{id:string;url:string}>((resolve,reject)=>{const p=g().google.picker,view=new p.DocsView(p.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);new p.PickerBuilder().addView(view).setOAuthToken(access).setDeveloperKey(settings.apiKey).setAppId(settings.projectNumber).setOrigin(window.location.origin).setCallback((data:any)=>{if(data.action===p.Action.PICKED){const id=data.docs?.[0]?.id;if(!id)reject(Error('Folder tidak sah.'));else resolve({id,url:'https://drive.google.com/drive/folders/'+id});}if(data.action===p.Action.CANCEL)reject(Error('Pemilihan folder dibatalkan.'));}).build().setVisible(true);});}
async function ensureFolder(token:string,meta:{id:string;parent:string;name:string}){
 const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(meta.id)+'?fields=id,name,mimeType,parents&supportsAllDrives=true';
 let r=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
 if(r.status===404){r=await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType,parents',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({id:meta.id,name:meta.name,mimeType:'application/vnd.google-apps.folder',parents:[meta.parent]}),signal:AbortSignal.timeout(30000)});if(r.status===409)r=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});}
 if(!r.ok)throw Error('Folder evidens belum dapat disediakan. Semak akses Google Drive dan cuba semula.');const saved=await r.json();if(saved.mimeType!=='application/vnd.google-apps.folder'||!saved.parents?.includes(meta.parent))throw Error('Folder evidens tidak sepadan dengan folder sekolah.');return saved.id as string;
}
// Some Android document providers omit both suffix and MIME. Inspect only supported binary formats.
export async function prepareEvidenceFile(file:File,method?:string):Promise<File>{
 try{evidenceUploadExtension(file,method);return file;}catch(error){
  if(file.size<1||file.size>(method==='apps-script'?5:20)*1024*1024)throw error;
  let bytes:Uint8Array;try{bytes=new Uint8Array(await file.arrayBuffer());}catch{throw Error('Fail tidak dapat dibaca daripada Google Drive. Muat turun ke peranti dan pilih semula.');}
  const starts=(signature:number[])=>signature.every((v,i)=>bytes[i]===v);
  let ext='',mime='';
  if(starts([37,80,68,70,45])){ext='pdf';mime='application/pdf';}
  else if(starts([255,216,255])){ext='jpg';mime='image/jpeg';}
  else if(starts([137,80,78,71,13,10,26,10])){ext='png';mime='image/png';}
  else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){ext='webp';mime='image/webp';}
  else if(starts([80,75,3,4])){
   // Read ZIP central directory names rather than compressed document contents.
   const names:string[]=[];const view=new DataView(bytes.buffer);
   for(let i=0;i+46<=bytes.length;i++)if(view.getUint32(i,true)===0x02014b50){const n=view.getUint16(i+28,true),extra=view.getUint16(i+30,true),comment=view.getUint16(i+32,true);if(i+46+n+extra+comment>bytes.length)break;names.push(new TextDecoder().decode(bytes.slice(i+46,i+46+n)));i+=45+n+extra+comment;}
   if(names.includes('[Content_Types].xml')){
    if(names.includes('word/document.xml'))ext='docx';
    else if(names.includes('xl/workbook.xml'))ext='xlsx';
    else if(names.includes('ppt/presentation.xml'))ext='pptx';
   }
  }else if(starts([208,207,17,224,161,177,26,225])){
   const directory=new TextDecoder('utf-16le').decode(bytes);
   if(directory.includes('WordDocument\0'))ext='doc';
   else if(directory.includes('Workbook\0')||directory.includes('Book\0'))ext='xls';
   else if(directory.includes('PowerPoint Document\0'))ext='ppt';
  }
  if(!ext)throw error;
  const prepared=new File([file],file.name+'.'+ext,{type:mime||'application/octet-stream',lastModified:file.lastModified});
  evidenceUploadExtension(prepared,method);return prepared;
 }
}
export async function uploadDriveEvidence(file:File,context:{module:EvidenceModule;aspect:string;actionId?:string;unitId?:string;year:number;stage?:string;epoch?:string},settings:DriveSettings,token:string){
 file=await prepareEvidenceFile(file,'google');
 const extension=evidenceUploadExtension(file,'google');
 const {upload}=await resourcesAPI({action:'reserve-upload',...context,extension,size:file.size});
 // Opening the chosen root in Picker grants drive.file access to that folder only.
 const root=await drive(token,'files/'+encodeURIComponent(upload.root)+'?fields=id,mimeType,capabilities(canAddChildren)&supportsAllDrives=true');if(root.mimeType!=='application/vnd.google-apps.folder'||root.capabilities?.canAddChildren===false)throw Error('Akaun Google ini tidak boleh menambah fail dalam folder sekolah.');
 const generated=await drive(token,'files/generateIds?count=3&space=drive&type=files');let aspectFolder='';
 for(const [i,level] of (upload.moduleRoot?['year','aspect']:['module','year','aspect']).entries()){const meta=await resourcesAPI({action:'folder-id',year:context.year,uploadId:upload.id,level,candidate:generated.ids[i]});aspectFolder=await ensureFolder(token,meta);}
 const boundary='skas_'+crypto.randomUUID().replace(/-/g,''),mime=/^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(file.type)?file.type:'application/octet-stream';const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify({name:upload.name,parents:[aspectFolder]}),'\r\n--'+boundary+'\r\nContent-Type: '+mime+'\r\n\r\n',file,'\r\n--'+boundary+'--\r\n'],{type:'multipart/related; boundary='+boundary});
 const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Fail belum dimuat naik ('+r.status+'). Semak akses folder dan cuba semula.');const saved=await r.json();return {name:saved.name as string,url:(saved.webViewLink||'https://drive.google.com/file/d/'+saved.id+'/view') as string};
}
export async function prepareDrive(settings:DriveSettings,module:EvidenceModule){const folder=evidenceFolder(settings,module);if(!folder)throw Error('Admin belum menetapkan folder evidens modul ini.');if(!googleConnectionReady(settings))throw Error('Muat naik terus belum disambungkan. Buka folder Google Drive, muat naik fail di sana dan tambah pautan fail sebagai evidens.');const token=await driveToken(settings),picked=await chooseDriveFolder(settings,token),expected=folder.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1];if(picked.id!==expected)throw Error('Pilih folder sekolah yang sama dengan tetapan pentadbir.');return token;}

export async function uploadScriptEvidence(file:File,context:{module:EvidenceModule;aspect:string;actionId?:string;unitId?:string;year:number;stage?:string;epoch?:string}){
 file=await prepareEvidenceFile(file,'apps-script');
 const extension=evidenceUploadExtension(file,'apps-script');
 const {upload}=await resourcesAPI({action:'reserve-upload',...context,extension,size:file.size});
 const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Fail tidak dapat dibaca.'));reader.readAsDataURL(file);});
 return resourcesAPI<{name:string;url:string}>({action:'script-upload',year:context.year,uploadId:upload.id,base64});
}
