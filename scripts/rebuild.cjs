const fs = require('fs'), vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const src = html.match(/<script type="text\/plain" id="genSrc">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({console});
vm.runInContext(src+';globalThis.Gen=LevelGen; globalThis.L=Logic;',ctx);
const checkpoint = path.join(root, `rebuilt-${+(process.argv[2]||0)}.json`);
const results = fs.existsSync(checkpoint) ? JSON.parse(fs.readFileSync(checkpoint)) : [];
const start = +(process.argv[2]||0), end = +(process.argv[3]||650);
for(let i=start+results.length;i<end;i++) {
  const t=Date.now();
  let lv;
  for (let seed=904; seed<920 && !lv; seed++) lv=ctx.Gen.makeLevel(i,{seed,maxAtt:500});
  if(!lv) throw Error('No certified candidate: '+(i+1));
  results.push(lv);
  fs.writeFileSync(path.join(root,`rebuilt-${start}.json`),JSON.stringify(results));
  console.log(i+1,lv.b.length,lv.d,Date.now()-t);
}
