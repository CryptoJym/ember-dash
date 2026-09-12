extends RefCounted
## Pure rules for the separate Ironflame playtest. Earlier saves are never read.
const VERSION = 1
const SAVE_KEY = "ember-ironflame-godot-v1"
const BLOODLINES = [
 {"id":"ember","name":"Embermane","color":"ffad67","gift":"Fireburst","detail":"Stronger spirit pulse. A fearless fighter.","damage":1.35},
 {"id":"tide","name":"Moonveil","color":"9adff6","gift":"Moonward","detail":"A ward absorbs the first hit in each chamber.","ward":1},
 {"id":"gale","name":"Swiftfern","color":"b2dfb2","gift":"Skybound","detail":"Triple jump and a quicker stride.","speed":1.10,"jumps":1},
 {"id":"void","name":"Starstep","color":"c7adff","gift":"Rift dash","detail":"Longer dashes. Faster recovery.","dash":1.2,"cooldown":0.7},
 {"id":"sun","name":"Dawngleam","color":"f5dc96","gift":"Lightkeeper","detail":"Twice the light attraction. Richer caches.","magnet":2.0,"bounty":1.3},
 {"id":"bloom","name":"Wildbloom","color":"efaec4","gift":"Renewal","detail":"Extra vitality. Heal on each chamber clear.","health":1,"heal":1}
]
const NAMES = ["Caldera","Mira","Zephra","Astra","Solen","Briar","Rowan","Thistle","Aster","Lyra","Kestrel","Luma","Sora","Vale","Orin","Wren","Juniper","Rune","Neri","Eira","Flint","Ilyra","Mica","Quill","Cirrus","Hollis","Yara","Vesper","Oriel","Iskra","Fable","Nyx","Cael","Riven","Perrin","Tarin"]
const BIOMES = [
 {"id":"grove","name":"The Lanternwild","subtitle":"Follow the light between the roots.","stone":"354c48","edge":"a6c590","accent":"f5d084","sky":"294e50"},
 {"id":"frost","name":"The Glass Cathedral","subtitle":"Where moonlight learns to sing.","stone":"35475e","edge":"b0dbe4","accent":"abe0ff","sky":"344669"},
 {"id":"cinder","name":"The Cinder Below","subtitle":"Even the ashes hold a spark.","stone":"513c4b","edge":"d59583","accent":"ffb37d","sky":"583f57"}
]
const UPGRADE_IDS = ["vitality","power","haste"]
const TALENT_IDS = ["power","wings","vitality","magnet"]
const TALENT_TEXT = ["Kindled spirit · +20% pulse strength","Feather soul · one extra air jump","Second wind · +1 heart and heal two","Firefly friend · +30% light reach"]

static func bounded(v, low, high, fallback = 0):
 if not (v is int or v is float) or not is_finite(float(v)):
  return fallback
 return clampi(int(v), low, high)

static func shuffled(values, rng):
 var out = values.duplicate()
 for i in range(out.size()-1, 0, -1):
  var j = rng.randi_range(0, i)
  var v = out[i]; out[i] = out[j]; out[j] = v
 return out

static func candidates(seed_value, excluded = ""):
 var rng = RandomNumberGenerator.new(); rng.seed = seed_value
 var names = shuffled(NAMES, rng)
 var powers = shuffled([0,1,2,3,4,5], rng)
 var out = []
 for p in powers.slice(0,3):
  var name = names.pop_back() + " " + BLOODLINES[p].name
  if name == excluded: name = names.pop_back() + " " + BLOODLINES[p].name
  out.append({"name":name,"bloodline":p})
 return out

