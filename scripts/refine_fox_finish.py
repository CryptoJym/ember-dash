"""Finish the owned authored fox scenes. No replacement of old scene sources.
Improves proportions, softer fur, tapered lower legs, full-body selection portraits,
consistent full-body framing, physically keyed game clips and six unique motifs.
Usage: Blender --background --factory-startup --threads 4 --python SCRIPT -- SRC OUT
"""
import bpy,math,json,sys,random
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
SRC,OUT=[Path(v) for v in sys.argv[sys.argv.index('--')+1:][:2]]
OUT.mkdir(parents=True,exist_ok=True)
metadata={}

def aim(cam,target):cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def render(path):bpy.context.scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
def keypose(sc,frame):sc.frame_set(frame);bpy.context.view_layer.update()

variants=['ember','tide','gale','void','sun','bloom']
if 'preview' in sys.argv:variants=['ember']
for variant in variants:
    bpy.ops.wm.open_mainfile(filepath=str(SRC/(variant+'-detailed.blend')),use_scripts=False)
    sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.render.film_transparent=True;sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.threads_mode='FIXED';sc.render.threads=4
    sc.render.resolution_percentage=100
    # Use each saved branch's materials; preserve its selected ornament visibility.
    for m in bpy.data.materials:
        if not m.use_nodes:continue
        p=m.node_tree.nodes.get('Principled BSDF')
        if not p:continue
        p.inputs['Roughness'].default_value=.82;p.inputs['Specular IOR Level'].default_value=.18
        if 'Groom' in m.name:
            p.inputs['Sheen Weight'].default_value=.2
            if 'Groom lit' in m.name:
                base=p.inputs['Base Color'].default_value
                p.inputs['Base Color'].default_value=tuple(v*.82 for v in base[:3])+(1,)
    head=bpy.data.objects['Head'];tail=bpy.data.objects['Tail'];spine=bpy.data.objects['Spine'];torso=bpy.data.objects['Torso']
    # Larger expressive head and ruff, leaner less tubular flank.
    head.scale=(1.16,1.12,1.10)
    torso.scale=(.90,.96,.90)
    bpy.data.objects['Chest bib'].scale.y*=1.10
    for o in bpy.data.objects:
        if o.name.startswith('Black nose'):o.scale*=.78
        if o.name.startswith('Soft ear fringe'):o.hide_render=True
        if o.name.startswith('Upper_leg'):o.scale=(o.scale.x*1.02,o.scale.y,o.scale.z)
        if o.name.startswith('Lower_leg'):o.scale=(o.scale.x*.88,o.scale.y*.88,o.scale.z)
        if o.name.startswith('Paw'):o.scale.x*=.86;o.scale.y*=.91
        if o.name.startswith('Toe'):o.scale*=.83
        if o.name.startswith('Ember flame crest'):o.hide_render=True
        if o.type=='CURVE' and (o.name.startswith(('Spine guard','Haunch groom','Shoulder groom','Fine facial','Fine muzzle','Swept cheek','Velvet sock','Upper limb','Chest ruff','Flowing tail groom'))):
            o.data.bevel_depth*=.57
            # The prior guard hairs extended like wires. Taper the same native groom
            # into coherent fur with a short silk layer and longer isolated guard tips.
            ratio=.38 if o.name.startswith(('Spine','Haunch','Shoulder')) else .48 if o.name.startswith(('Fine','Swept','Velvet','Upper')) else .62
            for idx,spline in enumerate(o.data.splines):
                if not spline.points:continue
                p0=Vector(spline.points[0].co[:3]);r=ratio*(1.25 if idx%17==0 else 1)
                for p in spline.points[1:]:
                    q=p0+(Vector(p.co[:3])-p0)*r;p.co=(*q,1)
            if o.name.startswith('Spine'):o.scale=(.90,.96,.90)
    # Small mane contours make the neck read as a continuous fox silhouette.
    for o in bpy.data.objects:
        if o.name.startswith('Sculpted cheek'):o.scale.y*=.83;o.scale.z*=.92
    for o in bpy.data.objects:
        if o.type=='LIGHT':
            if o.location.y>0:o.data.energy*=1.15
            else:o.data.energy*=.86
    sc.world.node_tree.nodes['Background'].inputs[1].default_value=.23
    cam=sc.camera
    # Clip states retain the animation channels and a shared floor anchor.
    cam.location=(0,-10,2.0);aim(cam,(-.15,0,1.12));cam.data.type='ORTHO';cam.data.ortho_scale=5.05
    sc.render.resolution_x=384;sc.render.resolution_y=288
    keypose(sc,1);proj=world_to_camera_view(sc,cam,Vector((0,0,0)))
    metadata={'frameWidth':384,'frameHeight':288,'columns':4,'rows':4,'anchor':[proj.x,1-proj.y],'drawScale':.42,'clips':{'idle':[0,4,5],'run':[4,8,14],'rise':[12,1,1],'fall':[13,1,1],'dash':[14,1,1],'pulse':[15,1,1]},'source':'Locally authored Blender 5.2.1 articulated fox, refined anatomy and tapered groom. Full-body selection portraits.','variants':['ember','tide','gale','void','sun','bloom']}
    p=OUT/'frames'/variant;p.mkdir(parents=True,exist_ok=True)
    for frame in range(1,2 if 'preview' in sys.argv else 17):keypose(sc,frame);render(p/f'{frame-1:02d}.png')
    keypose(sc,1)
    (OUT/'source').mkdir(exist_ok=True)
    # Save game rig before posing for the portrait. No destructive animation edits.
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(variant+'-finished.blend')),compress=True)
    # Selection uses the same actual fox anatomy, fully framed rather than a
    # cropped tail or an unvalidated seated deformation. Keep the prior rig editable.
    cam.location=(2.4,-10.5,2.8);aim(cam,(-.42,0,1.15));cam.data.ortho_scale=5.7;sc.render.resolution_x=800;sc.render.resolution_y=800
    bpy.context.view_layer.update()
    p=OUT/'portraits';p.mkdir(exist_ok=True);render(p/(variant+'.png'))
    cam.location=(3.3,-9.7,2.8);aim(cam,(.95,0,1.62));cam.data.ortho_scale=1.85;sc.render.resolution_x=256;sc.render.resolution_y=256
    p=OUT/'heads';p.mkdir(exist_ok=True);render(p/(variant+'.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'source'/(variant+'-portrait.blend')),compress=True)
(OUT/'atlas.json').write_text(json.dumps(metadata,indent=2))
print('FOX_FINISH_COMPLETE',json.dumps({'variants':variants,'preview':'preview' in sys.argv}),flush=True)
