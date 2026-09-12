extends SceneTree
const Fox=preload("res://fox.gd")
var failures=[]
func check(ok,msg):
 if not ok:failures.append(msg);printerr("FAIL "+msg)
 else:print("PASS "+msg)
func add_box(root,pos,size,layer=1):
 var body=StaticBody2D.new();body.collision_layer=layer;body.collision_mask=0
 var cs=CollisionShape2D.new();var rect=RectangleShape2D.new();rect.size=size;cs.shape=rect;cs.position=pos;body.add_child(cs);root.add_child(body);return body
func setup_input():
 for a in ["move_left","move_right","jump","dash","pulse","drop"]:
  if not InputMap.has_action(a):InputMap.add_action(a)
func frames(n):
 for i in range(n):await physics_frame
func _initialize():call_deferred("run")
func run():
 setup_input()
 var root=Node2D.new();get_root().add_child(root)
 add_box(root,Vector2(500,545),Vector2(1000,50))
 add_box(root,Vector2(300,420),Vector2(30,250))
 var fox=Fox.new();fox.attributes={"speed":320.0,"jumps":2,"dash_time":0.17,"dash_cooldown":1.0};fox.position=Vector2(100,520);root.add_child(fox);fox.active=true
 await frames(5)
 check(fox.is_on_floor(),"fox lands on engine floor")
 Input.action_press("move_right");await frames(120);Input.action_release("move_right")
 check(fox.position.x<265,"solid wall blocks horizontal movement")
 fox.position=Vector2(100,520);fox.velocity=Vector2.ZERO;await frames(5)
 Input.action_press("jump");await frames(2);Input.action_release("jump")
 var min_y=fox.position.y
 for i in range(50):
  await physics_frame
  min_y=minf(min_y,fox.position.y)
 check(min_y<470,"jump produces meaningful airtime; min_y="+str(min_y))
 await frames(75)
 check(fox.is_on_floor(),"fox returns to floor")
 fox.position=Vector2(100,520);fox.velocity=Vector2.ZERO;await frames(3)
 Input.action_press("move_right");Input.action_press("dash");await frames(2);Input.action_release("dash");var x0=fox.position.x
 Input.action_press("move_left");await frames(8);var x1=fox.position.x;Input.action_release("move_left");Input.action_release("move_right")
 check(x1>x0,"dash direction stays locked against opposite input")
 await frames(30)
 fox.position=Vector2(100,520);fox.velocity=Vector2.ZERO;await frames(3)
 Input.action_press("move_right");await frames(110);Input.action_release("move_right")
 check(fox.position.x<265,"wall collision remains stable after dash")
 if failures.is_empty():print("PHYSICS_TESTS_OK");quit(0)
 else:print("PHYSICS_TESTS_FAILED "+str(failures));quit(1)
