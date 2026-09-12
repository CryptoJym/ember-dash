import {pathToFileURL} from 'node:url';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.EMBER_PLAYWRIGHT||pathToFileURL('/Users/utlyze/Projects/educator-of-one-gradient/node_modules/playwright/index.mjs').href);
const url=process.env.EMBER_URL||'http://127.0.0.1:9017/';
const out=process.env.EMBER_EVIDENCE||'docs/ironflame/evidence';mkdirSync(out,{recursive:true});
const checks=[],errors=[];let organic=null;
function ok(name,value){assert.ok(value,name);checks.push({name,pass:true});console.log('PASS',name);}
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:120000});
const KEY='ember-ironflame-godot-v1';
async function beginContext(options={}){
 const context=await browser.newContext({viewport:{width:1280,height:800},...options});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/SCRIPT ERROR|^ERROR:/.test(m.text()))errors.push(m.text());});
 const state=()=>page.evaluate(()=>window.emberStatus);
 async function ready(){await page.waitForFunction(()=>window.emberStatus?.mode==='title',{},{timeout:60000});}
 async function click(prefix){await page.waitForFunction(p=>window.emberStatus?.menuButtons?.some(b=>b.text.startsWith(p)),prefix,{timeout:7000});let s=await state();const b=s.menuButtons.find(b=>b.text.startsWith(prefix));assert.ok(b,'button '+prefix);const v=page.viewportSize();const scaleX=v.width/(s.viewport?.[0]||v.width),scaleY=v.height/(s.viewport?.[1]||v.height);const x=(b.rect[0]+b.rect[2]/2)*scaleX,y=(b.rect[1]+b.rect[3]/2)*scaleY;assert.ok(y<v.height&&x<v.width&&y>0,'visible button '+prefix);await page.mouse.click(x,y);await page.waitForTimeout(180);}
 async function press(key,ms=90){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
 await page.goto(url,{waitUntil:'load'});await ready();return {context,page,state,ready,click,press};
}
try{
 const d=await beginContext();const {page,state,click,press}=d;
 await page.evaluate(()=>{localStorage.setItem('ember-lineage-v2','preserved-classic-lineage');localStorage.setItem('ember-dash-best-m','777');});
 await click('Choose your fox');await click('Begin as');await page.waitForFunction(()=>window.emberStatus.mode==='playing');
 let right=false,jumpUntil=0;const started=Date.now();await page.keyboard.down('KeyJ');
 while(Date.now()-started<90000){
  const s=await state();if(s.mode==='camp')break;assert.equal(s.mode,'playing','organic traversal remains alive');
  const enemy=s.opponents.filter(e=>e.hp>0&&e.x>s.x-40).sort((a,b)=>a.x-b.x)[0];
  const last=s.terrain.at(-1),portal=last.x+last.w-95;
  const close=enemy&&Math.abs(enemy.x-s.x)<65;
  const wantRight=!close&&s.x<portal-55;
  if(wantRight!==right){await page.keyboard[wantRight?'down':'up']('KeyD');right=wantRight;}
  const current=s.terrain.find(p=>s.x>=p.x-20&&s.x<=p.x+p.w+20);
  if(s.grounded&&current&&current!==last&&current.x+current.w-s.x<72&&wantRight&&Date.now()>jumpUntil){await page.keyboard.down('Space');jumpUntil=Date.now()+280;}
  if(jumpUntil&&Date.now()>jumpUntil){await page.keyboard.up('Space');jumpUntil=0;}
  if(s.x>=portal-70){await page.keyboard.up('KeyD');right=false;await press('KeyE');}
  await page.waitForTimeout(35);
 }
 await page.keyboard.up('KeyD');await page.keyboard.up('KeyJ');await page.keyboard.up('Space');
 let s=await state();organic=s;writeFileSync(out+'/traversal-state.json',JSON.stringify(s,null,2));await page.screenshot({path:out+'/traversal-finish.png'});ok('real keyboard traversal completes a seeded chamber',s.mode==='camp');ok('defeated enemies raise the living fox above level one',s.level>=2&&s.xp>0);ok('defeated enemy levels are absorbed into living spirit strength',s.spirit>0);ok('collecting and defeating enemies earns spendable light',s.light>=18);
 await page.screenshot({path:out+'/sanctuary-earned.png'});
 const wallet=s.light;await click('Inner flame');await page.waitForFunction(k=>{const v=JSON.parse(localStorage.getItem(k)||'null');return v?.upgrades?.power===1},KEY,{timeout:7000});let saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),KEY));ok('earned currency buys a real stat upgrade',saved.upgrades.power===1&&saved.light===wallet-18);
 if((await state()).menuButtons.some(b=>b.text.startsWith('Awaken a new gift'))){await click('Awaken a new gift');await click('Feather soul');await page.waitForFunction(k=>{const v=JSON.parse(localStorage.getItem(k)||'null');return v?.talents?.wings===1},KEY,{timeout:7000});saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),KEY));ok('earned level grants a chosen extra air jump',saved.talents.wings===1&&saved.tokens===0);}
 await click('Save and rest');await page.reload();await d.ready();await click('Resume your living');await page.waitForFunction(()=>window.emberStatus.mode==='playing');s=await state();ok('earned XP and level survive a browser reload',s.xp===saved.xp&&s.name===saved.name);ok('absorbed enemy levels survive while this fox lives',s.spirit===saved.spirit&&s.spirit>0);
 await press('KeyE');await page.waitForFunction(()=>window.emberStatus.mode==='camp');ok('reopening cleared sanctuary cannot farm experience',(await state()).xp===saved.xp);
 await click('Follow the roots');await page.waitForFunction(()=>window.emberStatus.mode==='playing'&&window.emberStatus.depth===2);
 await page.screenshot({path:out+'/gameplay-earned.png'});
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.emberStatus.mode==='dead',{},{timeout:15000});await page.keyboard.up('KeyD');
 const tomb=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),KEY));ok('actual fall death writes only a dead-profile tombstone',tomb.alive===false&&Object.keys(tomb).length===2);
 await page.screenshot({path:out+'/death-reset.png'});await click('Start a new life');await click('Begin as');await page.waitForFunction(()=>window.emberStatus.mode==='playing');s=await state();ok('new character starts at level one with zero XP, light, and absorbed spirit',s.level===1&&s.xp===0&&s.light===0&&s.spirit===0);saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),KEY));ok('dead character upgrades and talents do not carry over',saved.upgrades.power===0&&Object.keys(saved.talents).length===0);
 ok('earlier Ember Dash save keys remain unchanged',await page.evaluate(()=>localStorage.getItem('ember-lineage-v2')==='preserved-classic-lineage'&&localStorage.getItem('ember-dash-best-m')==='777'));
 // A separate genuine same-origin tab changes storage; the original must refuse stale writes.
 const tab=await d.context.newPage();await tab.goto(new URL('index.html',url).href);await tab.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:1,alive:false})),KEY);await tab.close();await page.bringToFront();await page.waitForTimeout(250);
 if((await state()).mode==='paused')await click('Continue');
 if((await state()).mode==='playing')await page.keyboard.press('KeyP');
 await page.waitForFunction(()=>window.emberStatus.mode==='conflict',{},{timeout:7000});
 ok('stale tab cannot overwrite a newer saved life',(await state()).mode==='conflict');ok('conflicting tombstone remains intact',JSON.parse(await page.evaluate(k=>localStorage.getItem(k),KEY)).alive===false);await d.context.close();
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const m=await beginContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});await m.click('Choose your fox');await m.page.screenshot({path:out+`/choose-${viewport.width}.png`});await m.click('Begin as');await m.page.waitForFunction(()=>window.emberStatus.mode==='playing');let ms=await m.state();ok(`${viewport.width}px mobile enters unobstructed play`,ms.menus===0);
  const touches=ms.touch||[];ok(`${viewport.width}px mobile has touch movement and jump`,touches.some(x=>x.action==='move_right')&&touches.some(x=>x.action==='jump'));
  const cd=await m.context.newCDPSession(m.page);const move=touches.find(t=>t.action==='move_right'),jump=touches.find(t=>t.action==='jump');
  const point=(t,id)=>({x:t.center[0],y:t.center[1],id,radiusX:8,radiusY:8,force:1});
  const x0=ms.x,y0=ms.y;await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(move,1)]});await m.page.waitForTimeout(230);
  await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(move,1),point(jump,2)]});await m.page.waitForFunction(y=>window.emberStatus.y<y-40,y0);ms=await m.state();ok(`${viewport.width}px simultaneous touch movement and jump work`,ms.x>x0+25&&!ms.grounded);
  await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.page.waitForTimeout(180);await m.page.screenshot({path:out+`/gameplay-${viewport.width}.png`});await m.context.close();
 }
 ok('no GDScript or uncaught browser errors',errors.length===0);
 const receipt={url,checks,errors,passed:checks.length,organic:{name:organic.name,seed:organic.seed,xp:organic.xp,level:organic.level,light:organic.light,spirit:organic.spirit},scope:'Actual exported Godot game. Combat, route traversal, earnings, purchase, talent, save, death and reset exercised through real browser inputs. Mobile is Chromium touch emulation, not a physical iPhone.'};
 writeFileSync(out+'/journey.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
}catch(e){writeFileSync(out+'/journey-failure.json',JSON.stringify({checks,errors,error:String(e)},null,2));throw e;}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);}
process.exit(0);
