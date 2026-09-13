extends SceneTree
const Encounter=preload("res://encounter.gd")
const Game=preload("res://main.gd")
var failures=[]
var checks=0
func check(value,message):
 checks+=1
 if value:print("PASS "+message)
 else:failures.append(message);printerr("FAIL "+message)
func enemy(kind):return {"type":kind,"hp":30.0,"x":200.0,"y":400.0,"cooldown":0.0}
func frames(n):
 for i in range(n):await process_frame
func _initialize():call_deferred("run")
func run():
 var e=enemy("spitter")
 check(Encounter.ranged_step(e,Vector2(100,400),.01,false).is_empty() and e.get("windup",0)==0,"offscreen enemy cannot fire or silently charge")
 check(Encounter.ranged_step(e,Vector2(100,400),.01,true).is_empty() and e.windup>.5,"newly visible ready enemy begins a visible wind-up rather than firing immediately")
 var shots=[]
 for i in range(25):shots.append_array(Encounter.ranged_step(e,Vector2(300,400),.01,true))
 check(shots.is_empty(),"player has time to read and dodge the wind-up")
 for i in range(32):shots.append_array(Encounter.ranged_step(e,Vector2(300,400),.01,true))
 check(shots.size()==1 and shots[0].x<0,"released shot follows telegraphed aim, not a last-instant homing correction")
 check(e.cooldown==2.3,"ranged attack resets its full recovery")
 e=enemy("spitter");Encounter.ranged_step(e,Vector2(100,400),.01,true);e.stagger=.12
 check(Encounter.ranged_step(e,Vector2(100,400),.01,true).is_empty() and e.windup==0,"a hit interrupts enemy wind-up")
 e=enemy("keeper");Encounter.ranged_step(e,Vector2(100,400),.01,true);shots=[]
 for i in range(73):shots.append_array(Encounter.ranged_step(e,Vector2(100,400),.01,true))
 check(shots.size()==3,"keeper retains three-projectile volley after visible wind-up")
 var g=Game.new();g.test_mode=true;g.ignore_focus=true;get_root().add_child(g);await frames(5)
 g.start_life({"name":"Readable fox","bloodline":0});await frames(5)
 g.fox.ward=0;g.fox.health=1;g.fox.invulnerability=0;g.fox.hit(1,g.fox.position-Vector2(20,0),"crystal spikes");await frames(5)
 check(g.mode=="dead" and g.last_dead.cause=="crystal spikes","death recap reports the actual lethal cause")
 check(g.profile=={"version":1,"alive":false},"death recap does not retain a persistent character profile")
 g.start_life({"name":"Motion fox","bloodline":0});await frames(5);g.play_pause();await frames(5)
 check(not g.fox.sprite.is_playing(),"actual game pause freezes fox animation")
 g.reduced_motion=true;g.fox.reduced_motion=true;g.set_mode("playing");await frames(5)
 check(g.fox.sprite.scale.abs().is_equal_approx(Vector2.ONE*g.fox.art_scale),"reduced motion keeps authored sprite proportions")
 var bad=g.room.enemies[0];g.damage_enemy(bad,1)
 check(bad.get("stagger",0)>.0 and not g.combat_text.is_empty(),"actual hit produces enemy stagger and damage feedback")
 var keeper=enemy("keeper");keeper.windup=.5
 g.damage_enemy(keeper,1)
 check(keeper.windup==.5 and keeper.stagger==0.0,"guardian is not stun-locked by repeated pulse attacks")
 check(Encounter.ranged_step(keeper,Vector2(100,400),.1,true).is_empty() and keeper.windup>.0,"guardian keeps its visible wind-up after taking damage")
 g.queue_free();await frames(4)
 print(JSON.stringify({"suite":"combat readability","checks":checks,"failures":failures}));quit(0 if failures.is_empty() else 1)
