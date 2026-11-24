// Session storage stays restricted to trusted extension contexts.
// Content collectors can only publish their bounded progress payloads.
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.kind!=='SKAS_AUTO_STATE_V1')return;
 if(sender.id!==chrome.runtime.id||!sender.tab||!sender.url?.startsWith('https://moeisins.moe.gov.my/SJN/penilaian-kendiri/')){reply({ok:false,message:'Sumber status tidak dibenarkan.'});return;}
 const value=message.value,keys=value&&typeof value==='object'?Object.keys(value):[];
 if(keys.length!==1||!['auto','strengthAuto'].includes(keys[0])||!value[keys[0]]||typeof value[keys[0]]!=='object'||JSON.stringify(value).length>4000000){reply({ok:false,message:'Status kutipan tidak sah / terlalu besar.'});return;}
 chrome.storage.session.set(value).then(()=>reply({ok:true}),e=>reply({ok:false,message:e.message}));
 return true;
});
