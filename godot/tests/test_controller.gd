extends SceneTree
const Fox=preload("res://fox.gd")
const Rules=preload("res://rules.gd")
var failures=[]
var count=0
var root_node:Node2D
var fox
func check(ok,msg):
 count+=1
 if not ok:failures.append(msg);printerr("FAIL "+msg)
 else:print("PASS "+msg)
func frames(n):
 for i in range(n):await physics_frame
func box(pos,size,one_way=false):
 var body=StaticBody2D.new();body.collision_layer=4 if one_way else 1;body.collision_mask=0
 var shape=CollisionShape2D.new();var rect=RectangleShape2D.new();rect.size=size;shape.shape=rect;shape.position=pos
 shape.one_way_collision=one_way;body.add_child(shape);root_node.add_child(body);return body
func spawn(pos):
 var f=Fox.new();f.attributes=Rules.stats(Rules.fresh({"name":"Controller fox","bloodline":0},1));f.position=pos;root_node.add_child(f);f.active=true;return f
func clear_inputs():
 for action in ["move_left","move_right","jump","dash","pulse","drop"]:Input.action_release(action)
func reset(pos):
 clear_inputs();fox.position=pos;fox.velocity=Vector2.ZERO;fox.dash_time=0;fox.dash_cooldown=0;fox.jump_buffer=0;fox.coyote=0;fox.jumps_used=0;fox.drop_time=0
 await frames(5)
func _initialize():call_deferred("run")
func run():
 for action in ["move_left","move_right","jump","dash","pulse","drop"]:
  if not InputMap.has_action(action):InputMap.add_action(action)
 root_node=Node2D.new();get_root().add_child(root_node)
 var floor_body=box(Vector2(500,570),Vector2(1000,100))
 fox=spawn(Vector2(150,520));await frames(5)
 check(fox.is_on_floor(),"real CharacterBody2D settles on solid floor")
 Input.action_press("move_right");await frames(10)
 check(fox.velocity.x>=319,"ground acceleration reaches full speed within 84ms")
 Input.action_release("move_right");var brake_x=fox.position.x;await frames(12)
 check(absf(fox.velocity.x)<.1 and fox.position.x-brake_x<12,"release brakes within twelve world pixels")
 await reset(Vector2(150,520));Input.action_press("jump");await frames(2);Input.action_release("jump")
 var tap_min=fox.position.y
 for i in range(90):await physics_frame;tap_min=minf(tap_min,fox.position.y)
 check(tap_min<470 and fox.is_on_floor(),"brief tap clears a useful height and lands")
 await reset(Vector2(150,520));Input.action_press("jump")
 var held_min=fox.position.y
 for i in range(90):await physics_frame;held_min=minf(held_min,fox.position.y)
 Input.action_release("jump")
 check(held_min<tap_min-20,"holding jump rises higher than tapping")
 await reset(Vector2(150,520));Input.action_press("jump");await frames(10);Input.action_release("jump");await frames(3);Input.action_press("jump");await frames(2)
 check(fox.velocity.y < -620 and fox.jumps_used==2,"second press performs exactly one air jump")
 Input.action_release("jump");await frames(2);Input.action_press("jump");await frames(2)
 check(fox.jumps_used==2 and fox.velocity.y> -620,"third jump is unavailable without inherited upgrade")
 await reset(Vector2(150,520))
 var wall=box(Vector2(270,425),Vector2(2,240));await frames(3)
 Input.action_press("move_right");Input.action_press("dash");await frames(2);Input.action_release("dash");Input.action_release("move_right");Input.action_press("move_left")
 var x0=fox.position.x;await frames(7)
 check(fox.position.x>x0 and fox.velocity.x>=0,"dash direction cannot reverse mid-burst")
 Input.action_release("move_left");await frames(30)
 check(fox.position.x<=248.1,"780px per second dash cannot tunnel through a two-pixel wall")
 root_node.remove_child(wall);wall.queue_free()
 await reset(Vector2(150,520))
 var ceiling=box(Vector2(150,390),Vector2(180,20));await frames(3);Input.action_press("jump")
 var ceiling_min=fox.position.y
 for i in range(70):await physics_frame;ceiling_min=minf(ceiling_min,fox.position.y)
 check(ceiling_min>=433.5,"solid ceiling stops upward motion without clipping")
 root_node.remove_child(ceiling);ceiling.queue_free()
 await reset(Vector2(150,520))
 var ledge=box(Vector2(150,450),Vector2(190,20),true);await frames(3);Input.action_press("jump")
 var ledge_min=fox.position.y
 for i in range(80):await physics_frame;ledge_min=minf(ledge_min,fox.position.y)
 Input.action_release("jump")
 check(ledge_min<430 and absf(fox.position.y-440)<1 and fox.is_on_floor(),"one-way ledge allows ascent and catches descent")
 Input.action_press("drop");await frames(2);Input.action_release("drop");await frames(80)
 check(absf(fox.position.y-520)<1 and fox.is_on_floor(),"drop input passes through a one-way ledge to solid ground")
 root_node.remove_child(ledge);ledge.queue_free()
 await reset(Vector2(150,520));fox.position=Vector2(150,504);fox.velocity=Vector2(0,450);fox.jumps_used=2;fox.coyote=0
 await frames(1);fox.jumps_used=2;Input.action_press("jump");await frames(8)
 check(fox.velocity.y < -450,"jump buffered before landing fires on landing")
 clear_inputs();fox.active=false;root_node.remove_child(floor_body);floor_body.queue_free();root_node.remove_child(fox);fox.queue_free();await frames(2)
 var total_gaps=0;var missed=[]
 for seed_value in range(40):
  var generated=Rules.room(9000+seed_value,1+seed_value%20,"trial" if seed_value%2 else "roots")
  for index in range(1,generated.platforms.size()):
   var a=generated.platforms[index-1];var b=generated.platforms[index]
   var gap=b.x-a.x-a.w;var rise=a.y-b.y
   var left=box(Vector2(200,550),Vector2(400,100))
   var right=box(Vector2(400+gap+220,550-rise),Vector2(440,100))
   fox=spawn(Vector2(330,500));await frames(4)
   fox.velocity.x=320;Input.action_press("move_right");Input.action_press("jump")
   var landed_right=false
   for frame in range(135):
    await physics_frame
    if fox.is_on_floor() and fox.position.x>400+gap+1:landed_right=true;break
   total_gaps+=1
   if not landed_right:missed.append({"seed":seed_value,"gap":gap,"rise":rise,"x":fox.position.x,"y":fox.position.y})
   clear_inputs();fox.active=false
   for n in [fox,left,right]:root_node.remove_child(n);n.queue_free()
   await frames(2)
 check(missed.is_empty(),"200 seeded required gaps traversed by actual engine collision with baseline fox")
 root_node.queue_free();await frames(2)
 print(JSON.stringify({"suite":"engine controller and generated traversal","checks":count,"gaps":total_gaps,"tapRise":520-tap_min,"heldRise":520-held_min,"missed":missed.slice(0,8),"failures":failures}))
 quit(0 if failures.is_empty() else 1)
