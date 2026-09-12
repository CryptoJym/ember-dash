extends SceneTree
var checks=0
var failures=[]
func verify(name,ok):
 checks+=1
 if not ok:failures.append(name);print("FAIL ",name)
 else:print("PASS ",name)
func _initialize():
 var meta=JSON.parse_string(FileAccess.get_file_as_string("res://assets/atlas.json"))
 verify("384x288 metadata matches the rendered cells",meta.frameWidth==384 and meta.frameHeight==288)
 verify("stable shared foot pivot is inside every frame",meta.anchor[0]>.4 and meta.anchor[0]<.8 and meta.anchor[1]>.7 and meta.anchor[1]<.95)
 var hashes=[];var frames_checked=0
 for id in ["ember","tide","gale","void","sun","bloom"]:
  var atlas=load("res://assets/atlases/"+id+".png").get_image();atlas.convert(Image.FORMAT_RGBA8)
  verify(id+" atlas has sixteen complete cells",atlas.get_size()==Vector2i(1536,1152))
  var valid=true;var aligned=true;var poses=[]
  for i in range(16):
   var cell=atlas.get_region(Rect2i((i%4)*384,int(i/4)*288,384,288));var rect=cell.get_used_rect()
   valid=valid and rect.has_area() and rect.position.x>0 and rect.position.y>0 and rect.end.x<384 and rect.end.y<288
   aligned=aligned and rect.end.y>=237 and rect.end.y<=255
   if i>=4 and i<12:poses.append(cell.get_data().hex_encode().sha256_text())
   frames_checked+=1
  verify(id+" frames contain art with no boundary clipping",valid)
  verify(id+" visible feet remain near the physics anchor",aligned)
  var unique={}
  for h in poses:unique[h]=true
  verify(id+" run contains eight distinct rendered poses",unique.size()==8)
  hashes.append(atlas.get_data().hex_encode().sha256_text())
  verify(id+" portrait and HUD head are imported",ResourceLoader.exists("res://assets/portraits/"+id+".png") and ResourceLoader.exists("res://assets/heads/"+id+".png"))
 var unique_variants={}
 for h in hashes:unique_variants[h]=true
 verify("six bloodlines have distinct image assets",unique_variants.size()==6)
 var props=JSON.parse_string(FileAccess.get_file_as_string("res://assets/props.json"))
 for id in ["grove","frost","cinder"]:
  verify(id+" landing projection has ordered finite bounds",is_finite(props[id].left) and props[id].left>0 and props[id].right<1 and props[id].left<props[id].right and props[id].top>0 and props[id].top<1)
  verify(id+" foreground and portal textures are imported",ResourceLoader.exists("res://assets/terrain/"+id+".png") and ResourceLoader.exists("res://assets/portals/"+id+".png"))
 for id in ["crawler","wisp","spitter","keeper"]:verify(id+" rendered enemy and anchor exist",ResourceLoader.exists("res://assets/enemies/"+id+".png") and props[id].has("anchor"))
 print(JSON.stringify({"suite":"rendered art and projection contracts","checks":checks,"frames":frames_checked,"failures":failures}))
 quit(0 if failures.is_empty() else 1)
