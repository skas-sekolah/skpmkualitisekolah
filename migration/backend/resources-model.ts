export type EvidenceModule='strength'|'management'|'achievement'|'standard4';
export const evidenceModules:EvidenceModule[]=['strength','management','achievement','standard4'];
export const evidenceModuleLabels:Record<EvidenceModule,string>={strength:'Evidens Kekuatan Kami',management:'Evidens Pengurusan Kami',achievement:'Evidens Pencapaian Kami',standard4:'Evidens Standard 4 — Pencerapan'};
export type DriveSettings={revision:number;folderUrl:string;moduleFolders?:Partial<Record<EvidenceModule,string>>;clientId:string;apiKey:string;projectNumber:string;updatedAt:string|null;uploadMethod?:'google'|'apps-script';scriptUrl?:string;scriptConfigured?:boolean};
export const evidenceFolder=(settings:DriveSettings,module:EvidenceModule)=>settings.moduleFolders?.[module]||settings.folderUrl||'';
export const googleConnectionReady=(settings:DriveSettings)=>!!(settings.clientId&&settings.apiKey&&settings.projectNumber);
export const scriptConnectionReady=(s:DriveSettings)=>!!(s.uploadMethod==='apps-script'&&s.scriptUrl&&s.scriptConfigured);
export const uploadConnectionReady=(s:DriveSettings)=>s.uploadMethod==='apps-script'?scriptConnectionReady(s):googleConnectionReady(s);
export type AchievementPSS={id:string;standard:string;title:string;memberIds:string[]};
export const schoolChoiceName=(value:string)=>value.normalize('NFKC').replace(/\s+/gu,' ').trim();
export const schoolChoiceKey=(value:string)=>schoolChoiceName(value).toLocaleUpperCase('ms-MY');
export function inspectSchoolChoices(values:unknown[],label:string){
 const names:string[]=[],duplicates:string[]=[],errors:string[]=[],seen=new Set<string>(),repeated=new Set<string>();
 for(const value of values){
  if(typeof value!=='string'){errors.push(label+': nama mestilah teks.');continue;}
  const name=schoolChoiceName(value);if(!name)continue;
  if(name.length>200){errors.push(label+': nama melebihi 200 aksara.');continue;}
  const key=schoolChoiceKey(name);if(seen.has(key)){if(!repeated.has(key))duplicates.push(name);repeated.add(key);}else{seen.add(key);names.push(name);}
 }
 if(names.length>200)errors.push(label+': maksimum 200 nama unik.');
 return {names,duplicates,errors};
}

export function pdpcEvidenceCode(name:string,stage:string){
 const prefix=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').match(/[A-Za-z0-9]+/g)?.map(word=>word[0].toUpperCase()+word.slice(1).toLowerCase()).join('').slice(0,120)||'Guru';
 const suffix:Record<string,string>={kendiri:'Kendiri',pertama:'Pencerapan1',kedua:'Pencerapan2'};
 if(!suffix[stage])throw Error('Jenis penilaian tidak sah.');
 return prefix+suffix[stage];
}

const uploadTypes:Record<string,string>={
 'application/pdf':'pdf','image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp',
 'application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx',
 'application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx',
 'application/vnd.ms-powerpoint':'ppt','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx',
 'text/plain':'txt','text/csv':'csv','application/csv':'csv',
 'application/vnd.oasis.opendocument.text':'odt','application/vnd.oasis.opendocument.spreadsheet':'ods','application/vnd.oasis.opendocument.presentation':'odp'
};
export function evidenceUploadExtension(file:{name:string;type:string;size:number},method?:string){
 const max=method==='apps-script'?5:20;
 if(file.size<1)throw Error('Fail "'+file.name+'" kosong atau belum dapat dibaca daripada Google Drive. Muat turun fail ke peranti dan pilih semula.');
 if(file.size>max*1024*1024)throw Error('Fail "'+file.name+'" melebihi had '+max+' MB'+(method==='apps-script'?' untuk sambungan Apps Script':'')+'.');
 const suffix=/\.([a-z0-9]+)$/i.exec(file.name.trim())?.[1].toLowerCase();
 if(suffix&&['pdf','jpg','jpeg','png','webp','doc','docx','xls','xlsx','ppt','pptx','txt','csv','odt','ods','odp'].includes(suffix))return suffix;
 const mime=file.type.toLowerCase().split(';')[0].trim();
 if(uploadTypes[mime])return uploadTypes[mime];
 throw Error('Jenis fail "'+file.name+'" tidak dapat dikenal pasti. Gunakan PDF, JPG, PNG atau dokumen pejabat; pastikan nama mempunyai sambungan seperti .pdf atau .jpg.');
}
