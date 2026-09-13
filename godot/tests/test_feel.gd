extends SceneTree
## Actual CharacterBody2D regressions for air control, buffered dash and animation.
const Fox=preload("res://fox.gd")
const Rules=preload("res://rules.gd")
var failures=[]
var count=0
var space:Node2D
var fox
func check(ok,msg):
 count+=1
 if ok:print("PASS "+msg)
 else:failures.append(msg);printerr("FAIL "+msg)
func frames(n):
 for i in range(n):await physics_frame
func input_clear():
 for a in ["move_left","move_right","jump","dash","pulse","drop"]:Input.action_release(a)
func reset(pos):
 input_clear()
 if is_instance_valid(fox):space.remove_child(fox);fox.queue_free()
 fox=Fox.new();fox.attributes=Rules.stats(Rules.fresh({"name":"Feel test","bloodline":0},11));fox.position=pos;space.add_child(fox);fox.active=true
 await frames(5)
func _initialize():call_deferred("run")
func run():
 for a in ["move_left","move_right","jump","dash","pulse","drop"]:
  if not InputMap.has_action(a):InputMap.add_action(a)
 space=Node2D.new();get_root().add_child(space)
 var body=StaticBody2D.new();body.collision_layer=1;body.collision_mask=0
 var shape=CollisionShape2D.new();var r=RectangleShape2D.new();r.size=Vector2(2500,100);shape.shape=r;shape.position=Vector2(1000,570);body.add_child(shape);space.add_child(body)
 await reset(Vector2(150,520));Input.action_press("move_right");await frames(12)
 Input.action_press("jump");await frames(2);Input.action_release("move_right");var start_x=fox.position.x
 await frames(27)
 var air_drift=fox.position.x-start_x
 check(absf(fox.velocity.x)<1 and air_drift<40,"air release stops inside forty world pixels without removing jump height")
 input_clear();await reset(Vector2(150,520));fox.dash_cooldown=.07
 Input.action_press("dash");await frames(2);Input.action_release("dash");await frames(18)
 check(fox.dash_serial==1 and fox.position.x>180,"dash pressed shortly before ready fires once when cooldown expires")
 await frames(45);check(fox.dash_serial==1,"buffered dash does not repeat on a held or released key")
 await reset(Vector2(150,520));Input.action_press("move_right");await frames(12);input_clear();fox.active=false;await frames(3)
 check(not fox.sprite.is_playing(),"paused fox freezes its animated sprite as well as its physics")
 var frozen=fox.position;await frames(12);check(fox.position==frozen,"paused physics position remains exact")
 fox.active=true;await frames(2);check(fox.sprite.is_playing(),"resuming the fox resumes its animation")
 await reset(Vector2(150,520));fox.health=4;fox.ward=0;fox.invulnerability=0;fox.hit(1,fox.position-Vector2(30,0));await frames(5)
 check(fox.velocity.x>65,"enemy knockback remains readable for the first forty milliseconds")
 check(fox.health==3,"knockback does not change damage amount")
 fox.hit(1,fox.position-Vector2(30,0));check(fox.health==3,"recovery window prevents duplicate contact damage")
 await reset(Vector2(150,520));Input.action_press("jump");await frames(2);input_clear()
 check(fox.sprite.scale.y>fox.art_scale,"takeoff briefly stretches only the painted sprite")
 check(fox.get_child(0).shape.size==Vector2(42,34),"sprite refinement never changes the collision box")
 var landed=false
 for i in range(160):
  await physics_frame
  if fox.is_on_floor():landed=true;break
 await frames(1)
 check(landed and fox.sprite.scale.x>fox.art_scale and fox.sprite.scale.y<fox.art_scale,"landing produces a bounded paw-anchored compression")
 await frames(55);check(absf(fox.sprite.scale.y-fox.art_scale)<.001,"landing compression settles back to authored proportions")
 var meta=JSON.parse_string(FileAccess.get_file_as_string("res://assets/atlas.json"))
 check(is_equal_approx(fox.sprite.sprite_frames.get_animation_speed("idle"),float(meta.clips.idle[2])),"animation playback obeys approved atlas clip timing")
 input_clear();space.queue_free();await frames(3)
 print(JSON.stringify({"suite":"controller feel and sprite","checks":count,"airReleaseDriftPx":air_drift,"failures":failures}))
 quit(0 if failures.is_empty() else 1)