static func fresh(choice, seed_value):
 return {"version":VERSION,"alive":true,"name":choice.name,"bloodline":choice.bloodline,"seed":seed_value,"depth":1,"route":"roots","xp":0,"light":0,"slain":0,"seconds":0.0,"health":5+int(BLOODLINES[choice.bloodline].get("health",0)),"ward":int(BLOODLINES[choice.bloodline].get("ward",0)),"tokens":0,"upgrades":{"vitality":0,"power":0,"haste":0},"talents":{},"taken":[],"defeated":[],"chest":false,"cleared":false,"position":[100.0,520.0]}

static func level_info(xp):
 var level = 1
 var into = bounded(xp,0,10000000)
 var needed = 24
 while level < 60 and into >= needed:
  into -= needed; level += 1; needed = int(round(24.0 * pow(level,1.30)))
 return {"level":level,"into":into,"next":needed}

static func stats(profile):
 var b = BLOODLINES[int(profile.bloodline)]
 var level = level_info(profile.xp).level
 var u = profile.upgrades; var t = profile.talents
 return {"level":level,"health":5+int(b.get("health",0))+int((level-1)/4)+int(u.vitality)+int(t.get("vitality",0)),"speed":320.0*float(b.get("speed",1.0)),"jumps":2+int(b.get("jumps",0))+mini(2,int(t.get("wings",0))),"damage":4.0*float(b.get("damage",1.0))*(1.0+(level-1)*0.12+int(u.power)*0.15+int(t.get("power",0))*0.2),"radius":104.0,"dash_time":0.17*float(b.get("dash",1.0)),"dash_cooldown":maxf(0.42,1.25*float(b.get("cooldown",1.0))*(1.0-int(u.haste)*0.08)),"magnet":65.0*float(b.get("magnet",1.0))*(1+int(t.get("magnet",0))*0.3),"ward":int(b.get("ward",0)),"heal":int(b.get("heal",0)),"bounty":float(b.get("bounty",1.0))}

static func award_xp(profile, amount):
 if not profile.get("alive",false):return 0
 var old_level = level_info(profile.xp).level
 profile.xp = mini(10000000,int(profile.xp)+bounded(amount,0,10000))
 var current = level_info(profile.xp).level
 for level in range(old_level+1,current+1):
  if level % 2 == 0: profile.tokens += 1
 return current-old_level

static func price(profile, id):
 if id not in UPGRADE_IDS: return -1
 var level = int(profile.upgrades[id])
 if level >= 6: return -1
 return int(ceil((24 if id=="vitality" else 18 if id=="power" else 20)*pow(1.55,level)))

static func purchase(profile, id):
 if not profile.get("alive",false):return false
 var cost = price(profile,id)
 if cost < 0 or profile.light < cost: return false
 profile.light -= cost; profile.upgrades[id] += 1
 if id == "vitality": profile.health = mini(stats(profile).health,profile.health+1)
 return true

static func talent(profile,id):
 if not profile.get("alive",false):return false
 if id not in TALENT_IDS or profile.tokens<=0 or int(profile.talents.get(id,0))>=5: return false
 profile.tokens -= 1; profile.talents[id] = int(profile.talents.get(id,0))+1
 if id=="vitality":profile.health = mini(stats(profile).health,profile.health+2)
 return true

