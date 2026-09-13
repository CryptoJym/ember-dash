"""Composite the project's illustrated fox cutouts with Blender-authored birthrights.
The fox is a textured 2.5D image plane, not a misrepresented full 3D reconstruction.
Each native .blend contains packed texture frames and keyed visibility for playback.
Run: Blender --background --factory-startup --threads 4 --python SCRIPT -- SOURCE OUTPUT
"""
import bpy,math,sys,json
from pathlib import Path
from mathutils import Vector
SRC,OUT=[Path(x) for x in sys.argv[sys.argv.index('--')+1:][:2]];OUT.mkdir(parents=True,exist_ok=True)
TAU=math.tau

def point(x,y,depth=-.05):return ((x-192)/100,depth,(144-y)/100)
def material(name,color,glow=0):
    rgb=tuple((int(color[i:i+2],16)/255)**2.2 for i in [0,2,4]);m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.38;p.inputs['Metallic'].default_value=.3;p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=glow;return m

def curve(name,pts,r,m):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.bevel_depth=r;cv.bevel_resolution=2;s=cv.splines.new('POLY');s.points.add(len(pts)-1)
    for p,co in zip(s.points,pts):p.co=(*co,1)
    o=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o

def gem(name,p,scale,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m);return o

def plane(image_path,frame):
    img=bpy.data.images.load(str(image_path),check_existing=True);img.pack()
    m=bpy.data.materials.new('Illustrated fox frame '+str(frame));m.use_nodes=True;n=m.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');transparent=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');tex=n.new('ShaderNodeTexImage');tex.image=img;tex.interpolation='Linear'
    m.node_tree.links.new(tex.outputs['Color'],em.inputs[0]);m.node_tree.links.new(tex.outputs['Alpha'],mix.inputs[0]);m.node_tree.links.new(transparent.outputs[0],mix.inputs[1]);m.node_tree.links.new(em.outputs[0],mix.inputs[2]);m.node_tree.links.new(mix.outputs[0],out.inputs[0]);m.surface_render_method='DITHERED'
    mesh=bpy.data.meshes.new('Fox UV plane');mesh.from_pydata([(-1.92,0,-1.44),(1.92,0,-1.44),(1.92,0,1.44),(-1.92,0,1.44)],[],[(0,1,2,3)]);mesh.update();uv=mesh.uv_layers.new()
    for loop,coord in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=coord
    ob=bpy.data.objects.new('Fox_frame_%02d'%frame,mesh);bpy.context.collection.objects.link(ob);ob.data.materials.append(m)
    # One exact image pose is visible per timeline cell. All images are packed.
    for i in range(16):ob.hide_render=i!=frame;ob.hide_viewport=i!=frame;ob.keyframe_insert(data_path='hide_render',frame=i+1);ob.keyframe_insert(data_path='hide_viewport',frame=i+1)
    return ob

meta=json.loads((SRC/'atlas.json').read_text());variants=meta['variants'];receipt=[]
for variant in variants:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.render.film_transparent=True;sc.render.resolution_x=384;sc.render.resolution_y=288;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.threads_mode='FIXED';sc.render.threads=4;sc.render.fps=14
    sc.view_settings.view_transform='Standard';sc.view_settings.look='None'
    sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[1].default_value=.2
    tint={'ember':'FFAA44','tide':'9DDAFF','gale':'ACDBAF','void':'C9ADFF','sun':'FFDC8A','bloom':'ECA3BC'}[variant]
    magic=material('Birthright glow',tint,1.2);metal=material('Warm silver details','CAB98F');leaf=material('Botanical leaf','518F69');petal=material('Rose petal','ECA3BC',.2)
    for i in range(16):plane(SRC/'frames'/variant/f'{i:02d}.png',i)
    if variant=='tide':
        curve('Moonward crescent',[point(270+38*math.cos(a),132+38*math.sin(a),.06) for a in [i*4.6/40-.7 for i in range(41)]],.014,magic)
        for i in range(4):gem('Moon crystal',point(273-i*8,163+i*3),(.035,.025,.10),magic)
    elif variant=='sun':
        curve('Dawn halo',[point(281+37*math.cos(i*TAU/64),139+37*math.sin(i*TAU/64),.05) for i in range(65)],.012,metal)
        for i in range(10):
            a=i*TAU/10;curve('Solar ray',[point(281+39*math.cos(a),139+39*math.sin(a),.05),point(281+45*math.cos(a),139+45*math.sin(a),.05)],.008,magic)
    elif variant=='gale':
        for i in range(6):
            x=263-i*9;y=149+i*2
            mesh=bpy.data.meshes.new('Swept leaf');mesh.from_pydata([point(x,y),point(x-9,y-11),point(x-24,y-12),point(x-11,y+2)],[],[(0,1,2,3)]);mesh.update();ob=bpy.data.objects.new('Wind mantle leaf',mesh);bpy.context.collection.objects.link(ob);ob.data.materials.append(leaf)
            curve('Leaf vein',[point(x,y,-.06),point(x-23,y-11,-.06)],.006,magic)
    elif variant=='void':
        for j in range(2):curve('Stellar orbit',[point(221+54*math.cos(i*TAU/64),165+19*math.sin(i*TAU/64)+j*7,.03) for i in range(65)],.006,magic)
        for i in range(12):gem('Starlight node',point(164+i*11,153+12*math.sin(i*2)),(.012,.009,.022 if i%3==0 else .012),magic)
    elif variant=='bloom':
        curve('Vine mantle',[point(278+2*math.sin(i),151+i*5) for i in range(10)],.014,leaf)
        for i in range(5):
            x=277+5*math.sin(i*2);y=152+i*9
            for j in range(5):gem('Blossom petal',point(x+3.1*math.cos(j*TAU/5),y+3.1*math.sin(j*TAU/5),-.07),(.036,.013,.022),petal)
            gem('Blossom pollen',point(x,y,-.10),(.013,.01,.013),metal)
    else:
        for i in range(9):gem('Ember mote',point(146+i*13,141+10*math.sin(i*2),-.02),(.010,.006,.016),magic)
    bpy.ops.object.camera_add(location=(0,-10,0));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.84;sc.camera=cam
    for loc,energy,col in [((2,-4,5),450,(1,.85,.65)),((-3,-3,2),300,(.5,.7,1))]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=4;o.data.color=col;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
    target=OUT/'frames'/variant;target.mkdir(parents=True,exist_ok=True)
    for i in range(16):
        sc.frame_set(i+1);sc.render.filepath=str(target/f'{i:02d}.png');bpy.ops.render.render(write_still=True)
    sc.frame_set(1);sc.frame_start=1;sc.frame_end=16
    sources=OUT/'source';sources.mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(sources/(variant+'-illustrated.blend')),compress=True)
    receipt.append({'variant':variant,'frames':16,'technique':'Packed illustrated texture frames with Blender-native decorative meshes and curves'})
meta['source']='Existing Ember Dash trailer art, local foreground extraction, Blender-native birthright overlays. 2.5D texture animation, not a full 3D model.'
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2));(OUT/'render-receipt.json').write_text(json.dumps(receipt,indent=2))
print('BLENDER_ILLUSTRATED_BIRTHRIGHTS_COMPLETE',flush=True)
