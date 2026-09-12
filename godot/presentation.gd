extends Control
## Read-only visual layer. All progression and collision state stays with main/fox.
const Rules=preload("res://rules.gd")
var game
var hero:Control
var portrait:TextureRect
var shade:TextureRect
var last_birth=-1
var mask_shader=Shader.new()

func _ready():
 mouse_filter=Control.MOUSE_FILTER_IGNORE
 mask_shader.code="shader_type canvas_item; void fragment(){vec4 c=texture(TEXTURE,UV);float d=length(UV-vec2(.5));COLOR=vec4(c.rgb,c.a*(1.0-smoothstep(.475,.49,d)));}"
 portrait=TextureRect.new();portrait.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;portrait.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_COVERED;portrait.mouse_filter=Control.MOUSE_FILTER_IGNORE
 var mat=ShaderMaterial.new();mat.shader=mask_shader;portrait.material=mat;add_child(portrait)
 var grad=Gradient.new();grad.set_color(0,Color(.015,.025,.04,.93));grad.set_color(1,Color(.015,.025,.04,0))
 var texture=GradientTexture2D.new();texture.gradient=grad;texture.fill_from=Vector2(.5,0);texture.fill_to=Vector2(.5,1)
 shade=TextureRect.new();shade.texture=texture;shade.mouse_filter=Control.MOUSE_FILTER_IGNORE;add_child(shade);move_child(shade,0);shade.show_behind_parent=true
 hero=preload("res://bloodline_portrait.gd").new();hero.birthright="ember";hero.tone=Color("e8c790");add_child(hero)

func _process(_dt):
 if not is_instance_valid(game):return
 var size=get_viewport_rect().size
 var play=game.mode in ["playing","paused","camp"] and game.profile.get("alive",false)
 portrait.visible=play;shade.visible=play
 hero.visible=game.mode=="title" and size.x>1000
 hero.position=Vector2(size.x*.62,size.y*.12);hero.size=Vector2(size.x*.30,size.y*.76)
 if play:
  var birth=int(game.profile.bloodline)
  if birth!=last_birth:
   last_birth=birth;portrait.texture=load("res://assets/heads/"+Rules.BLOODLINES[birth].id+".png")
  portrait.position=Vector2(15,14);portrait.size=Vector2(62,62)
  shade.position=Vector2.ZERO;shade.size=Vector2(size.x,160 if size.x<size.y else 140)
 queue_redraw()

func _draw():
 if not is_instance_valid(game):return
 var size=get_viewport_rect().size
 if game.mode in ["playing","paused","camp"] and game.profile.get("alive",false):
  var color=Color(Rules.BLOODLINES[int(game.profile.bloodline)].color)
  draw_arc(Vector2(46,45),33,0,TAU,64,Color(color,.85),1.5,true)
  var small=size.x<size.y
  # Crisp geometric hearts avoid depending on a system symbol font in web exports.
  var max_health=game.fox.attributes.health;var health=game.fox.health;var x0=90.0
  for i in range(mini(max_health,12)):
   var center=Vector2(x0+i*15,62);var points=PackedVector2Array()
   for j in range(32):
    var t=j*TAU/32;points.append(center+Vector2(16*pow(sin(t),3),-(13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t)))*.34)
   draw_colored_polygon(points,Color(color,.95 if i<health else .18))
  var route_y=size.y-(155 if small else 40)
  var total=maxf(1,game.room.width-160);var progress=clampf((game.fox.position.x-80)/total,0,1)
  var w=110 if small else 190
  var x=size.x/2-w/2.0
  draw_line(Vector2(x,route_y),Vector2(x+w,route_y),Color(.75,.72,.6,.22),2,true)
  draw_line(Vector2(x,route_y),Vector2(x+w*progress,route_y),Color(color,.8),2,true)
  draw_circle(Vector2(x+w*progress,route_y),3,color)
 else:
  # Fine gold frame around the sanctuary/hearth instead of a full-screen modal wall.
  var inset=12.0
  var gold=Color(.76,.63,.39,.35)
  for corner in [Vector2(inset,inset),Vector2(size.x-inset,inset),Vector2(inset,size.y-inset),Vector2(size.x-inset,size.y-inset)]:
   var sx=1 if corner.x<size.x/2 else -1;var sy=1 if corner.y<size.y/2 else -1
   draw_line(corner,corner+Vector2(65*sx,0),gold,1,true);draw_line(corner,corner+Vector2(0,65*sy),gold,1,true)
   draw_circle(corner+Vector2(7*sx,7*sy),2,gold)
