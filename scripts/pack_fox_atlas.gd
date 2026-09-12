extends SceneTree
func _initialize():
 var args=OS.get_cmdline_user_args()
 if args.size()!=2:
  push_error("Expected source art folder and output assets folder");quit(2);return
 var source=args[0];var dest=args[1]
 DirAccess.make_dir_recursive_absolute(dest+"/atlases")
 DirAccess.make_dir_recursive_absolute(dest+"/portraits")
 var receipt={"frames":96,"clips":["idle","run","rise","fall","dash","pulse"],"variants":[],"clipping":[]}
 for name in ["ember","tide","gale","void","sun","bloom"]:
  var atlas=Image.create(1024,768,false,Image.FORMAT_RGBA8)
  for i in range(16):
   var image=Image.load_from_file(source+"/frames/"+name+"/%02d.png"%i)
   if not image or image.is_empty():push_error("Missing frame "+name+str(i));quit(3);return
   image.convert(Image.FORMAT_RGBA8)
   var bounds=image.get_used_rect()
   if bounds.position.x<=0 or bounds.position.y<=0 or bounds.end.x>=256 or bounds.end.y>=192:receipt.clipping.append({"variant":name,"frame":i,"bounds":str(bounds)})
   atlas.blit_rect(image,Rect2i(0,0,256,192),Vector2i(i%4*256,int(i/4)*192))
  if atlas.save_png(dest+"/atlases/"+name+".png")!=OK:quit(4);return
  var portrait=Image.load_from_file(source+"/portraits/"+name+".png")
  var used=portrait.get_used_rect()
  if used.size.x>0 and used.size.y>0:
   used=used.grow(14).intersection(Rect2i(Vector2i.ZERO,portrait.get_size()))
   portrait=portrait.get_region(used)
  portrait.resize(480,360,Image.INTERPOLATE_LANCZOS);portrait.save_png(dest+"/portraits/"+name+".png")
  receipt.variants.append(name)
 var meta=FileAccess.get_file_as_string(source+"/atlas.json")
 var file=FileAccess.open(dest+"/atlas.json",FileAccess.WRITE);file.store_string(meta);file.close()
 var output=FileAccess.open(dest+"/atlas-receipt.json",FileAccess.WRITE);output.store_string(JSON.stringify(receipt,"  "));output.close()
 print(JSON.stringify(receipt));quit(0)
