extends CharacterBody2D
## Art and collisions have separate stable pivots: brush and ears are not hitboxes.
signal pulse
signal dashed
signal jumped
signal landed
signal hurt
signal died
const Rules=preload("res://rules.gd")
var attributes={"speed":320.0,"jumps":2,"dash_time":0.17,"dash_cooldown":1.25}
var active=false
var health=5
var ward=0
var facing=1
var dash_direction=1
var dash_time=0.0
var dash_cooldown=0.0
var attack_cooldown=0.0
var invulnerability=0.0
var coyote=0.0
var jump_buffer=0.0
var jumps_used=0
var drop_time=0.0
var dash_serial=0
var previous_y=0.0
var safe_position=Vector2(100,520)
var sprite:AnimatedSprite2D
var step_age=0.0
var color=Color("ffad67")
var atlas_path="res://assets/atlases/ember.png"
var anchor=Vector2(0.5326,0.8243)
var frame_size=Vector2(256,192)
var art_scale=0.63
var fx_time=0.0
var trail_age=0.0
var echoes=[]
var birthright="ember"

func _ready():
 process_physics_priority=-10
 collision_layer=2;collision_mask=1|4
 floor_snap_length=6.0;safe_margin=0.04;max_slides=6
 var shape=CollisionShape2D.new();var box=RectangleShape2D.new();box.size=Vector2(42,34);shape.shape=box;shape.position=Vector2(0,-17);add_child(shape)
 var meta=JSON.parse_string(FileAccess.get_file_as_string("res://assets/atlas.json"))
 if meta is Dictionary:
  frame_size=Vector2(meta.get("frameWidth",256),meta.get("frameHeight",192));art_scale=float(meta.get("drawScale",.63));anchor=Vector2(meta.anchor[0],meta.anchor[1])
 sprite=AnimatedSprite2D.new();sprite.centered=false;sprite.offset=-frame_size*anchor;sprite.scale=Vector2.ONE*art_scale;add_child(sprite)
 set_art(atlas_path)

func set_art(path):
 atlas_path=path
 birthright=path.get_file().get_basename()
 if sprite==null:return
 var texture=load(path)
 if not texture:return
 var frames=SpriteFrames.new()
 var clips={"idle":[0,4,5.0],"run":[4,8,14.0],"rise":[12,1,1.0],"fall":[13,1,1.0],"dash":[14,1,1.0],"pulse":[15,1,1.0]}
 for clip in clips:
  frames.add_animation(clip);frames.set_animation_speed(clip,clips[clip][2]);frames.set_animation_loop(clip,true)
  for i in range(clips[clip][0],clips[clip][0]+clips[clip][1]):
   var cell=AtlasTexture.new();cell.atlas=texture;cell.region=Rect2(Vector2(i%4,int(i/4))*frame_size,frame_size);frames.add_frame(clip,cell)
 sprite.sprite_frames=frames;sprite.play("idle")

func _physics_process(dt):
 if not active:return
 var grounded=is_on_floor()
 previous_y=position.y
 invulnerability=maxf(0,invulnerability-dt);dash_cooldown=maxf(0,dash_cooldown-dt);attack_cooldown=maxf(0,attack_cooldown-dt);jump_buffer=maxf(0,jump_buffer-dt);drop_time=maxf(0,drop_time-dt)
 set_collision_mask_value(3,drop_time<=0)
 coyote=0.12 if grounded else maxf(0,coyote-dt)
 if grounded:jumps_used=0
 var axis=Input.get_axis("move_left","move_right")
 if Input.is_action_just_pressed("jump"):jump_buffer=0.14
 if Input.is_action_just_pressed("drop") and grounded:
  drop_time=0.24;set_collision_mask_value(3,false);position.y+=2;velocity.y=80
 if Input.is_action_just_pressed("dash") and dash_cooldown<=0:
  dash_direction=int(signf(axis)) if absf(axis)>0.1 else facing
  facing=dash_direction;dash_time=attributes.dash_time;dash_cooldown=attributes.dash_cooldown;dash_serial+=1;velocity=Vector2(dash_direction*780,0);invulnerability=maxf(invulnerability,dash_time+0.07);dashed.emit()
 if jump_buffer>0 and (grounded or coyote>0 or jumps_used<attributes.jumps):
  if not grounded and coyote<=0:jumps_used=maxi(1,jumps_used)
  if jumps_used<attributes.jumps:
   velocity.y=-690;jumps_used+=1;coyote=0;jump_buffer=0;dash_time=0;jumped.emit()
 if Input.is_action_just_released("jump") and velocity.y < -500:velocity.y=-500
 if Input.is_action_pressed("pulse") and attack_cooldown<=0:
  attack_cooldown=.42;pulse.emit()
 if dash_time>0:
  dash_time=maxf(0,dash_time-dt);velocity.x=dash_direction*780;velocity.y=0
 else:
  if absf(axis)>0.1:
   facing=int(signf(axis))
   var acceleration=5100.0 if grounded else 2700.0
   if signf(axis)!=signf(velocity.x):acceleration*=1.4
   velocity.x=move_toward(velocity.x,axis*attributes.speed,acceleration*dt)
  else:velocity.x=move_toward(velocity.x,0,(6500.0 if grounded else 600.0)*dt)
  var gravity=2500.0 if velocity.y>0 else 2150.0
  if absf(velocity.y)<105 and Input.is_action_pressed("jump"):gravity=1400.0
  velocity.y=minf(1120,velocity.y+gravity*dt)
 move_and_slide()
 if is_on_wall() and dash_time>0:dash_time=0;velocity.x=0
 if is_on_ceiling():jump_buffer=0
 if is_on_floor():
  if not grounded:landed.emit()
 sprite.scale.x=absf(sprite.scale.x)*facing
 if dash_time>0:sprite.play("dash")
 elif attack_cooldown>.30:sprite.play("pulse")
 elif not is_on_floor():sprite.play("rise" if velocity.y<0 else "fall")
 elif absf(velocity.x)>25:
  sprite.play("run");sprite.speed_scale=clampf(absf(velocity.x)/attributes.speed,.7,1.3)
 else:sprite.play("idle");sprite.speed_scale=1.0
 sprite.modulate=Color(1.3,1.3,1.3,.82) if invulnerability>0 else Color.WHITE
 queue_redraw()
 if position.y>1100:
  health=0;active=false;died.emit()

