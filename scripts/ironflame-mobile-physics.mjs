// Repeat real multi-touch thumb movements in isolated game profiles. No game mutator.
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.EMBER_PLAYWRIGHT||pathToFileURL('/Users/utlyze/Projects/educator-of-one-gradient/node_modules/playwright/index.mjs').href);
const url=process.env.EMBER_URL||'http://127.0.0.1:9042/';assert.equal(new URL(url).hostname,'127.0.0.1');
const out=process.env.EMBER_EVIDENCE||'docs/mobile-physics-20260912/baseline';mkdirSync(out,{recursive:true});
const rounds=Number(process.env.EMBER_ROUNDS||2),cases=[],errors=[];
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:60000});
try{
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const c=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await c.newPage();p.setDefaultTimeout(12000);
  const checks=[];const measurements=[];const name=`${viewport.width}x${viewport.height}`;
  const test=(label,pass,detail)=>{checks.push({label,pass,detail});console.log(pass?'PASS':'FINDING',name,label,detail??'');};
  p.on('pageerror',e=>errors.push({case:name,error:e.message}));p.on('console',m=>{if(/SCRIPT ERROR|^ERROR:/.test(m.text()))errors.push({case:name,error:m.text()});});
  const state=()=>p.evaluate(()=>window.emberStatus);
  async function click(prefix){await p.waitForFunction(t=>window.emberStatus?.menuButtons?.some(b=>b.text.startsWith(t)),prefix);await p.waitForTimeout(300);let s=await state(),b=s.menuButtons.find(b=>b.text.startsWith(prefix));await p.touchscreen.tap((b.rect[0]+b.rect[2]/2)*viewport.width/s.viewport[0],(b.rect[1]+b.rect[3]/2)*viewport.height/s.viewport[1]);await p.waitForTimeout(240);}
  try{
   await p.goto(url);await p.waitForFunction(()=>window.emberStatus?.startupStage==='ready');await click('Choose your fox');await click('Begin as');await p.waitForFunction(()=>window.emberStatus.mode==='playing'&&window.emberStatus.grounded);
   const cd=await c.newCDPSession(p);let fingers=new Map();
   const point=(t,id)=>({id,x:t.center[0],y:t.center[1],radiusX:10,radiusY:10,force:1});
   async function down(id,t){fingers.set(id,point(t,id));await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...fingers.values()]});}
   async function move(id,t){fingers.set(id,point(t,id));await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[...fingers.values()]});}
   async function up(id){fingers.delete(id);await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[...fingers.values()]});}
   async function cancel(){fingers.clear();await cd.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForTimeout(300);}
   let s=await state();const controls=Object.fromEntries(s.touch.map(t=>[t.action,t]));
   test('mobile has a deliberate drop-through control',!!controls.drop);
   for(let round=0;round<rounds;round++){
    await down(1,controls.move_right);await p.waitForTimeout(190);let right=await state();
    await move(1,controls.move_left);await p.waitForTimeout(210);let left=await state();
    test(`round ${round+1}: sliding movement thumb reverses without lifting`,left.vx< -200,{rightVx:right.vx,afterSlideVx:left.vx});
    await up(1);await p.waitForTimeout(220);s=await state();test(`round ${round+1}: lifting movement thumb brakes`,Math.abs(s.vx)<2);
    // A short press/release jump, no holding directions or synthetic gameplay mutation.
    const floor=s.y;await down(2,controls.jump);await p.waitForTimeout(55);await up(2);
    let minY=floor;for(let i=0;i<15;i++){await p.waitForTimeout(24);s=await state();minY=Math.min(minY,s.y);}
    await p.waitForFunction(()=>window.emberStatus.grounded);test(`round ${round+1}: short touch jump lands without auto-bounce`,floor-minY>40&&s.mode==='playing',{rise:floor-minY});
    // Movement is held by one finger while another jumps; cancellation must release both.
    await down(1,controls.move_left);await p.waitForTimeout(60);await down(2,controls.jump);await p.waitForTimeout(90);s=await state();
    test(`round ${round+1}: two-finger jump retains left steering`,s.vx<0&&!s.grounded);
    await cancel();await p.waitForFunction(()=>window.emberStatus.grounded);s=await state();test(`round ${round+1}: cancel never leaves steering stuck`,Math.abs(s.vx)<2);
    measurements.push({round,x:s.x,y:s.y,health:s.health});
   }
   // Ordinary held jump should differ from a quick tap without changing the physics body.
   s=await state();const floor=s.y;await down(2,controls.jump);let high=floor;
   for(let i=0;i<14;i++){await p.waitForTimeout(25);s=await state();high=Math.min(high,s.y);}await up(2);await p.waitForFunction(()=>window.emberStatus.grounded);
   test('held touch has useful extra jump height',floor-high>90,{rise:floor-high});
   await p.screenshot({path:`${out}/mobile-${name}.png`,timeout:20000});
  }catch(e){errors.push({case:name,error:String(e)});console.log('CASE_ERROR',name,String(e));}
  cases.push({viewport,checks,measurements});await c.close();
 }
}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);}
const checks=cases.flatMap(c=>c.checks);const result={url,rounds,cases,checks:checks.length,passed:checks.filter(c=>c.pass).length,errors,scope:'Actual game controlled only by browser touch events; desktop Chromium emulation, not physical phone timing or balance certification.'};
writeFileSync(`${out}/mobile-physics.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({checks:result.checks,passed:result.passed,errors},null,2));process.exit(errors.length||checks.some(c=>!c.pass)?1:0);
