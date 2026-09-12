extends Node2D
## Live world ornamentation is separate from the engine's collision objects.
const Rules=preload("res://rules.gd")
var game
var glows:Texture2D
var portraits={}
var styles={}
var font:Font

func _ready():
 font=ThemeDB.fallback_font
 var image=Image.create(64,64,false,Image.FORMAT_RGBA8)
 for y in range(64):
  for x in range(64):
   var a=pow(maxf(0,1-Vector2(x-32,y-32).length()/32),2)
   image.set_pixel(x,y,Color(1,1,1,a))
 glows=ImageTexture.create_from_image(image)

func halo(pos,size,color,alpha=.25):draw_texture_rect(glows,Rect2(pos-Vector2.ONE*size,Vector2.ONE*size*2),false,Color(color,alpha))
func poly(points,color):draw_colored_polygon(PackedVector2Array(points),color)

func _draw():
 if game.room.is_empty():return
 var room=game.room;var b=Rules.BIOMES[int(room.biome)];var t=game.clock
 var width=game.get_viewport_rect().size.x/game.camera.zoom.x
 var view=Rect2(game.camera.position-Vector2(width/2,700),Vector2(width,1400))
 for pl in room.platforms+room.ledges:
  if pl.x+pl.w<view.position.x-100 or pl.x>view.end.x+100:continue
  var x=pl.x;var y=pl.y;var w=pl.w;var h=pl.h if pl.kind=="solid" else 24.0
  var stone=Color(b.stone);var edge=Color(b.edge);var rng=RandomNumberGenerator.new();rng.seed=int(pl.x*17+game.profile.get("depth",1)*97)
  poly([Vector2(x,y+3),Vector2(x+w,y+3),Vector2(x+w-9,y+h*.7),Vector2(x+w*.75,y+h),Vector2(x+w*.22,y+h-minf(35,h*.25)),Vector2(x+9,y+h*.8)],stone)
  for row in range(int(h/33)):
   for col in range(int(w/48)+1):
    var xx=x+col*48-(22 if row%2 else 0)
    var rect=Rect2(maxf(x+7,xx+3),y+15+row*33,minf(44,x+w-7-maxf(x+7,xx+3)),27)
    if rect.size.x>0:draw_style_box(block_style(stone.lightened(rng.randf_range(-.12,.10))),rect)
  draw_line(Vector2(x+2,y+8),Vector2(x+w-2,y+8),stone.darkened(.42),7)
  draw_line(Vector2(x,y+2),Vector2(x+w,y+2),edge.darkened(.25),7,true)
  draw_line(Vector2(x+3,y),Vector2(x+w-3,y),edge,2,true)
  for i in range(int(w/13)):
   var xx=x+7+i*13;var hh=rng.randf_range(3,10)
   if room.biome==0:
    draw_line(Vector2(xx,y),Vector2(xx-3,y-hh),edge.darkened(.15),1.4,true)
    draw_line(Vector2(xx,y),Vector2(xx+4,y-hh*.7),edge,1.2,true)
    if i%7==0:draw_circle(Vector2(xx,y-hh),2.3,Color("f4deb4"))
   elif room.biome==1 and i%4==0:
    poly([Vector2(xx,y-1),Vector2(xx+3,y-hh-8),Vector2(xx+9,y-1)],edge)
  if pl.kind=="solid":
   for i in range(3):
    var xx=x+25+i*w*.32;var path=PackedVector2Array([Vector2(xx,y+8),Vector2(xx-9,y+35),Vector2(xx+6,y+62),Vector2(xx+1,y+100)])
    draw_polyline(path,edge.darkened(.45),2,true)
    if room.biome==0:
     for j in range(4):
      var yy=y+26+j*16;poly([Vector2(xx,yy),Vector2(xx+13*(1 if j%2 else -1),yy-3),Vector2(xx+2,yy+5)],edge.darkened(.15))
   lantern(Vector2(x+w-27,y-30),Color(b.accent),t+x)
 for h in room.hazards:
  for i in range(3):poly([h.position+Vector2(i*13,13),h.position+Vector2(i*13+6,-2),h.position+Vector2(i*13+12,13)],Color("e7a5a2"))
 for mote in room.motes:
  if mote.id in game.profile.get("taken",[]):continue
  var p=Vector2(mote.x,mote.y+sin(t*2.5+mote.x)*3)
  if not view.has_point(p):continue
  var color=Color("dcc6fc") if mote.value>1 else Color("ffe8a8")
  halo(p,23,color,.36);poly([p+Vector2(0,-6),p+Vector2(4,0),p+Vector2(0,6),p+Vector2(-4,0)],color)
 if not game.profile.get("chest",false):
  var p=room.chest
  halo(p,60,Color(b.accent),.2)
  draw_style_box(block_style(Color("8d6343")),Rect2(p-Vector2(18,12),Vector2(36,27)))
  draw_line(p+Vector2(-18,-3),p+Vector2(18,-3),Color(b.accent),2)
  draw_rect(Rect2(p-Vector2(3,6),Vector2(6,12)),Color("f3d28b"))
 portal(room.portal,Color(b.accent),game.keeper_alive(),t)
 if game.profile.get("depth",1)==1:
  text_at(Vector2(110,405),"MOVE  ·  A / D",14,Color("dce8d3"))
  text_at(Vector2(425,385),"JUMP",13,Color("ead3aa"))
  draw_line(Vector2(445,395),Vector2(473,430),Color("ead3aa"),1.5,true)
  text_at(Vector2(925,360),"J / PULSE  ·  clear your path",13,Color("ead3aa"))
 for e in room.enemies:
  if e.hp>0 and view.grow(100).has_point(Vector2(e.x,e.y)):enemy(e,t,room.biome)
 for shot in game.shots:
  halo(shot.pos,20,Color("f4a7bd"),.42);draw_circle(shot.pos,5,Color("ffe1e2"))
 for ring in game.rings:
  var progress=1-ring.age/.25
  draw_arc(ring.pos,ring.radius*(.35+progress*.65),0,TAU,56,Color(ring.color,1-progress),3,true)
  halo(ring.pos,ring.radius,ring.color,.12*(1-progress))
 for particle in game.particles:draw_circle(particle.pos,2.2,Color(particle.color,minf(1,particle.age*2)))

