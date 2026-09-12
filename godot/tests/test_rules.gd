extends SceneTree
const Rules=preload("res://rules.gd")
var failures=[]
func check(ok,msg):
 if not ok:failures.append(msg);printerr("FAIL "+msg)
 else:print("PASS "+msg)
func _initialize():
 var first=Rules.candidates(9911)
 check(first.size()==3,"three candidates")
 var names=first.map(func(x):return x.name)
 check(names.duplicate().size()==3 and names[0]!=names[1] and names[1]!=names[2] and names[0]!=names[2],"candidate names unique")
 var p=Rules.fresh(first[0],9911)
 check(p.alive and p.xp==0 and p.light==0 and p.depth==1,"fresh fox starts clean")
 var levels=Rules.award_xp(p,500)
 check(levels>0 and Rules.level_info(p.xp).level>1,"spirit XP raises level")
 check(p.tokens>0,"leveling awards talent tokens")
 p.light=1000
 check(Rules.purchase(p,"power"),"living fox can buy strength")
 check(Rules.talent(p,"wings"),"living fox can awaken talent")
 var saved=Rules.normalize(p)
 check(saved.alive and saved.xp==p.xp and saved.upgrades.power==1,"profile round-trip preserves living progression")
 var dead=Rules.normalize({"version":1,"alive":false})
 check(dead.alive==false and dead.size()==2,"death tombstone contains no progression")
 var room=Rules.room(12345,8,"trial")
 check(room.platforms.size()==6 and room.enemies.any(func(e):return e.type=="keeper"),"boss chamber generated")
 check(room.width>2500,"generated room has traversal length")
 var deterministic=Rules.room(12345,8,"trial")
 check(JSON.stringify(room)==JSON.stringify(deterministic),"room generation deterministic")
 check(Rules.normalize({"version":99,"alive":true}).is_empty(),"unknown save version is not adopted")
 check(Rules.normalize(null).is_empty() and Rules.normalize([]).is_empty(),"non-object save rejected")
 var corrupt=p.duplicate(true);corrupt.health=0
 check(Rules.normalize(corrupt)=={"version":1,"alive":false},"zero health cannot resume as living")
 check(not Rules.purchase(dead,"power") and not Rules.talent(dead,"wings") and Rules.award_xp(dead,500)==0,"dead profile cannot gain or spend progression")
 var empty=Rules.fresh(first[0],45);var before=empty.duplicate(true)
 check(not Rules.purchase(empty,"power") and empty==before,"insufficient funds leave profile unchanged")
 check(not Rules.purchase(empty,"invented") and empty==before,"unknown upgrade cannot mutate state")
 var geometry_ok=true;var naming_ok=true
 for i in range(1000):
  var heirs=Rules.candidates(i);var names_seen=[]
  for h in heirs:
   if h.name in names_seen:naming_ok=false
   names_seen.append(h.name)
  var generated=Rules.room(i,1+i%40,["roots","cache","trial"][i%3])
  for j in range(1,generated.platforms.size()):
   var left=generated.platforms[j-1];var right=generated.platforms[j]
   if right.x-left.x-left.w>110 or absf(right.y-left.y)>30:geometry_ok=false
 check(naming_ok,"1000 deterministic choices have no duplicate candidate names")
 check(geometry_ok,"1000 generated chambers retain the tested geometry envelope")
 if failures.is_empty():print("RULE_TESTS_OK");quit(0)
 else:print("RULE_TESTS_FAILED "+str(failures));quit(1)
