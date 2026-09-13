extends RefCounted
## Persistent lineage history + per-life relic/mutation rules.
## The archive records history/discovery only. It never grants permanent raw stats.
const VERSION=1
const META_KEY="ember-lineage-archive-v1"
const MAX_ARCHIVE=64
const MAX_RELICS=6

const RELICS={
 "echo_fang":{"name":"Echo Fang","text":"Pulse strength +18%.","damage":1.18,"rarity":"common"},
 "swift_ember":{"name":"Swift Ember","text":"Movement speed +8%.","speed":1.08,"rarity":"common"},
 "sky_feather":{"name":"Skyroot Feather","text":"One additional air jump.","jumps":1,"rarity":"rare"},
 "spirit_lens":{"name":"Spirit Lens","text":"Light reach +30% and caches +15%.","magnet":1.30,"bounty":1.15,"rarity":"common"},
 "lantern_heart":{"name":"Lantern Heart","text":"Maximum vitality +1.","health":1,"rarity":"rare"},
 "rift_charm":{"name":"Rift Charm","text":"Dash recovers 15% faster.","dash_cooldown":.85,"rarity":"rare"},
 "ward_shard":{"name":"Moonward Shard","text":"Begin each chamber with a ward.","ward":1,"rarity":"rare"},
 "ancestor_bell":{"name":"Ancestor Bell","text":"Spirit absorption strengthens pulse reach.","radius":1.14,"rarity":"legendary"}
}
const MUTATIONS={
 "fleetborn":{"name":"Fleetborn","text":"Born quick: +8% movement speed.","speed":1.08},
 "skykin":{"name":"Skykin","text":"Born light: +1 air jump.","jumps":1},
 "stoutheart":{"name":"Stoutheart","text":"Born resilient: +1 maximum heart.","health":1},
 "bright_tail":{"name":"Bright-tail","text":"Born luminous: +35% light reach.","magnet":1.35},
 "stormpaw":{"name":"Stormpaw","text":"Born fierce: +12% pulse strength.","damage":1.12},
 "riftblood":{"name":"Riftblood","text":"Born between steps: dash recovery +12%.","dash_cooldown":.88},
 "ember_crest":{"name":"Ember Crest","text":"Fireburst blood resonates: +8% pulse and reach.","damage":1.08,"radius":1.08,"bloodline":0},
 "moon_crest":{"name":"Moon Crest","text":"Moonveil blood begins every room warded.","ward":1,"bloodline":1},
 "gale_crest":{"name":"Gale Crest","text":"Swiftfern blood carries +6% speed and reach.","speed":1.06,"radius":1.08,"bloodline":2},
 "star_crest":{"name":"Star Crest","text":"Starstep blood shortens dash recovery by 15%.","dash_cooldown":.85,"bloodline":3},
 "dawn_crest":{"name":"Dawn Crest","text":"Dawngleam blood enriches caches +20%.","bounty":1.20,"bloodline":4},
 "bloom_crest":{"name":"Bloom Crest","text":"Wildbloom blood carries +1 heart.","health":1,"bloodline":5}
}
const SYNERGIES={
 "stormstep":{"name":"Stormstep","requires":["sky_feather","rift_charm"],"text":"Feather + Rift: +7% speed and faster dash.","speed":1.07,"dash_cooldown":.92},
 "predator_flow":{"name":"Predator Flow","requires":["echo_fang","swift_ember"],"text":"Fang + Ember: +10% pulse and +4% speed.","damage":1.10,"speed":1.04},
 "radiant_bloom":{"name":"Radiant Bloom","requires":["lantern_heart","spirit_lens"],"text":"Heart + Lens: +20% light reach and +10% bounty.","magnet":1.20,"bounty":1.10}
}
const ARCHETYPES={
 "crossroads":{"name":"Wandering Roots","subtitle":"A balanced path through the wild.","reward":"light"},
 "treasure":{"name":"Lantern Cache","subtitle":"Fewer hunters. More light. A relic waits beyond.","reward":"relic"},
 "shrine":{"name":"Ancestor Shrine","subtitle":"Climb toward an old blessing.","reward":"relic"},
 "gauntlet":{"name":"Spirit Gauntlet","subtitle":"Stronger spirits guard richer spoils.","reward":"light"},
 "ascent":{"name":"Skyward Ruins","subtitle":"A vertical path rewards clean movement.","reward":"light"},
 "boss":{"name":"Guardian Threshold","subtitle":"A keeper stands between this fox and its legend.","reward":"relic"}
}

static func fresh_archive():
 return {"version":VERSION,"generation":1,"runs":0,"best_depth":0,"archive":[],"discoveries":{"relics":[],"mutations":[],"bosses":[]}}

