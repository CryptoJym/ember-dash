import bpy, math, os, random
from mathutils import Vector
ROOT='/Users/utlyze/Projects/ember-dash-astra-20260912'
OUT=os.path.join(ROOT,'lineage','assets')
os.makedirs(os.path.join(OUT,'foxes'),exist_ok=True); os.makedirs(os.path.join(OUT,'backdrops'),exist_ok=True)

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for d in (bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.cameras,bpy.data.lights):
        pass

def mat(name, color, emission=0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=.58
    if emission:
        bs.inputs['Emission Color'].default_value=(*color,1); bs.inputs['Emission Strength'].default_value=emission
    return m

def ico(name,loc,scale,material,sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc); o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o

def cone(name,loc,scale,rot,material,vertices=5):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=1,radius2=0,depth=2,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);return o

def ring(name,loc,scale,rot,material):
    bpy.ops.mesh.primitive_torus_add(major_radius=1,minor_radius=.045,major_segments=48,minor_segments=8,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);return o

def camera(loc,target,lens=55):
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.data.lens=lens;bpy.context.scene.camera=cam
    q=(Vector(target)-cam.location).to_track_quat('-Z','Y');cam.rotation_euler=q.to_euler();return cam

def lights(world=(.012,.018,.026,1)):
    bpy.context.scene.world.color=world[:3]
    bpy.ops.object.light_add(type='AREA',location=(4,-4,7)); key=bpy.context.object;key.data.energy=1000;key.data.shape='DISK';key.data.size=5
    bpy.ops.object.light_add(type='AREA',location=(-4,1,4)); fill=bpy.context.object;fill.data.energy=600;fill.data.size=4
    bpy.ops.object.light_add(type='POINT',location=(1,2,2)); bpy.context.object.data.energy=300

def setup_render(path,transparent=False,x=640,y=480):
    sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.render.resolution_x=x;sc.render.resolution_y=y;sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA' if transparent else 'RGB';sc.render.film_transparent=transparent
    sc.render.filepath=path;sc.render.image_settings.color_depth='8';sc.render.resolution_percentage=100
    sc.view_settings.look='AgX - Medium High Contrast'

def fox(power,bodyc,darkc,accent,kind):
    body=mat('body',bodyc); dark=mat('dark',darkc); cream=mat('cream',(1,.86,.68)); black=mat('black',(.015,.02,.025)); glow=mat('glow',accent,5)
    ico('Body',(0,0,1.25),(1.5,.58,.72),body); ico('Chest',(.7,-.02,1.32),(.62,.52,.64),cream)
    ico('Head',(1.35,0,2.05),(.70,.55,.65),body); ico('Muzzle',(1.92,-.02,1.9),(.55,.38,.32),cream)
    ico('Nose',(2.38,-.02,1.91),(.16,.18,.14),black); ico('Eye',(1.63,-.5,2.18),(.075,.035,.075),glow,1)
    for sy in (-1,1):
        cone('Ear',(1.05,sy*.33,2.70),(.27,.25,.55),(0,0,0),dark,5)
    # legs, paws
    for x,y in [(-.72,-.34),(.52,-.34),(-.62,.30),(.62,.30)]:
        ico('Leg',(x,y,.68),(.23,.22,.58),dark); ico('Paw',(x+.12,y-.02,.17),(.35,.27,.18),black)
    # bushy curved tail from overlapping tapered masses
    tailpts=[(-1.15,.12,1.42),(-1.9,.18,1.72),(-2.55,.10,2.20),(-3.0,.02,2.48)]
    for i,p in enumerate(tailpts): ico('Tail',p,(.72-i*.1,.48-i*.05,.54-i*.06),body)
    ico('TailTip',(-3.22,.01,2.62),(.50,.36,.40),cream)
    # scarf / collar and charm
    ring('Collar',(.98,0,1.75),(.46,.46,.32),(math.radians(90),0,0),dark)
    ico('Charm',(1.1,-.54,1.58),(.14,.05,.14),glow,1)
    if kind=='ember':
        for i,z in enumerate((1.8,2.25,2.62)): ico('Flame',(-2.5-i*.2,-.2,z),(.10,.08,.28),glow,1)
    elif kind=='tide':
        ring('MoonRing',(0,-.22,1.5),(1.25,.72,1.25),(math.radians(70),0,0),glow); ring('MoonRing',(0,-.12,1.5),(1.0,.55,1.0),(math.radians(74),0,0),glow)
    elif kind=='gale':
        for x in (-.8,.05,.75): cone('Feather',(x,-.58,1.42),(.18,.05,.45),(0,0,math.radians(-25)),glow,4)
    elif kind=='void':
        for a in range(0,360,72):
            r=1.45; th=math.radians(a); ico('Star',(r*math.cos(th),-.7,1.55+r*.42*math.sin(th)),(.08,.04,.08),glow,1)
    elif kind=='sun':
        ring('Halo',(1.2,.15,2.1),(.95,.95,.95),(math.radians(90),0,0),glow)
        for a in range(0,360,45):
            th=math.radians(a); ico('Ray',(1.2+.9*math.cos(th),.18,2.1+.9*math.sin(th)),(.05,.05,.16),glow,1)
    elif kind=='bloom':
        leaf=mat('leaf',(.18,.62,.38),1)
        for a in range(0,360,60):
            th=math.radians(a); ico('Leaf',(.85+.6*math.cos(th),-.48,1.55+.35*math.sin(th)),(.18,.05,.08),leaf,1)

