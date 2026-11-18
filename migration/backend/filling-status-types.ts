export type FillingState='empty'|'working'|'done';
export type FillingTab='management'|'subjects'|'clubs'|'uniforms'|'sports';
export type FillingRow={id:string;tab:FillingTab;aspect:string;title:string;unit:string;pps:string[];state:FillingState;evidence:boolean;filled:number;expected:number;updatedAt:string|null;workflow:string;configurationMissing?:boolean};
export type FillingSchool={id:string;code:string;name:string};
export type FillingBundle={year:number;school:FillingSchool;rows:FillingRow[];fetchedAt:string};
export const FILLING_TABS=[{id:'management',name:'Pengurusan'},{id:'subjects',name:'Panitia Mata Pelajaran'},{id:'clubs',name:'Kelab / Persatuan'},{id:'uniforms',name:'Badan Beruniform'},{id:'sports',name:'Sukan / Permainan'}] as const;
export const FILLING_LABELS={empty:'Belum mengisi',working:'Sedang mengisi',done:'Selesai'};