func hit(amount=1,origin=Vector2.ZERO):
 if not active or invulnerability>0:return false
 if ward>0:ward-=1
 else:health=maxi(0,health-amount)
 invulnerability=1.0
 if health<=0:active=false;died.emit()
 else:
  if dash_time<=0:velocity=Vector2(signf(position.x-origin.x)*155,-160)
  hurt.emit()
 return true

func _process(dt):
 if not active:return
 fx_time+=minf(dt,.05)
 for i in range(echoes.size()-1,-1,-1):
  echoes[i].life-=dt
  if echoes[i].life<=0:echoes.remove_at(i)
 trail_age+=dt
 if dash_time>0 and trail_age>.025 and sprite and sprite.sprite_frames:
  trail_age=0
  var texture=sprite.sprite_frames.get_frame_texture(sprite.animation,sprite.frame)
  echoes.append({"pos":global_position,"face":facing,"life":.17,"texture":texture})
  if echoes.size()>7:echoes.pop_front()
 queue_redraw()

func _draw():
 if sprite==null:return
 for echo in echoes:
  draw_set_transform(echo.pos-global_position,0,Vector2(echo.face*art_scale,art_scale))
  draw_texture(echo.texture,-frame_size*anchor,Color(color,echo.life*1.9))
 draw_set_transform(Vector2.ZERO)
 # Persistent birthright details share the fox pivot, not the camera or hitbox.
 var tail_pos=Vector2(-47*facing,-30)
 if birthright=="ember":
  for j in range(4):
   var p=tail_pos+Vector2(-j*4*facing,-j*3)
   var points=PackedVector2Array([p+Vector2(-4,5),p+Vector2(-6,-3),p+Vector2(sin(fx_time*7+j)*4,-14-j*2),p+Vector2(5,-1),p+Vector2(4,6)])
   draw_colored_polygon(points,Color(color,.22+.07*j))
 elif birthright=="tide":
  draw_arc(Vector2(6,-54),17,-PI*.9,PI*.38,28,Color(color,.55),1.2,true)
  for j in range(4):
   var a=fx_time*.6+j*PI/2;draw_circle(Vector2(6,-54)+Vector2.from_angle(a)*19,1.5,Color(color,.85))
 elif birthright=="gale":
  for j in range(3):
   var points=PackedVector2Array()
   for i in range(12):points.append(Vector2((-15-i*5)*facing,-32-j*6+sin(i*.5+fx_time*3+j)*3))
   draw_polyline(points,Color(color,.22-j*.03),1.5,true)
 elif birthright=="void":
  for j in range(13):
   var pos=Vector2((-10-j*4)*facing,-26+sin(j*4+fx_time)*19)
   var r=1+.7*sin(fx_time*2+j);draw_line(pos-Vector2(r,0),pos+Vector2(r,0),Color(color,.6),1,true);draw_line(pos-Vector2(0,r),pos+Vector2(0,r),Color(color,.6),1,true)
 elif birthright=="sun":
  for j in range(7):
   var a=fx_time*.7+j*TAU/7;var pos=Vector2(2,-28)+Vector2(cos(a)*46,sin(a)*26)
   draw_circle(pos,1.6,Color(color,.6))
 elif birthright=="bloom":
  for j in range(5):
   var pos=tail_pos+Vector2(sin(fx_time*.7+j*4)*24,-fposmod(fx_time*8+j*13,43))
   draw_circle(pos,2,Color(color,.5));draw_circle(pos+Vector2(2,1),1.7,Color("f8d5db",.4))
 if ward>0:draw_arc(Vector2(0,-27),42,0,TAU,44,Color(color,.52),1.8,true)
 if dash_time>0:
  for i in range(3):draw_line(Vector2(-facing*(25+i*12),-20+i*9),Vector2(-facing*(65+i*10),-20+i*9),Color(color,.4-i*.1),2,true)
