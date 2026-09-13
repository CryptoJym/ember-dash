"""Adapt approved biome paintings into widescreen matte backgrounds.
Keep the central composition; reflect peripheral crops to extend the plate.
The Godot foreground is separate and has an explicit collision contour.
"""
from pathlib import Path
from PIL import Image,ImageOps,ImageFilter
import numpy as np
import cv2
import json,hashlib,sys
SRC=Path(sys.argv[1]);OUT=Path(sys.argv[2]);OUT.mkdir(parents=True,exist_ok=True)
im=Image.open(SRC).convert('RGB');W,H=1920,1080
# Finish clearing the small baked demonstration actors; actual enemies and the
# player are separate live objects. Coordinates include the upstream 132px crop.
a=np.array(im);mask=np.zeros(a.shape[:2],np.uint8)
for x0,y0,x1,y1 in [(634,354,781,436),(1177,386,1320,450),(1148,532,1238,616)]:mask[y0:y1,x0:x1]=255
im=Image.fromarray(cv2.inpaint(a,mask,7,cv2.INPAINT_TELEA))
COLS=[('grove',(14,0,540,640)),('frost',(558,0,1096,640)),('cinder',(1110,0,1632,640))]
for key,rect in COLS:
 raw=im.crop(rect);raw.save(OUT/(key+'-portrait.png'))
 center=raw.resize((round(raw.width*H/raw.height),H),Image.Resampling.LANCZOS)
 cw=center.width;ox=(W-cw)//2
 base=ImageOps.fit(raw,(W,H),centering=(.5,.44),method=Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(2))
 for side in (-1,1):
  mirror=ImageOps.mirror(center);px=ox-cw if side<0 else ox+cw;base.paste(mirror,(px,0))
 base.paste(center,(ox,0))
 a=np.array(base).astype(float)/255
 yy,xx=np.mgrid[0:H,0:W];vertical=yy/H;edge=((xx-W/2)/(W/2))**2
 shade=.84-.15*edge-.20*np.clip((vertical-.54)/.46,0,1)
 haze=np.clip((vertical-.30)/.8,0,.20)*(1-edge*.4)
 tint=np.array({'grove':[.11,.18,.22],'frost':[.10,.13,.26],'cinder':[.20,.09,.15]}[key])
 a=a*shade[:,:,None]*(1-haze[:,:,None])+tint*haze[:,:,None]
 Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(OUT/(key+'.jpg'),quality=92)
provenance={'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'source':'Three approved illustrated biomes from this conversation. Labels and baked demonstration foxes removed before verified transfer.','adaptation':'Widescreen matte paintings with mirrored peripheral extensions and a lower collision-plane fade; not a reconstructed 3D environment.','outputs':[key+'.jpg' for key,_ in COLS]}
(OUT/'world-provenance.json').write_text(json.dumps(provenance,indent=2))
print('APPROVED_WORLD_PLATES_READY')
