extends SceneTree
## Native regression for the playtest's offscreen-Begin and covered-fox findings.
var checks=0
var failures=[]
func _initialize():run.call_deferred()
func check(ok,message):
 checks+=1
 if not ok:failures.append(message)
 print(("PASS " if ok else "FAIL ")+message)
func frames(n):
 for i in range(n):await process_frame
func run():
 for dims in [Vector2i(320,568),Vector2i(375,667),Vector2i(390,664),Vector2i(844,300),Vector2i(844,390),Vector2i(768,1024)]:
  root.size=dims
  var game=load("res://main.gd").new();game.test_mode=true;game.ignore_focus=true;root.add_child(game)
  await frames(15);game.open_choices();await frames(25)
  var viewport=Rect2(Vector2.ZERO,Vector2(dims));var begin=game.start_button.get_global_rect()
  check(viewport.encloses(begin),"%s: Begin stays fully inside viewport"%str(dims))
  check(viewport.encloses(game.menu.get_global_rect()),"%s: selection panel respects screen bounds"%str(dims))
  game.start_life(game.options[0]);await frames(100)
  if dims.x>dims.y:
   var foot=(game.fox.position-game.camera.position)*game.camera.zoom+Vector2(dims)/2
   var body=Rect2(foot-Vector2(21,34)*game.camera.zoom,Vector2(42,34)*game.camera.zoom)
   var overlaps=false
   for t in game.touch_buttons:
    if t.action in ["move_left","move_right"]:
     var center=t.position+Vector2.ONE*40*t.scale.x
     var near=Vector2(clampf(center.x,body.position.x,body.end.x),clampf(center.y,body.position.y,body.end.y))
     if near.distance_to(center)<80*t.scale.x*.45:overlaps=true
   check(not overlaps,"%s: landscape fox is above movement controls"%str(dims))
  root.remove_child(game);game.queue_free();await frames(5)
 print(JSON.stringify({"suite":"small-screen layout","checks":checks,"failures":failures}))
 quit(0 if failures.is_empty() else 1)
