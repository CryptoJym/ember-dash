"""Production foreground asset bake for Ember Dash. Blender CLI, owned workspace only.
Creates transparent platform, portal, and enemy plates with projection anchors.
No networking, credentials, external assets, or changes to prior source scenes.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
TAU=math.tau

def mat(name,hexcode,emit=0,rough=.8,noise=False):
    rgb=tuple((int(hexcode[i:i+2],16)/255)**2.2 for i in (0,2,4));m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.2
    p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emit
    if noise:
        t=m.node_tree.nodes.new('ShaderNodeTexNoise');t.inputs['Scale'].default_value=17;t.inputs['Detail'].default_value=4
        r=m.node_tree.nodes.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(*(v*.40 for v in rgb),1);r.color_ramp.elements[1].color=(*(min(1,v*1.35) for v in rgb),1)
        b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.7;b.inputs['Distance'].default_value=.05
        m.node_tree.links.new(t.outputs['Fac'],r.inputs[0]);m.node_tree.links.new(r.outputs[0],p.inputs['Base Color']);m.node_tree.links.new(t.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs[0],p.inputs['Normal'])
    return m

def clear(w,h):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.render.resolution_x=w;sc.render.resolution_y=h;sc.render.resolution_percentage=100;sc.render.film_transparent=True
    sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.threads_mode='FIXED';sc.render.threads=4
    sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast'
    sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.3,.4,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.3
    return sc

def camera(loc,target,scale):
    bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.data.type='ORTHO';c.data.ortho_scale=scale;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.camera=c;return c

def light(loc,energy,size,color):
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,-.3))-o.location).to_track_quat('-Z','Y').to_euler()

def cube(name,loc,scale,m,angle=0,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler[1]=angle;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    if bevel:
        b=o.modifiers.new('Eroded corners','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def rock(name,loc,scale,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler=(random.uniform(-.2,.2),random.uniform(-.3,.3),random.uniform(-.4,.4));o.data.materials.append(m);return o

def sphere(name,loc,scale,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
    for f in o.data.polygons:f.use_smooth=True
    return o

def vine(name,points,width,m):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.bevel_depth=width;cv.bevel_resolution=2
    s=cv.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,loc in zip(s.bezier_points,points):p.co=loc;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o

def blade(name,loc,length,width,m,tilt=0):
    x,y,z=loc;v=[(x-width*.5,y,z),(x+width*.5,y,z),(x+length*.35+tilt,y-.02,z+length*.8),(x+tilt,y,z+length)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],[(0,1,2),(0,2,3)]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(m)

manifest={}
palettes=[('grove','56645C','9AAF6A','2C443B','F8D99D'),('frost','667C9A','ABDCEC','344860','C8F5FF'),('cinder','655061','AD6557','352C40','FFB668')]
for biome,stone_color,edge_color,dark_color,magic_color in palettes:
    sc=clear(768,512);random.seed(149+len(biome))
    stone=mat('Carved '+biome,stone_color,noise=True);dark=mat('Deep cracks '+biome,dark_color,noise=True);edge=mat('Moss crystal '+biome,edge_color,noise=True);spark=mat('Living light '+biome,magic_color,1.8,rough=.4)
    # The exact front landing edge remains x=-3..3, z=0. The visible body is
    # now a fractured natural ledge matching the approved painted worlds,
    # rather than a repeated brick wall.
    cliff=mat('Fractured cliff '+biome,dark_color,noise=True);topmat=edge
    for i in range(15):
        x=-2.85+i*.405
        rock('Interlocking landing rock',(x,0,-.14-random.uniform(0,.06)),(.33+random.uniform(-.04,.08),.55,.20+random.uniform(0,.08)),stone if i%4 else cliff)
        if biome=='frost' and i%2==0:
            bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.08,depth=random.uniform(.22,.38),location=(x,-.28,.08));bpy.context.object.data.materials.append(topmat)
        elif biome=='cinder' and i%3==0:sphere('Surface ember',(x,-.30,.035),(.035,.022,.022),spark)
    for row in range(4):
        count=12-row
        for col in range(count):
            x=-2.70+col*(5.40/max(1,count-1))+random.uniform(-.11,.11);z=-.48-row*.35-random.uniform(0,.12)
            rock('Layered broken cliff',(x,.03,z),(.36+random.uniform(-.05,.16),.50,.25+random.uniform(-.02,.13)),cliff if (row+col)%3 else stone)
    for i in range(18):
        x=-2.87+i*.338
        rock('Living landing rim',(x,-.04,.005),(.20,.46,.075),topmat)
    if biome=='grove':
        grass=mat('Sunlit meadow edge','B4C487',rough=.95)
        for i in range(58):
            x=random.uniform(-2.93,2.93);blade('Fine meadow grass',(x,random.uniform(-.40,.30),.045),random.uniform(.07,.18),.008,grass,random.uniform(-.06,.06))
        petal=mat('Small wildflowers','F0C9C5')
        for j in range(8):
            x=-2.65+j*.75;z=.12+random.random()*.04
            for a in range(5):sphere('Tiny blossom',(x+.026*math.cos(a*TAU/5),-.27,z+.028*math.sin(a*TAU/5)),(.028,.015,.018),petal)
            sphere('Pollen',(x,-.30,z),(.012,.01,.012),spark)
        for j in range(6):
            x=-2.55+j*.95;points=[(x+.07*math.sin(i+j),-.47,-.03-i*.18) for i in range(8+j%3)]
            vine('Sparse hanging vine',points,.013,topmat)
            for i,pt in enumerate(points[1::2]):blade('Small ivy leaf',pt,.11,.085,topmat,(-.08 if i%2 else .08))
    elif biome=='frost':
        for i in range(20):
            x=random.uniform(-2.85,2.85)
            if i%2==0:
                bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=random.uniform(.035,.065),depth=random.uniform(.20,.48),location=(x,-.33,-.01));bpy.context.object.data.materials.append(topmat)
        for j in range(6):vine('Cold fracture seam',[(-2.6+j*.9,-.48,-.05),(-2.7+j*.9,-.48,-.55),(-2.55+j*.9,-.47,-1.15)],.014,spark)
    else:
        for j in range(7):
            x=-2.55+j*.84;points=[(x,-.49,-.03),(x+random.uniform(-.15,.15),-.49,-.55),(x+random.uniform(-.10,.12),-.49,-1.22)]
            vine('Molten cliff fissure',points,.022,spark)
    cam=camera((0,-10,3),(0,0,-.9),7.4);light((-3,-5,6),950,5,(1,.82,.60));light((4,1,4),1000,4,(.47,.69,1))
    root=OUT/'terrain';root.mkdir(exist_ok=True);sc.render.filepath=str(root/(biome+'.png'));bpy.ops.render.render(write_still=True)
    left=world_to_camera_view(sc,cam,Vector((-3,-.4,0)));right=world_to_camera_view(sc,cam,Vector((3,-.4,0)))
    manifest[biome]={'width':768,'height':512,'left':left.x,'right':right.x,'top':1-left.y}
    source=OUT/'source';source.mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(source/(biome+'-platform.blend')),compress=True)
    # Preserve palette but create a clear separate asset scene for the portal.
    sc=clear(384,512)
    for side in [-1,1]:
        for j in range(6):cube('Portal pillar',(side*.85,0,.16+j*.37),(.40,.53,.33),stone,side*.025 if j%2 else 0,.06)
        cube('Carved plinth',(side*.85,-.02,.04),(.61,.64,.13),edge)
        for j in range(3):rock('Pillar relief',(side*.86,-.29,.60+j*.48),(.15,.05,.12),edge)
    for j in range(13):
        a=math.pi*j/12;cube('Arch keystone',(.85*math.cos(a),0,2.20+.85*math.sin(a)),(.23,.56,.39),stone,math.pi/2-a,.055)
    path=[(-.66,-.31,.08),(-.66,-.31,2.21)]+[(.66*math.cos(a),-.31,2.21+.66*math.sin(a)) for a in [math.pi-j*math.pi/24 for j in range(25)]]+[(.66,-.31,.08)]
    vine('Luminous inner carving',path,.016,spark)
    if biome=='grove':
        for side in [-1,1]:
            vine('Overgrown portal',[(side*(.93+.07*math.sin(j)), -.33,j*.14) for j in range(18)],.019,edge)
            for j in range(12):blade('Portal ivy',(side*.93,-.36,j*.17),.19,.14,edge,side*.12)
    crystal=rock('Crown seal',(0,-.32,2.87),(.14,.08,.22),spark);crystal.rotation_euler[1]=0
    cam=camera((0,-10,2.2),(0,0,1.45),3.80);light((-3,-4,6),700,4,(1,.78,.54));light((4,2,4),800,3,(.51,.70,1))
    p=OUT/'portals';p.mkdir(exist_ok=True);sc.render.filepath=str(p/(biome+'.png'));bpy.ops.render.render(write_still=True)
    anchor=world_to_camera_view(sc,cam,Vector((0,-.3,0)));manifest[biome]['portal_anchor']=[anchor.x,1-anchor.y]
    bpy.ops.wm.save_as_mainfile(filepath=str(source/(biome+'-portal.blend')),compress=True)
# Enemy art is readable at native play size; silhouettes distinguish behavior.
for key in ['crawler','wisp','spitter','keeper']:
    sc=clear(256,256);random.seed(671)
    shell=mat('Hollow indigo','3C405C',noise=True);rim=mat('Amethyst edge','8D759F',noise=True);eyes=mat('Spirit eyes','F2B1D8',1.5);bone=mat('Weathered mask','C6CAB9',noise=True);moss=mat('Root cloak','516659',noise=True)
    if key=='wisp':
        sphere('Spirit core',(0,0,.0),(.31,.16,.44),shell)
        for side in [-1,1]:
            sphere('Wisp eye',(side*.12,-.16,.1),(.046,.03,.055),eyes)
            vine('Luminous plume',[(side*.20,0,-.2),(side*.45,.01,-.35),(side*.30,.01,-.65),(side*.5,.02,-.82)],.033,rim)
        for j in range(3):vine('Dissolving ribbon',[(-.17+j*.17,0,-.25),(-.25+j*.17,.01,-.52),(-.1+j*.17,.0,-.9)],.019,eyes)
    else:
        sphere('Shouldered body',(0,0,0),(.50,.24,.36 if key!='keeper' else .60),shell)
        rock('Carved face',(0,-.24,.15),(.34,.13,.28),bone)
        for side in [-1,1]:
            sphere('Dark eye socket',(side*.13,-.35,.20),(.09,.025,.04),shell)
            sphere('Living eye',(side*.13,-.37,.20),(.054,.014,.019),eyes)
            for j in range(3):
                vine('Root leg',[(side*.32,.08-j*.10,-.14),(side*(.6+j*.04),-.08,-.31),(side*(.50+j*.04),-.14,-.50)],.042,moss)
            vine('Antler',[ (side*.23,.0,.33),(side*.41,.0,.59),(side*.51,.02,.94 if key=='keeper' else .70)],.044,rim)
            if key=='keeper':
                for j in range(3):vine('Antler prong',[(side*.39,0,.56+j*.08),(side*(.59+j*.08),.02,.65+j*.17)],.026,bone)
        rock('Heart shard',(0,-.27,-.03),(.085,.05,.17),eyes)
        if key=='spitter':
            for j in range(5):rock('Thorn quiver',(-.4+j*.2,.12,.42),(.085,.12,.27),rim)
            sphere('Charged mouth',(0,-.38,.02),(.075,.045,.07),eyes)
        if key=='keeper':
            for j in range(9):blade('Tattered bark mantle',(-.52+j*.13,-.01,-.56),.4,.20,moss,random.uniform(-.12,.12))
    cam=camera((0,-8,2),(0,0,.08),2.45 if key=='keeper' else 2.15);light((-2,-4,4),500,3,(1,.71,.54));light((3,1,4),650,3,(.48,.68,1))
    p=OUT/'enemies';p.mkdir(exist_ok=True);sc.render.filepath=str(p/(key+'.png'));bpy.ops.render.render(write_still=True)
    anchor=world_to_camera_view(sc,cam,Vector((0,0,0)));manifest[key]={'anchor':[anchor.x,1-anchor.y]}
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(key+'.blend')),compress=True)
(OUT/'props.json').write_text(json.dumps(manifest,indent=2))
print('WORLD_PROPS_RENDERED',json.dumps({'platforms':3,'portals':3,'enemies':4}),flush=True)
