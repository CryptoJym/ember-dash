extends Node2D
const Rules=preload("res://rules.gd")
const Legacy=preload("res://legacy.gd")
const Fox=preload("res://fox.gd")
const WorldArt=preload("res://world_art.gd")
const Encounter=preload("res://encounter.gd")
var profile={}
var legacy=Legacy.fresh_archive()
var legacy_raw=null
var room={}
var mode="title"
var world:Node2D
var fox
var camera:Camera2D
var art
var ui:CanvasLayer
var menu_layer:CanvasLayer
var menu:PanelContainer
var hud:Control
var hud_name:Label
var hud_health:Label
var hud_level:Label
var hud_place:Label
var hud_light:Label
var xp_bar:ProgressBar
var touch_root:Node2D
var touch_buttons=[]
var hint:Label
var background:TextureRect
var options=[]
var selection=0
var menu_seed=0
var clock=0.0
var particles=[]
var rings=[]
var combat_text=[]
var last_room_reward=""
var reduced_motion=false
var startup_stage="created"
var shots=[]
var last_dead={}
var save_raw=null
var read_only=false
var warning=""
var storage_conflict=false
var save_timer=0.0
var publish_timer=0.0
var hint_timer=0.0
var look=70.0
var title_fox:TextureRect
var test_mode=false
var ignore_focus=false
var sounds={}
var audio_players=[]
var audio_index=0
var muted=false
var start_button:Button
var status_label:Label
var background_paths=["res://assets/backdrops/grove.jpg","res://assets/backdrops/frost.jpg","res://assets/backdrops/cinder.jpg"]

func _ready():
 randomize()
 menu_seed=randi()&0x7fffffff
 configure_input()
 startup_stage="motion preference"
 if OS.has_feature("web"):reduced_motion=bool(JavaScriptBridge.eval("window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0",true))
 startup_stage="background layers"
 var bg_layer=CanvasLayer.new();bg_layer.layer=-5;add_child(bg_layer)
 background=TextureRect.new();background.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;background.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_COVERED;bg_layer.add_child(background)
 var atmosphere_layer=CanvasLayer.new();atmosphere_layer.layer=-4;add_child(atmosphere_layer)
 var atmosphere=preload("res://atmosphere.gd").new();atmosphere.game=self;atmosphere_layer.add_child(atmosphere)
 world=Node2D.new();add_child(world)
 camera=Camera2D.new();add_child(camera);camera.enabled=true
 art=WorldArt.new();art.game=self;world.add_child(art)
 var art_ui=CanvasLayer.new();art_ui.layer=9;add_child(art_ui)
 var presentation=preload("res://presentation.gd").new();presentation.game=self;art_ui.add_child(presentation)
 ui=CanvasLayer.new();ui.layer=10;add_child(ui)
 menu_layer=CanvasLayer.new();menu_layer.layer=20;add_child(menu_layer)
 startup_stage="HUD"
 build_hud()
 startup_stage="profile load"
 if not test_mode:
  load_life();load_legacy()
 else:legacy=Legacy.fresh_archive()
 startup_stage="fox candidates"
 options=Legacy.decorate_candidates(Rules.candidates(menu_seed),menu_seed,legacy)
 set_background(0)
 room=Rules.room(menu_seed,1)
 startup_stage="title"
 open_title()
 get_viewport().size_changed.connect(resize_ui)
 resize_ui()
 startup_stage="ready"
 for i in range(6):
  var audio=AudioStreamPlayer.new();audio.volume_db=-19;audio.bus="Master";add_child(audio);audio_players.append(audio)
 for key in ["jump","pulse","mote","hurt","level","dash"]:
  if ResourceLoader.exists("res://assets/audio/"+key+".wav"):sounds[key]=load("res://assets/audio/"+key+".wav")

func configure_input():
 var keys={"move_left":[KEY_A,KEY_LEFT],"move_right":[KEY_D,KEY_RIGHT],"jump":[KEY_SPACE,KEY_W,KEY_UP],"dash":[KEY_SHIFT,KEY_K],"pulse":[KEY_J,KEY_X],"interact":[KEY_E],"drop":[KEY_S,KEY_DOWN],"pause_game":[KEY_ESCAPE,KEY_P]}
 for action in keys:
  if not InputMap.has_action(action):InputMap.add_action(action,0.22)
  for key in keys[action]:
   var event=InputEventKey.new();event.physical_keycode=key;InputMap.action_add_event(action,event)
 for pair in [["jump",JOY_BUTTON_A],["dash",JOY_BUTTON_B],["pulse",JOY_BUTTON_X],["interact",JOY_BUTTON_Y],["pause_game",JOY_BUTTON_START],["move_left",JOY_BUTTON_DPAD_LEFT],["move_right",JOY_BUTTON_DPAD_RIGHT],["drop",JOY_BUTTON_DPAD_DOWN]]:
  var event=InputEventJoypadButton.new();event.button_index=pair[1];InputMap.action_add_event(pair[0],event)
 for pair in [["move_left",-1.0],["move_right",1.0]]:
  var event=InputEventJoypadMotion.new();event.axis=JOY_AXIS_LEFT_X;event.axis_value=pair[1];InputMap.action_add_event(pair[0],event)

func clear_input():
 for action in ["move_left","move_right","jump","dash","pulse","interact","drop"]:Input.action_release(action)

func set_mode(next):
 if storage_conflict and next!="conflict":return
 mode=next
 menu_layer.visible=mode!="playing"
 clear_input()
 if is_instance_valid(fox):fox.active=mode=="playing"
 background.modulate=Color(.93,.95,1,1) if mode in ["playing","paused","camp"] else Color(.86,.90,.96,1)
 hud.visible=mode not in ["title","choose","dead","confirm","conflict","archive"]
 touch_root.visible=mode=="playing" and (DisplayServer.is_touchscreen_available() or (OS.has_feature("web") and JavaScriptBridge.eval("matchMedia('(pointer:coarse)').matches",true)==true))
 # Clear every menu panel, including any deferred/orphaned panel from a button callback.
 for child in menu_layer.get_children():
  if child is PanelContainer:
   child.visible=false
   menu_layer.remove_child(child)
   child.queue_free()
 menu=null

func box_style(color=Color("102630"),border=Color("647778")):
 var b=StyleBoxFlat.new();b.bg_color=color;b.border_color=border
 b.set_border_width_all(1);b.set_corner_radius_all(5)
 b.content_margin_left=20;b.content_margin_right=20;b.content_margin_top=18;b.content_margin_bottom=18
 return b

