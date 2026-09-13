"""Recompose owned Blender worlds for readable cinematic 2.5D gameplay.
Distant focal islands, foreground-framing architecture, bridges, lighting and mist.
"""
import bpy,sys,math,random,json
from pathlib import Path
from mathutils import Vector
SRC,OUT=[Path(s) for s in sys.argv[sys.argv.index('--')+1:][:2]];OUT.mkdir(parents=True,exist_ok=True)

def material(name,color,emit=0):
    rgb=tuple((int(color[i:i+2],16)/255)**2.2 for i in [0,2,4]);m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.82;p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emit
    n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=11;n.inputs['Detail'].default_value=3;b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.7;b.inputs['Distance'].default_value=.07;m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs[0],p.inputs['Normal']);return m

def block(name,loc,scale,mat,angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler[1]=angle;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);b=o.modifiers.new('Worn bevel','BEVEL');b.width=.07;b.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o

def arch(x,y,z,r,m):
    for j in range(18):
        a=j*math.pi/17;block('Mossy arch stone',(x+r*math.cos(a),y,z+r*math.sin(a)),(.30,.68,.51),m,math.pi/2-a)
    for side in [-1,1]:
        for j in range(8):block('Fluted carved pier',(x+side*r,y,z-.39*j),(.49,.64,.36),m)

def line(name,points,width,m):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.bevel_depth=width;cv.bevel_resolution=1;s=cv.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for v,p in zip(s.bezier_points,points):v.co=p;v.handle_left_type='AUTO';v.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(ob);ob.data.materials.append(m)

def lamp(x,y,z,mat,index):
    block('Suspended lantern',(x,y,z),(.17,.18,.32),mat)
    bpy.ops.object.light_add(type='POINT',location=(x,y-.1,z));o=bpy.context.object;o.name='Warm lantern illumination';o.data.energy=16 if index==1 else 28;o.data.color=(.64,.85,1) if index==1 else (1,.52,.12);o.data.shadow_soft_size=.24

receipts=[]
for index,key in enumerate(['grove','frost','cinder']):
    bpy.ops.wm.open_mainfile(filepath=str(SRC/(key+'-detailed.blend')),use_scripts=False);random.seed(304+index);sc=bpy.context.scene
    stone=material('Framing limestone', ['46514B','52627D','4A3447'][index]);rim=material('Weathered pale trim',['839275','85B2C7','9C716B'][index]);leaf=material('Deep climbing ivy','426340');gold=material('Living lamps',['F7C86D','AED7FF','FF743A'][index],2.2)
    # A low-contrast distant focal object is no longer mistaken for a live platform.
    for m in bpy.data.materials:
        if not m.use_nodes:continue
        bs=m.node_tree.nodes.get('Principled BSDF')
        if bs and ('Leaf hue' in m.name or 'canopy_' in m.name):
            c=bs.inputs['Base Color'].default_value;bs.inputs['Base Color'].default_value=(c[0]*.53,c[1]*.68,c[2]*.42,1)
        if m.name=='Distance haze':
            for n in m.node_tree.nodes:
                if n.type=='PRINCIPLED_VOLUME':n.inputs['Density'].default_value=.017
    # Left-side ruins frame the playable plane without adding non-colliding floor art.
    arch(-12,0,3.1,2.6,stone);arch(-12,-.18,3.1,2.25,rim)
    for side in [-1,1]:
        for j in range(5):block('Inset molding',(-12+side*2.73,-.37,1.0+j*.78),(.14,.14,.64),rim)
    if index==0:
        for j in range(11):
            x=-15+j*.43;z=6.8-abs(x+12)*.14
            line('Overhanging ivy',[(x,-.4,z),(x+.10,-.52,z-.75),(x-.08,-.6,z-1.7-random.random())],.024,leaf)
            for k in range(8):
                p=(x+(-1 if k%2 else 1)*.08,-.58,z-.15-k*.22)
                bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p);o=bpy.context.object;o.name='Leaf clusters';o.scale=(.17,.04,.10);o.data.materials.append(leaf)
    # Far arcades connect the floating structures into a legible ancient place.
    for x in [-8,-4,0,4,8]:
        arch(x,15,2.1,1.9,rim)
        for j in range(6):block('Bridge balustrade',(x-1.7+j*.65,15,4.6),(.08,.2,.65),stone)
        block('Bridge top rail',(x,15,4.9),(3.9,.35,.13),rim)
    for j,(x,y,z) in enumerate([(-14,-.5,3.9),(-10,-.5,3.9),(-7,13,5.0),(-3,13,5.0),(1,13,5.0),(5,13,5.0),(9,13,5.0)]):lamp(x,y,z,gold,index)
    # Slim near-edge trunks and broken pylons add depth but remain outside action center.
    if index==0:
        for side,x in [(-1,-18),(1,15)]:
            line('Near gnarled trunk',[(x,0,-3),(x-.3,0,1),(x+.5,0,6),(x+.2,0,10)],.65,stone)
            for j in range(4):line('Twisting near bough',[(x+.3,0,4+j),(x-side*2,0,6+j*.6),(x-side*4.5,1,6.2+j*.7)],.20-j*.025,stone)
    elif index==1:
        for x in [-18,15]:
            for j in range(7):block('Prismatic near spire',(x,1,j),(.78,.8,.91),stone)
            line('Frost vein',[(x-.25,-.42,0),(x+.12,-.42,3),(x-.08,-.42,7)],.022,gold)
    else:
        for x in [-18,15]:
            for j in range(7):block('Chained basalt pylon',(x,1,j),(.86,.9,.9),stone)
            line('Hanging ember chain',[(x,0,7),(x+2,0,5.7),(x+4,2,6.4)],.043,rim)
    cam=sc.camera;cam.location=(-5,-27,8);target=Vector((-5,11,3.2));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=35
    # A broad rim on the focal island echoes the approved light-drenched world direction.
    bpy.ops.object.light_add(type='AREA',location=(4,13,12));o=bpy.context.object;o.name='Focal island sunlight';o.data.energy=5000;o.data.size=8;o.data.color=(.6,.8,1) if index==1 else (1,.71,.35);o.rotation_euler=(Vector((1,7,3))-o.location).to_track_quat('-Z','Y').to_euler()
    sc.render.resolution_x=1920;sc.render.resolution_y=1080;sc.render.resolution_percentage=100;sc.render.threads_mode='FIXED';sc.render.threads=4;sc.render.image_settings.file_format='JPEG';sc.render.image_settings.color_mode='RGB';sc.render.image_settings.quality=93
    (OUT/'backdrops').mkdir(exist_ok=True);sc.render.filepath=str(OUT/'backdrops'/(key+'.jpg'));bpy.ops.render.render(write_still=True)
    (OUT/'source').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(key+'-composed.blend')),compress=True)
    receipts.append({'biome':key,'objects':len(bpy.data.objects),'cameraLens':35,'target':list(target)})
(OUT/'composition-receipt.json').write_text(json.dumps(receipts,indent=2));print('BIOME_COMPOSITION_COMPLETE',flush=True)
