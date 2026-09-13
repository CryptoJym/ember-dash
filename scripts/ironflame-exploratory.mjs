// Exploratory playtest of the owned web export. All saves are disposable contexts.
// Browser device emulation is NOT an iOS Simulator or physical-device test.
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const pw=await import(process.env.EMBER_PLAYWRIGHT||pathToFileURL('/Users/utlyze/Projects/educator-of-one-gradient/node_modules/playwright/index.mjs').href);
const url=process.env.EMBER_URL||'http://127.0.0.1:9037/';
assert.equal(new URL(url).hostname,'127.0.0.1','Only the owned loopback test export is allowed');
const out=process.env.EMBER_EVIDENCE||'docs/playtest-20260912/exploratory';mkdirSync(out,{recursive:true});
const records=[],errors=[];const hash=b=>createHash('sha256').update(b).digest('hex');
const artifacts=Object.fromEntries(['index.html','index.pck','index.wasm'].map(f=>[f,hash(readFileSync('forge/'+f))]));
const browser=await pw.chromium.launch({channel:'chrome',headless:true,timeout:120000});
const started=new Date().toISOString();
const viewports=[{width:320,height:568},{width:375,height:667},{width:390,height:664},{width:844,height:300},{width:844,height:390},{width:768,height:1024}];
function colliding(s){
 const feet={x:(s.x-s.camera[0])*s.zoom+s.viewport[0]/2,y:(s.y-s.camera[1])*s.zoom+s.viewport[1]/2};
 const r={left:feet.x-21*s.zoom,right:feet.x+21*s.zoom,top:feet.y-34*s.zoom,bottom:feet.y};
 const overlap=(s.touch||[]).filter(t=>{const nearX=Math.max(r.left,Math.min(t.center[0],r.right));const nearY=Math.max(r.top,Math.min(t.center[1],r.bottom));return Math.hypot(nearX-t.center[0],nearY-t.center[1])<t.size*.45;}).map(t=>t.action);
 return {feet,bodyScreenRect:r,overlappingControls:overlap,approxBodyHeightPx:34*s.zoom};
}
try{
 for(const viewport of viewports){
  const name=`${viewport.width}x${viewport.height}`;if(process.env.EMBER_CASE&&process.env.EMBER_CASE!==name)continue;console.log('CASE',name);
  const c=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await c.newPage();p.setDefaultTimeout(10000);
  const localErrors=[];p.on('pageerror',e=>localErrors.push(e.message));p.on('console',m=>{if(/SCRIPT ERROR|^ERROR:/.test(m.text()))localErrors.push(m.text())});
  const record={case:name,checks:[],observations:{},errors:localErrors};records.push(record);
  const check=(id,pass,detail)=>{record.checks.push({id,pass,...(detail?{detail}:{})});console.log(pass?'PASS':'FINDING',name,id)};
  const state=()=>p.evaluate(()=>window.emberStatus);
  async function click(prefix){
   await p.waitForFunction(t=>window.emberStatus?.menuButtons?.some(b=>b.text.startsWith(t)),prefix);
   // Wait for Godot's deferred container layout and exported observations to settle.
   await p.waitForTimeout(500);
   const s=await state(),b=s.menuButtons.find(b=>b.text.startsWith(prefix));const v=p.viewportSize();
   const x=(b.rect[0]+b.rect[2]/2)*v.width/s.viewport[0],y=(b.rect[1]+b.rect[3]/2)*v.height/s.viewport[1];
   assert.ok(x>0&&y>0&&x<v.width&&y<v.height,'button center in viewport: '+prefix);
   await p.touchscreen.tap(x,y);await p.waitForTimeout(350);
   const next=await state();console.log('TAP',prefix,JSON.stringify({before:s.mode,after:next?.mode,x,y,viewport:s.viewport}));
   writeFileSync(`${out}/progress-${name}.json`,JSON.stringify({prefix,before:s,after:next},null,2));
  }
  try{
   const response=await p.goto(url,{waitUntil:'load'});assert.equal(response.status(),200);assert.equal(hash(await response.body()),artifacts['index.html']);
   await p.waitForFunction(()=>window.emberStatus?.mode==='title',{},{timeout:60000});await click('Choose your fox');
   await p.waitForFunction(()=>window.emberStatus?.mode==='choose'&&window.emberStatus?.menuButtons?.some(b=>b.text.startsWith('Begin as')));await p.waitForTimeout(350);
   let s=await state();const start=s.menuButtons.find(b=>b.text.startsWith('Begin as'));
   check('begin button fully onscreen',start&&start.rect[0]>=0&&start.rect[1]>=0&&start.rect[0]+start.rect[2]<=s.viewport[0]+1&&start.rect[1]+start.rect[3]<=s.viewport[1]+1,start?.rect);
   await p.screenshot({path:`${out}/choose-${name}.png`});await click('Begin as');await p.waitForFunction(()=>window.emberStatus?.mode==='playing');await p.waitForTimeout(700);
   s=await state();record.observations.start=colliding(s);record.observations.touch=s.touch;record.observations.name=s.name;record.observations.seed=s.seed;
   check('hero collision body not covered by touch controls at spawn',record.observations.start.overlappingControls.length===0,record.observations.start);
   check('all active touch circles onscreen',s.touch.every(t=>t.center[0]-t.size/2>=0&&t.center[0]+t.size/2<=s.viewport[0]+1&&t.center[1]-t.size/2>=0&&t.center[1]+t.size/2<=s.viewport[1]+1));
   await p.screenshot({path:`${out}/play-${name}.png`});
   const cd=await c.newCDPSession(p);const move=s.touch.find(t=>t.action==='move_right'),jump=s.touch.find(t=>t.action==='jump');
   const point=(t,id)=>({x:t.center[0],y:t.center[1],id,radiusX:9,radiusY:9,force:1});
   const x=s.x,y=s.y;
   await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(move,1)]});await p.waitForTimeout(180);
   await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(move,1),point(jump,2)]});await p.waitForFunction(y=>window.emberStatus.y<y-35,y,{timeout:5000});
   s=await state();check('two-finger movement and jumping',s.x>x+20&&!s.grounded);
   await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>window.emberStatus.grounded,{},{timeout:7000});await p.waitForTimeout(150);s=await state();
   check('released touch stops grounded movement',Math.abs(s.vx)<2,{vx:s.vx,x:s.x});
   // A rotation at rest must not start motion or reset the character.
   const before=s;await p.setViewportSize({width:viewport.height,height:viewport.width});await p.waitForTimeout(600);s=await state();
   check('rotation preserves living fox without unsolicited movement',s.mode==='playing'&&s.name===before.name&&Math.abs(s.vx)<2&&Math.abs(s.x-before.x)<5,{before:[before.x,before.y],after:[s.x,s.y],mode:s.mode});
   record.observations.rotated=colliding(s);await p.screenshot({path:`${out}/rotated-${name}.png`});
   await p.keyboard.press('KeyP');await p.waitForFunction(()=>window.emberStatus.mode==='paused');
   const paused=await state();const cont=paused.menuButtons.find(b=>b.text.startsWith('Continue'));check('resume button reachable after rotation',cont&&cont.rect[1]>=0&&cont.rect[1]+cont.rect[3]<=paused.viewport[1]+1,cont?.rect);
   await click('Continue');await p.waitForFunction(()=>window.emberStatus.mode==='playing');
   check('no GDScript or browser errors',localErrors.length===0);
  }catch(e){record.error=String(e);errors.push({case:name,error:String(e)});console.log('CASE_FAILED',name,String(e));try{await p.screenshot({path:`${out}/failed-${name}.png`})}catch{}}
  finally{await c.close()}
 }
}finally{
 const result={started,ended:new Date().toISOString(),url,artifacts,webkitExecutableInstalled:existsSync(pw.webkit.executablePath()),records,errors,checks:records.flatMap(r=>r.checks).length,passed:records.flatMap(r=>r.checks).filter(c=>c.pass).length,findings:records.flatMap(r=>r.checks.filter(c=>!c.pass).map(c=>({case:r.case,...c}))),scope:'Actual Godot web export and real touch input in six isolated Chromium emulated viewports. Rotations change viewport dimensions; not native iOS orientation sensors. No gameplay profile fixture or production save was modified.'};
 writeFileSync(out+'/exploratory.json',JSON.stringify(result,null,2));console.log(JSON.stringify({checks:result.checks,passed:result.passed,findings:result.findings,errors},null,2));await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);
}
process.exit(errors.length||records.some(r=>r.checks.some(c=>!c.pass))?1:0);
