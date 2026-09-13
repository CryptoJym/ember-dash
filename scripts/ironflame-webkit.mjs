// Additional WebKit-engine check on macOS. This is neither Safari nor an iOS Simulator.
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const {webkit}=await import(process.env.EMBER_PLAYWRIGHT||pathToFileURL('/Users/utlyze/Projects/educator-of-one-gradient/node_modules/playwright/index.mjs').href);
const url=process.env.EMBER_URL||'http://127.0.0.1:9038/';assert.equal(new URL(url).hostname,'127.0.0.1');
const out=process.env.EMBER_EVIDENCE||'docs/playtest-20260912/webkit';mkdirSync(out,{recursive:true});
const checks=[],errors=[];let error=null;let browser;
const ok=(name,pass)=>{assert.ok(pass,name);checks.push({name,pass:true});console.log('PASS',name)};
const started=new Date().toISOString();
try{
 browser=await webkit.launch({headless:true,timeout:60000});const context=await browser.newContext({viewport:{width:390,height:664},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const p=await context.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/SCRIPT ERROR|^ERROR:/.test(m.text()))errors.push(m.text())});
 await p.goto(url,{waitUntil:'load'});await p.waitForFunction(()=>window.emberStatus?.engine==='Godot 4.7.2',{},{timeout:45000});ok('WebKit starts the actual Godot WebGL build',true);
 const state=()=>p.evaluate(()=>window.emberStatus);
 async function click(prefix){await p.waitForFunction(t=>window.emberStatus?.menuButtons?.some(b=>b.text.startsWith(t)),prefix);await p.waitForTimeout(500);const s=await state(),b=s.menuButtons.find(b=>b.text.startsWith(prefix));const v=p.viewportSize();await p.touchscreen.tap((b.rect[0]+b.rect[2]/2)*v.width/s.viewport[0],(b.rect[1]+b.rect[3]/2)*v.height/s.viewport[1]);await p.waitForTimeout(350)}
 await click('Choose your fox');await p.waitForFunction(()=>window.emberStatus.mode==='choose');ok('WebKit touch opens fox selection',true);await p.screenshot({path:out+'/choose.png'});
 await click('Begin as');await p.waitForFunction(()=>window.emberStatus.mode==='playing');await p.waitForTimeout(400);const before=await state();
 ok('WebKit touch enters play with no leftover menu',before.menus===0);
 await p.keyboard.down('KeyD');await p.waitForFunction(x=>window.emberStatus.x>x+50,before.x);await p.keyboard.up('KeyD');await p.waitForTimeout(150);ok('WebKit keyboard movement and braking',Math.abs((await state()).vx)<2);
 const s=await state(),jump=s.touch.find(t=>t.action==='jump');await p.touchscreen.tap(jump.center[0],jump.center[1]);await p.waitForFunction(y=>window.emberStatus.y<y-25,s.y);ok('WebKit touch jump leaves ground',!(await state()).grounded);
 await p.waitForFunction(()=>window.emberStatus.grounded,{},{timeout:7000});await p.screenshot({path:out+'/play.png'});
 await p.keyboard.press('KeyP');await p.waitForFunction(()=>window.emberStatus.mode==='paused');await click('Save and return');await p.reload();await p.waitForFunction(()=>window.emberStatus?.mode==='title',{},{timeout:45000});await click('Resume your living');await p.waitForFunction(()=>window.emberStatus.mode==='playing');ok('WebKit save reload keeps the same living fox',(await state()).name===before.name);
 ok('WebKit has no uncaught game script errors',errors.length===0);await context.close();
}catch(e){error=String(e);console.log('WEBKIT_FAILED',error)}finally{
 const result={started,ended:new Date().toISOString(),url,checks,errors,error,passed:checks.length,pckSha256:createHash('sha256').update(readFileSync('forge/index.pck')).digest('hex'),scope:'Installed Playwright WebKit on macOS with 390x664 mobile/touch emulation; single-touch menus/jump and keyboard movement. Not branded Safari, native iOS runtime, multi-touch hardware or physical iPhone proof.'};writeFileSync(out+'/webkit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(browser)await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);
}
process.exit(error?1:0);
