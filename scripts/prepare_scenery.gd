extends SceneTree
func _initialize():
 var args=OS.get_cmdline_user_args()
 DirAccess.make_dir_recursive_absolute(args[1]+"/backdrops")
 for name in ["grove","frost","cinder"]:
  var image=Image.load_from_file(args[0]+"/backdrops/"+name+".png")
  image.convert(Image.FORMAT_RGB8)
  var err=image.save_jpg(args[1]+"/backdrops/"+name+".jpg",.9)
  if err!=OK:push_error("Backdrop conversion failed");quit(2);return
 print("BACKDROP_ASSETS_READY")
 quit()
