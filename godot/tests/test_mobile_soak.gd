extends SceneTree
## Repeated thumb interactions through the real Godot input/control/physics path.
## Fixture-based engine tests, NOT a browser/physical-phone playthrough.
const Game=preload("res://main.gd")
var g
var checks=0
var failures=[]
var cycles=0
func check(v,message):
 checks+=1
 if v:print("PASS "+message)
 else:failures.append(message);printerr("FAIL "+message)
func frames(n):
 for i in range(n):await physics_frame
func center(a):
 for b in g.touch_buttons:
  if b.action==a:return b.position+Vector2(40,40)*b.scale
 return Vector2(-100,-100)
func finger(id,a,down=true,offset=Vector2.ZERO,canceled=false):
 var e=InputEventScreenTouch.new();e.index=id;e.position=center(a)+offset;e.pressed=down;e.canceled=canceled;Input.parse_input_event(e)
func slide(id,a,offset=Vector2.ZERO):
 var e=InputEventScreenDrag.new();e.index=id;e.position=center(a)+offset;Input.parse_input_event(e)
func _initialize():call_deferred("run")
func run():
 g=Game.new();g.test_mode=true;g.ignore_focus=true;root.add_child(g);await frames(6)
 for dimensions in [Vector2i(320,568),Vector2i(375,667),Vector2i(390,844),Vector2i(844,300),Vector2i(844,390),Vector2i(768,1024)]:
  root.size=dimensions;g.resize_ui();await frames(8)
  g.start_life({"name":"Repeated touch fixture","bloodline":0});g.touch_root.visible=true;await frames(90)
  var foot=(g.fox.position-g.camera.position)*g.camera.zoom+Vector2(dimensions)*.5
  var body=Rect2(foot-Vector2(21,34)*g.camera.zoom,Vector2(42,34)*g.camera.zoom)
  var hidden=[]
  for b in g.touch_buttons:
   if not b.is_visible_in_tree():continue
   var c=b.position+Vector2(40,40)*b.scale
   var nearest=Vector2(clampf(c.x,body.position.x,body.end.x),clampf(c.y,body.position.y,body.end.y))
   if nearest.distance_to(c)<b.scale.x*37:hidden.append(b.action)
  check(hidden.is_empty(),str(dimensions)+": every control clears the starting fox, overlaps="+str(hidden))
  for lap in range(5):
   var name=str(dimensions)+" lap "+str(lap+1)
   finger(0,"move_right");await frames(12);slide(0,"move_left");await frames(17)
   check(g.fox.velocity.x< -300,name+" thumb reversal")
   slide(0,"move_right",Vector2(0,31));await frames(17)
   check(g.fox.velocity.x>300,name+" drift-tolerant slide return")
   finger(1,"jump");await frames(3)
   var jumped=g.fox.jumps_used;var serial=g.fox.dash_serial
   slide(1,"dash");await frames(4)
   check(g.fox.jumps_used==jumped and g.fox.dash_serial==serial,name+" action-finger drift triggers no accidental dash/double jump")
   finger(0,"move_right",false,Vector2.ZERO,true);finger(1,"dash",false,Vector2.ZERO,true);await frames(85)
   check(g.fox.is_on_floor() and absf(g.fox.velocity.x)<1 and not Input.is_action_pressed("jump"),name+" cancel/landing stable")
   cycles+=1
  var ledge=g.room.ledges[0]
  g.fox.position=Vector2(ledge.x+70,ledge.y);g.fox.velocity=Vector2.ZERO;await frames(5)
  check(g.fox.is_on_floor() and absf(g.fox.position.y-ledge.y)<2,str(dimensions)+": fixture settles on one-way ledge")
  finger(0,"drop");await frames(3);finger(0,"drop",false);await frames(85)
  check(g.fox.is_on_floor() and g.fox.position.y>ledge.y+90,str(dimensions)+": real Down touch passes through ledge")
  var solid_y=g.fox.position.y;finger(0,"drop");await frames(3);finger(0,"drop",false);await frames(50)
  check(g.fox.is_on_floor() and absf(g.fox.position.y-solid_y)<2,str(dimensions)+": Down cannot fall through solid floor")
 g.queue_free();await frames(4)
 print(JSON.stringify({"suite":"repeated mobile input","checks":checks,"cycles":cycles,"failures":failures}));quit(0 if failures.is_empty() else 1)
