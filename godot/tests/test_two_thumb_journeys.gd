extends SceneTree
## State-aware two-thumb pilot in the actual engine. No health, XP, position,
## enemy, or wallet edits after starting each normal fresh life. Not a browser test.
const Game=preload("res://main.gd")
var g
var failures=[]
var lives=[]
var count=0
var held={}
func frames(n):
 for i in range(n):await physics_frame
func set_thumb(index,action):
 if held.get(index,"")==action:return
 if held.has(index):
  var release=InputEventScreenTouch.new();release.index=index;release.position=control(held[index]);release.pressed=false;Input.parse_input_event(release);held.erase(index)
 if action!="":
  var press=InputEventScreenTouch.new();press.index=index;press.position=control(action);press.pressed=true;Input.parse_input_event(press);held[index]=action
func control(action):
 for b in g.touch_buttons:
  if b.action==action:return b.position+Vector2(40,40)*b.scale
 return Vector2(-100,-100)
func verify(value,text):
 count+=1
 if value:print("PASS "+text)
 else:failures.append(text);printerr("FAIL "+text)
func _initialize():call_deferred("run")
func run():
 for birth in range(6):
  for trial in range(3):
   # Give each life a fresh scene/context. Reusing a sanctuary immediately
   # with a new viewport can deliver old deferred UI callbacks into the fixture.
   if is_instance_valid(g):g.queue_free();await frames(5)
   root.size=Vector2i(390,844) if trial%2==0 else Vector2i(844,390)
   await frames(5)
   g=Game.new();g.test_mode=true;g.ignore_focus=true;root.add_child(g);await frames(6)
   g.start_life({"name":"Thumb pilot "+str(birth)+"-"+str(trial),"bloodline":birth});g.touch_root.visible=true;await frames(8)
   var jump_until=0;var ticks_taken=0
   for tick in range(18000):
    await physics_frame;ticks_taken=tick
    if g.mode!="playing":break
    var f=g.fox;var portal=g.room.portal.x
    if tick==240 and f.position.x<110:
     print("STALLED_DIAGNOSTIC "+JSON.stringify({"birth":birth,"trial":trial,"position":[f.position.x,f.position.y],"axis":Input.get_axis("move_left","move_right"),"held":held,"visible":g.touch_root.visible,"size":[root.size.x,root.size.y],"buttons":g.touch_buttons.map(func(b):return {"action":b.action,"pressed":b.is_pressed(),"point":str(b.position)})}))
     break
    var nearest=null
    for e in g.room.enemies:
     if e.hp>0 and e.x>f.position.x-40 and (nearest==null or e.x<nearest.x):nearest=e
    var close=nearest!=null and absf(nearest.x-f.position.x)<65
    var right=not close and f.position.x<portal-55
    set_thumb(0,"move_right" if right else "")
    var base=null
    for pl in g.room.platforms:
     if f.position.x>=pl.x-20 and f.position.x<=pl.x+pl.w+20:base=pl;break
    if f.is_on_floor() and base!=null and base!=g.room.platforms.back() and base.x+base.w-f.position.x<72 and right and tick>=jump_until:jump_until=tick+30
    set_thumb(1,"jump" if tick<jump_until else "pulse")
    if f.position.x>=portal-70:
     set_thumb(0,"");set_thumb(1,"interact")
   set_thumb(0,"");set_thumb(1,"")
   var name="bloodline%d trial%d"%[birth,trial]
   verify(g.mode=="camp",name+" completes procedural chamber with at most two fingers")
   verify(g.profile.get("xp",0)>0 and g.profile.get("spirit",0)>0 and g.profile.get("light",0)>=18,name+" earns progression without test gifts")
   lives.append({"bloodline":birth,"trial":trial,"seed":g.profile.get("seed",0),"mode":g.mode,"hp":g.fox.health,"xp":g.profile.get("xp",0),"spirit":g.profile.get("spirit",0),"light":g.profile.get("light",0),"simulated_seconds":ticks_taken/120.0})
 g.queue_free();await frames(4)
 print(JSON.stringify({"suite":"two-thumb native journeys","checks":count,"failures":failures,"lives":lives}));quit(0 if failures.is_empty() else 1)