POW=[('vulpax',(0.95,.23,.06),(.33,.05,.035),(1,.28,.03),'ember'),('nivalis',(.22,.55,.78),(.07,.14,.35),(.2,.8,1),'tide'),('sylra',(.45,.66,.24),(.09,.28,.18),(.65,1,.4),'gale'),('umbra',(.22,.12,.38),(.07,.03,.14),(.62,.25,1),'void'),('lumen',(.98,.65,.16),(.42,.20,.035),(1,.9,.3),'sun'),('verdara',(.56,.23,.25),(.18,.06,.11),(.3,1,.48),'bloom')]
for name,bc,dc,ac,k in POW:
    clear();fox(name,bc,dc,ac,k);lights();camera((6.6,-9.2,4.4),(0,0,1.45),65);setup_render(os.path.join(OUT,'foxes',name+'.png'),True,760,560);bpy.ops.render.render(write_still=True)

def rock(loc,scale,material):
    o=ico('rock',loc,scale,material,1);o.rotation_euler=(random.random()*.3,random.random()*.3,random.random()*math.pi);return o

def render_bg(name,palette,mode):
    clear();random.seed({'grove':1,'frost':2,'cinder':3}[mode]); sky,ground,accent=palette; mground=mat('ground',ground); mgold=mat('accent',accent,3); mdark=mat('dark',(ground[0]*.35,ground[1]*.35,ground[2]*.35))
    # ground and layered silhouettes
    bpy.ops.mesh.primitive_plane_add(size=40,location=(0,0,-1));bpy.context.object.data.materials.append(mground)
    for layer in range(4):
        z=-.3+layer*.18
        for i in range(16):
            x=-15+i*2.1+random.uniform(-.5,.5); y=4+layer*3+random.uniform(-.5,.5)
            rock((x,y,z+random.uniform(0,1.2)),(1.1+random.random()*1.6,.8+random.random(),2.0+random.random()*4),mdark)
    if mode=='grove':
        for i in range(18):
            x=-15+i*1.8; y=random.uniform(3,14); cone('tree',(x,y,2.1),(0.35,.35,3.2),(0,0,0),mdark,7); ico('crown',(x,y,5.0),(1.0,1.0,1.4),mground,1)
        for x in (-7,-1,5,10): ico('lantern',(x,1.0,1.2),(.1,.1,.1),mgold,1)
    elif mode=='frost':
        for x in range(-14,15,3):
            cone('spire',(x,random.uniform(3,12),2.6),(.8,.8,4.2),(0,0,0),mground,5)
            ring('arch',(x,random.uniform(1,5),1.8),(1.2,1.2,1.2),(math.radians(90),0,0),mgold)
    else:
        for x in range(-15,16,3): cone('volcanic',(x,random.uniform(4,13),1.6),(1.4,1.4,3.0),(0,0,0),mground,6)
        for x in (-10,-4,2,7,12):
            bpy.ops.mesh.primitive_cube_add(size=1,location=(x,1,.2));o=bpy.context.object;o.scale=(.75,.18,.04);o.data.materials.append(mgold);o.rotation_euler[2]=random.uniform(-.5,.5)
    lights((*sky,1)); camera((0,-16,5.2),(0,6,2.3),54); setup_render(os.path.join(OUT,'backdrops',name+'.png'),False,1920,1080); bpy.ops.render.render(write_still=True)
render_bg('lanternwild',((.015,.08,.09),(.06,.18,.15),(.95,.62,.18)),'grove')
render_bg('glass-cathedral',((.035,.06,.14),(.10,.18,.30),(.28,.85,1.0)),'frost')
render_bg('cinder-below',((.11,.025,.03),(.22,.055,.035),(1.0,.18,.035)),'cinder')
print('Rendered lineage assets to',OUT)
