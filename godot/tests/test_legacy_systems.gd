extends SceneTree
const Rules=preload("res://rules.gd")
const Legacy=preload("res://legacy.gd")
var failures=[]
var count=0
func check(ok,msg):
 count+=1
 if ok:print("PASS "+msg)
 else:failures.append(msg);printerr("FAIL "+msg)
func _initialize():call_deferred("run")
func run():
 var archive=Legacy.fresh_archive()
 check(archive.generation==1 and archive.runs==0 and archive.archive.is_empty(),"fresh lineage archive has history but no permanent progression")
 var base=Rules.candidates(12345)
 var a=Legacy.decorate_candidates(base,12345,archive);var b=Legacy.decorate_candidates(base,12345,archive)
 check(a.size()==3 and a==b,"birth mutations are deterministic from candidate seed")
 check(a.all(func(c):return Legacy.valid_mutation(c.mutation,c.bloodline) and c.generation==1),"every candidate receives one valid positive mutation")
 var p=Rules.fresh(a[0],77);p.xp=99;p.light=88;p.spirit=17;p.relics=["echo_fang","swift_ember"];p.depth=5;p.slain=7;p.bosses=["rootbound_sentinel"]
 var before=Rules.stats(p)
 check(before.damage>4 and before.speed>320,"relics, Spirit and mutation affect only the living build")
 check("predator_flow" in before.synergies,"matching relic pair activates a named synergy")
 archive=Legacy.record_death(archive,p,"a test guardian")
 check(archive.runs==1 and archive.generation==2 and archive.best_depth==5 and archive.archive.size()==1,"death advances generation and archives the completed life")
 check("echo_fang" in archive.discoveries.relics and "rootbound_sentinel" in archive.discoveries.bosses,"archive records discoveries without keeping equipped power")
 var next=Legacy.decorate_candidates(Rules.candidates(54321,p.name),54321,archive)[0]
 var child=Rules.fresh(next,88)
 check(child.generation==2 and child.xp==0 and child.light==0 and child.spirit==0 and child.relics.is_empty(),"descendant starts fresh despite ancestor history")
 check(child.upgrades=={"vitality":0,"power":0,"haste":0} and child.talents.is_empty(),"dead character upgrades and talents never become lineage stats")
 var old_save={"version":1,"alive":true,"name":"Old Fox","bloodline":0,"seed":19,"depth":2,"xp":12,"light":3,"spirit":1,"health":5,"ward":0,"tokens":0,"upgrades":{"vitality":0,"power":0,"haste":0},"talents":{},"taken":[],"defeated":[],"chest":false,"cleared":false,"position":[100,520]}
 var normalized=Rules.normalize(old_save)
 check(normalized.alive and normalized.generation==1 and normalized.mutation=="" and normalized.relics.is_empty(),"pre-lineage living saves normalize without corruption")
 var relic_profile=Rules.fresh({"name":"Relic fox","bloodline":0,"generation":1,"mutation":""},22);var no_relic=Rules.stats(relic_profile)
 relic_profile.relics=["sky_feather","rift_charm"];var relic_stats=Rules.stats(relic_profile)
 check(relic_stats.jumps==no_relic.jumps+1 and relic_stats.dash_cooldown<no_relic.dash_cooldown,"relic modifiers alter active movement stats")
 check("stormstep" in relic_stats.synergies,"Skyroot Feather plus Rift Charm creates Stormstep")
 var reward_room={"reward":{"kind":"relic","id":"spirit_lens"}}
 var first=Legacy.claim_room_reward(relic_profile,reward_room);var light_before=relic_profile.light;var second=Legacy.claim_room_reward(relic_profile,reward_room)
 check(first.claimed and "spirit_lens" in relic_profile.relics,"room reward grants a relic to the living fox")
 check(not second.claimed and relic_profile.light==light_before,"same chamber reward cannot be farmed twice")
 for depth in range(1,17):
  var room=Rules.room(9001,depth,"roots")
  check(Legacy.ARCHETYPES.has(room.archetype) and room.reward is Dictionary,"room director emits a named archetype and deterministic reward")
  if depth%4==0:check(room.archetype=="boss" and room.enemies.any(func(e):return e.id=="keeper"),"every fourth chamber remains a guardian room")
 var treasure=0;var gauntlet=0
 for seed in range(100):
  if Legacy.room_archetype(seed,3,"cache")=="treasure":treasure+=1
  if Legacy.room_archetype(seed,3,"trial")=="gauntlet":gauntlet+=1
 check(treasure>=25 and gauntlet>=25,"route choices materially bias treasure and gauntlet room pools")
 var geometry_ok=true
 for seed in range(100):
  for depth in range(1,13):
   var room=Rules.room(12000+seed,depth,["roots","cache","trial"][depth%3])
   if room.platforms.size()!=6 or room.width<=0:geometry_ok=false
   for i in range(1,room.platforms.size()):
    var gap=room.platforms[i].x-room.platforms[i-1].x-room.platforms[i-1].w
    if gap<58 or gap>110:geometry_ok=false
 check(geometry_ok,"1200 directed rooms preserve the previously tested traversable gap envelope")
 var other=Legacy.fresh_archive();var q=Rules.fresh({"name":"Second branch","bloodline":1,"generation":1,"mutation":"moon_crest"},8);other=Legacy.record_death(other,q,"the moon")
 var merged=Legacy.merge_archives(archive,other)
 check(merged.archive.size()==2 and merged.discoveries.relics.has("echo_fang"),"concurrent lineage histories merge without dropping distinct ancestors")
 var bounded=Legacy.fresh_archive()
 for i in range(80):
  var life=Rules.fresh({"name":"Ancestor "+str(i),"bloodline":i%6,"generation":i+1,"mutation":""},i);bounded=Legacy.record_death(bounded,life,"time")
 check(bounded.archive.size()==Legacy.MAX_ARCHIVE and bounded.generation==81,"archive stays bounded while generation history continues")
 print(JSON.stringify({"suite":"lineage relic mutation and room director","checks":count,"treasure_bias":treasure,"gauntlet_bias":gauntlet,"failures":failures}))
 quit(0 if failures.is_empty() else 1)
