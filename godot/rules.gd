extends RefCounted
## Pure rules for the separate Ironflame playtest. Earlier saves are never read.
const Legacy=preload("res://legacy.gd")
const VERSION = 1
const SAVE_KEY = "ember-ironflame-godot-v1"
const BLOODLINES = [
 {"id":"ember","name":"Embermane","founder":"Caldera","color":"ffad67","gift":"Fireburst","tagline":"Burn brighter. Go further.","detail":"Stronger spirit pulse. A fearless fighter.","damage":1.35},
 {"id":"tide","name":"Moonveil","founder":"Mira","color":"9adff6","gift":"Moonward","tagline":"Guard what matters.","detail":"A ward absorbs the first hit in each chamber.","ward":1},
 {"id":"gale","name":"Swiftfern","founder":"Zephra","color":"b2dfb2","gift":"Skybound","tagline":"Higher. Lighter. Freer.","detail":"Triple jump and a quicker stride.","speed":1.10,"jumps":1},
 {"id":"void","name":"Starstep","founder":"Astra","color":"c7adff","gift":"Rift dash","tagline":"Beyond every limit.","detail":"Longer dashes. Faster recovery.","dash":1.2,"cooldown":0.7},
 {"id":"sun","name":"Dawngleam","founder":"Solen","color":"f5dc96","gift":"Lightkeeper","tagline":"Attract hope. Illuminate the way.","detail":"Twice the light attraction. Richer caches.","magnet":2.0,"bounty":1.3},
 {"id":"bloom","name":"Wildbloom","founder":"Briar","color":"efaec4","gift":"Renewal","tagline":"Heal. Grow. Belong.","detail":"Extra vitality. Heal on each chamber clear.","health":1,"heal":1}
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
 var bloodline=int(choice.bloodline)
 var p={"version":VERSION,"alive":true,"name":choice.name,"bloodline":bloodline,"generation":clampi(int(choice.get("generation",1)),1,1000000),"mutation":str(choice.get("mutation","")),"relics":[],"rewarded_rooms":[],"bosses":[],"seed":seed_value,"depth":1,"route":"roots","xp":0,"light":0,"spirit":0,"slain":0,"seconds":0.0,"health":5+int(BLOODLINES[bloodline].get("health",0)),"ward":int(BLOODLINES[bloodline].get("ward",0)),"tokens":0,"upgrades":{"vitality":0,"power":0,"haste":0},"talents":{},"taken":[],"defeated":[],"chest":false,"cleared":false,"position":[100.0,520.0]}
 var mods=Legacy.stat_modifiers(p)
 p.health+=int(mods.health);p.ward=maxi(p.ward,int(mods.ward))
 return p

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
 var spirit=mini(250,int(profile.get("spirit",0)))
 var spirit_strength=1.0+spirit*0.004
 var spirit_speed=1.0+spirit*0.0005
 var mods=Legacy.stat_modifiers(profile)
 return {"level":level,"health":5+int(b.get("health",0))+int((level-1)/4)+int(u.vitality)+int(t.get("vitality",0))+int(mods.health),"speed":320.0*float(b.get("speed",1.0))*spirit_speed*float(mods.speed),"jumps":2+int(b.get("jumps",0))+mini(2,int(t.get("wings",0)))+int(mods.jumps),"damage":4.0*float(b.get("damage",1.0))*(1.0+(level-1)*0.12+int(u.power)*0.15+int(t.get("power",0))*0.2)*spirit_strength*float(mods.damage),"radius":104.0*(1.0+spirit*0.001)*float(mods.radius),"dash_time":0.17*float(b.get("dash",1.0)),"dash_cooldown":maxf(0.36,1.25*float(b.get("cooldown",1.0))*(1.0-int(u.haste)*0.08)*float(mods.dash_cooldown)),"magnet":65.0*float(b.get("magnet",1.0))*(1+int(t.get("magnet",0))*0.3)*(1.0+spirit*0.001)*float(mods.magnet),"ward":maxi(int(b.get("ward",0)),int(mods.ward)),"heal":int(b.get("heal",0)),"bounty":float(b.get("bounty",1.0))*float(mods.bounty),"spirit":spirit,"mutation":profile.get("mutation",""),"relics":profile.get("relics",[]).size(),"synergies":Legacy.synergies_for(profile)}

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
 var mutation=str(raw.get("mutation",""))
 if not Legacy.valid_mutation(mutation,bloodline):mutation=""
 var p = fresh({"name":str(raw.get("name","Wren")).strip_edges().left(48),"bloodline":bloodline,"generation":bounded(raw.get("generation"),1,1000000,1),"mutation":mutation},bounded(raw.get("seed"),0,2147483647))
 p.depth=bounded(raw.get("depth"),1,10000,1);p.xp=bounded(raw.get("xp"),0,10000000)
 p.light=bounded(raw.get("light"),0,10000000);p.spirit=bounded(raw.get("spirit"),0,1000000);p.slain=bounded(raw.get("slain"),0,100000)
 if raw.get("relics") is Array:
  for id in raw.relics.slice(0,Legacy.MAX_RELICS):
   if Legacy.valid_relic(id) and id not in p.relics:p.relics.append(id)
 if raw.get("rewarded_rooms") is Array:
  for value in raw.rewarded_rooms.slice(0,256):
   var depth_id=bounded(value,1,10000,-1)
   if depth_id>0 and depth_id not in p.rewarded_rooms:p.rewarded_rooms.append(depth_id)
 if raw.get("bosses") is Array:
  for id in raw.bosses.slice(0,64):
   if id is String and id.length()<64 and id not in p.bosses:p.bosses.append(id)
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
 var archetype=Legacy.room_archetype(seed_value,depth,route)
 var room_info=Legacy.ARCHETYPES[archetype]
 var platforms=[];var ledges=[];var motes=[];var enemies=[];var hazards=[]
 var x=0.0;var y=520.0
 for i in range(6):
  var width=480.0 if i==0 else 660.0 if i==5 and archetype=="boss" else 430.0 if i==5 else float(rng.randi_range(300,420))
  platforms.append({"x":x,"y":y,"w":width,"h":400.0,"kind":"solid"})
  if i>0 and i<5:
   var mote_count=6 if archetype=="treasure" else 4
   for j in range(mote_count):motes.append({"id":"m%d-%d"%[i,j],"x":x+45+j*(width-90)/maxi(1,mote_count-1),"y":y-44.0,"value":2 if archetype=="treasure" and j%2==0 else 1})
   var elevated=(i%2==0) or (archetype in ["shrine","ascent"] and i in [1,3])
   if elevated:
    var ledge_y=y-(130 if archetype=="ascent" and i%2 else 110)
    ledges.append({"x":x+60,"y":ledge_y,"w":160.0,"h":24.0,"kind":"oneway"})
    for j in range(3):motes.append({"id":"l%d-%d"%[i,j],"x":x+87+j*49,"y":ledge_y-30,"value":2})
   var should_spawn=i>=2 and not (archetype=="treasure" and i==2)
   if should_spawn:
    var type="spitter" if depth>=3 and rng.randf()<0.3 else "wisp" if rng.randf()<0.30 else "crawler"
    var lv=mini(25,1+int(depth/2)+(1 if route=="trial" or archetype=="gauntlet" else 0))
    enemies.append({"id":"enemy%d"%i,"type":type,"level":lv,"x":x+width*.66,"y":y-(80 if type=="wisp" else 22),"home":y-(80 if type=="wisp" else 22),"lo":x+65,"hi":x+width-60,"hp":7.0+lv*2.5,"max_hp":7.0+lv*2.5,"phase":rng.randf()*TAU,"cooldown":1.7,"flash":0.0})
   if depth>=3 and i==3 and archetype not in ["treasure","shrine"]:hazards.append(Rect2(x+35,y-13,38,13))
  x+=width
  if i<5:
   x+=rng.randi_range(58,80 if depth==1 else mini(110,80+depth*3));y=clampf(y+rng.randi_range(-30,30),440,545)
 var end=platforms.back()
 if archetype=="gauntlet":
  var lv=mini(25,2+int(depth/2));var px=platforms[1].x+platforms[1].w*.72;var py=platforms[1].y-22
  enemies.append({"id":"gauntlet","type":"crawler","level":lv,"x":px,"y":py,"home":py,"lo":platforms[1].x+50,"hi":platforms[1].x+platforms[1].w-45,"hp":7.0+lv*2.5,"max_hp":7.0+lv*2.5,"phase":rng.randf()*TAU,"cooldown":1.7,"flash":0.0})
 if archetype=="boss":
  var lv=mini(25,2+int(depth/3));var hp=30.0+lv*7
  enemies.append({"id":"keeper","type":"keeper","level":lv,"x":end.x+260,"y":end.y-56,"home":end.y-56,"lo":end.x+110,"hi":end.x+end.w-170,"hp":hp,"max_hp":hp,"phase":0.0,"cooldown":2.8,"flash":0.0})
 var reward=Legacy.room_reward(seed_value,depth,archetype,route)
 return {"platforms":platforms,"ledges":ledges,"motes":motes,"enemies":enemies,"hazards":hazards,"width":x,"biome":biome,"archetype":archetype,"archetype_name":room_info.name,"subtitle":room_info.subtitle,"reward":reward,"portal":Vector2(end.x+end.w-95,end.y),"chest":Vector2(platforms[3].x+65,platforms[3].y-20)}
