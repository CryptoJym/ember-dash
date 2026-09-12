extends SceneTree
## Integration against the actual scene, UI callbacks, combat, and permadeath.
const Game=preload("res://main.gd")
const Rules=preload("res://rules.gd")
var failures=[]
var count=0
func check(ok,msg):
 count+=1
 if not ok:failures.append(msg);printerr("FAIL "+msg)
 else:print("PASS "+msg)
func frames(n):
 for i in range(n):await process_frame
func buttons(node):
 var found=[]
 for child in node.get_children():
  if child is Button:found.append(child)
  found.append_array(buttons(child))
 return found
func click(game,phrase):
 var found=(buttons(game.ui)+buttons(game.menu_layer)).filter(func(b):return b.text.begins_with(phrase))
 check(found.size()==1,"single actionable button: "+phrase)
 if found.size()!=1:return
 found[0].pressed.emit()
 await frames(3)
func panels(game):return game.menu_layer.get_children().filter(func(n):return n is PanelContainer and n.is_visible_in_tree())
func _initialize():call_deferred("run")
func run():
 var g=Game.new();g.test_mode=true;g.ignore_focus=true;get_root().add_child(g)
 await frames(4)
 check(g.mode=="title" and panels(g).size()==1,"one title panel")
 await click(g,"Choose your fox")
 check(g.mode=="choose" and panels(g).size()==1,"one selection panel")
 var choice=g.options[g.selection].duplicate()
 await click(g,"Begin as")
 check(g.mode=="playing" and g.fox.active,"begin enables physics")
 check(panels(g).is_empty(),"no menu overlay survives begin callback")
 check(g.fox.sprite.sprite_frames.has_animation("run"),"animated fox loaded")
 await frames(4)
 g.play_pause();await frames(3)
 check(g.mode=="paused" and not g.fox.active and panels(g).size()==1,"pause disables gameplay with one panel")
 await click(g,"Continue")
 check(g.mode=="playing" and panels(g).is_empty(),"resume removes pause panel")
 var e=g.room.enemies[0];var old=g.profile.xp
 g.damage_enemy(e,999);var earned=g.profile.xp
 check(earned>old and e.id in g.profile.defeated,"enemy spirit awards XP once")
 g.damage_enemy(e,999)
 check(g.profile.xp==earned,"defeated enemy cannot award twice")
 g.profile.light=100;g.fox.position=g.room.portal;g.open_camp();await frames(3)
 check(g.mode=="camp" and panels(g).size()==1,"chamber transition opens one sanctuary")
 var level=Rules.level_info(g.profile.xp).level
 check(level>1 and g.fox.attributes.level==level,"sanctuary levels apply to active stats")
 var wallet=g.profile.light;var cost=Rules.price(g.profile,"power")
 await click(g,"Inner flame")
 check(g.profile.upgrades.power==1 and g.profile.light==wallet-cost,"shop spends exact light and raises strength")
 await click(g,"Follow the roots")
 check(g.profile.depth==2 and g.mode=="playing" and g.fox.active and panels(g).is_empty(),"new chamber retains level and clears menus")
 check(g.profile.upgrades.power==1 and Rules.level_info(g.profile.xp).level>=level,"same fox keeps abilities between rooms")
 g.fox.health=1;g.fox.invulnerability=0;g.fox.hit(1,g.fox.position-Vector2(10,0));await frames(3)
 # Moonward absorbs the first hit. Test death after explicitly exhausting the ward.
 if g.mode!="dead":g.fox.ward=0;g.fox.invulnerability=0;g.fox.hit(1,g.fox.position-Vector2(10,0));await frames(3)
 check(g.mode=="dead" and not g.fox.active,"actual lethal hit ends gameplay")
 check(g.profile=={"version":1,"alive":false},"death discards every character progression field")
 await click(g,"Start a new life")
 await click(g,"Begin as")
 check(g.profile.xp==0 and g.profile.light==0 and Rules.stats(g.profile).level==1,"next fox starts with no XP or currency")
 check(g.profile.upgrades=={"vitality":0,"power":0,"haste":0},"next fox inherits no dead-character upgrades")
 g.queue_free();await frames(3)
 # Let the native audio mixer acknowledge stopped streams before engine teardown.
 OS.delay_msec(80)
 await frames(2)
 print(JSON.stringify({"suite":"actual Godot scene flow","checks":count,"failures":failures}))
 quit(0 if failures.is_empty() else 1)
