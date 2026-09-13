extends Node2D
## Read-only rings beside the player's thumb: never disables buffered input.
var game
func _process(_dt):
 if is_visible_in_tree():queue_redraw()
func _draw():
 if not is_instance_valid(game) or not is_instance_valid(game.fox) or game.mode!="playing":return
 var f=game.fox
 for b in game.touch_buttons:
  if not b.is_visible_in_tree() or b.action not in ["dash","jump"]:continue
  var center=b.position+Vector2(40,40)*b.scale
  var radius=36*b.scale.x
  var ready=1.0
  if b.action=="dash":ready=clampf(1-f.dash_cooldown/maxf(.01,f.attributes.dash_cooldown),0,1)
  else:ready=1.0 if f.is_on_floor() else float(f.air_jumps_remaining())/maxi(1,int(f.attributes.jumps)-1)
  draw_arc(center,radius,-PI*.5,TAU-PI*.5,44,Color(f.color,.17),2,true)
  if ready>.005:draw_arc(center,radius,-PI*.5,TAU*ready-PI*.5,44,Color(f.color,.9),2.5,true)
