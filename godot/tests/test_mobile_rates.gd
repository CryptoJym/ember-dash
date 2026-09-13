extends SceneTree
## Trajectory comparison at different fixed physics rates, not physical-device FPS.
const Fox=preload("res://fox.gd")
const Rules=preload("res://rules.gd")
var host:Node2D
var fox
var checks=0
var failures=[]
var runs=[]
func verify(value,text):
 checks+=1
 if value:print("PASS "+text)
 else:failures.append(text);printerr("FAIL "+text)
func ticks(n):
 for i in range(n):await physics_frame
func reset():
 for a in ["move_left","move_right","jump","dash","pulse","drop"]:Input.action_release(a)
 if is_instance_valid(fox):host.remove_child(fox);fox.queue_free()
 fox=Fox.new();fox.attributes=Rules.stats(Rules.fresh({"name":"Physics rate","bloodline":0},10));fox.position=Vector2(200,520);host.add_child(fox);fox.active=true;await ticks(5)
func _initialize():call_deferred("run")
func run():
 for a in ["move_left","move_right","jump","dash","pulse","drop"]:
  if not InputMap.has_action(a):InputMap.add_action(a)
 host=Node2D.new();root.add_child(host)
 var floor_body=StaticBody2D.new();floor_body.collision_layer=1;var shape=CollisionShape2D.new();var rect=RectangleShape2D.new();rect.size=Vector2(3000,100);shape.shape=rect;shape.position=Vector2(1200,570);floor_body.add_child(shape);host.add_child(floor_body)
 for hz in [30,60,120]:
  Engine.physics_ticks_per_second=hz;await reset()
  Input.action_press("jump");var peak=520.0
  for i in range(hz):await physics_frame;peak=minf(peak,fox.position.y)
  Input.action_release("jump");verify(fox.is_on_floor(),"%dHz held jump returns to ground"%hz)
  var held_rise=520-peak
  verify(held_rise>95 and held_rise<120,"%dHz held jump retains authored height"%hz)
  await reset();Input.action_press("move_right");await ticks(int(hz*.2));Input.action_press("jump");await ticks(2);Input.action_release("move_right");var x0=fox.position.x
  await ticks(int(hz*.25));var drift=fox.position.x-x0
  verify(absf(fox.velocity.x)<1 and drift<=35,"%dHz thumb release arrests air drift"%hz)
  await reset();fox.position=Vector2(200,120);await ticks(2);Input.action_press("dash");await ticks(1);Input.action_release("dash");await ticks(int(hz*.6));var dash_distance=fox.position.x-200
  verify(dash_distance>145 and dash_distance<190,"%dHz dash endpoint stays inside mobile envelope"%hz)
  var wall=StaticBody2D.new();wall.collision_layer=1;var wall_shape=CollisionShape2D.new();var wr=RectangleShape2D.new();wr.size=Vector2(2,800);wall_shape.shape=wr;wall_shape.position=Vector2(310,150);wall.add_child(wall_shape);host.add_child(wall)
  await reset();Input.action_press("dash");await ticks(int(hz*.5));Input.action_release("dash")
  verify(fox.position.x<289.2,"%dHz dash does not tunnel through thin wall"%hz)
  host.remove_child(wall);wall.queue_free();await ticks(2)
  runs.append({"physics_hz":hz,"held_rise":held_rise,"air_drift":drift,"dash_distance":dash_distance})
 for key in ["held_rise","air_drift","dash_distance"]:
  var values=runs.map(func(r):return r[key]);verify(values.max()-values.min()<18,"30/60/120Hz "+key+" variation stays below18px")
 Engine.physics_ticks_per_second=120;host.queue_free();await ticks(3)
 print(JSON.stringify({"suite":"fixed-rate mobile physics","checks":checks,"failures":failures,"runs":runs}));quit(0 if failures.is_empty() else 1)
