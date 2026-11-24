(()=>{
function inspect(module){
 const origin='https://moeisins.moe.gov.my';if(location.origin!==origin||!location.pathname.startsWith('/SJN/penilaian-kendiri/'))throw Error('Buka borang penilaian MOEIS dahulu.');
 const patterns={strength:'kekuatan-kami',management:'pengurusan-kami',achievement:'pencapaian-kami'};
 if(!Object.hasOwn(patterns,module)||!location.pathname.includes('/'+patterns[module]+'/')||location.pathname.includes('/standard4/'))throw Error('Halaman MOEIS bukan modul yang dipilih.');
 const raw=[...document.querySelectorAll('input,select,textarea')],seen=new Set(),fields=[];
 for(const el of raw){const type=String(el.type||el.tagName||'').toLowerCase();if(el.disabled||el.readOnly||el.closest?.('fieldset[disabled]')||el.getClientRects?.().length===0||!['text','number','url','email','date','checkbox','radio','textarea','select-one'].includes(type))continue;
  const groupKey=type==='radio'?String([...document.forms].indexOf(el.form))+':'+el.name:null;if(groupKey&&seen.has(groupKey))continue;if(groupKey)seen.add(groupKey);
  const group=type==='radio'?raw.filter(x=>x.type==='radio'&&x.name===el.name&&x.form===el.form):[el];if(group.some(x=>x.disabled||x.readOnly))continue;
  const labels=[...document.querySelectorAll('label')].filter(l=>el.id&&l.htmlFor===el.id).map(l=>l.textContent.trim());const row=el.closest?.('tr');const label=(el.getAttribute?.('aria-label')||labels.join(' / ')||el.closest?.('label')?.textContent||(row?.cells?[...row.cells].filter(c=>!c.contains?.(el)).map(c=>c.textContent).filter(Boolean).join(' · '):'')||el.placeholder||el.name||'Medan '+(fields.length+1)).replace(/\s+/g,' ').trim().slice(0,250);
  fields.push({index:fields.length,name:el.name||'',type,label,min:el.min??'',max:el.max??'',step:el.step||(type==='number'?'1':''),maxLength:el.maxLength??-1,value:type==='checkbox'?!!el.checked:type==='radio'?(group.find(x=>x.checked)?.value??null):el.value,options:type==='select-one'?[...el.options].map(o=>({value:o.value,label:o.textContent,disabled:o.disabled})):type==='radio'?group.map(x=>({value:x.value,label:x.value,disabled:x.disabled})):[],element:el,group});
 }
 if(!fields.length)throw Error('Tiada medan boleh diisi. Medan automatik / dikunci tidak diubah.');return {module,url:location.href,title:document.title,fields:fields.map(({element,group,...f})=>f),_elements:fields};
}
function publicInspect(module){const {_elements,...view}=inspect(module);return view;}
function apply(module,expected,mapping,record){if(record?.readOnly)throw Error('Rekod ini dijana automatik MOEIS; pengisian ditolak.');const current=inspect(module),{_elements,...snapshot}=current;if(JSON.stringify(snapshot)!==JSON.stringify(expected))throw Error('Borang telah berubah. Semak semula sebelum mengisi.');if(!Array.isArray(mapping)||!mapping.length||mapping.length>500)throw Error('Pilih padanan medan dahulu.');const seen=new Set(),changes=[];
 for(const m of mapping){const source=record.fields.find(f=>f.key===m.key),target=_elements[m.index];if(!source||!target||seen.has(m.index))throw Error('Padanan berganda / tidak sah.');seen.add(m.index);let value=source.value;
  if(source.unit==='score0to4'&&/peratus|wajaran|%/i.test(target.label))throw Error('Skor 0–4 tidak boleh ditukar terus kepada peratus / wajaran. Pilih medan skor mentah yang betul.');
  if(target.type==='checkbox'){if(typeof value!=='boolean')throw Error('Kotak tanda memerlukan nilai benar/palsu.');}
  else{if(typeof value==='boolean')throw Error('Nilai benar/palsu perlu dipadankan kepada kotak tanda.');value=String(value).replace(/\r\n/g,'\n');if(target.maxLength>=0&&value.length>target.maxLength)throw Error('Teks melebihi had '+target.label);
   if(['radio','select-one'].includes(target.type)&&!target.options.some(o=>o.value===value&&!o.disabled))throw Error('Pilihan tepat tidak tersedia bagi '+target.label);
   if(target.type==='number'){if(value.trim()===''||!Number.isFinite(Number(value)))throw Error('Nilai nombor tidak sah.');const n=Number(value);if(target.min!==''&&n<Number(target.min)||target.max!==''&&n>Number(target.max))throw Error('Nilai di luar julat '+target.label);if(target.step&&target.step!=='any'){const step=Number(target.step),base=Number(target.min||0),q=(n-base)/step;if(step>0&&Math.abs(q-Math.round(q))>1e-7)throw Error('Langkah nombor tidak sepadan.');}}
   if(target.type==='url'&&!/^https?:\/\//i.test(value))throw Error('Pautan tidak sah.');if(target.type==='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Tarikh tidak sah.');if(target.min&&value<target.min||target.max&&value>target.max)throw Error('Tarikh di luar julat.');}if(target.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Emel tidak sah.');}
  if(target.value!==null&&target.value!==''&&target.value!==false&&String(target.value)!==String(value)&&m.replace!==true)throw Error('Sahkan penggantian nilai sedia ada dahulu.');changes.push({target,value});
 }
 for(const {target,value}of changes){const el=target.type==='radio'?target.group.find(r=>r.value===value):target.element;if(target.type==='checkbox'||target.type==='radio')el.checked=target.type==='checkbox'?value:true;else{const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(setter)setter.call(el,value);else el.value=value;}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
 const after=publicInspect(module);for(const {target,value}of changes)if(String(after.fields[target.index].value)!==String(value))throw Error('Semakan selepas isi gagal; semak borang sebelum menyimpan.');return {filled:changes.length,view:after};
}
globalThis.SKASWriteAdapter={inspect:publicInspect,apply};
})();
