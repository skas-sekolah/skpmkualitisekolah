export type UploadField={key:string;label:string;value:string|number|boolean;unit?:string};
export type UploadRecord={id:string;title:string;group?:string;status?:string;fields:UploadField[];meta?:Record<string,unknown>;scores?:Record<string,number|null>;readOnly?:boolean};
export type MoeisUploadPack={kind:'SKAS_MOEIS_UPLOAD_V1';schoolCode:string;schoolName:string;year:number;createdAt:string;modules:Record<string,{records:UploadRecord[]}>;warnings:string[]};
