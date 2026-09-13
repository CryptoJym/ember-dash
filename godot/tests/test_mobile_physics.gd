extends SceneTree
## Touch events hit the real control nodes; trajectory fixtures use actual engine collision.
const Game=preload("res://main.gd")
var count=0
var failures=[]
var observations={}
var g
func check(value,message):
 count+=1
 if value:print("PASS "+message)
 else:failures.append(message);printerr("FAIL "+message)
func frames(n):
 for i in range(n):await physics_frame
func touch(index,pos,pressed=true,canceled=false):
 var e=InputEventScreenTouch.new();e.index=index;e.position=pos;e.pressed=pressed;e.canceled=canceled;Input.parse_input_event(e)
func drag(index,pos):
 var e=InputEventScreenDrag.new();e.index=index;e.position=pos;Input.parse_input_event(e)
func center(action):
 for b in g.touch_buttons:
  if b.action==action:return b.position+Vector2(40,40)*b.scale
 return Vector2(-100,-100)
func fresh():
 g.clear_input();g.start_life({"name":"Mobile physics fixture","bloodline":0});g.touch_root.visible=true
 await frames(6)
func _initialize():call_deferred("run")
func run():
 root.size=Vector2i(390,844)
 g=Game.new();g.test_mode=true;g.ignore_focus=true;root.add_child(g);await frames(5)
 await fresh()
 touch(0,center("move_right"));await frames(12)
 check(g.fox.velocity.x>300,"movement begins from the actual touch button")
 drag(0,center("move_left"));await frames(16)
 check(g.fox.velocity.x< -300,"movement thumb slides right-to-left without a lift")
 drag(0,center("move_right"));await frames(16)
 check(g.fox.velocity.x>300,"same movement thumb slides back to the right")
 touch(0,center("move_right"),false,true);await frames(14)
 check(absf(g.fox.velocity.x)<1,"OS touch cancellation releases movement")
 await fresh();touch(0,center("move_right"));await frames(8)
 drag(0,center("move_right")+Vector2(0,31));await frames(8)
 check(g.fox.velocity.x>300,"31px vertical thumb drift keeps intended direction")
 touch(0,center("move_right"),false);await frames(12)
 check(absf(g.fox.velocity.x)<1,"release after thumb drift leaves no stuck input")
 check(center("drop").x>=0,"mobile has an explicit one-way-platform drop control")
 await fresh();touch(0,center("move_right"));touch(1,center("jump"));await frames(3)
 check(g.fox.velocity.x>0 and g.fox.velocity.y<0,"jump finger does not steal movement finger")
 g.play_pause();await frames(3)
 touch(0,center("move_right"),false);touch(1,center("jump"),false)
 g.set_mode("playing");g.touch_root.visible=true;await frames(36)
 check(not Input.is_action_pressed("move_right") and absf(g.fox.velocity.x)<1,"pause/resume while fingers held cannot stick movement")
 await fresh();g.fox.position=Vector2(180,200);g.fox.velocity=Vector2.ZERO;await frames(2)
 Input.action_press("dash");await frames(2);Input.action_release("dash")
 var dash_start=180.0
 await frames(48)
 observations.air_dash_total=g.fox.position.x-dash_start
 check(g.fox.position.x-dash_start<190,"air dash plus release stops within190px rather than a long uncontrolled coast")
 await fresh();g.fox.position=Vector2(180,490);g.fox.velocity=Vector2(0,300);await frames(1)
 g.fox.jumps_used=2;g.fox.coyote=0
 Input.action_press("jump");await frames(1);Input.action_release("jump")
 var peak=520.0;var took_off=false
 for i in range(100):
  await physics_frame
  if g.fox.velocity.y<0:took_off=true;peak=minf(peak,g.fox.position.y)
 observations.buffered_tap_rise=520-peak
 check(took_off,"early jump tap is retained until landing")
 check(520-peak<90 and 520-peak>45,"released buffered jump stays a short hop, not an unwanted full-height leap")
 await fresh();touch(0,center("move_right"));await frames(8);g.resize_ui();await frames(12)
 check(not Input.is_action_pressed("move_right"),"layout change cancels stale thumb coordinates")
 touch(0,center("move_right"),false)
 await fresh();touch(0,center("jump"));touch(0,center("jump"),false)
 var quick_peak=520.0
 for i in range(90):await physics_frame;quick_peak=minf(quick_peak,g.fox.position.y)
 check(520-quick_peak>45 and 520-quick_peak<90,"touch press/release within one physics step registers one short hop")
 check(g.fox.is_on_floor() and g.fox.jumps_used<=1,"quick tap finishes without an automatic repeat jump")
 g.queue_free();await frames(3)
 print(JSON.stringify({"suite":"mobile thumb and physics","checks":count,"observations":observations,"failures":failures}))
 quit(0 if failures.is_empty() else 1)
