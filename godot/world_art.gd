extends Node2D
## Rendered Blender assets; authored landing anchors align art to unchanged collision.
const Rules=preload("res://rules.gd")
var game
var glows:Texture2D
var styles={}
var font:Font
var terrain={}
var portals={}
var enemies={}
var meta={}

func _ready():
 font=ThemeDB.fallback_font
 meta=JSON.parse_string(FileAccess.get_file_as_string("res://assets/props.json"))
 for key in ["grove","frost","cinder"]:
  terrain[key]=load("res://assets/terrain/"+key+".png")
  portals[key]=load("res://assets/portals/"+key+".png")
 for key in ["crawler","wisp","spitter","keeper"]:enemies[key]=load("res://assets/enemies/"+key+".png")
 var image=Image.create(64,64,false,Image.FORMAT_RGBA8)
 for y in range(64):
  for x in range(64):
   var a=pow(maxf(0,1-Vector2(x-32,y-32).length()/32),2)
   image.set_pixel(x,y,Color(1,1,1,a))
 glows=ImageTexture.create_from_image(image)

func halo(pos,radius,color,alpha=.25):draw_texture_rect(glows,Rect2(pos-Vector2.ONE*radius,Vector2.ONE*radius*2),false,Color(color,alpha))
func poly(points,color):draw_colored_polygon(PackedVector2Array(points),color)
func text_at(pos,text,size,color):draw_string(font,pos,text,HORIZONTAL_ALIGNMENT_LEFT,-1,size,color)

func _draw():
 if game.room.is_empty() or meta.is_empty():return
 var room=game.room;var b=Rules.BIOMES[int(room.biome)];var t=game.clock
 var width=game.get_viewport_rect().size.x/game.camera.zoom.x
 var view=Rect2(game.camera.position-Vector2(width/2,700),Vector2(width,1400))
 var accent=Color(b.accent);var key=b.id
 # Distant motes and vertical fall streaks sit behind the physical platforms.
 for i in range(24):
  var px=view.position.x+fposmod(i*137.9-game.camera.position.x*.1+t*(3+i%3),width+80)-40
  var py=190+fposmod(i*72.31,390)+sin(t*.6+i)*9
  halo(Vector2(px,py),8,accent,.10+.04*sin(t+i))
 for pl in room.platforms+room.ledges:
  if pl.x+pl.w<view.position.x-100 or pl.x>view.end.x+100:continue
  var data=meta[key];var image=terrain[key]
  var sx=pl.w/((data.right-data.left)*data.width)
  var sy=sx*(.29 if pl.kind=="oneway" else 1.0)
  var rect=Rect2(Vector2(pl.x-data.left*data.width*sx,pl.y-data.top*data.height*sy),Vector2(data.width*sx,data.height*sy))
  draw_texture_rect(image,rect,false)
  # A thin continuous contour exposes the exact landing surface rather than foliage.
  draw_line(Vector2(pl.x+2,pl.y),Vector2(pl.x+pl.w-2,pl.y),Color(b.edge,.62),1.25,true)
  if pl.kind=="solid":lantern(Vector2(pl.x+pl.w-32,pl.y-37),accent,t+pl.x)
 for h in room.hazards:
  for i in range(3):
   var left=h.position+Vector2(i*13,13);var peak=h.position+Vector2(i*13+6,-2);var right=h.position+Vector2(i*13+12,13)
   poly([left,peak,right],Color("9b7782"));draw_line(peak,right,Color("f3b6a6"),1.5,true)
 for mote in room.motes:
  if mote.id in game.profile.get("taken",[]):continue
  var pos=Vector2(mote.x,mote.y+sin(t*2.5+mote.x)*3)
  if not view.has_point(pos):continue
  var color=Color("dcc6fc") if mote.value>1 else Color("ffe8a8")
  halo(pos,23,color,.36)
  draw_circle(pos,3.3,color)
  draw_arc(pos,7,0,TAU,18,Color(color,.6),1,true)
  for i in range(4):
   var a=t*.3+i*PI/2
   draw_line(pos+Vector2.from_angle(a)*9,pos+Vector2.from_angle(a)*11,Color(color,.45),1,true)
 if not game.profile.get("chest",false):
  var pos=room.chest
  halo(pos,58,accent,.27)
  draw_style_box(block_style(Color("47352c")),Rect2(pos-Vector2(19,10),Vector2(38,25)))
  draw_style_box(block_style(Color("8f6645")),Rect2(pos-Vector2(18,16),Vector2(36,15)))
  for side in [-1,1]:draw_rect(Rect2(pos+Vector2(side*11-2,-15),Vector2(4,29)),Color("be9a63"))
  draw_line(pos+Vector2(-18,-1),pos+Vector2(18,-1),Color("efc47b"),1.4)
  poly([pos+Vector2(0,-9),pos+Vector2(4,-4),pos+Vector2(0,3),pos+Vector2(-4,-4)],Color("fff1bc"))
 portal(room.portal,key,accent,game.keeper_alive(),t)
 if game.profile.get("depth",1)==1 and game.mode=="playing":
  var coarse=game.touch_root.visible
  text_at(Vector2(110,405),"MOVE" if coarse else "A / D  -  MOVE",13,Color("e0e8d3"))
  text_at(Vector2(412,399),"JUMP",12,Color("ead3aa"))
  draw_line(Vector2(445,410),Vector2(472,445),Color("ead3aa",.7),1.2,true)
 for enemy_data in room.enemies:
  if enemy_data.hp>0 and view.grow(100).has_point(Vector2(enemy_data.x,enemy_data.y)):enemy(enemy_data,t,room.biome)
 for shot in game.shots:
  halo(shot.pos,22,Color("f4a7bd"),.42);draw_circle(shot.pos,4.8,Color("ffe1e2"))
  draw_line(shot.pos,shot.pos-shot.v.normalized()*15,Color("f4a7bd",.55),2,true)
 for ring in game.rings:
  var progress=1-ring.age/.25
  draw_arc(ring.pos,ring.radius*(.35+progress*.65),0,TAU,56,Color(ring.color,1-progress),3,true)
  halo(ring.pos,ring.radius,ring.color,.18*(1-progress))
  for j in range(9):
   var a=j*TAU/9+t*.4;var outer=ring.pos+Vector2.from_angle(a)*ring.radius*progress
   draw_line(outer-Vector2.from_angle(a)*14,outer,Color(ring.color,1-progress),2,true)
 for particle in game.particles:draw_circle(particle.pos,2.2,Color(particle.color,minf(1,particle.age*2)))

