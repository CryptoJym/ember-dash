extends SceneTree
func _initialize():
 var args=OS.get_cmdline_user_args()
 if args.size()!=1:push_error("Provide the output notice path");quit(2);return
 var text="GODOT ENGINE AND INCLUDED THIRD-PARTY NOTICES\n\n"+Engine.get_license_text()+"\n\n"
 var copyright=Engine.get_copyright_info()
 for entry in copyright:text+=JSON.stringify(entry,"  ")+"\n\n"
 var licenses=Engine.get_license_info()
 for name in licenses:text+="\n"+name+"\n"+str(licenses[name])+"\n"
 var file=FileAccess.open(args[0],FileAccess.WRITE)
 if not file:push_error("Cannot write engine notices");quit(3);return
 file.store_string(text);file.close();print("ENGINE_NOTICES_WRITTEN");quit()
