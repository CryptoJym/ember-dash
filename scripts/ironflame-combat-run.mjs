// State-observing playtest bot. Sends real keys/buttons; never changes game state.
import {chromium} from '/Users/utlyze/Projects/educator-of-one-gradient/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const url=process.env.EMBER_URL||'http://127.0.0.1:9041/';
assert.equal(new URL(url).hostname,'127.0.0.1');
const out=process.env.EMBER_EVIDENCE||'docs/playtest-20260912/refinement/combat-run';mkdirSync(out,{recursive:true});
const errors=[],rooms=[],checks=[];let result;
const b=await chromium.launch({channel:'chrome',headless:true,timeout:45000});
const c=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(12000);
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/SCRIPT ERROR|^ERROR:/.test(m.text()))errors.push(m.text())});
const state=()=>p.evaluate(()=>window.emberStatus);
const check=(name,pass)=>{checks.push({name,pass});assert.ok(pass,name);console.log('PASS',name)};
async function click(prefix){await p.waitForFunction(t=>window.emberStatus?.menuButtons.some(b=>b.text.startsWith(t)),prefix);await p.waitForTimeout(400);const s=await state(),r=s.menuButtons.find(b=>b.text.startsWith(prefix)).rect;await p.mouse.click(r[0]+r[2]/2,r[1]+r[3]/2);await p.waitForTimeout(300)}
try{
 await p.goto(url);await p.waitForFunction(()=>window.emberStatus?.startupStage==='ready',{},{timeout:60000});check('reduced-motion preference does not prevent browser startup',(await state()).reducedMotion===true);
 await click('Choose your fox');await click('Begin as');await p.waitForFunction(()=>window.emberStatus.mode==='playing');
 for(let chamber=1;chamber<=4;chamber++){
  let moving=false,jumpRelease=0;const start=Date.now();await p.keyboard.down('KeyJ');
  while(Date.now()-start<50000){
   const s=await state();if(s.mode==='camp')break;assert.equal(s.mode,'playing',`survival in chamber ${chamber}`);
   const foe=s.opponents.filter(e=>e.hp>0&&e.x>s.x-50).sort((a,b)=>a.x-b.x)[0];const last=s.terrain.at(-1),portal=last.x+last.w-95;
   const wantRight=!(foe&&Math.abs(foe.x-s.x)<82)&&s.x<portal-55;
   if(wantRight!==moving){await p.keyboard[wantRight?'down':'up']('KeyD');moving=wantRight}
   const tile=s.terrain.find(t=>s.x>=t.x-20&&s.x<=t.x+t.w+20);
   if(s.grounded&&tile&&tile!==last&&tile.x+tile.w-s.x<74&&wantRight&&!jumpRelease){await p.keyboard.down('Space');jumpRelease=Date.now()+285}
   if(jumpRelease&&Date.now()>jumpRelease){await p.keyboard.up('Space');jumpRelease=0}
   if(s.x>portal-70){await p.keyboard.up('KeyD');moving=false;await p.keyboard.press('KeyE')}
   await p.waitForTimeout(32);
  }
  for(const key of ['KeyD','KeyJ','Space'])await p.keyboard.up(key);
  const s=await state();check(`real-input chamber ${chamber} clears`,s.mode==='camp');rooms.push({depth:s.depth,seed:s.seed,name:s.name,health:s.health,level:s.level,spirit:s.spirit,light:s.light,defeated:s.opponents.filter(e=>e.hp<=0).map(e=>e.type)});
  if(chamber===4){check('guardian defeated without profile mutation',s.opponents.some(e=>e.type==='keeper'&&e.hp<=0));await p.screenshot({path:out+'/guardian-cleared.png',timeout:15000})}
  else {await click('Follow the roots');await p.waitForFunction(()=>window.emberStatus.mode==='playing')}
 }
 check('multi-room progression accumulates Spirit',rooms.at(-1).spirit>rooms[0].spirit);
 check('no script or uncaught browser errors',errors.length===0);
 result={passed:true,checks,rooms,errors,scope:'One state-aware real-input bot life across four random rooms and first keeper, reduced-motion Chromium desktop. Not human balance certification.'};
}catch(e){result={passed:false,checks,rooms,errors,error:String(e),state:await state().catch(()=>null)};await p.screenshot({path:out+'/failure.png',timeout:15000}).catch(()=>{})}
finally{writeFileSync(out+'/combat-run.json',JSON.stringify(result,null,2));await c.close();await b.close()}
process.exit(result.passed?0:1);
