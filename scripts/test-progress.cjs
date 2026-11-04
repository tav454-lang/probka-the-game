const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
const src=html.split('// ---------- save ----------')[1].split('// ---------- themes ----------')[0];
function boot(initial={},blocked=false){
 const data=new Map(Object.entries(initial)),events={},req={},warnings=[];
 const c=vm.createContext({N:650,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(blocked)throw Error('blocked');data.set(k,v)}},navigator:{},window:{addEventListener:(k,f)=>events[k]=f},indexedDB:{open:()=>req},setTimeout:f=>{warnings.push(f)},toast:()=>{},$:()=>({hidden:true}),buildMap:()=>{}});
 vm.runInContext(src+';globalThis.api={save:()=>save,persist,firstOpen};',c);
 return {data,events,req,c,api:c.api,warnings};
}
const key='tyanuchki-save';
let a=boot({[key]:JSON.stringify({v:1,reached:120,coins:480,inv:{hint:9},theme:'mint'})});
assert.equal(a.api.save().reached,120);assert.equal(a.api.save().coins,480);assert.equal(a.api.save().inv.hint,9);assert.equal(a.api.firstOpen(),120);
a.api.save().reached=121;a.api.persist();a=boot(Object.fromEntries(a.data));assert.equal(a.api.save().reached,121);
a.api.save().reached=30;a.api.persist();assert.equal(a.api.save().reached,121);
let b=boot({[key]:'{bad', [key+'-backup']:JSON.stringify({reached:207,coins:900})});assert.equal(b.api.save().reached,207);assert.equal(b.api.save().coins,900);
b=boot({[key]:JSON.stringify({reached:2}),[key+'-completed']:'349'});assert.equal(b.api.save().reached,349);
b.events.storage({key:key+'-completed',newValue:'351'});assert.equal(b.api.save().reached,351);
b.events.storage({key:key+'-completed',newValue:'20'});assert.equal(b.api.save().reached,351);
const blocked=boot({},true);assert.equal(blocked.warnings.length,1);
// A browser with only the IndexedDB backup recovers the count and inventory.
const idb=boot();let read={},stored;
const store={get:()=>read,put:v=>{stored=v}};
idb.req.result={transaction:()=>({objectStore:()=>store})};idb.req.onsuccess();read.result={reached:290,coins:730,inv:{hint:6},skin:'jelly'};read.onsuccess();assert.equal(idb.api.save().reached,290);assert.equal(idb.api.save().coins,730);assert.equal(stored.reached,290);
console.log('PASS: old save migration, reload, monotonic count, spare copy, cross-tab count, blocked storage, IndexedDB recovery');