func label(text,size=16,color=Color("e6e6d4")):
 var l=Label.new();l.text=text;l.add_theme_font_size_override("font_size",size);l.add_theme_color_override("font_color",color);l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;l.add_theme_color_override("font_outline_color",Color(.015,.04,.06,.7));l.add_theme_constant_override("outline_size",2);return l

func button(text,callback,tint=Color("e8c790")):
 var b=Button.new();b.text=text;b.tooltip_text=text;b.clip_text=true;b.text_overrun_behavior=TextServer.OVERRUN_TRIM_ELLIPSIS;b.custom_minimum_size.y=48;b.add_theme_font_size_override("font_size",15)
 b.add_theme_color_override("font_color",Color("f2eddd"));b.add_theme_stylebox_override("normal",box_style(Color("15262d"),Color(tint,.55)))
 b.add_theme_stylebox_override("hover",box_style(Color("2c3737"),tint));b.add_theme_stylebox_override("focus",box_style(Color("303c3c"),tint))
 b.add_theme_stylebox_override("pressed",box_style(Color("4c493d"),tint));b.pressed.connect(callback, CONNECT_DEFERRED);return b

func make_menu(title,subtitle,wide=false):
 for child in menu_layer.get_children():
  if child is PanelContainer:
   child.hide()
   menu_layer.remove_child(child)
   child.queue_free()
 menu=PanelContainer.new();menu.add_theme_stylebox_override("panel",box_style(Color(.035,.085,.11,.96),Color("9b907363")));menu_layer.add_child(menu)
 var scroller=ScrollContainer.new();scroller.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED;scroller.size_flags_vertical=Control.SIZE_EXPAND_FILL;menu.add_child(scroller)
 var outer=VBoxContainer.new();outer.size_flags_horizontal=Control.SIZE_EXPAND_FILL;outer.add_theme_constant_override("separation",8 if get_viewport_rect().size.y<520 else 12);scroller.add_child(outer);menu.set_meta("content",outer);outer.minimum_size_changed.connect(_queue_menu_height.bind(menu.get_instance_id()))
 if get_viewport_rect().size.y>=520:outer.add_child(label("EMBER DASH  /  LINEAGE",10,Color("e8c790")))
 outer.add_child(label(title,24 if get_viewport_rect().size.y<600 or get_viewport_rect().size.x<380 else 32))
 outer.add_child(label(subtitle,13,Color("b3c6c1")))
 menu.set_meta("wide",wide)
 return outer

func fit_menu():
 if not is_instance_valid(menu):return
 var viewport=get_viewport_rect().size
 var width=minf(1020 if menu.get_meta("wide",false) else 540,viewport.x-28)
 menu.size=Vector2(width,viewport.y-36)
 menu.position=Vector2(viewport.x*.065 if mode=="title" and viewport.x>1000 else (viewport.x-width)/2,18)
 _fit_menu_height.call_deferred(menu.get_instance_id())

func _fit_menu_height(id):
 if not is_instance_valid(menu) or menu.get_instance_id()!=id:return
 var viewport=get_viewport_rect().size
 var content=menu.get_meta("content")
 var height=minf(viewport.y-36,content.get_combined_minimum_size().y+40)
 if menu.get_meta("pinned_actions",false):height=viewport.y-36
 menu.size.y=height
 menu.position.y=maxf(18,(viewport.y-height)/2)

func open_title():
 if storage_conflict:return
 set_mode("title")
 var alive=profile.get("alive",false)
 var out=make_menu("A small fox.\nAn extraordinary life.","A new world. A living bloodline.\nGrow stronger by absorbing the spirits you defeat.")
 if alive:
  out.add_child(label("%s  ·  LEVEL %d  ·  CHAMBER %d"%[profile.name,Rules.level_info(profile.xp).level,profile.depth],14,Color("e8c790")))
  var resume=button("Resume your living fox",resume_life);out.add_child(resume);resume.grab_focus()
  out.add_child(button("Begin a different life",confirm_new))
 else:
  var begin=button("Choose your fox",open_choices);out.add_child(begin);begin.grab_focus()
 if legacy.runs>0:out.add_child(button("Lineage archive · %d lives"%legacy.runs,open_archive,Color("c4b1f0")))
 out.add_child(label("GENERATION %d · ONE LIFE · Levels, light, relics and upgrades belong to this fox.\nDeath ends its living profile. The archive remembers the story, never the stats."%legacy.generation,12,Color("c2b3a2")))
 out.add_child(label("Move A/D · Jump Space · Dash Shift · Pulse J\nTouch controls on phones. Sound can be muted in pause.",11,Color("9bb2af")))
 if not warning.is_empty():out.add_child(label(warning,12,Color("ffc799")))
 fit_menu.call_deferred()

func open_archive():
 set_mode("archive")
 var out=make_menu("The Fox Archive","Every life leaves a story. None of its combat power carries into the next fox.",true)
 out.add_child(label("GENERATION %d · %d completed lives · deepest chamber %d"%[legacy.generation,legacy.runs,legacy.best_depth],14,Color("e8c790")))
 if legacy.archive.is_empty():out.add_child(label("No ancestors have been recorded yet.",13))
 else:
  var start=maxi(0,legacy.archive.size()-8)
  for i in range(legacy.archive.size()-1,start-1,-1):
   var entry=legacy.archive[i];var birth=Rules.BLOODLINES[clampi(int(entry.get("bloodline",0)),0,5)]
   var line="GEN %d · %s · Lv.%d · chamber %d\n%s · %d spirits · %s"%[entry.get("generation",1),entry.get("name","Unknown"),entry.get("level",1),entry.get("depth",1),Legacy.mutation_name(entry.get("mutation","")),entry.get("spirit",0),entry.get("cause","the unknown")]
   out.add_child(label(line,12,Color(birth.color)))
 var discovered=legacy.discoveries
 out.add_child(label("DISCOVERED · %d/%d relics · %d/%d mutations · %d guardians"%[discovered.relics.size(),Legacy.RELICS.size(),discovered.mutations.size(),Legacy.MUTATIONS.size(),discovered.bosses.size()],12,Color("b3c6c1")))
 out.add_child(button("Back",open_title));fit_menu.call_deferred()

func archive_current_life(cause):
 if not profile.get("alive",false):return
 legacy=Legacy.record_death(legacy,profile,cause);save_legacy()

func refresh_birth_candidates(excluded=""):
 menu_seed=randi()&0x7fffffff
 options=Legacy.decorate_candidates(Rules.candidates(menu_seed,excluded),menu_seed,legacy);selection=0

