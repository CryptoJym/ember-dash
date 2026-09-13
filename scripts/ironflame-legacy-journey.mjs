import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.EMBER_PLAYWRIGHT||pathToFileURL('/Users/utlyze/Projects/educator-of-one-gradient/node_modules/playwright/index.mjs').href);
const url=process.env.EMBER_URL||'http://127.0.0.1:9044/';
assert.equal(new URL(url).hostname,'127.0.0.1','legacy journey must use the owned loopback export');
const out=process.env.EMBER_EVIDENCE||'docs/legacy-20260913/browser';mkdirSync(out,{recursive:true});
const LIFE='ember-ironflame-godot-v1',META='ember-lineage-archive-v1';
const errors=[],checks=[],rooms=[];const ok=(name,v)=>{assert.ok(v,name);checks.push({name,pass:true});console.log('PASS',name)};
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:45000});
const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();page.setDefaultTimeout(12000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/SCRIPT ERROR|^ERROR:/.test(m.text()))errors.push(m.text())});
const state=()=>page.evaluate(()=>window.emberStatus);
async function click(prefix){await page.waitForFunction(p=>window.emberStatus?.menuButtons?.some(b=>b.text.startsWith(p)),prefix);const s=await state(),b=s.menuButtons.find(x=>x.text.startsWith(prefix));assert.ok(b);await page.mouse.click(b.rect[0]+b.rect[2]/2,b.rect[1]+b.rect[3]/2);await page.waitForTimeout(220)}
async function clearRoom(){
 let moving=false,jumpRelease=0;const started=Date.now();await page.keyboard.down('KeyJ');
 while(Date.now()-started<55000){
  const s=await state();if(s.mode==='camp')break;assert.equal(s.mode,'playing','fox stays alive while clearing room');
  const foe=s.opponents.filter(e=>e.hp>0&&e.x>s.x-50).sort((a,b)=>a.x-b.x)[0];const last=s.terrain.at(-1),portal=last.x+last.w-95;
  const wantRight=!(foe&&Math.abs(foe.x-s.x)<82)&&s.x<portal-55;
  if(wantRight!==moving){await page.keyboard[wantRight?'down':'up']('KeyD');moving=wantRight}
  const tile=s.terrain.find(t=>s.x>=t.x-20&&s.x<=t.x+t.w+20);
  if(s.grounded&&tile&&tile!==last&&tile.x+tile.w-s.x<74&&wantRight&&!jumpRelease){await page.keyboard.down('Space');jumpRelease=Date.now()+285}
  if(jumpRelease&&Date.now()>jumpRelease){await page.keyboard.up('Space');jumpRelease=0}
  if(s.x>portal-70){if(moving){await page.keyboard.up('KeyD');moving=false}await page.keyboard.press('KeyE')}
  await page.waitForTimeout(32);
 }
 for(const key of ['KeyD','KeyJ','Space'])await page.keyboard.up(key).catch(()=>{});
 const s=await state();assert.equal(s.mode,'camp','room reaches sanctuary');rooms.push({depth:s.depth,archetype:s.roomArchetype,reward:s.roomReward,relics:s.relics,spirit:s.spirit,light:s.light});return s;
}
try{
 await page.goto(url);await page.waitForFunction(()=>window.emberStatus?.startupStage==='ready',{},{timeout:60000});let s=await state();
 ok('legacy build starts in browser',s.build==='legacy-replayability-20260913'&&s.legacyGeneration===1&&s.legacyRuns===0);
 await page.evaluate(()=>{localStorage.setItem('ember-lineage-v2','preserve-old-lineage');localStorage.setItem('ember-dash-best-m','998');});
 await click('Choose your fox');await page.screenshot({path:out+'/generation-one-choices.png'});await click('Begin as');await page.waitForFunction(()=>window.emberStatus?.mode==='playing');s=await state();
 ok('generation one starts with a positive mutation',s.generation===1&&typeof s.mutation==='string'&&s.mutation.length>0);
 ok('room director is visible in exported state',typeof s.roomArchetype==='string'&&s.roomArchetype.length>0&&s.roomReward?.kind);
 let foundRelic=false;
 for(let depth=1;depth<=4;depth++){
  s=await clearRoom();const saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),LIFE));
  ok(`chamber ${depth} reward is persisted once`,saved.rewarded_rooms.includes(depth));
  if(s.relics.length){foundRelic=true;ok(`living relic changes are persisted by chamber ${depth}`,saved.relics.length===s.relics.length);}
  if(depth<4){const route=depth===1?'Chase the lanterns':depth===2?'Wake the sentinels':'Follow the roots';await click(route);await page.waitForFunction(d=>window.emberStatus.mode==='playing'&&window.emberStatus.depth===d,depth+1)}
 }
 ok('four-room run guarantees at least one living relic',foundRelic&&(await state()).relics.length>0);
 s=await state();ok('fourth chamber remains a guardian encounter',s.opponents.some(e=>e.type==='keeper'&&e.hp<=0));
 await page.screenshot({path:out+'/guardian-relic-sanctuary.png'});
 await click('Living build');await page.waitForFunction(()=>window.emberStatus.mode==='camp');ok('living build panel is reachable from sanctuary',(await state()).menus===1);await click('Back to the lantern');
 await click('Follow the roots');await page.waitForFunction(()=>window.emberStatus.mode==='playing'&&window.emberStatus.depth===5);
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.emberStatus.mode==='dead',{},{timeout:18000});await page.keyboard.up('KeyD');s=await state();
 const tomb=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),LIFE));const archive=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),META));
 ok('actual death keeps the original two-field living tombstone',tomb.alive===false&&Object.keys(tomb).length===2);
 ok('death writes one separate lineage ancestor',archive.runs===1&&archive.generation===2&&archive.archive.length===1);
 ok('ancestor remembers mutation and relic discoveries',archive.archive[0].mutation.length>0&&archive.discoveries.relics.length>0);
 await page.screenshot({path:out+'/legacy-death.png'});await click('Start a new life');await page.waitForFunction(()=>window.emberStatus.mode==='choose');await click('Begin as');await page.waitForFunction(()=>window.emberStatus.mode==='playing');s=await state();
 ok('descendant begins generation two with a fresh living build',s.generation===2&&s.level===1&&s.xp===0&&s.light===0&&s.spirit===0&&s.relics.length===0&&s.mutation.length>0);
 await page.keyboard.press('KeyP');await page.waitForFunction(()=>window.emberStatus.mode==='paused');await click('Save and return');await page.waitForFunction(()=>window.emberStatus.mode==='title');await click('Lineage archive');await page.waitForFunction(()=>window.emberStatus.mode==='archive');ok('lineage archive is reachable in exported browser game',(await state()).legacyRuns===1);
 ok('older Ember Dash keys remain untouched',await page.evaluate(()=>localStorage.getItem('ember-lineage-v2')==='preserve-old-lineage'&&localStorage.getItem('ember-dash-best-m')==='998'));
 ok('no GDScript or uncaught browser errors',errors.length===0);
 const receipt={url,checks,passed:checks.length,errors,rooms,scope:'Exact exported Godot WebGL candidate. Room traversal/combat/relic earning/death/archive/rebirth used real browser inputs. Isolated browser context; not physical iPhone/Safari.'};writeFileSync(out+'/legacy-journey.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
}catch(e){writeFileSync(out+'/legacy-journey-failure.json',JSON.stringify({checks,errors,rooms,error:String(e),state:await state().catch(()=>null)},null,2));throw e}
finally{await context.close().catch(()=>{});await browser.close().catch(()=>{})}
