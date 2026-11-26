(()=>{
const names={'server-confirmed':'Simpanan baharu disahkan','already-matched':'Skor sedia ada sepadan','problem-skipped':'Bermasalah','empty-skipped':'Tiada skor / rujukan',ready:'Sedia, belum disimpan'};
const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0;
function reason(s){s=String(s||'');
 if(/Sesi|sekolah|Tahun|tab was closed|No tab with id/i.test(s))return ['session','Sesi, sekolah atau tahun','Log masuk semula; semak sekolah dan tahun.'];
 if(/Kod kandungan: [\d.]+, [\d.]+|Lebih satu|Lebih daripada satu|Terlalu banyak calon/i.test(s))return ['ambiguous','Lebih satu calon / kod','Buka borang tepat melalui menu MOEIS; semak calon pautan.'];
 if(/Nombor standard|Kod kandungan/i.test(s))return ['criterion','Kod standard tidak sepadan','Semak kod pada borang MOEIS dan kod rekod sumber.'];
 if(/Tajuk standard/i.test(s))return ['heading','Tajuk standard belum disahkan','Semak tajuk kandungan; pengesan halaman mungkin memerlukan pembaikan.'];
 if(/Pautan.*tidak ditemui|nama unit tidak ditemui/i.test(s))return ['route','Pautan / nama unit tidak ditemui','Semak nama, pendaftaran unit dan halaman yang dilawati.'];
 if(/berubah selepas|berubah sejak|Identiti/i.test(s))return ['changed','Identiti / borang berubah','Muat semula borang dan semak sebelum mengisi.'];
 if(/tidak disahkan|belum sepadan/i.test(s))return ['unconfirmed','Simpanan belum disahkan','Buka semula MOEIS dan semak skor sebelum mengulang penghantaran.'];
 return ['other','Masalah lain','Baca mesej terperinci rekod ini.'];
}
function model(job){const rows=[...new Map((job?.results||[]).map((r,i)=>[r.id||'row-'+i,r])).values()],s=job?.summary||{},counts={},groups=new Map();
 for(const r of rows){counts[r.status]=(counts[r.status]||0)+1;if(r.status==='problem-skipped'){const [id,label,action]=reason(r.message);if(!groups.has(id))groups.set(id,{id,label,action,records:[],scores:0});const g=groups.get(id);g.records.push(r);g.scores+=num(r.scoreCount);}}
 const valid=rows.filter(r=>['server-confirmed','already-matched'].includes(r.status)),scores=valid.reduce((n,r)=>n+num(r.scoreCount),0),source=num(s.sourceScores),total=num(s.totalRecords),consistent=source>=scores&&total>=rows.length;
 return {rows,counts,total,source,scores,confirmedRecords:valid.length,remaining:Math.max(0,total-rows.length),percent:consistent&&source?Math.round(scores/source*10000)/100:null,consistent,groups:[...groups.values()].sort((a,b)=>b.records.length-a.records.length)};
}
function decodeReport(raw){const p=JSON.parse(raw),j=p?.batch;
 if(!j||!Array.isArray(j.results)||!j.summary||!Number.isInteger(j.summary.totalRecords)||j.summary.totalRecords<0||!Number.isFinite(j.summary.sourceScores)||j.summary.sourceScores<0||j.results.some(r=>!r||typeof r.status!=='string'||typeof r.title!=='string'||!Number.isFinite(r.scoreCount)||r.scoreCount<0))throw Error('Pilih fail SKAS-laporan-berkelompok…json.');
 if(!model(j).consistent)throw Error('Jumlah dalam laporan tidak konsisten.');return {...j,running:false,imported:true};
}
function element(d,tag,text,cls){const e=d.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;}
function render(container,job){if(!container)return;const d=container.ownerDocument,make=(tag,text,cls)=>element(d,tag,text,cls),filterValue=container.querySelector('[data-report-filter]')?.value;container.replaceChildren();
 if(!job){container.append(make('p','Belum ada laporan pengisian berkelompok.'));return;}const m=model(job);
 container.append(make('h2',job.imported?'Rumusan laporan diimport':'Rumusan pengisian berkelompok'));
 if(job.schoolCode)container.append(make('p','Sekolah '+job.schoolCode+' · Tahun '+job.year+' · Mod '+(job.mode==='review'?'semakan sahaja':'isi dan simpan')));
 if(job.updatedAt)container.append(make('p','Dikemas kini: '+new Date(job.updatedAt).toLocaleString('ms-MY')));
 const hero=make('div',undefined,'report-hero');hero.append(make('strong',m.percent===null?'—':m.percent.toLocaleString('ms-MY')+'%'),make('span','Skor disahkan pada pelayan'),make('p',m.scores+' / '+m.source+' skor sumber'));container.append(hero);
 container.append(make('p','Peratus = skor disahkan ÷ skor sumber dalam bahagian pakej pilihan. Skor kosong tidak dikira; skor 0 dikira.'));
 if(!m.source)container.append(make('p','Tiada skor sumber untuk pengiraan peratus.'));if(!m.consistent)container.append(make('p','Jumlah laporan tidak konsisten; peratus tidak dipaparkan.','report-warning'));
 const cards=make('div',undefined,'report-cards');for(const [value,label] of [[m.counts['server-confirmed']||0,'Rekod simpanan baharu disahkan'],[m.counts['already-matched']||0,'Rekod skor sedia ada sepadan'],[m.counts['problem-skipped']||0,'Rekod bermasalah'],[m.counts['empty-skipped']||0,'Rekod tiada skor / rujukan'],[m.counts.ready||0,'Rekod sedia, belum disimpan'],[m.remaining,'Rekod belum diproses']]){const card=make('div');card.append(make('strong',value),make('span',label));cards.append(card);}container.append(cards);
 container.append(make('p','Disahkan '+m.confirmedRecords+' / '+m.total+' rekod · Diproses '+m.rows.length+' / '+m.total+' rekod.'));
 container.append(make('p',job.running?'Proses sedang berjalan.':job.status==='completed'?'Proses tamat. Lihat rekod bermasalah dan belum disimpan di bawah.':'Status: '+(job.message||job.status||'Belum diketahui')));
 if(job.mode==='review'||m.counts.ready)container.append(make('p','Rekod “Sedia” hanya lulus semakan; belum dikira sebagai simpanan berjaya.','report-warning'));
 if(m.groups.length){container.append(make('h3','Pecahan masalah'));for(const g of m.groups){const details=make('details');details.append(make('summary',g.label+' — '+g.records.length+' rekod / '+g.scores+' skor'),make('p',g.action));for(const r of g.records){const entry=make('div',undefined,'report-entry');entry.append(make('strong',r.title),make('p',r.message||''));for(const c of r.candidates||[])entry.append(make('p',(c.status==='validated'?'Calon lulus: ':'Calon ditolak: ')+(c.url||'')+(c.message?' · '+c.message:'')));details.append(entry);}container.append(details);}}
 if(job.discovery?.warnings?.length){const details=make('details');details.append(make('summary','Amaran carian — '+job.discovery.warnings.length));for(const w of job.discovery.warnings)details.append(make('p',w.message||String(w)));container.append(details);}
 const label=make('label','Lihat rekod '),select=make('select');select.dataset.reportFilter='';for(const [value,text] of [['problem-skipped','Bermasalah'],['all','Semua rekod'],...Object.entries(names).filter(([k])=>k!=='problem-skipped')]){const opt=make('option',text);opt.value=value;select.append(opt);}select.value=filterValue||((m.counts['problem-skipped']||0)?'problem-skipped':'all');label.append(select);container.append(label);
 const list=make('div',undefined,'report-records');container.append(list);const draw=()=>{list.replaceChildren();const rows=m.rows.filter(r=>select.value==='all'||r.status===select.value);if(!rows.length)list.append(make('p','Tiada rekod dalam pilihan ini.'));for(const r of rows){const entry=make('div',undefined,'report-entry');entry.append(make('strong',r.title),make('p',(names[r.status]||r.status)+' · '+num(r.scoreCount)+' skor'),make('p',r.message||''));list.append(entry);}};select.addEventListener('change',draw);draw();
}
function renderSingle(container,job){if(!container)return;const d=container.ownerDocument;container.replaceChildren();if(!job)return;container.append(element(d,'h3','Keputusan satu rekod'),element(d,'p',job.title||job.recordId||''),element(d,'p',job.status==='server-confirmed'?'Disahkan pada pelayan: '+num(job.confirmedScores)+' / '+num(job.scoreCount)+' skor.':job.running?'Sedang diproses. Tunggu pengesahan pelayan.':'Belum disahkan tersimpan.'),element(d,'p',job.message||''));}
globalThis.ReliableReport={model,reason,decodeReport,render,renderSingle};
})();