func confirm_new():
 set_mode("confirm")
 var out=make_menu("Leave this life behind?","This ends the living fox. Its combat progression is lost, but its story is recorded in the lineage archive.")
 out.add_child(button("Keep my fox",open_title))
 out.add_child(button("End this life and choose a descendant",func():archive_current_life("left the trail");profile={"version":1,"alive":false};save_life();refresh_birth_candidates();open_choices(),Color("df9999")))
 fit_menu.call_deferred()

func open_choices():
 if storage_conflict:return
 set_mode("choose")
 var out=make_menu("Who will you become?","Three different names. Three entirely positive gifts.",true)
 var size=get_viewport_rect().size
 # The cards scroll, but Begin/Back stay in the fixed panel. Never nest a
 # screen-height card scroller inside another scroller containing the actions.
 var old_scroller=menu.get_child(0)
 old_scroller.remove_child(out);menu.remove_child(old_scroller);old_scroller.queue_free();menu.add_child(out)
 menu.set_meta("pinned_actions",true)
 var scroll=ScrollContainer.new();scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED;scroll.custom_minimum_size.y=72;scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL;out.add_child(scroll)
 var three_columns=size.x>=980
 var cards=HBoxContainer.new() if three_columns else VBoxContainer.new();cards.size_flags_horizontal=Control.SIZE_EXPAND_FILL;cards.add_theme_constant_override("separation",10);scroll.add_child(cards)
 for i in range(options.size()):
  var option=options[i];var birth=Rules.BLOODLINES[option.bloodline];var tint=Color(birth.color)
  var card=PanelContainer.new();card.size_flags_horizontal=Control.SIZE_EXPAND_FILL;card.custom_minimum_size.x=280 if three_columns else 0
  card.add_theme_stylebox_override("panel",box_style(Color("152932"),tint if selection==i else Color("4d6564")));cards.add_child(card)
  var v=VBoxContainer.new();card.add_child(v)
  var image=preload("res://bloodline_portrait.gd").new();image.birthright=birth.id;image.tone=tint;image.custom_minimum_size.y=240 if size.x>=660 else 190;v.add_child(image)
  v.add_child(label(option.name,20,tint));v.add_child(label((birth.founder+"'S "+birth.name+" · "+birth.gift).to_upper(),10,tint));v.add_child(label(birth.tagline+"  "+birth.detail,12));v.add_child(label("GEN %d · %s\n%s"%[option.generation,Legacy.mutation_name(option.mutation),Legacy.mutation_text(option.mutation)],11,Color("d8c9f0")))
  var index=i
  var pick=button("Selected" if selection==i else "Choose this fox",func():selection=index;open_choices(),tint);v.add_child(pick)
 if size.y>=520:out.add_child(label("New terrain every life. Double jump and dash are available to every fox.",11,Color("a9c0b7")))
 if not three_columns:
  var selected_birth=Rules.BLOODLINES[options[selection].bloodline]
  var summary=label(options[selection].name+" · "+selected_birth.gift,13,Color(selected_birth.color));out.add_child(summary);menu.set_meta("selected_summary",summary)
 var actions=HBoxContainer.new();actions.add_theme_constant_override("separation",8);out.add_child(actions)
 start_button=button("Begin as "+options[selection].name,func():start_life(options[selection]));start_button.size_flags_horizontal=Control.SIZE_EXPAND_FILL;actions.add_child(start_button);start_button.grab_focus()
 var back=button("Back",open_title);back.custom_minimum_size.x=76;actions.add_child(back)
 fit_menu.call_deferred()

func start_life(choice):
 if storage_conflict:return
 if is_instance_valid(menu):menu.visible=false
 profile=Rules.fresh(choice,randi()&0x7fffffff)
 set_mode("playing");build_room(false);save_life();notify("Follow the light. Jump once, then tap again in the air.",5)

func resume_life():
 if storage_conflict:return
 if not profile.get("alive",false):return
 build_room(true);set_mode("playing");notify("Welcome back, "+profile.name+". Your journey continues.")

func build_room(restoring):
 for n in world.get_children():
  if n!=art:world.remove_child(n);n.queue_free()
 room=Rules.room(profile.seed,profile.depth,profile.route)
 set_background(room.biome);shots.clear();particles.clear();rings.clear();combat_text.clear()
 for pl in room.platforms+room.ledges:
  var body=StaticBody2D.new();body.collision_layer=4 if pl.kind=="oneway" else 1;body.collision_mask=0
  var shape=CollisionShape2D.new();var rect=RectangleShape2D.new();rect.size=Vector2(pl.w,pl.h);shape.shape=rect;shape.position=Vector2(pl.x+pl.w/2,pl.y+pl.h/2)
  if pl.kind=="oneway":shape.one_way_collision=true;shape.one_way_collision_margin=4
  body.add_child(shape);world.add_child(body)
 fox=Fox.new();var birth=Rules.BLOODLINES[int(profile.bloodline)]
 fox.atlas_path="res://assets/atlases/"+birth.id+".png";fox.color=Color(birth.color)
 var meta=JSON.parse_string(FileAccess.get_file_as_string("res://assets/atlas.json"))
 if meta is Dictionary:fox.anchor=Vector2(meta.anchor[0],meta.anchor[1])
 fox.attributes=Rules.stats(profile);fox.health=profile.health;fox.ward=profile.ward;fox.position=Vector2(100,520);fox.reduced_motion=reduced_motion
 if restoring:
  var requested=Vector2(profile.position[0],profile.position[1])
  for pl in room.platforms+room.ledges:
   if requested.x>pl.x+24 and requested.x<pl.x+pl.w-24 and absf(requested.y-pl.y)<12:fox.position=Vector2(requested.x,pl.y)
 fox.safe_position=fox.position;fox.invulnerability=.6
 world.add_child(fox)
 fox.active=mode=="playing"
 fox.pulse.connect(attack);fox.dashed.connect(func():sound("dash"));fox.jumped.connect(func():sound("jump");burst(fox.position,fox.color,8));fox.landed.connect(func():burst(fox.position,Color("bfd4bd"),5))
 fox.hurt.connect(func():sound("hurt");save_life())
 fox.died.connect(on_death)
 for e in room.enemies:
  if e.id in profile.defeated:e.hp=0.0
 camera.position=Vector2(maxf(270,fox.position.x+70),365)
 resize_ui()

func set_background(index):
 if ResourceLoader.exists(background_paths[index]):background.texture=load(background_paths[index])

