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

# Three purpose-built 2.5D world plates. Geometry remains available in .blend sources.
def cube(name,loc,scale,mat,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Worn corners','BEVEL');b.width=bevel;b.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def arch(x,y,z,r,mat):
    for i in range(13):
        a=math.pi*i/12;o=cube('Arch voussoir',(x+r*math.cos(a),y,z+r*math.sin(a)),(.49,.65,.37),mat);o.rotation_euler[1]=math.pi/2-a
    for side in [-1,1]:
        for j in range(6):cube('Weathered pillar',(x+side*r,y,z-j*.43),(.38,.59,.38),mat)

def foliage(loc,scale,mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc);o=bpy.context.object;o.name='Sculpted canopy';o.scale=scale;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True

def island(x,y,z,w,mat,top):
    bpy.ops.mesh.primitive_cone_add(vertices=9,radius1=.12,radius2=w,depth=w*1.8,location=(x,y,z-w*.86));o=bpy.context.object;o.name='Suspended island';o.scale=(1,.6,1);o.data.materials.append(mat)
    foliage((x,y,z),(w,.65*w,.23),top)

def make_world(key,index):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    random.seed(200+index);sc=setup(1920,1080,False)
    palettes=[('244749','688777','456841','91A76A','FBD789'),('354B76','88A9B9','526992','A6D9DE','BFF9FF'),('382B48','8B666F','594451','D27750','FFB953')]
    dark,far,mid,leaf,lit=palettes[index]
    stone=material('stone_'+key,dark);distance=material('distant_'+key,far);trunk=material('carved_'+key,mid);canopy=material('canopy_'+key,leaf);glow=material('light_'+key,lit,2.8)
    sc.world.node_tree.nodes['Background'].inputs[0].default_value=(*[v**2.2 for v in ((.30,.44,.48) if index==0 else (.26,.35,.55) if index==1 else (.35,.19,.30))],1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    # Atmospheric geology and distant silhouettes intentionally stay above the live collision plane.
    for layer in range(3):
        for i in range(8):
            x=-18+i*5+random.uniform(-1,1);y=14+layer*7;z=random.uniform(-.4,4)
            island(x,y,z,random.uniform(1.7,3.3),distance,distance)
            if (i+layer)%2==0:
                cube('Distant tower',(x,y,z+2),(.55,.8,3.8),distance)
                spike('Distant roof',(x,y,z+3.9),(x,y,z+5.2),.7,distance)
    island(1,7,1.8,4.4,stone,canopy if index==0 else trunk)
    island(-7,11,1,2.6,trunk,canopy if index==0 else distance)
    island(8,13,3,2.3,trunk,canopy if index==0 else distance)
    if index==0:
        tube('Ancient luminous trunk',[(1,7,1.6),(.6,7,3),(1.1,7,4.4),(.2,7,5.9),(.9,7,7.5)],[.92,.72,.62,.41,.21],trunk,None,14)
        for j in range(9):
            a=j*TAU/9;end=(1+math.cos(a)*3,7+math.sin(a)*1.2,6+random.random()*2)
            tube('Spreading bough',[(.7,7,4.2),((end[0]+.7)*.5,7,5.7),end],[.35,.24,.07],trunk,None,10)
            foliage((end[0],end[1],end[2]+.4),(1.7,1.3,.9),canopy)
            foliage((end[0]-.3,end[1]-.5,end[2]+.9),(1.1,.9,.65),material('Sunlit foliage'+str(j),'B4BD76'))
        arch(-6,10,3,1.5,trunk)
        for j in range(24):
            x=random.uniform(-3,5);y=random.uniform(4.5,7.5);z=random.uniform(2,3.4)
            ellipsoid('Hanging lantern',(x,y,z),(.06,.06,.15),glow,segments=10,rings=6)
            tube('Vine chain',[(x,y,z+.2),(x-.15,y,z+1.2),(x+.1,y,z+2.1)],[.014,.018,.014],trunk,None,5)
    elif index==1:
        for x,h,w in [(-1.8,6,.75),(1,8.4,1.2),(3.8,6,.75)]:
            cube('Cathedral tower',(x,7,1.8+h*.5),(w,1.1,h),trunk)
            spike('Glass steeple',(x,7,1.8+h),(x,7,4.1+h),w*.9,canopy)
            for zz in range(3,int(h)+1):cube('Lit window',(x,6.41,zz),(.12,.04,.6),glow)
        arch(1,6.3,4.5,2,canopy);arch(1,6.25,3.3,1.1,glow)
        for j in range(15):
            x=random.uniform(-6,8);y=random.uniform(8,14);z=random.uniform(-.7,3)
            tube('Floating crystal',[(x,y,z-1),(x,y,z),(x+.08,y,z+2)],[.01,.21,.01],canopy,None,5)
        bpy.ops.mesh.primitive_torus_add(major_radius=3,minor_radius=.035,major_segments=96,minor_segments=6,location=(1,9,6),rotation=(math.pi/2,0,0));bpy.context.object.data.materials.append(glow)
    else:
        for j in range(9):
            a=j*TAU/9;x=1+math.cos(a)*3;y=7+math.sin(a)*1.5;h=random.uniform(3,6)
            cube('Basalt citadel',(x,y,1.8+h*.5),(.8,.7,h),stone);spike('Broken basalt crown',(x,y,1.8+h),(x+.2,y,h+2.8),.7,trunk)
            cube('Lava seam',(x-.2,y-.4,1.8+h*.4),(.025,.015,h*.7),glow)
        arch(1,6,3.8,2,glow);arch(1,6.1,3.8,2.25,trunk)
        for j in range(9):
            x=random.uniform(-8,9);y=random.uniform(7,16)
            tube('Molten waterfall',[(x,y,1),(x+.1,y,-1.2),(x+.15,y,-4)],[.07,.12,.16],glow,None,8)
    # Side islands, hanging roots and pools of warm light create authored depth.
    for x,y,z,w in [(-11,5,.5,3.4),(10,7,-.2,3.7),(-6,17,3,2)]:
        island(x,y,z,w,stone,trunk)
        for j in range(7):
            xx=x+random.uniform(-w*.7,w*.7);yy=y+random.uniform(-.5,.5)
            tube('Hanging root',[(xx,yy,z),(xx-.2,yy,z-1),(xx+.15,yy,z-2.4)],[.025,.035,.007],trunk,None,6)
    # Small motes are physical geometry in the plate, with live particles added in the game.
    for j in range(45):ellipsoid('Drifting mote',(random.uniform(-10,10),random.uniform(4,12),random.uniform(-1,8)),(.025,.025,.025),glow,segments=6,rings=4)
    light((-4,-6,14),(0,7,3),2700,10,(1,.83,.58) if index==0 else (.65,.82,1) if index==1 else (1,.49,.21))
    light((7,5,12),(0,7,3),3200,9,(.59,.82,1));light((-4,14,8),(0,7,3),2100,7,(1,.77,.45))
    bpy.ops.object.camera_add(location=(0,-21,7));cam=bpy.context.object;cam.data.lens=48;sc.camera=cam;aim(cam,(0,7,3.6))
    (OUT/'backdrops').mkdir(exist_ok=True);render(OUT/'backdrops'/(key+'.png'))
    (OUT/'source').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(key+'-environment.blend')))
for index,key in enumerate(['grove','frost','cinder']):make_world(key,index)
print('FORGE_SCENERY_COMPLETE',str(OUT),flush=True)
