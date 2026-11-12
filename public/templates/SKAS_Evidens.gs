// SK@S: one deployment per school. Download a school-specific copy from Tetapan evidens.
// Do not publish this code or its secret. Deploy Web app: Execute as Me, access Anyone.
// Anonymous calls cannot upload: every request requires a server-generated HMAC signature.
const SKAS_CONFIG = {schoolCode:'REPLACE_SCHOOL_CODE',secret:'REPLACE_SECRET',roots:{}};

function doPost(e) {
 try {
  const envelope=JSON.parse(e.postData.contents),payload=envelope.payload;
  if(typeof payload!=='string'||payload.length>7100000||typeof envelope.signature!=='string')throw Error('Permintaan tidak sah.');
  const signature=Utilities.computeHmacSha256Signature(payload,SKAS_CONFIG.secret,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
  let mismatch=signature.length^envelope.signature.length;
  for(let i=0;i<signature.length;i++)mismatch|=signature.charCodeAt(i)^envelope.signature.charCodeAt(i);
  if(mismatch)throw Error('Tandatangan permintaan tidak sah.');
  const p=JSON.parse(payload);
  if(p.schoolCode!==SKAS_CONFIG.schoolCode||!Number.isFinite(p.timestamp)||Math.abs(Date.now()-p.timestamp)>300000)throw Error('Sekolah atau tempoh permintaan tidak sah.');
  const roots=SKAS_CONFIG.roots||{};
  if(p.operation==='test') {
   const configured=Object.entries(p.roots).filter(([module,id])=>id);
   if(!configured.length)throw Error('Tetapkan sekurang-kurangnya satu folder modul.');
   configured.forEach(([module,id])=>{if(roots[module]!==id)throw Error('Folder '+module+' berbeza daripada skrip. Muat turun dan deploy semula skrip.');DriveApp.getFolderById(id).getName();});
   return json_({ok:true,message:'Sambungan dan folder sekolah berjaya disemak.'});
  }
  if(p.operation!=='upload'||!roots[p.module]||roots[p.module]!==p.root)throw Error('Folder modul tidak dibenarkan.');
  if(!/^[a-zA-Z0-9-]{10,80}$/.test(p.uploadId)||!Number.isInteger(p.year)||p.year<2020||p.year>2100||! /^[a-zA-Z0-9._-]{1,80}$/.test(p.aspect))throw Error('Konteks skor tidak sah.');
  const ext=p.name.split('.').pop().toLowerCase(),types={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',txt:'text/plain',csv:'text/csv',odt:'application/vnd.oasis.opendocument.text',ods:'application/vnd.oasis.opendocument.spreadsheet',odp:'application/vnd.oasis.opendocument.presentation'};
  if(!types[ext]||! /^[a-zA-Z0-9._()\-]{1,180}$/.test(p.name)||p.size<1||p.size>5242880||typeof p.base64!=='string'||p.base64.length>6990508)throw Error('Fail tidak disokong atau melebihi 5 MB.');
  const bytes=Utilities.base64Decode(p.base64);if(bytes.length!==p.size)throw Error('Saiz fail berbeza.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw Error('Sesi muat naik sibuk. Cuba semula.');
  try {
   let folder=DriveApp.getFolderById(p.root);
   // Always isolate by school, even when multiple schools share the same root folder.
   folder=child_(folder,SKAS_CONFIG.schoolCode);
   if(!p.moduleRoot)folder=child_(folder,{strength:'Evidens Kekuatan Kami',management:'Evidens Pengurusan Kami',achievement:'Evidens Pencapaian Kami',standard4:'Evidens Standard 4 — Pencerapan'}[p.module]);
   folder=child_(child_(folder,String(p.year)),p.aspect);
   const files=folder.getFilesByName(p.name);
   while(files.hasNext()){const old=files.next();if(old.getDescription()==='SKAS:'+p.uploadId)return json_({ok:true,fileId:old.getId(),name:old.getName()});}
   const file=folder.createFile(Utilities.newBlob(bytes,types[ext],p.name));file.setDescription('SKAS:'+p.uploadId);
   // Preserve folder permissions. Never enable public/link sharing.
   return json_({ok:true,fileId:file.getId(),name:file.getName()});
  } finally {lock.releaseLock();}
 } catch(error) {return json_({ok:false,error:String(error.message||error).slice(0,300)});}
}
function child_(parent,name){const found=parent.getFoldersByName(name);return found.hasNext()?found.next():parent.createFolder(name);}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
