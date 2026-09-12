"""Editable Blender staging scenes for the approved 2.5D paintings and foxes.
Packed image planes and keyed painted character mesh; not a full 3D recreation.
No original project scene is modified.
"""
import bpy,sys,math,json
from pathlib import Path
R=Path(sys.argv[sys.argv.index('--')+1]);OUT=R/'approved-stages';OUT.mkdir(exist_ok=True)
def plane(name,image_path,x,y,z,w,h):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(-w/2,0,-h/2),(w/2,0,-h/2),(w/2,0,h/2),(-w/2,0,h/2)],[],[(0,1,2,3)]);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=(x,y,z)
 uv=mesh.uv_layers.new(name='Painting UV')
 for p in mesh.polygons:
  for j,li in enumerate(p.loop_indices):uv.data[li].uv=[(0,0),(1,0),(1,1),(0,1)][j]
 image=bpy.data.images.load(str(image_path),check_existing=False);image.pack()
 mat=bpy.data.materials.new(name+' | Original artwork');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear()
 tex=n.new('ShaderNodeTexImage');tex.image=image;em=n.new('ShaderNodeEmission');tr=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');out=n.new('ShaderNodeOutputMaterial');l=mat.node_tree.links
 l.new(tex.outputs['Color'],em.inputs[0]);l.new(tex.outputs['Alpha'],mix.inputs[0]);l.new(tr.outputs[0],mix.inputs[1]);l.new(em.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],out.inputs[0]);mat.surface_render_method='DITHERED';mesh.materials.append(mat)
 return obj
for key,foxkey in [('grove','ember'),('frost','tide'),('cinder','void')]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 scene=bpy.context.scene;scene.name='Ember Dash | '+key+' | 2.5D approved stage';scene['art_pipeline']='Approved concept paintings, textured Blender puppet and Blender-baked foreground assets. Not fully modeled backdrop geometry.'
 plane('Approved distant matte',R/'approved-worlds'/(key+'.jpg'),0,3,0,19.2,10.8)
 plane('Left foreground platform',R/'godot/assets/terrain'/(key+'.png'),-5,0,-3.4,8,5.33)
 plane('Right foreground platform',R/'godot/assets/terrain'/(key+'.png'),4,.1,-3.6,8,5.33)
 with bpy.data.libraries.load(str(R/'approved-animated/source'/(foxkey+'-approved-puppet.blend')),link=False) as (source,dest):dest.objects=[n for n in source.objects if 'approved painted fox' in n]
 for obj in dest.objects:
  bpy.context.collection.objects.link(obj);obj.location=(-5,-.3,-2.65);obj.scale=(.48,.48,.48)
 bpy.ops.object.camera_add(location=(0,-12,0),rotation=(math.pi/2,0,0));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=19.2;scene.camera=camera
 scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.frame_start=1;scene.frame_end=16;scene.render.fps=14;scene.frame_set(5)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(key+'-approved-stage.blend')),compress=True)
print('APPROVED_EDITABLE_STAGES_SAVED',flush=True)