func play_pause():
 if mode=="paused":set_mode("playing");return
 if mode!="playing":return
 save_life()
 if storage_conflict:return
 set_mode("paused")
 var out=make_menu("Catch your breath.","Your living profile is saved. Quitting is not a death.")
 var resume=button("Continue",func():set_mode("playing"));out.add_child(resume);resume.grab_focus()
 out.add_child(button("Sound: "+("off" if muted else "on"),func():muted=not muted;set_mode("playing");play_pause()))
 out.add_child(button("Reduced motion: "+("on" if reduced_motion else "off"),func():reduced_motion=not reduced_motion;fox.reduced_motion=reduced_motion;set_mode("playing");play_pause()))
 out.add_child(button("Save and return to title",func():save_life();open_title()))
 out.add_child(label("Hold jump for height. Tap again to air jump.\nDash direction locks until the burst ends.\nS / Down drops through a thin ledge. E enters the portal.",12))
 if not warning.is_empty():out.add_child(label(warning,12,Color("ffbd94")))
 fit_menu.call_deferred()

func on_death():
 if mode!="playing":return
 last_dead={"generation":profile.get("generation",legacy.generation),"name":profile.name,"level":Rules.level_info(profile.xp).level,"depth":profile.depth,"slain":profile.slain,"spirit":profile.get("spirit",0),"cause":fox.death_cause,"mutation":profile.get("mutation",""),"relics":profile.get("relics",[]).duplicate()}
 archive_current_life(last_dead.cause)
 profile={"version":1,"alive":false};save_life()
 if storage_conflict:return
 set_mode("dead");sound("hurt")
 var out=make_menu("Every flame\nhas its moment.","Generation %d · %s reached level %d and chamber %d."%[last_dead.generation,last_dead.name,last_dead.level,last_dead.depth])
 out.add_child(label("Lost to "+last_dead.cause+".  "+str(last_dead.slain)+" spirits defeated · "+str(last_dead.spirit)+" Spirit absorbed.",13,Color("e9cfaa")))
 out.add_child(label("Legacy recorded: "+Legacy.mutation_name(last_dead.mutation)+(" · "+str(last_dead.relics.size())+" relics" if not last_dead.relics.is_empty() else ""),12,Color("c4b1f0")))
 out.add_child(label("This fox's XP, light, Spirit, relics, upgrades and talents are gone. Only its story and discoveries remain in the archive.",14,Color("d9b6a1")))
 var retry=button("Start a new life · Generation "+str(legacy.generation),func():refresh_birth_candidates(last_dead.name);open_choices())
 out.add_child(retry);out.add_child(button("View lineage archive",open_archive,Color("c4b1f0")));retry.grab_focus();fit_menu.call_deferred()

func notify(text,time=3.5):
 hint.text=text;hint.visible=true;hint_timer=time

func sound(key):
 # The headless physics runner has no audio device. Browser/native play still uses the real samples.
 if DisplayServer.get_name()=="headless":return
 if muted or not sounds.has(key) or audio_players.is_empty():return
 var audio=audio_players[audio_index%audio_players.size()];audio_index+=1;audio.stream=sounds[key];audio.play()

func burst(pos,color,count):
 for i in range(count):
  if particles.size()>110:break
  particles.append({"pos":pos,"v":Vector2(randf_range(-90,90),randf_range(-120,20)),"age":randf_range(.3,.7),"color":color})

func _physics_process(dt):
 if mode!="playing" or not is_instance_valid(fox):return
 if not fox.active:return
 profile.seconds+=dt
 var attributes=fox.attributes
 for mote in room.motes:
  if mote.id in profile.taken:continue
  var pos=Vector2(mote.x,mote.y)
  if pos.distance_to(fox.position+Vector2(0,-20))<attributes.magnet:
   profile.taken.append(mote.id);profile.light+=int(mote.value);burst(pos,Color("f9d98a"),5);sound("mote")
 if not profile.chest and fox.position.distance_to(room.chest)<55:
  profile.chest=true;var gain=int((18 if profile.route=="cache" else 10)*attributes.bounty);profile.light+=gain;burst(room.chest,Color("ffcc76"),20);notify("Lantern cache · +%d light. Spend it at the next sanctuary."%gain);save_life()
 for e in room.enemies:
  if e.hp<=0:continue
  e.flash=maxf(0,e.flash-dt);e.phase+=dt;e.cooldown-=dt;e.stagger=maxf(0,float(e.get("stagger",0))-dt)
  var speed=28.0 if e.type=="keeper" else 32.0
  if e.stagger<=0:e.x=clampf(e.x+sin(e.phase*.8)*speed*dt,e.lo,e.hi)
  if e.type=="wisp":e.y=e.home+sin(e.phase*2)*13
  var pos=Vector2(e.x,e.y)
  var distance=pos.distance_to(fox.position+Vector2(0,-18))
  var visible=absf(pos.x-camera.position.x)<get_viewport_rect().size.x/(2*camera.zoom.x)-24 and distance<560
  for velocity in Encounter.ranged_step(e,fox.position+Vector2(0,-22),dt,visible):
   shots.append({"pos":pos,"v":velocity,"age":4.0,"cause":"a keeper's volley" if e.type=="keeper" else "a spitter's ember"})
  var radius=46 if e.type=="keeper" else 25
  if distance<radius+25:
   if fox.dash_time>0:
    if e.get("last_dash",-1)!=fox.dash_serial:e.last_dash=fox.dash_serial;damage_enemy(e,attributes.damage*1.15)
   elif fox.previous_y<=e.y-radius*.5 and fox.velocity.y>80:
    damage_enemy(e,attributes.damage);fox.velocity.y=-470;fox.jumps_used=1
   elif e.stagger<=0:fox.hit(1,pos,"a "+str(e.type))
   if mode!="playing":return
 for h in room.hazards:
  if Rect2(fox.position-Vector2(18,33),Vector2(36,33)).intersects(h):fox.hit(1,Vector2(h.position.x,fox.position.y),"crystal spikes")
  if mode!="playing":return
 for i in range(shots.size()-1,-1,-1):
  var shot=shots[i];shot.pos+=shot.v*dt;shot.age-=dt
  if shot.pos.distance_to(fox.position+Vector2(0,-20))<22:
   fox.hit(1,shot.pos,shot.get("cause","an enemy projectile"));shots.remove_at(i)
   if mode!="playing":return
  elif shot.age<=0:shots.remove_at(i)
 var distance=fox.position.distance_to(room.portal)
 if distance<100 and hint_timer<=0:hint.visible=true;hint.text="Defeat the keeper to break the seal." if keeper_alive() else "E / INTERACT · Enter the sanctuary"
 elif hint_timer<=0:hint.visible=false
 if Input.is_action_just_pressed("interact") and distance<100 and not keeper_alive():open_camp();return
 if fox.is_on_floor():
  var pos=fox.position
  var stable=room.platforms.any(func(pl):return pos.x>pl.x+28 and pos.x<pl.x+pl.w-28 and absf(pos.y-pl.y)<3)
  var danger=room.hazards.any(func(h):return h.grow(70).has_point(pos)) or room.enemies.any(func(e):return e.hp>0 and Vector2(e.x,e.y).distance_to(pos)<110)
  if stable and not danger:fox.safe_position=pos
 save_timer+=dt
 if save_timer>2 and fox.is_on_floor():save_timer=0;save_life()
 update_hud()

