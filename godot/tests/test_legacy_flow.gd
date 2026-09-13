extends SceneTree
const Game=preload("res://main.gd")
const Legacy=preload("res://legacy.gd")
var failures=[]
var count=0
func check(ok,msg):
 count+=1
 if ok:print("PASS "+msg)
 else:failures.append(msg);printerr("FAIL "+msg)
func frames(n):
 for i in range(n):await process_frame
func buttons(node):
 var found=[]
 for child in node.get_children():
  if child is Button:found.append(child)
  found.append_array(buttons(child))
 return found
func click(game,prefix):
 var found=(buttons(game.ui)+buttons(game.menu_layer)).filter(func(b):return b.text.begins_with(prefix))
 check(found.size()==1,"single actionable button: "+prefix)
 if found.size()==1:found[0].pressed.emit();await frames(3)
func _initialize():call_deferred("run")
func run():
 var g=Game.new();g.test_mode=true;g.ignore_focus=true;get_root().add_child(g);await frames(5)
 check(g.legacy.generation==1 and g.legacy.runs==0,"scene begins with empty lineage history in isolated test mode")
 await click(g,"Choose your fox")
 var chosen=g.options[g.selection].duplicate(true)
 check(chosen.has("mutation") and chosen.generation==1,"choice screen candidates carry visible lineage mutation metadata")
 await click(g,"Begin as")
 check(g.profile.generation==1 and g.profile.mutation==chosen.mutation,"chosen mutation enters the living profile")
 var first_room=g.room
 check(first_room.has("archetype") and first_room.has("reward"),"actual scene builds through room director")
 g.profile.light=0;g.fox.position=g.room.portal
 for e in g.room.enemies:e.hp=0
 g.open_camp();await frames(3)
 check(g.profile.rewarded_rooms.has(1),"sanctuary claims directed room reward exactly once")
 var reward_state={"light":g.profile.light,"relics":g.profile.relics.duplicate()}
 g.set_mode("playing");g.open_camp();await frames(3)
 check(g.profile.light==reward_state.light and g.profile.relics==reward_state.relics,"reopening sanctuary cannot farm directed reward")
 g.set_mode("playing");g.fox.death_cause="the test depths";g.on_death();await frames(3)
 check(g.profile=={"version":1,"alive":false},"living profile still collapses to the original dead tombstone")
 check(g.legacy.runs==1 and g.legacy.generation==2 and g.legacy.archive.size()==1,"death records ancestor in separate lineage archive")
 check(g.legacy.archive[0].name==chosen.name and g.legacy.archive[0].mutation==chosen.mutation,"ancestor record preserves identity and mutation")
 await click(g,"Start a new life")
 check(g.options.all(func(c):return c.generation==2),"rebirth choices advance to next generation")
 var descendant=g.options[0]
 g.start_life(descendant);await frames(3)
 check(g.profile.xp==0 and g.profile.light==0 and g.profile.spirit==0 and g.profile.relics.is_empty(),"new descendant receives no dead-life progression")
 g.open_title();await frames(3);await click(g,"Lineage archive")
 check(g.mode=="archive","lineage archive is reachable from title")
 check(g.menu_layer.get_children().any(func(n):return n is PanelContainer and n.is_visible_in_tree()),"archive renders as a mobile-safe menu panel")
 g.queue_free();await frames(3)
 print(JSON.stringify({"suite":"actual lineage scene flow","checks":count,"failures":failures}))
 quit(0 if failures.is_empty() else 1)