func block_style(color):
 var key=color.to_html()
 if not styles.has(key):
  var style=StyleBoxFlat.new();style.bg_color=color;style.set_corner_radius_all(3);style.border_color=color.lightened(.18);style.set_border_width_all(1);styles[key]=style
 return styles[key]

func lantern(pos,color,t):
 halo(pos,51,color,.38+.035*sin(t*2))
 draw_line(pos+Vector2(0,-23),pos+Vector2(0,-12),Color("9c8461"),1.4)
 draw_arc(pos+Vector2(0,-11),3,PI,TAU,8,Color("d4b078"),1,true)
 poly([pos+Vector2(-9,-10),pos+Vector2(9,-10),pos+Vector2(7,11),pos+Vector2(-7,11)],Color("352c26"))
 draw_rect(Rect2(pos+Vector2(-5,-7),Vector2(10,16)),Color("dab56b"))
 poly([pos+Vector2(0,-6-sin(t)*1.4),pos+Vector2(3,4),pos+Vector2(0,7),pos+Vector2(-3,4)],Color("fff2c9"))
 for x in [-8,8]:draw_line(pos+Vector2(x,-10),pos+Vector2(x*.80,11),Color("c2a173"),1.4)
 draw_line(pos+Vector2(-9,-11),pos+Vector2(9,-11),Color("e4bf7b"),1.5)
 draw_line(pos+Vector2(-8,12),pos+Vector2(8,12),Color("aa8652"),2)

func portal(pos,key,color,locked,t):
 var tint=Color("cb8fae") if locked else color
 var image=portals[key];var anchor=Vector2(meta[key].portal_anchor[0],meta[key].portal_anchor[1]);var size=Vector2(174,232)
 halo(pos+Vector2(0,-85),127,tint,.37)
 for i in range(12):
  var q=pos+Vector2(sin(i*7+t)*34,-fposmod(t*22+i*13,164))
  draw_circle(q,1.6,Color(tint,.7));halo(q,7,tint,.16)
 draw_texture_rect(image,Rect2(pos-anchor*size,size),false,Color(.85,.72,.88) if locked else Color.WHITE)
 text_at(pos+Vector2(-52,-213),"KEEPER SEAL" if locked else "SANCTUARY",11,tint)
 if locked:
  for i in range(3):draw_line(pos+Vector2(-36,-107+i*35),pos+Vector2(36,-77+i*35),Color(tint,.6),2)

func enemy(e,t,biome):
 var pos=Vector2(e.x,e.y);var boss=e.type=="keeper";var size=Vector2.ONE*(162 if boss else 97 if e.type=="wisp" else 105)
 var anchor=Vector2(meta[e.type].anchor[0],meta[e.type].anchor[1]);var tint=Color("d7b4dc")
 halo(pos,88 if boss else 38,tint,.19)
 var bob=sin(t*(3 if e.type=="wisp" else 7)+e.phase)*(2.0 if e.type=="wisp" else .7)
 draw_texture_rect(enemies[e.type],Rect2(pos+Vector2(0,bob)-anchor*size,size),false,Color(1.8,1.6,1.7) if e.flash>0 else Color.WHITE)
 if e.type in ["spitter","keeper"]:
  var telegraph=clampf(1-e.cooldown/.7,0,1)
  if telegraph>0:
   draw_arc(pos+Vector2(0,22 if not boss else 46),30 if not boss else 53,0,TAU,48,Color("ffb6bc",telegraph*.8),2,true)
   halo(pos,32,Color("ffc1c9"),telegraph*.65)
 if boss or e.hp<e.max_hp:
  var w=100 if boss else 48;var y=-70 if boss else -44
  draw_rect(Rect2(pos+Vector2(-w/2.0,y),Vector2(w,5)),Color("161d2e"))
  draw_rect(Rect2(pos+Vector2(-w/2.0,y),Vector2(w*e.hp/e.max_hp,5)),tint)
  text_at(pos+Vector2(-12,y-5),"Lv. "+str(e.level),10,Color("ddd0d6"))
  if boss:text_at(pos+Vector2(-84,y-25),["ROOTBOUND SENTINEL","CHOIR OF GLASS","ASHEN REGENT"][biome],11,tint)