func attack():
 if mode!="playing":return
 var center=fox.position+Vector2(0,-25);var attributes=fox.attributes
 rings.append({"pos":center,"age":.25,"radius":attributes.radius,"color":fox.color})
 sound("pulse")
 for e in room.enemies:
  if e.hp>0 and Vector2(e.x,e.y).distance_to(center)<attributes.radius+(35 if e.type=="keeper" else 17):damage_enemy(e,attributes.damage)

func damage_enemy(e,amount):
 if e.hp<=0:return
 var dealt=minf(e.hp,amount)
 e.hp=maxf(0,e.hp-amount);e.flash=.17
 # Ordinary creatures can be interrupted; a guardian cannot be permanently
 # stun-locked by simply holding PULSE. Its visible volley remains dodgeable.
 e.stagger=0.0 if e.type=="keeper" else .12
 if e.type!="keeper":e.windup=0.0
 burst(Vector2(e.x,e.y),Color("d7b1ee"),7)
 float_text(Vector2(e.x,e.y-35),"−"+str(snappedf(dealt,.1)),Color("fff1d6"))
 if e.hp<=0:
  if e.id in profile.defeated:return
  profile.defeated.append(e.id);profile.slain+=1
  if e.type=="keeper":
   var guardian=["rootbound_sentinel","choir_of_glass","ashen_regent"][clampi(int(room.biome),0,2)]
   if guardian not in profile.bosses:profile.bosses.append(guardian)
  var xp=(55+e.level*12) if e.type=="keeper" else (7+e.level*5)
  var absorbed=maxi(1,int(e.level));profile.spirit=mini(1000000,int(profile.get("spirit",0))+absorbed)
  var levels=Rules.award_xp(profile,xp)
  profile.light+=16 if e.type=="keeper" else 3
  # Spirit changes capabilities on every defeat, not only at an XP level boundary.
  var old_max=fox.attributes.health
  var old_damage=fox.attributes.damage
  fox.attributes=Rules.stats(profile)
  float_text(fox.position-Vector2(0,90),"+%d SPIRIT  ·  +%.1f%% STRENGTH"%[absorbed,100*(fox.attributes.damage/old_damage-1)],fox.color)
  if levels>0:
   fox.health=mini(fox.attributes.health,fox.health+maxi(1,fox.attributes.health-old_max))
   notify("LEVEL %d · Absorbed %d enemy levels · +%d experience."%[fox.attributes.level,absorbed,xp]);sound("level")
  else:notify("Absorbed %d enemy levels · +%d experience"%[absorbed,xp],1.6)
  burst(Vector2(e.x,e.y),fox.color,20);save_life()

func float_text(pos,text,tint):
 if combat_text.size()>=24:combat_text.pop_front()
 combat_text.append({"pos":pos,"text":text,"tint":tint,"life":.85})

func keeper_alive():
 for e in room.enemies:
  if e.type=="keeper" and e.hp>0:return true
 return false

func open_camp():
 if mode!="playing":return
 last_room_reward=""
 if not profile.get("cleared",false):
  Rules.award_xp(profile,12+profile.depth*2);profile.cleared=true
  var reward=Legacy.claim_room_reward(profile,room);last_room_reward=str(reward.get("message",""))
  fox.attributes=Rules.stats(profile);fox.health=mini(fox.attributes.health,fox.health+1+fox.attributes.heal);fox.ward=maxi(fox.ward,int(fox.attributes.ward))
 save_life()
 if storage_conflict:return
 set_mode("camp");show_camp()

func show_camp():
 # Sanctuary healing and purchases happen while physics is paused; refresh the
 # HUD here too so it agrees with the shop rather than showing pre-heal health.
 update_hud()
 var out=make_menu("A moment by the lantern.","Chamber %d complete. Heal, grow, then choose your next path."%profile.depth,true)
 out.add_child(label("LEVEL %d   ·   %d LIGHT   ·   %d / %d HEARTS"%[Rules.stats(profile).level,profile.light,fox.health,fox.attributes.health],15,Color("e8c790")))
 var shop=HBoxContainer.new() if get_viewport_rect().size.x>660 else VBoxContainer.new();shop.add_theme_constant_override("separation",8);out.add_child(shop)
 var titles={"vitality":"Heartwood · +1 heart","power":"Inner flame · +15% strength","haste":"Quickening · faster dash"}
 for id in Rules.UPGRADE_IDS:
  var cost=Rules.price(profile,id);var key=id
  var purchase=button(titles[id]+"\n"+(str(cost)+" light" if cost>=0 else "Maximum"),func():
   if mode=="camp" and Rules.purchase(profile,key):fox.attributes=Rules.stats(profile);fox.health=profile.health;save_life();show_camp()
  )
  purchase.size_flags_horizontal=Control.SIZE_EXPAND_FILL;purchase.disabled=cost<0 or profile.light<cost;shop.add_child(purchase)
 if profile.tokens>0:out.add_child(button("Awaken a new gift  ·  %d available"%profile.tokens,show_talents,Color("c4b1f0")))
 if not last_room_reward.is_empty():out.add_child(label(last_room_reward,12,Color("f2d7a0")))
 out.add_child(button("Living build · %s · %d relics"%[Legacy.mutation_name(profile.get("mutation","")),profile.get("relics",[]).size()],show_build,Color("c4b1f0")))
 var paths=VBoxContainer.new() if get_viewport_rect().size.x<660 else HBoxContainer.new();paths.add_theme_constant_override("separation",10);out.add_child(paths)
 var roots=button("Follow the roots\nA balanced path",func():next_room("roots"));roots.size_flags_horizontal=Control.SIZE_EXPAND_FILL;paths.add_child(roots)
 var route="cache" if profile.depth%2==1 else "trial"
 var other=button(("Chase the lanterns\nA richer cache" if route=="cache" else "Wake the sentinels\nStronger spirits"),func():next_room(route));other.size_flags_horizontal=Control.SIZE_EXPAND_FILL;paths.add_child(other)
 out.add_child(label("These upgrades belong to this living fox. They do not survive its death.",11,Color("c1afa2")))
 out.add_child(button("Save and rest here",func():save_life();open_title()))
 roots.grab_focus();fit_menu.call_deferred()

