export type FinalRow={module:string;id:string;title:string;ready:boolean;status:string;score:string;issues:string[]};
export type SchoolAttestation={year:number;school:{code:string;name:string};fingerprint:string;revision:number;canAttest:boolean;ready:boolean;rows:FinalRow[];declaration:null|{at:string;by:string;name:string;fingerprint:string};current:boolean};
