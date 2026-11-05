export const PPD_MODULES=[{id:'strength',name:'Kekuatan Kami'},{id:'management',name:'Pengurusan Kami'},{id:'achievement',name:'Pencapaian Kami'},{id:'standard4',name:'Standard 4 · PdPc'}] as const;
export type PpdModule=typeof PPD_MODULES[number]['id'];
export const PPD_STATES=[{id:'empty',name:'Belum diisi',color:'#cbd5e1'},{id:'draft',name:'Draf / sedang diisi',color:'#e8b846'},{id:'returned',name:'Perlu pembetulan',color:'#d95368'},{id:'submitted',name:'Dihantar',color:'#4792d2'},{id:'verified',name:'Disahkan',color:'#269a79'}] as const;
export type PpdState=typeof PPD_STATES[number]['id'];
export type PpdCounts={expected:number;empty:number;draft:number;returned:number;submitted:number;verified:number};
export type PpdSchool={id:string;code:string;name:string;enabled:boolean;teachers:number;updatedAt:string|null;modules:Record<PpdModule,PpdCounts>};
export type PpdBundle={year:number;years:number[];schools:PpdSchool[];fetchedAt:string};
