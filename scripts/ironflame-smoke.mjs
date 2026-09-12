import {pathToFileURL} from 'node:url';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.EMBER_PLAYWRIGHT||pathToFileURL('/Users/utlyze/Projects/educator-of-one-gradient/node_modules/playwright/index.mjs').href);
const url=process.env.EMBER_URL||'http://127.0.0.1:9017/';
const out=process.env.EMBER_EVIDENCE||'docs/ironflame/evidence';mkdirSync(out,{recursive:true});
const checks=[],errors=[];const ok=(name,value)=>{assert.ok(value,name);checks.push({name,pass:true});console.log('PASS',name);};
console.log('BROWSER_LAUNCH');
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:120000});
console.log('BROWSER_READY');
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/SCRIPT ERROR|^ERROR:/.test(m.text()))errors.push(m.text());});
 await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.emberStatus?.mode==='title',{},{timeout:60000});
 const state=()=>page.evaluate(()=>window.emberStatus);
 async function click(text){await page.waitForFunction(t=>window.emberStatus?.menuButtons?.some(b=>b.text.startsWith(t)),text);await page.waitForTimeout(200);const b=(await state()).menuButtons.find(b=>b.text.startsWith(text));assert.ok(b,'button '+text);await page.mouse.click(b.rect[0]+b.rect[2]/2,b.rect[1]+b.rect[3]/2);await page.waitForTimeout(220);}
 ok('Godot web runtime starts',(await state()).engine==='Godot 4.7.2');
 await click('Choose your fox');let s=await state();ok('three distinct fox names',new Set(s.candidateNames).size===3);
 await page.screenshot({path:out+'/choose-desktop.png'});
 await click('Begin as');await page.waitForFunction(()=>window.emberStatus?.mode==='playing');await page.waitForTimeout(300);
 s=await state();ok('begin removes every menu',s.menus===0);const initial=s;
 await page.keyboard.down('KeyD');await page.waitForFunction(x=>window.emberStatus.x>x+60,initial.x);await page.keyboard.up('KeyD');await page.waitForTimeout(160);s=await state();ok('real keyboard movement',s.x>initial.x+60);
 const stop=s.x;await page.waitForTimeout(180);ok('ground braking stops promptly',Math.abs((await state()).x-stop)<3);
 const floor=(await state()).y;await page.keyboard.down('Space');await page.waitForFunction(y=>window.emberStatus.y<y-55,floor,{timeout:4000});s=await state();ok('held jump has meaningful airtime',!s.grounded&&s.y<floor-55);await page.keyboard.up('Space');
 await page.waitForFunction(()=>window.emberStatus.grounded,{},{timeout:4000});
 const x0=(await state()).x;await page.keyboard.down('ShiftLeft');await page.waitForFunction(()=>window.emberStatus.dash>0,{},{timeout:4000});s=await state();ok('dash activates from real key input',s.dash>0);await page.keyboard.up('ShiftLeft');await page.waitForTimeout(220);ok('dash moves fox forward',(await state()).x>x0+70);
 await page.keyboard.press('KeyP');await page.waitForFunction(()=>window.emberStatus.mode==='paused');ok('pause has exactly one menu',(await state()).menus===1);
 await click('Continue');await page.waitForFunction(()=>window.emberStatus.mode==='playing');ok('resume clears the pause menu',(await state()).menus===0);
 await page.screenshot({path:out+'/gameplay-desktop.png'});
 await page.keyboard.press('KeyP');await page.waitForFunction(()=>window.emberStatus.mode==='paused');await click('Save and return');await page.waitForFunction(()=>window.emberStatus.mode==='title');
 const before=JSON.parse(await page.evaluate(()=>localStorage.getItem('ember-ironflame-godot-v1')));ok('real localStorage has living profile',before.alive===true&&before.name===initial.name);
 await page.reload();await page.waitForFunction(()=>window.emberStatus?.mode==='title',{},{timeout:60000});await click('Resume your living');await page.waitForFunction(()=>window.emberStatus.mode==='playing');ok('reload restores same living fox',(await state()).name===before.name);
 ok('no script errors in browser',errors.length===0);
 await context.close();
 writeFileSync(out+'/browser-smoke.json',JSON.stringify({url,checks,errors,passed:checks.length,scope:'Godot WebGL build; actual mouse/keyboard inputs and native browser localStorage. No test mutator used.'},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);}
process.exit(0);
