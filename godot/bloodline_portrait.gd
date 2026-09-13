extends Control
## The approved painted character, not a re-colored substitute or procedural bust.
var birthright="ember"
var tone=Color("ffad67")
var painting:Texture2D
var shadow:Texture2D

func _ready():
 mouse_filter=Control.MOUSE_FILTER_IGNORE
 painting=load("res://assets/portraits/"+birthright+".png")
 var grad=Gradient.new();grad.set_color(0,Color(.025,.055,.075,0));grad.set_color(1,Color(.025,.055,.075,.58))
 var tex=GradientTexture2D.new();tex.gradient=grad;tex.fill_from=Vector2(.5,.68);tex.fill_to=Vector2(.5,1);shadow=tex
 resized.connect(queue_redraw)
 queue_redraw()

func _draw():
 if painting==null or size.x<=0 or size.y<=0:return
 var raw=painting.get_size()
 var ratio=maxf(size.x/raw.x,size.y/raw.y)
 var region=size/ratio
 # Favor the ears and expressive face; crop lower paws, never the crown.
 var origin=Vector2((raw.x-region.x)*.5,maxf(0,(raw.y-region.y)*.05))
 draw_texture_rect_region(painting,Rect2(Vector2.ZERO,size),Rect2(origin,region))
 draw_texture_rect(shadow,Rect2(Vector2.ZERO,size),false)
 var gold=Color(tone,.75)
 for corner in [Vector2(5,5),Vector2(size.x-5,5),Vector2(5,size.y-5),size-Vector2(5,5)]:
  var direction=Vector2(1 if corner.x<size.x/2 else -1,1 if corner.y<size.y/2 else -1)
  draw_line(corner,corner+Vector2(24*direction.x,0),gold,1,true)
  draw_line(corner,corner+Vector2(0,24*direction.y),gold,1,true)