func show_talents():
 if profile.tokens<=0:return
 var out=make_menu("A new gift awakens.","Choose a capability for this fox. Only beneficial powers.")
 for i in range(Rules.TALENT_IDS.size()):
  var key=Rules.TALENT_IDS[i]
  var b=button(Rules.TALENT_TEXT[i],func():
   if Rules.talent(profile,key):fox.attributes=Rules.stats(profile);fox.health=profile.health;save_life();show_camp()
  )
  b.disabled=int(profile.talents.get(key,0))>=5;out.add_child(b)
 fit_menu.call_deferred()

func show_build():
 var mutation=str(profile.get("mutation",""))
 var out=make_menu("This fox's living build",Legacy.mutation_name(mutation)+" · "+Legacy.mutation_text(mutation),true)
 if profile.get("relics",[]).is_empty():out.add_child(label("No relics yet. Treasure, shrines and guardians can reveal them.",12,Color("b3c6c1")))
 else:
  for id in profile.relics:out.add_child(label("RELIC · "+Legacy.relic_name(id)+"\n"+Legacy.relic_text(id),12,Color("e8c790")))
 var synergies=Legacy.synergies_for(profile)
 if not synergies.is_empty():
  for id in synergies:out.add_child(label("SYNERGY · "+Legacy.SYNERGIES[id].name+"\n"+Legacy.SYNERGIES[id].text,12,Color("c4b1f0")))
 out.add_child(label("All of this power belongs to this life. Death archives the story, then clears the build.",11,Color("c1afa2")))
 out.add_child(button("Back to the lantern",show_camp));fit_menu.call_deferred()

func next_room(route):
 profile.depth+=1;profile.route=route;profile.taken=[];profile.defeated=[];profile.chest=false;profile.cleared=false;profile.position=[100.0,520.0]
 profile.health=fox.health;profile.ward=Rules.stats(profile).ward
 build_room(false);set_mode("playing");save_life();notify(room.get("archetype_name","Wandering Roots")+" · "+Rules.BIOMES[room.biome].name+" · Chamber "+str(profile.depth))

func build_hud():
 hud=Control.new();hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);hud.mouse_filter=Control.MOUSE_FILTER_IGNORE;ui.add_child(hud)
 hud_name=label("",15);hud.add_child(hud_name)
 hud_health=label("",24,Color("f0c990"));hud.add_child(hud_health)
 hud_level=label("",11,Color("cdb7ed"));hud.add_child(hud_level)
 hud_place=label("",17);hud_place.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;hud.add_child(hud_place)
 hud_light=label("",22,Color("f3d49b"));hud_light.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT;hud.add_child(hud_light)
 xp_bar=ProgressBar.new();xp_bar.show_percentage=false;xp_bar.add_theme_stylebox_override("background",strip_style(Color("1d3540")));xp_bar.add_theme_stylebox_override("fill",strip_style(Color("ad93cb")));hud.add_child(xp_bar)
 var pause=button("II",play_pause);pause.name="Pause";pause.custom_minimum_size=Vector2(48,48);hud.add_child(pause)
 hint=label("",13,Color("f1d5a4"));hint.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;ui.add_child(hint)
 touch_root=Node2D.new();ui.add_child(touch_root)
 var icons={"move_left":"M48 23L28 40L48 57","move_right":"M32 23L52 40L32 57","jump":"M24 44L40 25L56 44M40 25V60","drop":"M24 37L40 54L56 37M40 54V20M22 66H58","dash":"M22 30H50L42 20M27 43H60L50 54","pulse":"M40 18V62M18 40H62M25 25L55 55M25 55L55 25","interact":"M27 20H52V60H27M18 40H44M35 31L44 40L35 49"}
 for action in icons:
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="36" fill="#112c37" fill-opacity=".80" stroke="#e7cc9f" stroke-width="2"/><path d="'+icons[action]+'" fill="none" stroke="#f6dfb5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  var image=Image.new();image.load_svg_from_string(svg)
  var tb=TouchScreenButton.new();tb.texture_normal=ImageTexture.create_from_image(image);tb.action=action;tb.visibility_mode=TouchScreenButton.VISIBILITY_ALWAYS
  var shape=CircleShape2D.new();shape.radius=37;tb.shape=shape;tb.shape_centered=true;touch_root.add_child(tb);touch_buttons.append(tb)
  # Use native sliding capture only for the direction pad. Jump/dash stay
  # finger-owned so drifting across an action cannot create an accidental press.
  if action in ["move_left","move_right"]:
   tb.passby_press=true;var thumb_shape=RectangleShape2D.new();thumb_shape.size=Vector2(80,112);tb.shape=thumb_shape
  var active_image=Image.new();active_image.load_svg_from_string(svg.replace("#112c37","#426270"));tb.texture_pressed=ImageTexture.create_from_image(active_image)
  var text=label({"move_left":"","move_right":"","jump":"JUMP","drop":"DOWN","dash":"DASH","pulse":"PULSE","interact":"ENTER"}[action],10);text.position=Vector2(0,78);text.size=Vector2(80,16);text.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER;tb.add_child(text)
 var feedback=preload("res://touch_feedback.gd").new();feedback.game=self;touch_root.add_child(feedback)

