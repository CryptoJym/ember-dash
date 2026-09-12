"""Enhance the existing owned environment scenes; never modifies the source in-place.
Blender --background --factory-startup --threads 4 --python SCRIPT -- SOURCE_DIR OUTPUT_DIR
"""
import bpy, sys, math, random, json
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];SOURCE=Path(args[0]);OUT=Path(args[1]);OUT.mkdir(parents=True,exist_ok=True)

def material(name,rgb,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.85
    p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    return m

def curve(name,points,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=1;c.resolution_u=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for v,p in zip(s.points,points):v.co=(*p,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

def leaf_cloud(name,centers,mat,seed):
    random.seed(seed);verts=[];faces=[]
    for c,sz in centers:
        c=Vector(c);a=random.uniform(0,math.tau);u=Vector((math.cos(a),math.sin(a),random.uniform(-.6,.6)))*sz;v=Vector((-math.sin(a),math.cos(a),random.uniform(-.4,.4)))*sz*.4
        j=len(verts);verts.extend([c-u,c-v,c+u,c+v,c+Vector((0,0,.06))]);faces.extend([(j,j+1,j+4),(j+1,j+2,j+4),(j+2,j+3,j+4),(j+3,j,j+4)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    return o

receipts=[]
for index,key in enumerate(['grove','frost','cinder']):
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/(key+'-environment.blend')),use_scripts=False)
    random.seed(index+831);sc=bpy.context.scene
    # Replace the single-color background with an actual horizon color script.
    wn=sc.world.node_tree;wn.nodes.clear();out=wn.nodes.new('ShaderNodeOutputWorld');bg=wn.nodes.new('ShaderNodeBackground');tex=wn.nodes.new('ShaderNodeTexCoord');sep=wn.nodes.new('ShaderNodeSeparateXYZ');ramp=wn.nodes.new('ShaderNodeValToRGB')
    wn.links.new(tex.outputs['Normal'],sep.inputs[0]);wn.links.new(sep.outputs['Z'],ramp.inputs[0]);wn.links.new(ramp.outputs[0],bg.inputs[0]);wn.links.new(bg.outputs[0],out.inputs[0]);bg.inputs[1].default_value=.75
    skies=[[(.32,.46,.62,1),(.04,.11,.22,1)],[(.22,.28,.46,1),(.024,.045,.13,1)],[(.3,.1,.14,1),(.045,.028,.07,1)]]
    ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=skies[index][0];ramp.color_ramp.elements[1].position=.65;ramp.color_ramp.elements[1].color=skies[index][1]
    # Fine normal variation plus geometric erosion remove featureless block surfaces.
    for m in list(bpy.data.materials):
        if not m.use_nodes:continue
        p=m.node_tree.nodes.get('Principled BSDF')
        if not p or 'light_' in m.name:continue
        p.inputs['Roughness'].default_value=.85
        n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=23;n.inputs['Detail'].default_value=4
        b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.55;b.inputs['Distance'].default_value=.09
        m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    for o in list(bpy.data.objects):
        if o.name.startswith('Suspended island'):
            bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
            sub=o.modifiers.new('Crag subdivisions','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=3;sub.render_levels=3
            texture=bpy.data.textures.new('Eroded rock '+o.name,type='CLOUDS');texture.noise_scale=.65;texture.noise_depth=2
            dis=o.modifiers.new('Weathered crags','DISPLACE');dis.texture=texture;dis.strength=.8;dis.mid_level=.5
        elif o.name.startswith('Sculpted canopy') and o.location.z>4.8 and index==0:
            matrix=o.matrix_world.copy();o.hide_render=True
            colors=[(.18,.30,.13),(.28,.39,.16),(.38,.44,.22),(.11,.22,.14)]
            for palette,rgb in enumerate(colors):
                centers=[]
                for j in range(950):
                    z=random.uniform(-1,1);a=random.uniform(0,math.tau);v=Vector((math.sqrt(1-z*z)*math.cos(a),math.sqrt(1-z*z)*math.sin(a),z))*random.uniform(.73,1.03)
                    p=matrix@v;centers.append((p,random.uniform(.055,.14)))
                leaf_cloud('Individual canopy leaves '+o.name+str(palette),centers,material('Leaf hue '+str(palette)+o.name,rgb),831+palette)
    # Small ruins and thin hanging roots provide scale cues.
    moss=material('Fine roots and moss',(.07,.16,.11) if index==0 else (.16,.21,.30) if index==1 else (.19,.07,.06))
    water=material('Waterfall silk',(.25,.58,.7) if index<2 else (.95,.2,.035),.35 if index<2 else 2.2)
    for j in range(40):
        x=random.uniform(-2.8,4.5);y=random.uniform(5.5,8.8);z=random.uniform(1.4,2.1)
        points=[(x+math.sin(i*.8+j)*.08,y,z-i*.17) for i in range(random.randint(8,22))]
        curve('Fine dangling root',points,.012,moss)
    for x,y,z in [(-2.1,7,1.7),(3.6,7.3,1.6),(-7.0,11,1.0),(8.4,13,2.9)]:
        for j in range(13):
            points=[(x+j*.024+math.sin(i*.28)*.014,y+.01*j,z-i*.25) for i in range(26)]
            curve('Waterfall curtain',points,.012+random.random()*.015,water)
    if index==1:
        for x in [-1.8,1,3.8]:
            for z in [3.2,4.5,5.8]:
                for j in range(8):
                    a=j*math.tau/8
                    curve('Cathedral tracery',[(x,6.36,z),(x+.27*math.cos(a),6.36,z+.45*math.sin(a))],.015,water)
    # Fog volume unifies far-away geometry while leaving the foreground sharp.
    fog=bpy.data.materials.new('Distance haze');fog.use_nodes=True;nodes=fog.node_tree.nodes;nodes.clear();vol=nodes.new('ShaderNodeVolumePrincipled');vo=nodes.new('ShaderNodeOutputMaterial');vol.inputs['Density'].default_value=.009;vol.inputs['Color'].default_value=(.65,.75,.9,1) if index<2 else (.55,.26,.3,1);vol.inputs['Anisotropy'].default_value=.28;fog.node_tree.links.new(vol.outputs['Volume'],vo.inputs['Volume'])
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,20,4));cube=bpy.context.object;cube.name='Atmosphere';cube.scale=(60,29,30);cube.data.materials.append(fog)
    sc.render.resolution_x=1920;sc.render.resolution_y=1080;sc.render.resolution_percentage=100;sc.render.threads_mode='FIXED';sc.render.threads=4;sc.render.engine='BLENDER_EEVEE';sc.render.image_settings.file_format='JPEG';sc.render.image_settings.color_mode='RGB';sc.render.image_settings.quality=93
    (OUT/'backdrops').mkdir(exist_ok=True);sc.render.filepath=str(OUT/'backdrops'/(key+'.jpg'));bpy.ops.render.render(write_still=True)
    (OUT/'source').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(key+'-detailed.blend')),compress=True)
    receipts.append({'biome':key,'objects':len(bpy.data.objects),'render':str(OUT/'backdrops'/(key+'.jpg'))})
(OUT/'environment-receipt.json').write_text(json.dumps(receipts,indent=2))
print('ENVIRONMENT_DETAIL_COMPLETE',flush=True)