static func normalize_archive(raw):
 var out=fresh_archive()
 if not raw is Dictionary or raw.get("version")!=VERSION:return out
 out.generation=clampi(int(raw.get("generation",1)),1,1000000)
 out.runs=clampi(int(raw.get("runs",0)),0,1000000)
 out.best_depth=clampi(int(raw.get("best_depth",0)),0,1000000)
 if raw.get("archive") is Array:
  for entry in raw.archive.slice(maxi(0,raw.archive.size()-MAX_ARCHIVE)):
   if entry is Dictionary and str(entry.get("name","")).length()>0:out.archive.append(entry.duplicate(true))
 if raw.get("discoveries") is Dictionary:
  for key in ["relics","mutations","bosses"]:
   if raw.discoveries.get(key) is Array:
    for id in raw.discoveries[key].slice(0,128):
     if id is String and id.length()<64 and id not in out.discoveries[key]:out.discoveries[key].append(id)
 return out

static func merge_archives(left,right):
 var a=normalize_archive(left);var b=normalize_archive(right);var out=fresh_archive()
 out.generation=maxi(a.generation,b.generation);out.best_depth=maxi(a.best_depth,b.best_depth)
 var seen={}
 for source in [a.archive,b.archive]:
  for entry in source:
   var key="%s|%s|%s|%s"%[entry.get("generation",0),entry.get("name",""),entry.get("depth",0),entry.get("cause","")]
   if not seen.has(key):seen[key]=true;out.archive.append(entry.duplicate(true))
 out.archive.sort_custom(func(x,y):return int(x.get("generation",0))<int(y.get("generation",0)))
 while out.archive.size()>MAX_ARCHIVE:out.archive.pop_front()
 out.runs=maxi(maxi(a.runs,b.runs),out.archive.size())
 for key in ["relics","mutations","bosses"]:
  for source in [a.discoveries[key],b.discoveries[key]]:
   for id in source:
    if id not in out.discoveries[key]:out.discoveries[key].append(id)
 return out

static func mutation_for(seed_value,generation,bloodline,slot=0):
 var rng=RandomNumberGenerator.new();rng.seed=(str(seed_value)+":birth:"+str(generation)+":"+str(bloodline)+":"+str(slot)).hash()
 var universal=["fleetborn","skykin","stoutheart","bright_tail","stormpaw","riftblood"]
 var crest=["ember_crest","moon_crest","gale_crest","star_crest","dawn_crest","bloom_crest"][clampi(int(bloodline),0,5)]
 # About one birth in four expresses the bloodline-specific crest; there is no generation scaling.
 return crest if rng.randf()<.25 else universal[rng.randi_range(0,universal.size()-1)]

static func decorate_candidates(candidates,seed_value,archive):
 var generation=clampi(int(archive.get("generation",1)),1,1000000)
 var out=[]
 for i in range(candidates.size()):
  var candidate=candidates[i].duplicate(true)
  candidate.generation=generation
  candidate.mutation=mutation_for(seed_value,generation,int(candidate.bloodline),i)
  out.append(candidate)
 return out

static func mutation_name(id):return MUTATIONS.get(id,{"name":"Unmarked"}).name
static func mutation_text(id):return MUTATIONS.get(id,{"text":"No mutation."}).text
static func relic_name(id):return RELICS.get(id,{"name":"Unknown relic"}).name
static func relic_text(id):return RELICS.get(id,{"text":""}).text

static func valid_mutation(id,bloodline=-1):
 if not id is String or not MUTATIONS.has(id):return false
 var required=int(MUTATIONS[id].get("bloodline",-1))
 return required<0 or bloodline<0 or required==bloodline

static func valid_relic(id):return id is String and RELICS.has(id)

static func room_archetype(seed_value,depth,route):
 if depth%4==0:return "boss"
 var rng=RandomNumberGenerator.new();rng.seed=(str(seed_value)+":archetype:"+str(depth)+":"+str(route)).hash()
 var bag=[]
 if route=="cache":bag=["treasure","treasure","shrine","crossroads","ascent"]
 elif route=="trial":bag=["gauntlet","gauntlet","ascent","crossroads","shrine"]
 else:bag=["crossroads","crossroads","ascent","shrine","treasure","gauntlet"]
 return bag[rng.randi_range(0,bag.size()-1)]

static func room_reward(seed_value,depth,archetype,route):
 if ARCHETYPES.get(archetype,{}).get("reward","light")=="light":
  var amount=10+depth*2+(8 if archetype=="gauntlet" else 4 if archetype=="ascent" else 0)
  return {"kind":"light","amount":amount,"label":"%d bonus light"%amount}
 var ids=RELICS.keys();ids.sort()
 var rng=RandomNumberGenerator.new();rng.seed=(str(seed_value)+":relic:"+str(depth)+":"+archetype+":"+route).hash()
 var id=ids[rng.randi_range(0,ids.size()-1)]
 return {"kind":"relic","id":id,"label":relic_name(id)}

