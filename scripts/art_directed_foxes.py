"""Ember Dash construction assets. Run with Blender --background --factory-startup.
Owned scene only; no external downloads. Outputs keyed .blend, GLB, RGBA animation
frames, portraits and backdrop renders. Palette/silhouette direction is from the
six-fox image-generation board in James's Ember Dash conversation (2026-09-12).
"""
import bpy, math, random, json, sys, os
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
OUT=Path(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else Path(__file__).resolve().parents[1]/'forge'/'assets')
OUT.mkdir(parents=True,exist_ok=True)
TAU=math.tau

def material(name,hexcolor,emission=0,metal=0):
    rgb=tuple((int(hexcolor[i:i+2],16)/255)**2.2 for i in (0,2,4))
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=.53;p.inputs['Metallic'].default_value=metal
    p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    return m

def recolor(m,hexcolor):
    rgb=tuple((int(hexcolor[i:i+2],16)/255)**2.2 for i in (0,2,4));m.diffuse_color=(*rgb,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Emission Color'].default_value=(*rgb,1)

def empty(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o

def ellipsoid(name,loc,scale,mat,parent=None,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=(0,0,0));o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def tube(name,points,radii,mat,parent=None,sides=10):
    verts=[];faces=[]
    for i,(pos,r) in enumerate(zip(points,radii)):
        p=Vector(pos);t=Vector(points[min(len(points)-1,i+1)])-Vector(points[max(0,i-1)])
        axis=t.normalized();b=axis.cross(Vector((0,1,0))).normalized()
        if b.length<.1:b=Vector((1,0,0))
        q=axis.cross(b).normalized()
        for j in range(sides):verts.append(p+r*(b*math.cos(j*TAU/sides)+q*math.sin(j*TAU/sides)))
    for i in range(len(points)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces += [tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=True
    return o

def spike(name,base,tip,width,mat,parent=None):return tube(name,[base,tip],[width,.005],mat,parent,6)

def mesh(name,verts,faces,mat,parent=None):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat)
    bevel=o.modifiers.new('Soft carved edges','BEVEL');bevel.width=.035;bevel.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o

def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def light(loc,target,energy,size,color):
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.data.color=color;aim(o,target)

def setup(w,h,transparent=True):
    sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.render.resolution_x=w;sc.render.resolution_y=h;sc.render.resolution_percentage=100
    sc.render.film_transparent=transparent;sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.image_settings.color_depth='8'
    sc.render.threads_mode='FIXED';sc.render.threads=4;sc.render.fps=24
    sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast'
    if hasattr(sc,'eevee'):sc.eevee.taa_render_samples=24
    sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.23,.3,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.3
    return sc

def render(path):bpy.context.scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
sc=setup(256,192)
coat=material('Coat | lineage tint','CB5A25');shadow=material('Socks and ear backs','392A35');cream=material('Ivory chest and brush','FFF0D1');inner=material('Inner ear','C58884');eye=material('Amber eyes','FFC955',.55);black=material('Nose and eyeliner','151622');magic=material('Living magic','FF6F25',2.2,.15)
root=empty('Fox_Root');body=empty('Spine',parent=root)
ellipsoid('Torso',(-.08,0,1.02),(.89,.30,.36),coat,body)
ellipsoid('Haunch',(-.66,0,1.01),(.40,.33,.40),coat,body)
ellipsoid('Shoulder',(.54,0,1.10),(.38,.32,.43),coat,body)
# Fuse same-material torso volumes into a continuous sculpt, not stacked balls.
bpy.ops.object.select_all(action='DESELECT')
for name in ['Torso','Haunch','Shoulder']:bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['Torso'];bpy.ops.object.join();o=bpy.context.object
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
r=o.modifiers.new('Continuous torso sculpt','REMESH');r.mode='VOXEL';r.voxel_size=.045;bpy.ops.object.modifier_apply(modifier=r.name)
r=o.modifiers.new('Sculpt smoothing','SMOOTH');r.factor=.6;r.iterations=5;bpy.ops.object.modifier_apply(modifier=r.name)
for f in o.data.polygons:f.use_smooth=True
ellipsoid('Chest bib',(.71,-.02,1.02),(.18,.29,.32),cream,body)
head=empty('Head',(.70,0,1.39),body)
ellipsoid('Fox skull',(.12,0,.19),(.42,.295,.37),coat,head)
for side in [-1,1]:
    mesh('Swept ivory cheek',[(.54,side*.16,.075),(.20,side*.295,.12),(-.15,side*.30,.18),(-.04,side*.34,.025),(-.19,side*.26,-.045),(.13,side*.25,-.14),(.59,side*.13,-.055)],[(0,1,5),(1,2,3),(1,3,5),(3,4,5),(0,5,6)],cream,head)
tube('Tapered snout',[(.32,0,.19),(.53,0,.07),(.75,0,.04)],[.23,.18,.085],coat,head,16)
ellipsoid('Lower muzzle',(.50,-.005,-.005),(.30,.16,.075),cream,head)
ellipsoid('Black nose',(.79,0,.048),(.077,.095,.07),black,head)
for side in [-1,1]:
    mesh('Pointed ear',[(.16,side*.15,.36),(-.22,side*.20,.30),(.06,side*.40,.30),(-.16,side*.34,.77),(-.23,side*.30,.30)],[(0,1,3),(1,2,3),(2,0,3),(1,0,4),(2,1,4),(0,2,4)],coat,head)
    mesh('Ear inset',[(.11,side*.20,.39),(.03,side*.35,.36),(-.13,side*.32,.67)],[(0,1,2)],inner,head)
    ellipsoid('Eye socket',(.32,side*.255,.27),(.105,.026,.048),black,head)
    ellipsoid('Bright iris',(.345,side*.284,.27),(.042,.014,.033),eye,head)
    ellipsoid('Vertical pupil',(.355,side*.305,.269),(.010,.008,.026),black,head)
    ellipsoid('Eye glint',(.365,side*.314,.287),(.013,.006,.012),cream,head)
    for j in range(3):
        spike('Cheek fur',(.10-j*.044,side*(.25+j*.01),.17-j*.033),(-.12-j*.065,side*(.31+j*.012),.10-j*.075),.055-j*.008,cream,head)
for i in range(12):
    a=i*TAU/12
    spike('Mane tuft',(.64,.29*math.cos(a),1.20+.26*math.sin(a)),(.39,.39*math.cos(a),1.15+.40*math.sin(a)),.10,cream,body)
# Four articulated two-segment legs. Feet are on the same ground plane in all idle poses.
legs=[]
for k,(hipx,sy) in enumerate([(-.64,.22),(.58,.22),(-.64,-.22),(.58,-.22)]):
    hip=empty('Hip_'+str(k),(hipx,sy,.94),body)
    upper=ellipsoid('Upper_leg',(0,0,-.21),(.125,.115,.25),coat,hip)
    knee=empty('Knee_'+str(k),(0,0,-.43),hip)
    lower=ellipsoid('Lower_leg',(0,0,-.19),(.077,.075,.23),shadow,knee)
    paw=ellipsoid('Paw',(.075,0,-.42),(.17,.12,.075),shadow,knee)
    for j in range(2):ellipsoid('Toe',(.18, -.055+j*.10,-.41),(.046,.045,.052),shadow,knee)
    legs.append((hip,knee,paw,hipx,k))
tail=empty('Tail',(-.92,.025,1.08),body)
tube('Long flowing brush',[(0,0,0),(-.28,0,.04),(-.64,.02,.16),(-.96,.03,.40),(-1.12,.03,.67),(-1.24,.02,.80)],[.15,.29,.37,.30,.18,.012],coat,tail,16)
brush=bpy.data.objects['Long flowing brush'];brush.data.materials.append(cream)
for face in brush.data.polygons:
    if min(face.vertices)>=3*16:face.material_index=1
for j in range(8):spike('Brush strand',(-.30-j*.10,-.19,.06+j*.065),(-.53-j*.10,-.24,.11+j*.065),.12-j*.009,coat,tail)
# A small readable crystal crest distinguishes each birthright without engulfing the silhouette.
crest=empty('Birthright_crest',(.52,-.34,1.13),body)
mesh('Chest talisman',[(-.075,0,0),(0,-.04,.15),(.075,0,0),(0,-.06,-.14),(0,-.08,0)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],magic,crest)
# Each bloodline changes silhouette/readability as well as color.
ornament_groups={k:[] for k in ['ember','tide','gale','void','sun','bloom']}
# Embermane: swept flame fins along the spine.
for i,(x,z) in enumerate([(-.46,1.34),(-.18,1.42),(.08,1.38)]):
    ornament_groups['ember'].append(spike('Ember flame crest',(x,-.03,z),(x-.17,-.04,z+.28-i*.025),.055,magic,body))
# Moonveil: lunar orbit and a ward pearl over the shoulder.
bpy.ops.mesh.primitive_torus_add(major_radius=.30,minor_radius=.022,major_segments=32,minor_segments=6);o=bpy.context.object;o.name='Moonveil orbit';o.parent=body;o.location=(.15,-.35,1.36);o.rotation_euler=(math.radians(78),0,0);o.data.materials.append(magic);ornament_groups['tide'].append(o)
ornament_groups['tide'].append(ellipsoid('Moon pearl',(.45,-.36,1.50),(.07,.035,.07),magic,body,12,8))
# Swiftfern: three aerodynamic feather vanes swept backward.
for i,x in enumerate([.10,-.18,-.45]):
    ornament_groups['gale'].append(mesh('Wind feather',[(x,-.35,1.25),(x-.18,-.39,1.43),(x-.36,-.37,1.36),(x-.15,-.35,1.24)],[(0,1,3),(1,2,3)],magic,body))
# Starstep: orbiting star nodes around the flank.
for i in range(5):
    a=i*TAU/5
    ornament_groups['void'].append(ellipsoid('Starstep mote',(-.12+math.cos(a)*.68,-.38,1.18+math.sin(a)*.36),(.045,.025,.045),magic,body,8,6))
# Dawngleam: halo and short solar rays above the ears.
bpy.ops.mesh.primitive_torus_add(major_radius=.32,minor_radius=.022,major_segments=36,minor_segments=6);o=bpy.context.object;o.name='Dawn halo';o.parent=head;o.location=(.10,0,.72);o.rotation_euler=(math.radians(90),0,0);o.data.materials.append(magic);ornament_groups['sun'].append(o)
for a in range(0,360,60):
    th=math.radians(a);ornament_groups['sun'].append(spike('Dawn ray',(.10+math.cos(th)*.34,-.02,.72+math.sin(th)*.34),(.10+math.cos(th)*.47,-.02,.72+math.sin(th)*.47),.018,magic,head))
# Wildbloom: petal/leaf crown tucked into the mane.
for i in range(5):
    a=-.9+i*.45
    ornament_groups['bloom'].append(ellipsoid('Bloom petal',(.55+math.cos(a)*.20,-.34,1.38+math.sin(a)*.18),(.11,.025,.045),magic,body,10,6))
for group in ornament_groups.values():
    for obj in group:obj.hide_render=True
light((2,-4,6),(0,0,1),850,4,(1,.83,.65));light((-3,1,4),(0,0,1),1000,3,(.48,.73,1));light((4,3,2),(0,0,1),650,3,(1,.62,.33))
bpy.ops.object.camera_add(location=(.0,-9,2.5));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=4.6;sc.camera=cam;aim(cam,(-.15,0,1.08))
# Deterministic sixteen-cell state atlas: idle 0..3, run 4..11, rise 12, fall 13, dash 14, pulse 15.
def pose(i):
    phase=((i-4)%8)/8*TAU;run=4<=i<12;air=i in (12,13,14);body.location=(0,0,(.045*math.sin(phase*2) if run else .012*math.sin(i*math.pi/2)))
    body.rotation_euler=(0, -.07 if i==14 else .03*math.sin(phase) if run else 0,0)
    head.rotation_euler=(0,-.14 if i==12 else .12 if i==13 else -.08 if i==15 else .018*math.sin(i),0)
    tail.rotation_euler=(.08*math.sin(phase), .14*math.sin(phase) if run else -.15 if air else .06*math.sin(i),0)
    for hip,knee,paw,x,k in legs:
        swing=math.sin(phase+(0 if k in [0,3] else math.pi)) if run else 0
        if air:
            hip.rotation_euler=(0,-.65 if x<0 else .72,0);knee.rotation_euler=(0,.3 if x<0 else -.85,0)
        else:
            dx=swing*.29 if run else .035
            dz=.94-(.12+max(0,math.cos(phase+(0 if k in [0,3] else math.pi)))*.19 if run else .12)
            distance=min(.848,math.sqrt(dx*dx+dz*dz));sign=1 if x>0 else -1
            hip.rotation_euler=(0,math.atan2(-dx,dz)+sign*math.acos(max(-1,min(1,(.43**2+distance**2-.42**2)/(2*.43*distance)))),0)
            knee.rotation_euler=(0,-sign*math.acos(max(-1,min(1,(distance**2-.43**2-.42**2)/(2*.43*.42)))),0)
    for obj in [body,head,tail]+[o for a in legs for o in a[:2]]:
        obj.keyframe_insert(data_path='location',frame=i+1);obj.keyframe_insert(data_path='rotation_euler',frame=i+1)

# Art-directed curved groom. Included by prepare_art_pass.py into an editable Blender script.
random.seed(913)
for o in list(bpy.data.objects):
    if any(o.name.startswith(n) for n in ['Swept ivory cheek','Mane tuft','Cheek fur','Brush strand']):
        bpy.data.objects.remove(o,do_unlink=True)
for m in [coat,cream,shadow]:
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.72
    bs.inputs['Specular IOR Level'].default_value=.25
    tex=m.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=150;tex.inputs['Detail'].default_value=2
    bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.20;bump.inputs['Distance'].default_value=.015
    m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
fur_main=material('Groom auburn','C95721');fur_light=material('Groom lit tips','E98940');fur_dark=material('Groom undertone','8A351E');fur_cream=material('Groom pale ivory','FFF0D6');fur_white=material('Groom white tips','FFF8EB');fur_sock=material('Groom velvet socks','332735')
fur_mats=[fur_main,fur_light,fur_dark]
grooms=[]
def hair_bundle(name,parent,mat,width=.0019):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.resolution_u=1;cv.bevel_depth=width;cv.bevel_resolution=1;cv.use_fill_caps=True
    ob=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(ob);ob.parent=parent;ob.data.materials.append(mat);grooms.append(ob);return cv

def strand(cv,origin,normal,direction,length):
    p=Vector(origin);n=Vector(normal).normalized();d=Vector(direction).normalized()
    s=cv.splines.new('POLY');s.points.add(4)
    for i in range(5):
        t=i/4;q=p+n*(length*.38*math.sin(t*math.pi*.7))+d*(length*t)
        s.points[i].co=(*q,1);s.points[i].radius=[.9,.85,.65,.38,.025][i]

def ellipsoid_groom(name,center,scale,parent,mats,count,length,direction,width=.0019):
    cvs=[hair_bundle(name+' '+str(i),parent,m,width) for i,m in enumerate(mats)]
    c=Vector(center)
    for i in range(count):
        z=random.uniform(-1,1);a=random.uniform(0,math.tau);v=Vector((math.sqrt(1-z*z)*math.cos(a),math.sqrt(1-z*z)*math.sin(a),z))
        p=c+Vector((v.x*scale[0],v.y*scale[1],v.z*scale[2]))
        n=Vector((v.x/scale[0],v.y/scale[1],v.z/scale[2])).normalized()
        strand(cvs[i%len(cvs)],p,n,Vector(direction)+n*.40,length*random.uniform(.55,1.4))

ellipsoid_groom('Spine guard hair',(-.13,0,1.04),(.87,.315,.355),body,fur_mats,5500,.065,(-1,0,-.10))
ellipsoid_groom('Haunch groom',(-.66,0,1.0),(.39,.33,.37),body,fur_mats,1000,.085,(-.6,0,-.6))
ellipsoid_groom('Shoulder groom',(.53,0,1.12),(.345,.32,.405),body,fur_mats,2100,.07,(-.3,0,-1))
ellipsoid_groom('Chest ruff',(.68,-.005,1.03),(.21,.295,.34),body,[fur_cream,fur_white],3400,.12,(-.12,0,-1),.0026)
ellipsoid_groom('Fine facial fur',(.12,0,.19),(.415,.292,.36),head,[fur_main,fur_light],3500,.035,(-1,0,-.4),.0023)
for side in [-1,1]:
    ellipsoid('Sculpted cheek',(.13,side*.223,.02),(.27,.10,.175),cream,head,32,16)
    ellipsoid_groom('Swept cheek fringe '+str(side),(.11,side*.235,.015),(.26,.10,.165),head,[fur_cream,fur_white],1700,.085,(-.9,side*.3,-.25),.0021)
    tube('Upper expressive lid',[(.205,side*.279,.29),(.285,side*.299,.315),(.37,side*.272,.299),(.417,side*.235,.277)],[.010,.015,.012,.003],black,head,8)
    tube('Lower ivory eye rim',[(.22,side*.28,.253),(.30,side*.300,.224),(.37,side*.265,.247)],[.008,.012,.002],cream,head,8)
    earcv=hair_bundle('Soft ear fringe '+str(side),head,fur_main,.003)
    for i in range(150):
        t=random.random();p=Vector((.03-.18*t,side*(.37-.04*t),.35+.41*t))
        strand(earcv,p,(0,side,.5),(-.2,side*.15,1),random.uniform(.04,.08))
    for j in range(3):
        cv=hair_bundle('Whisker '+str(side)+str(j),head,fur_white,.0017)
        strand(cv,(.50,side*.13,.045-j*.016),(0,side,0),(-.20,side,-.08+j*.06),.30+j*.035)
for hip,knee,paw,x,k in legs:
    ellipsoid_groom('Upper limb '+str(k),(0,0,-.20),(.122,.111,.238),hip,[fur_main,fur_light],230,.055,(0,0,-1),.0028)
    ellipsoid_groom('Velvet sock '+str(k),(0,0,-.18),(.075,.074,.214),knee,[fur_sock],200,.035,(0,0,-1),.0022)
points=[Vector(p) for p in [(0,0,0),(-.28,0,.04),(-.64,.02,.16),(-.96,.03,.40),(-1.12,.03,.67),(-1.24,.02,.80)]]
radii=[.15,.29,.37,.30,.18,.012]
tailcvs=[hair_bundle('Flowing tail groom '+str(i),tail,m,.0023) for i,m in enumerate(fur_mats+[fur_cream,fur_white])]
for j in range(6300):
    v=random.uniform(0,4.95);i=int(v);t=v-i;c=points[i].lerp(points[i+1],t);r=radii[i]*(1-t)+radii[i+1]*t
    axis=(points[i+1]-points[i]).normalized();b=axis.cross(Vector((0,1,0))).normalized();q=axis.cross(b)
    a=random.uniform(0,math.tau);n=b*math.cos(a)+q*math.sin(a);p=c+n*r
    matindex=3+(j%2) if v>3.5 else j%3
    strand(tailcvs[matindex],p,n,axis,random.uniform(.07,.12))

ellipsoid_groom("Fine muzzle",(.46,0,.08),(.255,.155,.12),head,[fur_main,fur_light],900,.025,(1,0,0),.0014)

# Replace minimal markers with six fully modeled silhouettes.
for group in ornament_groups.values():
    for o in group:bpy.data.objects.remove(o,do_unlink=True)
ornament_groups={k:[] for k in ['ember','tide','gale','void','sun','bloom']}
leaf_mat=material('Botanical jade','488461');petal_mat=material('Wildbloom rose petals','F098BA');gold_mat=material('Antique sun metal','AE783D',0,.7);crystal=material('Moon glass','80DBF2',.6,.3)
crystal.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.22

def ribbon(name,pts,radii,mat,parent):return tube(name,pts,radii,mat,parent,10)
def own(kind,creator):
    before=set(bpy.data.objects);creator()
    ornament_groups[kind]+=[o for o in bpy.data.objects if o not in before]

def lunar():
    for i in range(6):
        a=i*math.tau/6;base=(.58,-.05+.34*math.cos(a),1.2+.32*math.sin(a));tip=(.50,base[1]*1.35,base[2]+.27+.07*(i%2))
        tube('Cut moon crystal',[base,tip],[.075,.001],crystal,body,5)
    crescent=[(.18+math.cos(a)*.52,.12,1.95+math.sin(a)*.52) for a in [(-.65+i*4.3/32) for i in range(33)]]
    ribbon('Crescent moon',crescent,[.009+math.sin(i*math.pi/32)*.036 for i in range(33)],magic,body)
    for side in [-1,1]:ribbon('Moon constellation chain',[(.5,side*.33,1.5),(.25,side*.36,1.24),(.48,side*.35,.92)],[.014,.016,.009],gold_mat,body)
def embers():
    for j in range(7):
        x=-.20-j*.09
        ribbon('Swept ember wisps',[(x,-.04,1.38),(x-.08,-.04,1.54),(x-.02,-.03,1.68),(x-.15,-.03,1.82-j*.03)],[.04,.05,.027,.001],magic,body)
    for j in range(5):
        ribbon('Flame brush tip',[(-.88,.02,.54+j*.025),(-1.1,.02,.76+j*.04),(-1.05,.02,1+j*.025),(-1.32,.02,1.1+j*.025)],[.025,.035,.02,.001],magic,tail)
def wind():
    for side in [-1,1]:
        for j in range(6):
            x=.52-j*.105;z=1.38-j*.045
            mesh('Layered wind leaves',[(x,side*.30,z),(x-.18,side*.48,z+.21),(x-.48,side*.40,z+.20),(x-.22,side*.36,z-.045)],[(0,1,3),(1,2,3)],leaf_mat,body)
            ribbon('Leaf silver vein',[(x,side*.33,z),(x-.23,side*.43,z+.10),(x-.48,side*.41,z+.20)],[.004,.007,.001],cream,body)
    for j in range(3):
        ribbon('Silk wind stream',[(.10,.1,1.42),(-.3,.22,1.68+j*.12),(-.82,.18,1.7+j*.13),(-1.18,.1,1.9+j*.08)],[.01,.018,.016,.001],magic,body)
def stars():
    for j in range(24):
        a=j*.58;pos=(-.4+math.cos(a)*(.6+.018*j),-.14+math.sin(a)*.35,1.2+j*.035)
        ellipsoid('Falling star',pos,(.018,.018,.045 if j%4==0 else .02),magic,body,8,4)
    for j in range(2):
        ribbon('Orbit of night',[(-.7+math.cos(a)*.82,.1+math.sin(a)*.4,1.3+math.sin(a)*.22+j*.15) for a in [i*math.tau/36 for i in range(37)]],[.007]*37,magic,body)
def solar():
    pos=Vector((.72,.16,1.91));r=.62
    pts=[tuple(pos+Vector((math.cos(a)*r,0,math.sin(a)*r))) for a in [i*math.tau/64 for i in range(65)]]
    ribbon('Radiant solar halo',pts,[.016]*65,gold_mat,body)
    ribbon('Inner sun engraving',[tuple(pos+Vector((math.cos(a)*(r-.05),-.003,math.sin(a)*(r-.05)))) for a in [i*math.tau/64 for i in range(65)]],[.006]*65,magic,body)
    for j in range(12):
        a=j*math.tau/12;p=pos+Vector((math.cos(a)*r,0,math.sin(a)*r));tip=pos+Vector((math.cos(a)*(r+.14),0,math.sin(a)*(r+.14)))
        ribbon('Golden sun ray',[tuple(p),tuple(tip)],[.016,.001],magic,body)
def bloom():
    pts=[(.50+.08*math.sin(i*.6),-.30-.02*math.sin(i),1.52-i*.025) for i in range(30)]
    ribbon('Living vine necklace',pts,[.014]*30,leaf_mat,body)
    for i in range(9):
        x=.49+math.sin(i)*.1;y=-.34;z=1.5-i*.057
        for j in range(5):
            a=j*math.tau/5;o=ellipsoid('Rose blossom petal',(x+math.cos(a)*.07,y-.015,z+math.sin(a)*.07),(.075,.024,.035),petal_mat,body,12,6);o.rotation_euler[1]=-a
        ellipsoid('Golden pollen',(x,y-.042,z),(.029,.02,.029),gold_mat,body,10,6)
        mesh('Vine leaf',[(x,y,z),(x-.07,y-.03,z+.10),(x-.20,y,z+.08),(x-.1,y,z-.015)],[(0,1,3),(1,2,3)],leaf_mat,body)
for key,fn in [('ember',embers),('tide',lunar),('gale',wind),('void',stars),('sun',solar),('bloom',bloom)]:own(key,fn)
for o in bpy.data.objects:
    if o.type=='LIGHT':o.data.energy*=.68
sc.world.node_tree.nodes['Background'].inputs[1].default_value=.18

PREVIEW='preview' in sys.argv
sc.render.resolution_x=384;sc.render.resolution_y=288
cam.location=(0,-9,2.5);aim(cam,(-.15,0,1.12));cam.data.ortho_scale=4.9
for i in range(16):pose(i)
sc.frame_start=1;sc.frame_end=16;sc.frame_set(1)
proj=world_to_camera_view(sc,cam,Vector((0,0,0)))
metadata={'frameWidth':384,'frameHeight':288,'columns':4,'rows':4,'anchor':[proj.x,1-proj.y],'drawScale':.42,'clips':{'idle':[0,4,5],'run':[4,8,14],'rise':[12,1,1],'fall':[13,1,1],'dash':[14,1,1],'pulse':[15,1,1]},'source':'Art-directed local Blender groom, articulated meshes and curved guard hairs; six modeled birthrights','variants':[]}
variants=[('ember','B9511B','302535','FF962C','E98C45','853111'),('tide','BCDCE5','324F71','6BDFFF','F0FCFF','729CB9'),('gale','799B88','294D49','B3F3AF','B9D1AB','426951'),('void','45416A','171A2B','B18AFF','7D73A9','24233F'),('sun','DCB878','6B4830','FFE2A1','F3DCC2','A47D40'),('bloom','B56D80','432C3A','ED9CB9','E2A4AC','713F54')]
for name,bc,dc,ac,lightc,darkc in variants[:1] if PREVIEW else variants:
    for m,col in [(coat,bc),(fur_main,bc),(fur_light,lightc),(fur_dark,darkc),(shadow,dc),(fur_sock,dc),(magic,ac),(eye,ac)]:recolor(m,col)
    for key,objs in ornament_groups.items():
        for o in objs:o.hide_render=key!=name
    metadata['variants'].append(name)
    folder=OUT/'frames'/name;folder.mkdir(parents=True,exist_ok=True)
    for i in range(1 if PREVIEW else 16):sc.frame_set(i+1);render(folder/f'{i:02}.png')
    sc.frame_set(1)
    cam.location=(4.2,-8.8,3.1);aim(cam,(.38,0,1.36));cam.data.ortho_scale=3.35;sc.render.resolution_x=640;sc.render.resolution_y=720
    (OUT/'portraits').mkdir(exist_ok=True);render(OUT/'portraits'/f'{name}.png')
    cam.location=(3.0,-8,2.6);aim(cam,(1.02,0,1.63));cam.data.ortho_scale=1.6;sc.render.resolution_x=256;sc.render.resolution_y=256
    (OUT/'heads').mkdir(exist_ok=True);render(OUT/'heads'/f'{name}.png')
    cam.location=(0,-9,2.5);aim(cam,(-.15,0,1.12));cam.data.ortho_scale=4.9;sc.render.resolution_x=384;sc.render.resolution_y=288
    if not PREVIEW:
        (OUT/'source').mkdir(exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/f'{name}-detailed.blend'),compress=True)
(OUT/'atlas.json').write_text(json.dumps(metadata,indent=2))
(OUT/'build-receipt.json').write_text(json.dumps({'blender':bpy.app.version_string,'preview':PREVIEW,'groomObjects':len(grooms),'groomStrands':sum(len(o.data.splines) for o in grooms),'variants':metadata['variants'],'frameCount':1 if PREVIEW else 96,'ornamentObjects':{k:len(v) for k,v in ornament_groups.items()}},indent=2))
print('ART_DIRECTED_FOXES_COMPLETE',str(OUT),flush=True)
