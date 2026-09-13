"""Animate the six approved illustrated foxes as deformable Blender image meshes.
This is a 2.5D puppet with preserved painted character designs, NOT a 3D sculpt.
Each .blend packs its own source texture and sixteen keyed mesh poses.
Usage: Blender --background --factory-startup --threads 4 --python SCRIPT -- INPUT OUTPUT
"""
import bpy,math,json,sys,hashlib,shutil
from pathlib import Path
from mathutils import Vector
SRC,OUT=[Path(x) for x in sys.argv[sys.argv.index('--')+1:][:2]];OUT.mkdir(parents=True,exist_ok=True)
W,H=512,384;AX,AY=256,324;TAU=math.tau
KEYS=['ember','tide','gale','void','sun','bloom']
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def transform(x,y,frame):
 run=4<=frame<12;air=frame in [12,13,14];phase=((frame-4)%8)/8*TAU if run else frame*TAU/4
 dx=0.;dy=0.
 # Small, continuous anatomy weights preserve the original painterly silhouette.
 tail=(1-smooth(192,253,x))*(1-smooth(265,302,y))
 dx+=tail*math.sin(phase)*3;dy+=tail*math.sin(phase+(x-100)*.007)*(7 if run else 3)
 head=smooth(279,332,x)*(1-smooth(225,260,y));dy+=head*(-5 if frame==12 else 3 if frame==13 else math.sin(phase)*1.8)
 if run:
  lower=smooth(226,302,y)
  hind=math.exp(-((x-217)/43)**4)*lower;front=math.exp(-((x-318)/40)**4)*lower
  dx+=hind*math.sin(phase)*15+front*math.sin(phase+math.pi)*15
  dy-=hind*max(0,math.cos(phase))*8+front*max(0,math.cos(phase+math.pi))*8
  dy-=(1-lower)*math.sin(phase*2)*2.3
 elif air:
  lower=smooth(225,310,y);dx+=(x-266)*.08*lower;dy-=lower*(18 if frame!=14 else 11)
  if frame==14:dx+=(x-AX)*.06;dy=(dy+(y-240)*-.045)
 elif frame==15:dx+=smooth(220,330,x)*5;dy-=head*3
 else:dy-=math.sin(phase)*1.4*(1-smooth(280,324,y))
 return ((x+dx-AX)/100,0,(AY-y-dy)/100)
receipts=[]
for key in KEYS:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.render.film_transparent=True;sc.render.resolution_x=W;sc.render.resolution_y=H;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.threads_mode='FIXED';sc.render.threads=4;sc.render.fps=14
 sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.world.color=(0,0,0)
 img=bpy.data.images.load(str(SRC/'cutouts'/(key+'.png')),check_existing=False);img.pack()
 mat=bpy.data.materials.new('Approved illustration | '+key);mat.use_nodes=True;n=mat.node_tree.nodes;n.clear()
 out=n.new('ShaderNodeOutputMaterial');mix=n.new('ShaderNodeMixShader');em=n.new('ShaderNodeEmission');tr=n.new('ShaderNodeBsdfTransparent');tex=n.new('ShaderNodeTexImage');tex.image=img
 mat.node_tree.links.new(tex.outputs['Color'],em.inputs[0]);mat.node_tree.links.new(tex.outputs['Alpha'],mix.inputs[0]);mat.node_tree.links.new(tr.outputs[0],mix.inputs[1]);mat.node_tree.links.new(em.outputs[0],mix.inputs[2]);mat.node_tree.links.new(mix.outputs[0],out.inputs[0]);mat.surface_render_method='DITHERED'
 nx,ny=48,36;verts=[];faces=[];uvs=[];pixels=[]
 for row in range(ny+1):
  for col in range(nx+1):
   x=col/nx*W;y=row/ny*H;verts.append(((x-AX)/100,0,(AY-y)/100));pixels.append((x,y));uvs.append((col/nx,1-row/ny))
 for row in range(ny):
  for col in range(nx):
   a=row*(nx+1)+col;faces.append((a,a+nx+1,a+nx+2,a+1))
 mesh=bpy.data.meshes.new('Continuous illustrated skin');mesh.from_pydata(verts,[],faces);mesh.update();uv=mesh.uv_layers.new(name='Approved artwork UV')
 for p in mesh.polygons:
  for li in p.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
 obj=bpy.data.objects.new(key+' | approved painted fox',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat);obj.shape_key_add(name='Basis')
 poses=[]
 for frame in range(16):
  pose=obj.shape_key_add(name=('Idle' if frame<4 else 'Run' if frame<12 else ['Rise','Fall','Dash','Pulse'][frame-12])+f' {frame:02}')
  for point,pixel in zip(pose.data,pixels):point.co=transform(*pixel,frame)
  for t in range(16):pose.value=1 if t==frame else 0;pose.keyframe_insert(data_path='value',frame=t+1)
  poses.append(pose)
 bpy.ops.object.camera_add(location=(0,-10,(AY-H/2)/100));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=W/100;sc.camera=cam
 sc.frame_start=1;sc.frame_end=16
 frames=OUT/'frames'/key;frames.mkdir(parents=True,exist_ok=True)
 for frame in range(16):
  sc.frame_set(frame+1);sc.render.filepath=str(frames/f'{frame:02}.png');bpy.ops.render.render(write_still=True)
 sc.frame_set(1);(OUT/'source').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(key+'-approved-puppet.blend')),compress=True)
 receipts.append({'variant':key,'frames':16,'meshVertices':len(verts),'keyedPoses':16,'sourceSha256':hashlib.sha256((SRC/'cutouts'/(key+'.png')).read_bytes()).hexdigest()})
for sub in ['portraits','heads']:
 (OUT/sub).mkdir(exist_ok=True)
 for key in KEYS:shutil.copyfile(SRC/sub/(key+'.png'),OUT/sub/(key+'.png'))
meta={'frameWidth':W,'frameHeight':H,'columns':4,'rows':4,'anchor':[AX/W,AY/H],'drawScale':.38,'clips':{'idle':[0,4,4],'run':[4,8,14],'rise':[12,1,1],'fall':[13,1,1],'dash':[14,1,1],'pulse':[15,1,1]},'source':'Approved painted six-fox illustration, directly cropped and animated as a Blender 2.5D mesh puppet. No substitute recolored model.','variants':KEYS}
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2));(OUT/'render-receipt.json').write_text(json.dumps(receipts,indent=2));print('APPROVED_PUPPETS_RENDERED',flush=True)
