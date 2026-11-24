(()=>{
const duration=ms=>{const seconds=Math.max(0,Math.round(ms/1000));return seconds<60?seconds+' saat':Math.floor(seconds/60)+' min '+(seconds%60)+' saat';};
function view(s,now=Date.now()){
 const total=Math.max(0,Number(s?.total)||0),processed=Math.min(total,Math.max(0,Number(s?.processed)||0)),records=s?.records?.length||0,errors=s?.errors?.length||0;
 const elapsed=s?.startedAt?Math.max(0,(s.finishedAt||now)-s.startedAt):0,listing=!!s?.running&&(s.phase==='listing'||!total);
 const part=s?.phase==='reading'?Math.min(8,Math.max(0,Number(s.subaspects)||0))/8:0,work=Math.min(total,processed+part);
 const percent=listing?null:!s?0:s.phase==='done'?100:total?Math.min(s.running?99:100,Math.floor(work/total*100)):0;
 let title=!s?'Belum bermula':listing?'Menyemak senarai guru…':s.running?'Sedang mengambil skor…':s.phase==='done'?(records?'SIAP — CSV boleh dimuat turun':'Selesai — tiada rekod boleh dieksport'):s.phase==='stopped'?'Dihentikan — hasil yang siap dikekalkan':s.failed?'Bacaan terhenti — semak amaran':records?'CSV boleh dimuat turun':'Belum bermula';
 const stale=!!s?.running&&!!s.updatedAt&&now-s.updatedAt>30000;
 if(stale)title='Menunggu respons MOEIS…';
 const eta=s?.running&&!listing&&!stale&&processed>=1&&work>0&&elapsed>0?'Anggaran berbaki: '+duration(elapsed/work*(total-work)):s?.running?'Anggaran masa belum tersedia':'';
 const detail=listing?`${s?.pagesRead||0} halaman diperiksa · ${total} guru berpautan ditemui`:total?`${processed} / ${total} guru berpautan diperiksa · ${records} rekod tersedia`:records?`${records} rekod tersedia`:'';
 return {percent,title,detail,eta,elapsed:elapsed?'Masa berlalu: '+duration(elapsed):'',current:s?.currentTeacher?`${s.currentTeacher} · ${s.subaspects||0}/8 subaspek · ${s.itemCount||0}/38 item`:'',warnings:errors?`${errors} amaran — rekod tanpa pautan / gagal dibaca disenaraikan di bawah`:'',ready:!s?.running&&records>0,stale};
}
globalThis.SKASProgress={view};
})();
