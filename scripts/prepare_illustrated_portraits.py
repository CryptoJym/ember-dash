"""Prepare full-resolution three-quarter portraits from the game's existing poster.
The transparent poster is produced locally by matte_existing_fox.py's documented
BiRefNet pipeline. No image or profile is sent to a third-party service.
"""
import sys,json,hashlib
from pathlib import Path
from PIL import Image
import numpy as np
import cv2
SOURCE=Path(sys.argv[1]);OUT=Path(sys.argv[2])
source=Image.open(SOURCE).convert('RGBA')
colors={'ember':None,'tide':(.54,.36),'gale':(.39,.36),'void':(.73,.60),'sun':(.115,.58),'bloom':(.94,.45)}
def variant(image,key):
    if key=='ember':return image.copy()
    a=np.array(image);hsv=cv2.cvtColor(a[:,:,:3].astype(np.float32)/255,cv2.COLOR_RGB2HSV)
    colored=(hsv[:,:,1]>.23)&((hsv[:,:,0]<65)|(hsv[:,:,0]>330))
    h,s=colors[key];hsv[:,:,0][colored]=h*360;hsv[:,:,1][colored]*=s/.8
    if key=='tide':hsv[:,:,2][colored]=np.minimum(1,hsv[:,:,2][colored]*1.09)
    if key=='void':hsv[:,:,2][colored]*=.85
    a[:,:,:3]=np.clip(cv2.cvtColor(hsv,cv2.COLOR_HSV2RGB)*255,0,255).astype(np.uint8)
    a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)
for key in colors:
    # Deliberate head-and-chest framing, with a soft lower falloff instead of
    # pretending a source whose front foot leaves frame is a full-body portrait.
    bust=variant(source.crop((660,252,1150,736)),key)
    rgba=np.array(bust);h=rgba.shape[0];fade=np.ones(h);fade[-65:]=np.linspace(1,0,65)
    rgba[:,:,3]=(rgba[:,:,3]*fade[:,None]).astype(np.uint8);bust=Image.fromarray(rgba)
    canvas=Image.new('RGBA',(640,720));bust=bust.resize((610,603),Image.Resampling.LANCZOS);canvas.alpha_composite(bust,(15,85))
    (OUT/'portraits').mkdir(parents=True,exist_ok=True);canvas.save(OUT/'portraits'/f'{key}.png')
    head=variant(source.crop((820,285,1130,575)),key);head.thumbnail((256,256),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(head,((256-head.width)//2,(256-head.height)//2));(OUT/'heads').mkdir(exist_ok=True);canvas.save(OUT/'heads'/f'{key}.png')
(OUT/'portrait-receipt.json').write_text(json.dumps({'input':'assets/entry-poster.jpg, locally matted','matteSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'variants':list(colors),'portraitSize':[640,720],'headSize':[256,256],'framing':'intentional head-and-chest, three-quarter view'},indent=2))
print('ILLUSTRATED_PORTRAITS_READY')
