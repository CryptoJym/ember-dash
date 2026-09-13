"""Prepare approved Ember Dash artwork for a 2.5D Godot/Blender pipeline.
Input is a verified local crop sheet of the user-approved conversation image.
No generation service, palette substitution, or external art search is performed.
"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
import cv2
from PIL import Image,ImageOps
SRC=Path(sys.argv[1]);OUT=Path(sys.argv[2]);OUT.mkdir(parents=True,exist_ok=True)
im=Image.open(SRC).convert('RGB')
# Remove the edge of the board's left-side label from the Ember portrait.
a=np.array(im);letter_mask=np.zeros(a.shape[:2],np.uint8);letter_mask[85:182,68:119]=255
im=Image.fromarray(cv2.inpaint(a,letter_mask,5,cv2.INPAINT_TELEA))
KEYS=['ember','tide','gale','void','sun','bloom']
PORTRAITS=[(88,7,346,421),(342,5,545,421),(532,38,752,421),(760,12,966,421),(982,8,1178,421),(1187,45,1437,421)]
HEADS=[(168,15,319,166),(386,11,536,166),(608,65,758,216),(821,26,971,177),(1006,36,1156,187),(1259,71,1409,222)]
SIDES=[(182,454,345,573),(343,454,507,573),(521,454,694,573),(714,454,881,573),(903,454,1072,573),(1096,454,1256,573)]
BODY=[[(46,62),(94,54),(128,57),(134,75),(101,87),(65,83)],[(64,63),(107,54),(134,45),(137,63),(113,81),(76,81)],[(61,66),(113,49),(143,46),(148,62),(124,79),(83,84)],[(70,68),(111,61),(125,41),(143,36),(143,54),(124,81),(78,89)],[(62,75),(114,58),(122,32),(146,33),(144,60),(121,80),(73,97)],[(38,65),(110,59),(119,42),(139,40),(143,55),(116,75),(53,85)]]
records=[]
for i,key in enumerate(KEYS):
 for name in ['portraits','heads','cutouts','review']:(OUT/name).mkdir(exist_ok=True)
 p=ImageOps.fit(im.crop(PORTRAITS[i]),(480,720),method=Image.Resampling.LANCZOS,centering=(.5,.08));p.save(OUT/'portraits'/f'{key}.png')
 im.crop(HEADS[i]).resize((256,256),Image.Resampling.LANCZOS).save(OUT/'heads'/f'{key}.png')
 crop=im.crop(SIDES[i]);a=np.array(crop);height,width=a.shape[:2]
 hsv=cv2.cvtColor(a,cv2.COLOR_RGB2HSV);value=a.max(2);sat=hsv[:,:,1]
 mask=np.full((height,width),cv2.GC_PR_BGD,np.uint8)
 mask[(value>60)&((sat>32)|(value>110))]=cv2.GC_PR_FGD;mask[value<31]=cv2.GC_BGD
 seed=np.zeros_like(mask);cv2.fillPoly(seed,[np.array(BODY[i],np.int32)],1);mask[seed>0]=cv2.GC_FGD
 mask[:2,:]=cv2.GC_BGD;mask[:,:2]=cv2.GC_BGD;mask[:,-2:]=cv2.GC_BGD;mask[-2:,:]=cv2.GC_BGD
 cv2.grabCut(a,mask,None,np.zeros((1,65)),np.zeros((1,65)),7,cv2.GC_INIT_WITH_MASK)
 fg=np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]);magic=((value>75)&(sat>70))
 magic[-4:]=False;magic[:2]=False;magic[:,:2]=False;magic[:,-2:]=False
 alpha=np.where(fg,255,0).astype(np.uint8)
 alpha=np.maximum(alpha,np.where(magic,np.clip((value.astype(float)-42)/100*255,0,230),0).astype(np.uint8))
 alpha=np.maximum(alpha,cv2.GaussianBlur(alpha,(3,3),.5));alpha[-3:]=(alpha[-3:].astype(float)*np.array([.85,.35,0])[:,None]).astype(np.uint8)
 rgba=np.dstack([a,alpha]);rgba[alpha==0,:3]=0
 result=Image.fromarray(rgba).resize((round(width*2.0),round(height*2.0)),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(512,384));left=256-round(result.width*.62);top=324-result.height;canvas.alpha_composite(result,(left,top));canvas.save(OUT/'cutouts'/f'{key}.png')
 check=Image.new('RGBA',canvas.size,'#54717a');check.alpha_composite(canvas);check.convert('RGB').save(OUT/'review'/f'{key}.jpg')
 records.append({'bloodline':key,'portraitCrop':PORTRAITS[i],'headCrop':HEADS[i],'sideCrop':SIDES[i],'sourceSize':list(crop.size),'alphaBounds':canvas.getbbox()})
(OUT/'art-provenance.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'source':'Approved six-fox concept illustration supplied in this conversation; cropped locally, verified AVIF transfer. Not the previous game trailer.','technique':'Original painted characters, no palette substitution; animated as textured mesh puppets in Blender.','canvas':[512,384],'anchor':[.5,324/384],'variants':records},indent=2))
print('APPROVED_FOX_ART_READY',len(records))