func resize_ui():
 # Rotating/resizing invalidates held thumb coordinates; hiding releases native buttons.
 var restore_touch=touch_root.visible
 touch_root.hide();clear_input()
 if is_instance_valid(fox):fox.jump_buffer=0;fox.dash_buffer=0;fox.buffered_jump_released=false
 var s=get_viewport_rect().size
 background.position=Vector2(-s.x*.03,-s.y*.02);background.size=s*Vector2(1.06,1.04)
 var portrait=s.x<s.y
 camera.zoom=Vector2.ONE*(s.x/500.0 if portrait else minf(s.x/1050.0,s.y/640.0))
 hud_name.position=Vector2(90,18);hud_name.size=Vector2(s.x-164 if portrait else 310,24)
 hud_health.position=Vector2(90,78);hud_health.size=Vector2(250,20);hud_health.add_theme_font_size_override("font_size",11)
 hud_level.position=Vector2(90,40);hud_level.size=Vector2(s.x-154 if portrait else 310,20);hud_level.add_theme_font_size_override("font_size",10)
 xp_bar.position=Vector2(90,103);xp_bar.size=Vector2(190 if portrait else 260,5)
 hud_place.position=Vector2(15 if portrait else s.x/2-210,125 if portrait else 20);hud_place.size=Vector2(s.x-30 if portrait else 420,50)
 hud_light.position=Vector2(s.x-115,88 if portrait else 20);hud_light.size=Vector2(95,32)
 hud.get_node("Pause").position=Vector2(s.x-68,14 if portrait else 65);hud.get_node("Pause").size=Vector2(48,48)
 hint.position=Vector2(20,185 if portrait else s.y-155);hint.size=Vector2(s.x-40,50)
 var bottom=s.y-80
 var specs={"move_left":[Vector2(40,bottom),58.0],"move_right":[Vector2(106,bottom),58.0],"drop":[Vector2(174,bottom) if not portrait else Vector2(73,bottom-68),44.0],"pulse":[Vector2(s.x-153,bottom-5),58.0],"dash":[Vector2(s.x-94,bottom-68),54.0],"jump":[Vector2(s.x-44,bottom),72.0],"interact":[Vector2(s.x*.5,bottom-55),44.0]}
 for tb in touch_buttons:
  var spec=specs[tb.action];tb.scale=Vector2.ONE*(spec[1]/80.0);tb.position=spec[0]-Vector2.ONE*(spec[1]/2.0)
 touch_root.visible=restore_touch
 if is_instance_valid(menu):fit_menu.call_deferred()

func update_hud():
 if not profile.get("alive",false):return
 var b=Rules.BLOODLINES[int(profile.bloodline)];var level=Rules.level_info(profile.xp)
 hud_name.text=profile.name
 hud_health.text="HEARTS %d / %d%s"%[fox.health,fox.attributes.health,"  WARD" if fox.ward else ""]
 hud_level.text="LEVEL %d  ·  SPIRIT %d  ·  %s"%[level.level,profile.get("spirit",0),"DASH READY" if fox.dash_cooldown<=0 else "DASH %.1fs"%fox.dash_cooldown]
 hud_place.text="CHAMBER %02d · %s\n%s"%[profile.depth,room.get("archetype_name","Wandering Roots"),Rules.BIOMES[room.biome].name];hud_light.text="LIGHT "+str(profile.light)
 xp_bar.max_value=level.next;xp_bar.value=level.into
 for tb in touch_buttons:
  if tb.action=="interact":tb.visible=fox.position.distance_to(room.portal)<140

func _process(dt):
 # Modal UI has its own render layer, derived from authoritative game state.
 menu_layer.visible=mode!="playing"
 clock+=minf(dt,.05)
 if mode=="playing":
  for i in range(combat_text.size()-1,-1,-1):
   combat_text[i].life-=dt
   if not reduced_motion:combat_text[i].pos.y-=dt*22
   if combat_text[i].life<=0:combat_text.remove_at(i)
 if hint_timer>0:hint_timer=maxf(0,hint_timer-dt)
 for i in range(particles.size()-1,-1,-1):
  var p=particles[i];p.age-=dt;p.pos+=p.v*dt;p.v.y+=140*dt
  if p.age<=0:particles.remove_at(i)
 for i in range(rings.size()-1,-1,-1):
  rings[i].age-=dt
  if rings[i].age<=0:rings.remove_at(i)
 if is_instance_valid(fox) and mode not in ["title","choose","dead"]:
  var target_look=85.0*fox.facing if absf(fox.velocity.x)>35 else look
  look=lerpf(look,target_look,1-exp(-dt*5))
  var half_width=get_viewport_rect().size.x/(2*camera.zoom.x)
  # Short landscape phone views reserve the bottom band for thumbs. Keep
  # the platform/fox near 55% height rather than underneath the move buttons.
  var view_size=get_viewport_rect().size
  var resting_y=365.0
  if view_size.x>view_size.y and view_size.y<=430:
   resting_y=520.0-(view_size.y*.05)/camera.zoom.y
  var target=Vector2(clampf(fox.position.x+look,half_width,room.width-half_width),minf(resting_y,fox.position.y+120))
  camera.position=camera.position.lerp(target,1-exp(-dt*10))
 else:camera.position=Vector2(620,365)
 if is_instance_valid(art):art.queue_redraw()
 publish_timer+=dt
 if publish_timer>.05:
  publish_timer=0
  if OS.has_feature("web"):
   var state=snapshot();JavaScriptBridge.eval("window.emberStatus="+JSON.stringify(state)+";document.body.dataset.ember="+JSON.stringify(mode)+";",true)

func snapshot():
 return {"engine":"Godot 4.7.2","build":"legacy-replayability-20260913","startupStage":startup_stage,"mode":mode,"alive":profile.get("alive",false),"name":profile.get("name",""),"level":Rules.level_info(profile.get("xp",0)).level,"xp":profile.get("xp",0),"light":profile.get("light",0),"spirit":profile.get("spirit",0),"depth":profile.get("depth",0),"health":fox.health if is_instance_valid(fox) else 0,"x":fox.position.x if is_instance_valid(fox) else 0,"y":fox.position.y if is_instance_valid(fox) else 0,"grounded":fox.is_on_floor() if is_instance_valid(fox) else false,"dash":fox.dash_time if is_instance_valid(fox) else 0,"candidateNames":options.map(func(x):return x.name),"warning":warning,"menus":menu_layer.get_children().filter(func(n):return n is PanelContainer and n.is_visible_in_tree()).size(),"menuButtons":button_observations(ui)+button_observations(menu_layer),"viewport":[get_viewport_rect().size.x,get_viewport_rect().size.y],"touch":touch_buttons.filter(func(b):return b.is_visible_in_tree()).map(func(b):return {"action":b.action,"center":[b.position.x+40*b.scale.x,b.position.y+40*b.scale.y],"size":80*b.scale.x}),"vx":fox.velocity.x if is_instance_valid(fox) else 0,"vy":fox.velocity.y if is_instance_valid(fox) else 0,"camera":[camera.position.x,camera.position.y],"zoom":camera.zoom.x,"seed":profile.get("seed",0),"terrain":room.get("platforms",[]),"opponents":room.get("enemies",[]),"dashSerial":fox.dash_serial if is_instance_valid(fox) else 0,"jumpsUsed":fox.jumps_used if is_instance_valid(fox) else 0,"inputAxis":Input.get_axis("move_left","move_right"),"airJumps":fox.air_jumps_remaining() if is_instance_valid(fox) else 0,"animation":fox.sprite.animation if is_instance_valid(fox) else "","animationPlaying":fox.sprite.is_playing() if is_instance_valid(fox) else false,"reducedMotion":reduced_motion,"selectedFox":options[selection].name if not options.is_empty() else "","generation":profile.get("generation",legacy.generation),"mutation":profile.get("mutation",""),"relics":profile.get("relics",[]),"synergies":Legacy.synergies_for(profile),"roomArchetype":room.get("archetype",""),"roomReward":room.get("reward",{}),"legacyRuns":legacy.runs,"legacyGeneration":legacy.generation,"lastDeath":last_dead,"hudHealth":hud_health.text,"hudLight":hud_light.text}

