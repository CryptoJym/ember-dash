extends Control
## Cosmetic parallax, depth haze and drifting lights. Does not alter world geometry.
const Rules=preload("res://rules.gd")
var game
var veil:TextureRect
var glow:Texture2D
var background_shader=Shader.new()
var rays=[]

func _ready():
 mouse_filter=Control.MOUSE_FILTER_IGNORE
 background_shader.code="""shader_type canvas_item;
uniform vec2 drift=vec2(0.0);
uniform vec3 haze_color=vec3(.20,.28,.38);
void fragment(){
 vec2 uv=clamp(UV+drift,vec2(.008),vec2(.992));
 vec4 c=texture(TEXTURE,uv);
 float lum=dot(c.rgb,vec3(.2126,.7152,.0722));
 c.rgb=mix(c.rgb,vec3(lum),.12);
 float depth=smoothstep(.38,.92,UV.y)*.38;
 c.rgb=mix(c.rgb,haze_color,depth);
 COLOR=c;
}"""
 var material=ShaderMaterial.new();material.shader=background_shader;game.background.material=material
 var image=Image.create(64,64,false,Image.FORMAT_RGBA8)
 for y in range(64):
  for x in range(64):image.set_pixel(x,y,Color(1,1,1,pow(maxf(0,1-Vector2(x-32,y-32).length()/32),2)))
 glow=ImageTexture.create_from_image(image)
 var grad=Gradient.new();grad.set_color(0,Color(.018,.035,.06,0));grad.set_color(1,Color(.018,.035,.06,.76))
 var texture=GradientTexture2D.new();texture.gradient=grad;texture.fill_from=Vector2(.5,.35);texture.fill_to=Vector2(.5,1)
 veil=TextureRect.new();veil.texture=texture;veil.mouse_filter=Control.MOUSE_FILTER_IGNORE;add_child(veil)

func _process(_dt):
 var size=get_viewport_rect().size
 veil.size=size;veil.position=Vector2.ZERO
 if is_instance_valid(game.background) and game.background.material:
  var fraction=0.0 if game.room.is_empty() else clampf(game.camera.position.x/maxf(1,game.room.width),0,1)
  game.background.material.set_shader_parameter("drift",Vector2((fraction-.5)*.055,0))
  var biome=game.room.get("biome",0)
  game.background.material.set_shader_parameter("haze_color",Color("263b4b") if biome==0 else Color("2d3858") if biome==1 else Color("492e43"))
 queue_redraw()

func _draw():
 if game.room.is_empty():return
 var size=get_viewport_rect().size;var t=game.clock
 var b=Rules.BIOMES[int(game.room.biome)];var gold=Color(b.accent)
 # Broad shafts are intentionally quiet: the high contrast belongs to the fox and floor.
 for i in range(3):
  var x=size.x*(.42+i*.22)-game.camera.position.x*.018
  var sway=sin(t*.25+i)*9
  var points=PackedVector2Array([Vector2(x,0),Vector2(x+17,0),Vector2(x-170+sway,size.y*.76),Vector2(x-270+sway,size.y*.76)])
  draw_colored_polygon(points,Color(gold,.024))
 for i in range(34):
  var pos=Vector2(fposmod(i*153.7-game.camera.position.x*.027+t*(1+i%3)*2,size.x+50)-25,size.y*.16+fposmod(i*89.7,size.y*.63)+sin(t*.6+i)*8)
  var alpha=.12+.1*(.5+.5*sin(t+i*3))
  draw_texture_rect(glow,Rect2(pos-Vector2(7,7),Vector2(14,14)),false,Color(gold,alpha))
  draw_circle(pos,1.0,Color(gold,alpha+.16))
