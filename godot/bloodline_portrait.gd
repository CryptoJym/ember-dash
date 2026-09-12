extends Control
## Image-based portrait stage with birthright-specific framing; no game-state writes.
var birthright="ember"
var tone=Color("ffad67")
var image:TextureRect
var glow:Texture2D

func _ready():
 mouse_filter=Control.MOUSE_FILTER_IGNORE
 image=TextureRect.new();image.texture=load("res://assets/portraits/"+birthright+".png");image.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;image.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED;image.mouse_filter=Control.MOUSE_FILTER_IGNORE;add_child(image);image.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 var pixels=Image.create(64,64,false,Image.FORMAT_RGBA8)
 for y in range(64):
  for x in range(64):pixels.set_pixel(x,y,Color(1,1,1,pow(maxf(0,1-Vector2(x-32,y-32).length()/32),1.5)))
 glow=ImageTexture.create_from_image(pixels)
 resized.connect(queue_redraw)

func _draw():
 if glow==null:return
 var center=size*Vector2(.54,.52);var radius=minf(size.x*.48,size.y*.45)
 draw_texture_rect(glow,Rect2(center-Vector2.ONE*radius*1.35,Vector2.ONE*radius*2.7),false,Color(tone,.28))
 var oval=PackedVector2Array()
 for i in range(65):
  var a=i*TAU/64;oval.append(center+Vector2(cos(a)*radius*.9,sin(a)*radius))
 draw_polyline(oval,Color(tone,.18),1,true)
 if birthright=="sun":
  draw_arc(center-Vector2(0,radius*.15),radius*.85,0,TAU,64,Color(tone,.6),1.4,true)
  for i in range(12):
   var a=i*TAU/12;var p=center-Vector2(0,radius*.15)
   draw_line(p+Vector2.from_angle(a)*radius*.92,p+Vector2.from_angle(a)*radius*1.01,Color(tone,.7),1.4,true)
 elif birthright=="tide":draw_arc(center-Vector2(radius*.1,radius*.2),radius*.86,-PI*.95,PI*.55,64,Color(tone,.58),2,true)
 elif birthright=="void":
  for i in range(12):
   var a=i*TAU/12;var p=center+Vector2.from_angle(a)*radius
   draw_line(p-Vector2(3,0),p+Vector2(3,0),Color(tone,.7),1,true);draw_line(p-Vector2(0,3),p+Vector2(0,3),Color(tone,.7),1,true)
 elif birthright=="bloom" or birthright=="gale":
  for i in range(9):
   var a=i*.35+1.1;var p=center+Vector2.from_angle(a)*radius
   var leaf=PackedVector2Array([p,p+Vector2(-9,-7),p+Vector2(-14,2),p+Vector2(-4,5)])
   draw_colored_polygon(leaf,Color(tone,.34))
   if birthright=="bloom":
    for j in range(5):draw_circle(p+Vector2.from_angle(j*TAU/5)*3.3,2.5,Color(tone,.48))
 else:
  for i in range(15):
   var p=center+Vector2(sin(i*2.3)*radius,cos(i*1.7)*radius)
   draw_circle(p,1.5 if i%3 else 2.1,Color(tone,.58))