func _unhandled_input(event):
 if event.is_action_pressed("pause_game") and not event.is_echo() and mode in ["playing","paused"]:
  play_pause();get_viewport().set_input_as_handled()

func _notification(what):
 if what==NOTIFICATION_APPLICATION_FOCUS_OUT and not ignore_focus and mode=="playing":play_pause()

func load_legacy():
 var raw=null
 if OS.has_feature("web"):
  raw=JavaScriptBridge.eval("(()=>{try{return localStorage.getItem('"+Legacy.META_KEY+"')}catch(e){return '__unavailable__'}})()",true)
 else:
  if FileAccess.file_exists("user://lineage.json"):raw=FileAccess.get_file_as_string("user://lineage.json")
 legacy_raw=raw
 if raw==null:return
 if not raw is String or raw=="__unavailable__" or raw.length()>524288:
  warning=(warning+"  " if not warning.is_empty() else "")+"Lineage archive storage is unavailable; this run can continue."
  return
 var parsed=JSON.parse_string(raw);legacy=Legacy.normalize_archive(parsed)

func save_legacy():
 if test_mode:return true
 var raw=JSON.stringify(legacy)
 if OS.has_feature("web"):
  var current=JavaScriptBridge.eval("(()=>{try{return localStorage.getItem('"+Legacy.META_KEY+"')}catch(e){return '__unavailable__'}})()",true)
  if current=="__unavailable__":
   warning=(warning+"  " if not warning.is_empty() else "")+"Lineage archive could not be saved."
   return false
  if current!=legacy_raw and current is String and current.length()>0:
   var other=JSON.parse_string(current)
   legacy=Legacy.merge_archives(legacy,other);raw=JSON.stringify(legacy)
  var result=JavaScriptBridge.eval("(()=>{try{localStorage.setItem("+JSON.stringify(Legacy.META_KEY)+","+JSON.stringify(raw)+");return 'ok'}catch(e){return 'unavailable'}})()",true)
  if result!="ok":return false
 else:
  var file=FileAccess.open("user://lineage.tmp",FileAccess.WRITE)
  if not file:return false
  file.store_string(raw);file.close()
  if DirAccess.rename_absolute("user://lineage.tmp","user://lineage.json")!=OK:return false
 legacy_raw=raw
 return true

func load_life():
 var raw=null
 if OS.has_feature("web"):
  raw=JavaScriptBridge.eval("(()=>{try{return localStorage.getItem('"+Rules.SAVE_KEY+"')}catch(e){return '__unavailable__'}})()",true)
 else:
  if FileAccess.file_exists("user://ironflame.json"):raw=FileAccess.get_file_as_string("user://ironflame.json")
 save_raw=raw
 if raw==null:return
 if not raw is String or raw=="__unavailable__" or raw.length()>262144:
  read_only=true;warning="Local saving is unavailable. This life is temporary.";return
 var parsed=JSON.parse_string(raw);profile=Rules.normalize(parsed)
 if profile.is_empty():read_only=true;warning="This save needs recovery. It was not overwritten. This session is temporary."

func save_life():
 if test_mode:return true
 if storage_conflict or read_only:return false
 if profile.get("alive",false) and is_instance_valid(fox):
  profile.health=fox.health;profile.ward=fox.ward
  profile.position=[fox.safe_position.x,fox.safe_position.y]
 var raw=JSON.stringify(profile)
 if OS.has_feature("web"):
  var script="(()=>{try{if(localStorage.getItem("+JSON.stringify(Rules.SAVE_KEY)+")!=="+JSON.stringify(save_raw)+")return 'conflict';localStorage.setItem("+JSON.stringify(Rules.SAVE_KEY)+","+JSON.stringify(raw)+");return 'ok'}catch(e){return 'unavailable'}})()"
  var result=JavaScriptBridge.eval(script,true)
  if result=="conflict":
   storage_conflict=true;warning="Another tab changed this profile. Reload this page before continuing.";set_mode("conflict")
   var out=make_menu("Your other journey changed.",warning);out.add_child(button("Reload the latest profile",func():JavaScriptBridge.eval("location.reload()",true)));fit_menu.call_deferred();return false
  if result!="ok":read_only=true;warning="Saving failed. This session is temporary; do not rely on a reload to keep it.";notify(warning,7);return false
 else:
  var file=FileAccess.open("user://ironflame.tmp",FileAccess.WRITE)
  if not file:read_only=true;warning="Local saving is unavailable.";return false
  file.store_string(raw);file.close()
  if DirAccess.rename_absolute("user://ironflame.tmp","user://ironflame.json")!=OK:read_only=true;warning="Local save could not be committed.";return false
 save_raw=raw
 return true

func button_observations(node):
 var items=[]
 for child in node.get_children():
  if child is Button and child.is_visible_in_tree() and not child.disabled:
   var rect=child.get_global_rect()
   items.append({"text":child.text,"rect":[rect.position.x,rect.position.y,rect.size.x,rect.size.y]})
  items.append_array(button_observations(child))
 return items

func strip_style(color):
 var style=StyleBoxFlat.new()
 style.bg_color=color
 style.set_corner_radius_all(3)
 style.content_margin_left=0;style.content_margin_right=0;style.content_margin_top=0;style.content_margin_bottom=0
 return style

func _queue_menu_height(id):
 _fit_menu_height.call_deferred(id)

func _exit_tree():
 for player in audio_players:
  if is_instance_valid(player):
   player.stop()
   player.stream=null
 sounds.clear()
