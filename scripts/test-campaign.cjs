const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(html.match(/const LEVELS_DATA = (.*);/)[1]);
const proofs=JSON.parse(fs.readFileSync(path.join(root,'tests/campaign-proofs.json')));
const worker=html.match(/<script type="text\/plain" id="genSrc">([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({});vm.runInContext(worker+';globalThis.L=Logic;',ctx);const L=ctx.L;
const mainLogic=html.slice(html.indexOf('const Logic =',html.indexOf('</script>',html.indexOf('id="genSrc"'))),html.lastIndexOf('// Level generator for'));
const main=vm.createContext({});vm.runInContext(mainLogic+';globalThis.L=Logic;',main);
assert.equal(data.levels.length,650);assert.equal(proofs.length,650);
let steps=0;
function noOverlap(st){const occupied=new Set();for(const b of st.blocks)if(!b.out)for(const [dx,dy] of b.cells){let x=b.x+dx,y=b.y+dy;assert(x>=0&&x<st.w&&y>=0&&y<st.h);let n=y*st.w+x;assert(!st.wall[n]&&!occupied.has(n));occupied.add(n)}}
for(let i=0;i<data.levels.length;i++)for(const engine of [L,main.L]){
 const lv=data.levels[i],st=engine.makeState({w:lv.w,h:lv.h,walls:lv.wl,gates:lv.g.map(([side,at,len,c])=>({side,at,len,c})),blocks:lv.b.map(([s,x,y,c,c2,ax,ice,lock=-1,bomb=0,hid=0])=>({cells:data.shapes[s],x,y,c,c2,ax,ice,lock,bomb,hid}))});
 noOverlap(st);
 for(const o of proofs[i]){
  const b=st.blocks[o.i];assert(b&&!b.out&&engine.movable(b),`level ${i+1}: immovable`);
  assert(Number.isInteger(o.x)&&Number.isInteger(o.y));
  const occ=engine.occGrid(st,o.i);assert(engine.reachFast(st,o.i,occ).list.includes(o.y*st.w+o.x),`level ${i+1}: blocked path`);
  const changed=b.x!==o.x||b.y!==o.y;
  if(o.t==='mv'){b.x=o.x;b.y=o.y;}else{const g=st.gates[o.gi];assert(g&&engine.gateOpen(st,occ,b,o.x,o.y,g),`level ${i+1}: invalid gate`);engine.applyExit(st,o.i,o.x,o.y,o.gi);}
  for(const z of st.blocks)if(!z.out&&z.bomb>0){z.bomb-=o.t==='mv'?1:changed?2:1;assert(z.bomb>0,`level ${i+1}: bomb`);}
  noOverlap(st);steps++;
 }
 assert(engine.won(st),`level ${i+1}: unfinished`);
}
console.log(`PASS: ${data.levels.length} levels; ${steps} legal operations across game and worker engines, no boosters, no collisions, bombs safe`);
