extends SceneTree
## Build a metadata-driven atlas. No resizing or recropping of individual animation cells.
func _initialize():
 var args=OS.get_cmdline_user_args()
 if args.size()!=2:push_error("Expected art and asset directories");quit(2);return
 var source=args[0];var dest=args[1]
 var meta=JSON.parse_string(FileAccess.get_file_as_string(source+"/atlas.json"))
 if not meta is Dictionary:push_error("Missing atlas metadata");quit(3);return
 var fw=int(meta.frameWidth);var fh=int(meta.frameHeight)
 var receipt={"frames":0,"clipping":[],"variants":[],"resolution":[fw,fh],"drawScale":meta.drawScale}
 for sub in ["atlases","portraits","heads"]:DirAccess.make_dir_recursive_absolute(dest+"/"+sub)
 for name in meta.variants:
  var atlas=Image.create(fw*4,fh*4,false,Image.FORMAT_RGBA8)
  for i in range(16):
   var image=Image.load_from_file(source+"/frames/"+name+"/%02d.png"%i)
   if not image or image.is_empty() or image.get_size()!=Vector2i(fw,fh):push_error("Missing/wrong frame "+name+str(i));quit(4);return
   image.convert(Image.FORMAT_RGBA8);var bounds=image.get_used_rect()
   if bounds.position.x<=0 or bounds.position.y<=0 or bounds.end.x>=fw or bounds.end.y>=fh:receipt.clipping.append({"variant":name,"frame":i,"bounds":str(bounds)})
   atlas.blit_rect(image,Rect2i(0,0,fw,fh),Vector2i((i%4)*fw,int(i/4)*fh));receipt.frames+=1
  if atlas.save_png(dest+"/atlases/"+name+".png")!=OK:quit(5);return
  for sub in ["portraits","heads"]:
   var portrait=Image.load_from_file(source+"/"+sub+"/"+name+".png")
   if portrait.is_empty():push_error("Missing portrait");quit(6);return
   if portrait.save_png(dest+"/"+sub+"/"+name+".png")!=OK:quit(7);return
  receipt.variants.append(name)
 for entry in [["atlas.json",meta],["atlas-receipt.json",receipt]]:
  var f=FileAccess.open(dest+"/"+entry[0],FileAccess.WRITE);f.store_string(JSON.stringify(entry[1],"  "));f.close()
 print(JSON.stringify(receipt))
 quit(0 if receipt.clipping.is_empty() else 8)
