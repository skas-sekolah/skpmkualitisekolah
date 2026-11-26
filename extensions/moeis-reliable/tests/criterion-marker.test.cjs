const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const url='https://moeisins.moe.gov.my/SJN/penilaian-kendiri/pengurusan-kami/standard3-1/index?no_aspek=3.1.1&tahun=2026';
const previous=fs.readFileSync(path.join(__dirname,'fixtures','page-081.js'),'utf8');
function fixture(marker,{source='3.1.1.1',before='',after='',old=false}={}){
 const radios=[0,1,2,3,4].map(v=>'<input type="radio" name="skor1" value="'+v+'">').join('');
 const html='<body>BBA8284 <table><tr><td>STANDARD</td><td>STANDARD 3.1: PENGURUSAN KURIKULUM</td></tr></table>'+before+marker+'<table><tr><td>KRITERIA KRITIKAL</td><td>Ketetapan pelaksanaan kurikulum</td></tr></table><form method="post" action="save"><input type="hidden" name="id_aspek" value="80">'+radios+'<button type="submit">Simpan</button></form>'+after+'</body>';
 const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window;
 w.eval(fs.readFileSync(path.join(root,'core.js'),'utf8'));
 w.eval(old?previous:fs.readFileSync(path.join(root,'page.js'),'utf8'));
 let submits=0;w.document.querySelector('form').requestSubmit=()=>submits++;
 return {dom,w,submits:()=>submits,ctx:{url:w.ReliableCore.route(url),year:2026,schoolCode:'BBA8284',record:{id:source,fields:[{key:'scores.a',value:4}]}}};
}
for(const marker of [
 '<a class="btn btn-success" href="javascript:void(0)">3.1.1.1</a>',
 '<a class="btn btn-success" href="index?id_aspek=80&no_aspek=3.1.1&tahun=2026">3.1.1.1</a>',
 '<div class="btn btn-success">3.1.<span>1.1</span></div>',
 '<input type="button" value="3.1.1.1">'
]){
 let s=fixture(marker,{old:true});
 assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Nombor standard/);assert.equal(s.submits(),0);s.dom.window.close();
 s=fixture(marker);const expected=s.w.ReliablePage.inspect(s.ctx);assert.equal(expected.fields[0].name,'skor1');assert.equal(s.submits(),0);
 s.w.ReliablePage.apply(s.ctx,expected);assert.equal(s.submits(),1);s.dom.window.close();
}
let s=fixture('<div>3.1.1.2</div>',{before:'<aside><div>3.1.1.1</div></aside>'});
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Kod kandungan: 3.1.1.2/);assert.equal(s.submits(),0);s.dom.window.close();
s=fixture('<div>3.1.1.2</div>',{after:'<div>3.1.1.1</div>'});
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Nombor standard/);s.dom.window.close();
s=fixture('<a class="active">3.1.1.1</a><a>3.1.1.2</a>');
assert.equal(s.w.ReliablePage.inspect(s.ctx).fields.length,1);s.ctx.record.id='3.1.1.2';
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Nombor standard/);s.dom.window.close();
s=fixture('<a>3.1.1.1</a><a>3.1.1.2</a>');
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Nombor standard/);s.dom.window.close();
s=fixture('<div hidden>3.1.1.1</div><div>3.1.1.2</div>');
assert.throws(()=>s.w.ReliablePage.inspect(s.ctx),/Nombor standard/);s.dom.window.close();
console.log('PASS: reproduces v0.8.1 criterion badge false negatives; fixes JavaScript/different-URL links, split DIV labels and input buttons; wrong, hidden, sidebar, trailing and ambiguous codes stay blocked; inspect never submits.');