func block_style(color):
 var key=color.to_html()
 if not styles.has(key):
  var style=StyleBoxFlat.new();style.bg_color=color;style.set_corner_radius_all(2);styles[key]=style
 return styles[key]

func text_at(pos,text,size,color):draw_string(font,pos,text,HORIZONTAL_ALIGNMENT_LEFT,-1,size,color)

func lantern(p,color,t):
 halo(p,43,color,.35+.04*sin(t*2))
 draw_line(p+Vector2(0,-23),p+Vector2(0,-10),Color("776b57"),2)
 poly([p+Vector2(-9,-9),p+Vector2(9,-9),p+Vector2(7,11),p+Vector2(-7,11)],Color("8c7653"))
 draw_rect(Rect2(p+Vector2(-4,-6),Vector2(8,14)),color)
 draw_circle(p+Vector2(0,1),3,Color("fff2c9"))

func portal(p,color,locked,t):
 var tint=Color("cb8fae") if locked else color
 halo(p+Vector2(0,-70),128,tint,.32)
 var stone=Color("44545c")
 draw_style_box(block_style(stone),Rect2(p+Vector2(-59,-117),Vector2(19,117)))
 draw_style_box(block_style(stone),Rect2(p+Vector2(40,-117),Vector2(19,117)))
 draw_arc(p+Vector2(0,-114),49,PI,TAU,28,stone,20,true)
 draw_arc(p+Vector2(0,-114),40,PI,TAU,28,tint,2,true)
 draw_line(p+Vector2(-40,-114),p+Vector2(-40,-4),tint,2,true)
 draw_line(p+Vector2(40,-114),p+Vector2(40,-4),tint,2,true)
 for i in range(10):
  var q=p+Vector2(sin(i*7+t)*29,-fmod(t*18+i*14,133))
  draw_circle(q,1.6,Color(tint,.7))
 text_at(p+Vector2(-66,-180),"KEEPER SEAL" if locked else "SANCTUARY",13,tint)
 if locked:
  for i in range(3):draw_line(p+Vector2(-37,-105+i*35),p+Vector2(37,-75+i*35),Color(tint,.6),2)

func enemy(e,t,biome):
 var p=Vector2(e.x,e.y);var boss=e.type=="keeper";var scale=1.9 if boss else 1.0
 var tint=Color("d7b4dc") if e.flash<=0 else Color("fff9df")
 halo(p,80 if boss else 36,tint,.22)
 if e.type=="wisp":
  poly([p+Vector2(0,-30),p+Vector2(20,-2),p+Vector2(11,15),p+Vector2(0,26),p+Vector2(-12,13),p+Vector2(-20,-3)],Color("627398"))
  draw_circle(p+Vector2(-6,-4),3,Color("c9edff"));draw_circle(p+Vector2(6,-4),3,Color("c9edff"))
  for j in range(3):draw_arc(p+Vector2(0,7),25+j*7,t+j*.7,t+2+j*.7,16,Color("badbef",.4),1,true)
 else:
  for side in [-1,1]:
   for i in range(3):
    var foot=p+Vector2(side*(27+i*3),12+sin(t*7+i)*3)*scale
    draw_line(p+Vector2(side*16,-3+i*6)*scale,foot,Color("78857b"),3,true)
  draw_style_box(block_style(Color("384459")),Rect2(p-Vector2(22,23)*scale,Vector2(44,39)*scale))
  for side in [-1,1]:
   poly([p+Vector2(side*10,-22)*scale,p+Vector2(side*27,-44)*scale,p+Vector2(side*24,-10)*scale],Color("747b8d"))
   draw_line(p+Vector2(side*5,-9)*scale,p+Vector2(side*15,-11)*scale,tint,3,true)
  poly([p+Vector2(0,-23)*scale,p+Vector2(7,-6)*scale,p+Vector2(0,0)*scale,p+Vector2(-7,-6)*scale],tint)
  if e.type=="spitter" or boss:
   var telegraph=clampf(1-e.cooldown/.7,0,1)
   draw_circle(p+Vector2(0,6),3+telegraph*6,tint)
   if telegraph>0:draw_arc(p,35*scale,0,TAU,48,Color("ffb6bc",telegraph*.8),2,true)
 if boss or e.hp<e.max_hp:
  var w=90 if boss else 44
  draw_rect(Rect2(p+Vector2(-w/2.0,-55*scale),Vector2(w,4)),Color("1c2333"))
  draw_rect(Rect2(p+Vector2(-w/2.0,-55*scale),Vector2(w*e.hp/e.max_hp,4)),tint)
  if boss:text_at(p+Vector2(-90,-62*scale),["ROOTBOUND SENTINEL","CHOIR OF GLASS","ASHEN REGENT"][biome],12,tint)
