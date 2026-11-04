const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.join(__dirname,'..');
 const server=require('http').createServer((req,res)=>{const u=req.url.split('?')[0];const file=path.join(root,u==='/'?'index.html':u);try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{if(!localStorage.getItem('tyanuchki-save'))localStorage.setItem('tyanuchki-save',JSON.stringify({reached:0,snd:0,music:0,daily:{last:new Date().toISOString().slice(0,10),day:1},seen:['start','boss','tier1','tier2','walls','arrow','ice','key','layer','bomb','hid','timer']}))});
 await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForTimeout(500);
 for(const w of [320,375,390,430]){
  await p.setViewportSize({width:w,height:844});await p.evaluate(()=>{document.getElementById('dailySheet').hidden=true;window.__probka.startLevel(70)});await p.waitForTimeout(600);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert(await p.locator('#t-hint').isVisible());assert(await p.locator('#timer').isVisible());
 }
 await p.setViewportSize({width:390,height:844});
 const proofs=JSON.parse(fs.readFileSync(path.join(root,'tests/campaign-proofs.json')));
 for(const level of [0,24,149,324,649]){
  await p.evaluate(i=>{document.querySelectorAll('.over').forEach(e=>e.hidden=true);window.__probka.startLevel(i)},level);await p.waitForTimeout(1000);
  const result=await p.evaluate(async proof=>{
   const game=window.__probka,L=game.L,cv=document.getElementById('cv');
   const wait=ms=>new Promise(r=>setTimeout(r,ms));let count=0;
   function send(type,x,y){cv.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));}
   for(const op of proof){
    const st=game.st,b=st.blocks[op.i],G=game.G,r=cv.getBoundingClientRect(),cell=b.cells[0];
    if(b.out)throw Error('already out');
    const reach=L.reachFast(st,op.i),route=L.pathTo(st,reach,op.x,op.y);
    const ox=cell[0]+.5,oy=cell[1]+.5;const at=(x,y)=>[r.left+G.bx+(x+ox)*G.s,r.top+G.by+(y+oy)*G.s];
    send('pointerdown',...at(b.x,b.y));
    if(!game.drag)throw Error('drag refused '+op.i);
    for(const [x,y] of route){send('pointermove',...at(x,y));await wait(90);}
    if(op.t!=='mv'){
     const g=st.gates[op.gi],dir=L.DIRS[g.side],bb=L.bbox(b.cells),len=(g.side===0||g.side===2?bb.h:bb.w)+.6;
     // Move through every grid cell to the rim, then into the gate's tail.
     const [ex,ey]=L.edgePos(st,b,op.x,op.y,g);
     for(let x=op.x,y=op.y;x!==ex||y!==ey;){x+=Math.sign(ex-x);y+=Math.sign(ey-y);send('pointermove',...at(x,y));await wait(90);}
     send('pointermove',...at(ex+dir[0]*len,ey+dir[1]*len));await wait(350);
    }
    const v=game.vis()[op.i];send('pointerup',...at(op.x,op.y));await wait(260);
    if(op.t==='mv'&&(b.x!==op.x||b.y!==op.y))throw Error('move mismatch '+op.i+' '+b.x+','+b.y+' wanted '+op.x+','+op.y);
    if(op.t==='in'&&!b.out)throw Error('exit mismatch '+op.i);
    if(game.ended&&!L.won(st))throw Error('lost');count++;
   }
   return {won:L.won(game.st),count};
  },proofs[level]);
  assert(result.won);await p.waitForTimeout(1000);console.log('touch replay',level+1,result);
 }
 const before=await p.evaluate(()=>window.__probka.save().reached);await p.reload();await p.waitForTimeout(700);assert.equal(await p.evaluate(()=>window.__probka.save().reached),before);
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: portrait widths 320/375/390/430, touch replays, reload preserves completed count',before);
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