static func claim_room_reward(profile,room):
 var depth=int(profile.get("depth",1));var rewarded=profile.get("rewarded_rooms",[])
 if depth in rewarded:return {"claimed":false,"message":""}
 rewarded.append(depth);profile.rewarded_rooms=rewarded
 var reward=room.get("reward",{})
 if reward.get("kind")=="relic":
  var id=str(reward.get("id",""))
  if valid_relic(id) and id not in profile.relics and profile.relics.size()<MAX_RELICS:
   profile.relics.append(id)
   return {"claimed":true,"kind":"relic","id":id,"message":"RELIC FOUND · "+relic_name(id)+" · "+relic_text(id)}
  var overflow=18+depth*2;profile.light+=overflow
  return {"claimed":true,"kind":"light","amount":overflow,"message":"Relic echo converted to %d light."%overflow}
 var amount=clampi(int(reward.get("amount",0)),0,10000);profile.light+=amount
 return {"claimed":true,"kind":"light","amount":amount,"message":"ROOM BOUNTY · +%d light"%amount}

static func synergies_for(profile):
 var out=[];var relics=profile.get("relics",[])
 for id in SYNERGIES:
  var ok=true
  for req in SYNERGIES[id].requires:
   if req not in relics:ok=false;break
  if ok:out.append(id)
 return out

static func stat_modifiers(profile):
 var m={"health":0,"jumps":0,"ward":0,"speed":1.0,"damage":1.0,"radius":1.0,"magnet":1.0,"bounty":1.0,"dash_cooldown":1.0}
 var mutation=str(profile.get("mutation",""))
 var parts=[]
 if valid_mutation(mutation,int(profile.get("bloodline",-1))):parts.append(MUTATIONS[mutation])
 for id in profile.get("relics",[]):
  if valid_relic(id):parts.append(RELICS[id])
 for id in synergies_for(profile):parts.append(SYNERGIES[id])
 for part in parts:
  for key in ["health","jumps","ward"]:m[key]+=int(part.get(key,0))
  for key in ["speed","damage","radius","magnet","bounty","dash_cooldown"]:m[key]*=float(part.get(key,1.0))
 return m

static func build_summary(profile):
 var parts=[]
 var mutation=str(profile.get("mutation",""))
 if valid_mutation(mutation,int(profile.get("bloodline",-1))):parts.append("Mutation: "+mutation_name(mutation))
 if not profile.get("relics",[]).is_empty():
  var names=[]
  for id in profile.relics:names.append(relic_name(id))
  parts.append("Relics: "+", ".join(names))
 var syn=synergies_for(profile)
 if not syn.is_empty():
  var names=[]
  for id in syn:names.append(SYNERGIES[id].name)
  parts.append("Synergy: "+", ".join(names))
 return "  ·  ".join(parts)

static func record_death(archive,profile,cause):
 var out=normalize_archive(archive)
 var entry={"generation":int(profile.get("generation",out.generation)),"name":str(profile.get("name","Unknown")),"bloodline":int(profile.get("bloodline",0)),"level":1,"depth":int(profile.get("depth",1)),"slain":int(profile.get("slain",0)),"spirit":int(profile.get("spirit",0)),"seconds":float(profile.get("seconds",0)),"cause":str(cause),"mutation":str(profile.get("mutation","")),"relics":profile.get("relics",[]).duplicate(),"bosses":profile.get("bosses",[]).duplicate()}
 # XP is deliberately summarized, never carried into the next living profile.
 var xp=int(profile.get("xp",0));var level=1;var into=xp;var needed=24
 while level<60 and into>=needed:into-=needed;level+=1;needed=int(round(24.0*pow(level,1.30)))
 entry.level=level
 out.archive.append(entry)
 while out.archive.size()>MAX_ARCHIVE:out.archive.pop_front()
 out.runs+=1;out.generation=maxi(out.generation,entry.generation+1);out.best_depth=maxi(out.best_depth,entry.depth)
 if valid_mutation(entry.mutation) and entry.mutation not in out.discoveries.mutations:out.discoveries.mutations.append(entry.mutation)
 for id in entry.relics:
  if valid_relic(id) and id not in out.discoveries.relics:out.discoveries.relics.append(id)
 for id in entry.bosses:
  if id is String and id not in out.discoveries.bosses:out.discoveries.bosses.append(id)
 return out