static func normalize(raw):
 if not raw is Dictionary or raw.get("version") != VERSION or not raw.has("alive"): return {}
 if raw.alive != true: return {"version":VERSION,"alive":false}
 var bloodline = bounded(raw.get("bloodline"),0,5,-1)
 if bloodline < 0: return {}
 var p = fresh({"name":str(raw.get("name","Wren")).strip_edges().left(48),"bloodline":bloodline},bounded(raw.get("seed"),0,2147483647))
 p.depth=bounded(raw.get("depth"),1,10000,1);p.xp=bounded(raw.get("xp"),0,10000000)
 p.light=bounded(raw.get("light"),0,10000000);p.slain=bounded(raw.get("slain"),0,100000)
 p.seconds=bounded(raw.get("seconds"),0,31536000);p.tokens=bounded(raw.get("tokens"),0,30)
 p.route=raw.get("route","roots") if raw.get("route","roots") in ["roots","cache","trial"] else "roots"
 for id in UPGRADE_IDS:p.upgrades[id]=bounded(raw.get("upgrades",{}).get(id,0) if raw.get("upgrades",{}) is Dictionary else 0,0,6)
 for id in TALENT_IDS:p.talents[id]=bounded(raw.get("talents",{}).get(id,0) if raw.get("talents",{}) is Dictionary else 0,0,5)
 p.health=bounded(raw.get("health"),0,stats(p).health,stats(p).health)
 if p.health <= 0:return {"version":VERSION,"alive":false}
 p.ward=bounded(raw.get("ward"),0,1)
 for key in ["taken","defeated"]:
  if raw.get(key) is Array:
   for id in raw[key].slice(0,160):
    if id is String and id.length()<50 and id not in p[key]:p[key].append(id)
 p.chest=raw.get("chest",false)==true;p.cleared=raw.get("cleared",false)==true
 if raw.get("position") is Array and raw.position.size()==2:
  p.position=[bounded(raw.position[0],30,10000,100),bounded(raw.position[1],-400,950,520)]
 return p

static func room(seed_value, depth, route="roots"):
 var rng=RandomNumberGenerator.new();rng.seed=(str(seed_value)+":"+str(depth)+":"+route).hash()
 var biome=int((depth-1)/4)%3
 var platforms=[];var ledges=[];var motes=[];var enemies=[];var hazards=[]
 var x=0.0;var y=520.0
 for i in range(6):
  var width=480.0 if i==0 else 660.0 if i==5 and depth%4==0 else 430.0 if i==5 else float(rng.randi_range(300,420))
  platforms.append({"x":x,"y":y,"w":width,"h":400.0,"kind":"solid"})
  if i>0 and i<5:
   for j in range(4):motes.append({"id":"m%d-%d"%[i,j],"x":x+45+j*(width-90)/3,"y":y-44.0,"value":1})
   if i%2==0:
    ledges.append({"x":x+60,"y":y-110,"w":160.0,"h":24.0,"kind":"oneway"})
    for j in range(3):motes.append({"id":"l%d-%d"%[i,j],"x":x+87+j*49,"y":y-140,"value":2})
   if i>=2:
    var type="spitter" if depth>=3 and rng.randf()<0.3 else "wisp" if rng.randf()<0.30 else "crawler"
    var lv=mini(25,1+int(depth/2)+(1 if route=="trial" else 0))
    enemies.append({"id":"enemy%d"%i,"type":type,"level":lv,"x":x+width*.66,"y":y-(80 if type=="wisp" else 22),"home":y-(80 if type=="wisp" else 22),"lo":x+65,"hi":x+width-60,"hp":7.0+lv*2.5,"max_hp":7.0+lv*2.5,"phase":rng.randf()*TAU,"cooldown":1.7,"flash":0.0})
   if depth>=3 and i==3:hazards.append(Rect2(x+35,y-13,38,13))
  x+=width
  if i<5:
   x+=rng.randi_range(58,80 if depth==1 else mini(110,80+depth*3));y=clampf(y+rng.randi_range(-30,30),440,545)
 var end=platforms.back()
 if depth%4==0:
  var lv=mini(25,2+int(depth/3));var hp=30.0+lv*7
  enemies.append({"id":"keeper","type":"keeper","level":lv,"x":end.x+260,"y":end.y-56,"home":end.y-56,"lo":end.x+110,"hi":end.x+end.w-170,"hp":hp,"max_hp":hp,"phase":0.0,"cooldown":2.8,"flash":0.0})
 return {"platforms":platforms,"ledges":ledges,"motes":motes,"enemies":enemies,"hazards":hazards,"width":x,"biome":biome,"portal":Vector2(end.x+end.w-95,end.y),"chest":Vector2(platforms[3].x+65,platforms[3].y-20)}
