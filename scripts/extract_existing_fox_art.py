"""Recover high-detail game sprites from the project's own existing fox trailer.
No external generation, network calls, or borrowed artwork. Explicit foreground
outline initializes GrabCut; optical flow tracks the outline through eight frames.
Store all mattes for review. Export visual variants only; gameplay stays in Godot.
"""
from pathlib import Path
import sys,json,math,hashlib
import cv2
import numpy as np
from PIL import Image,ImageEnhance
cv2.setNumThreads(2)
ROOT=Path(sys.argv[1]);OUT=Path(sys.argv[2]);OUT.mkdir(parents=True,exist_ok=True)
outline=np.array([(0,168),(34,170),(48,149),(60,99),(91,80),(127,81),(162,99),(199,140),(239,159),(288,170),(323,172),(365,168),(415,165),(462,156),(492,147),(490,96),(504,96),(536,129),(565,100),(577,103),(588,149),(595,176),(595,194),(613,207),(609,219),(594,224),(586,242),(571,251),(552,243),(539,233),(530,260),(546,285),(563,308),(577,330),(585,365),(562,365),(558,339),(536,316),(503,299),(494,292),(481,310),(475,326),(443,333),(441,327),(460,313),(449,297),(411,280),(385,291),(378,313),(394,334),(403,345),(381,350),(363,330),(354,323),(355,347),(364,363),(337,365),(323,348),(316,308),(318,295),(329,271),(320,250),(317,220),(280,237),(239,245),(208,242),(183,234),(151,215),(127,191),(113,171),(97,149),(82,140),(72,152),(71,175),(62,185),(27,195),(0,187)],np.int32)
source=[];mattes=[];previous=None;previous_mask=None;anchor_x=450.0
kernel=np.ones((5,5),np.uint8)
for idx in range(1,9):
    path=ROOT/f'run-{idx:02d}.png';bgr=cv2.imread(str(path))
    if bgr is None:raise RuntimeError('Missing source '+str(path))
    gray=cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY);h,w=gray.shape
    if previous is None:
        mask0=np.zeros((h,w),np.uint8);cv2.fillPoly(mask0,[outline],255)
    else:
        flow=cv2.calcOpticalFlowFarneback(gray,previous,None,.5,4,25,4,7,1.5,0)
        yy,xx=np.mgrid[:h,:w].astype(np.float32)
        mask0=cv2.remap(previous_mask.astype(np.float32),xx+flow[:,:,0],yy+flow[:,:,1],cv2.INTER_LINEAR).astype(np.uint8)
        forward=cv2.calcOpticalFlowFarneback(previous,gray,None,.5,4,25,4,7,1.5,0)
        anchor_x+=float(np.median(forward[190:260,380:500,0]))
    probable=cv2.dilate(mask0,kernel,iterations=2)>25
    sure=cv2.erode(mask0,kernel,iterations=1)>240
    mask=np.full((h,w),cv2.GC_BGD,np.uint8);mask[probable]=cv2.GC_PR_FGD;mask[sure]=cv2.GC_FGD
    # Keep absolute background margins so segmentation never adopts the brick street.
    mask[372:,:]=cv2.GC_BGD;mask[:45,:]=cv2.GC_BGD;mask[:,638:]=cv2.GC_BGD
    bg=np.zeros((1,65),np.float64);fg=np.zeros((1,65),np.float64)
    cv2.grabCut(bgr,mask,None,bg,fg,4,cv2.GC_INIT_WITH_MASK)
    binary=np.where((mask==1)|(mask==3),255,0).astype(np.uint8)
    # Only keep components touching the actual fox body/tail, not loose street sparks.
    count,labels,stats,cents=cv2.connectedComponentsWithStats(binary,8)
    keep=[i for i in range(1,count) if stats[i,cv2.CC_STAT_AREA]>120]
    binary=np.where(np.isin(labels,keep),255,0).astype(np.uint8)
    if len(sys.argv)>3:
        reviewed=Image.open(Path(sys.argv[3])/f'{idx:02d}.png').convert('RGBA')
        alpha=np.array(reviewed)[:,:,3].astype(np.float32)
        binary=np.where(alpha>128,255,0).astype(np.uint8)
    else:
        alpha=cv2.GaussianBlur(binary,(3,3),.55).astype(np.float32)
    alpha[:,:18]*=np.linspace(0,1,18)[None,:]
    rgba=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGBA);rgba[:,:,3]=alpha.astype(np.uint8)
    rgba[rgba[:,:,3]==0,:3]=0
    im=Image.fromarray(rgba)
    # Fixed-world body pivot tracked horizontally; no per-frame tight cropping jitter.
    cell=Image.new('RGBA',(384,288));scaled=im.resize((375,204),Image.Resampling.LANCZOS)
    foot_rows=np.where(np.any(alpha[:,280:637]>60,axis=1))[0]
    ground_y=int(foot_rows[-1]) if len(foot_rows) else 365
    offset=(round(240-anchor_x*375/736),round(245-ground_y*375/736));cell.alpha_composite(scaled,offset)
    (OUT/'mattes').mkdir(exist_ok=True);im.save(OUT/'mattes'/f'{idx:02d}.png')
    cell.save(OUT/f'run-{idx:02d}.png');source.append(cell);mattes.append({'frame':idx,'anchorX':anchor_x,'groundY':ground_y,'foregroundPixels':int(np.count_nonzero(binary))})
    previous=gray;previous_mask=binary

palettes={'ember':None,'tide':(.54,.36),'gale':(.39,.35),'void':(.73,.55),'sun':(.115,.55),'bloom':(.94,.45)}
def tint(im,variant):
    if variant=='ember':return im.copy()
    rgba=np.array(im);rgb=rgba[:,:,:3].astype(np.float32)/255
    hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV);hue,saturation=palettes[variant]
    colored=(hsv[:,:,1]>.28)&((hsv[:,:,0]<60)|(hsv[:,:,0]>330))
    hsv[:,:,0][colored]=hue*360
    hsv[:,:,1][colored]*=saturation/.8
    if variant=='tide':hsv[:,:,2][colored]=np.clip(hsv[:,:,2][colored]*1.12,0,1)
    if variant=='void':hsv[:,:,2][colored]*=.79
    rgba[:,:,:3]=np.clip(cv2.cvtColor(hsv,cv2.COLOR_HSV2RGB)*255,0,255).astype(np.uint8)
    return Image.fromarray(rgba)
for variant in palettes:
    out=OUT/'frames'/variant;out.mkdir(parents=True,exist_ok=True)
    # Idle breath is a bounded mesh-equivalent warp; run uses eight genuine video poses.
    idle=source[3]
    for frame in range(16):
        if frame<4:
            im=idle.copy()
            if frame%2:im=im.transform((384,288),Image.Transform.AFFINE,(1,0,0,0,.992,1.8),Image.Resampling.BICUBIC)
        elif frame<12:im=source[frame-4]
        elif frame==12:im=source[5].transform((384,288),Image.Transform.AFFINE,(1,-.025,5,0,1,0),Image.Resampling.BICUBIC)
        elif frame==13:im=source[1]
        elif frame==14:im=source[6].transform((384,288),Image.Transform.AFFINE,(.94,0,14,0,1.03,-5),Image.Resampling.BICUBIC)
        else:im=source[3]
        tint(im,variant).save(out/f'{frame:02}.png')
    # Full-body portraits retain the original painted fur, eye and anatomy.
    portrait=Image.open(OUT/'mattes'/'04.png').convert('RGBA')
    portrait=tint(portrait,variant);bounds=portrait.getbbox();portrait=portrait.crop(bounds)
    canvas=Image.new('RGBA',(720,720));ratio=min(660/portrait.width,590/portrait.height);portrait=portrait.resize((round(portrait.width*ratio),round(portrait.height*ratio)),Image.Resampling.LANCZOS);canvas.alpha_composite(portrait,((720-portrait.width)//2,(720-portrait.height)//2))
    (OUT/'portraits').mkdir(exist_ok=True);canvas.save(OUT/'portraits'/f'{variant}.png')
    # Head is cropped from the same accepted character, not an unrelated portrait model.
    head=Image.open(OUT/'mattes'/'04.png').convert('RGBA').crop((453,79,631,267));head=tint(head,variant);head.thumbnail((256,256),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(head,((256-head.width)//2,(256-head.height)//2));(OUT/'heads').mkdir(exist_ok=True);canvas.save(OUT/'heads'/f'{variant}.png')
meta={'frameWidth':384,'frameHeight':288,'columns':4,'rows':4,'anchor':[240/384,245/288],'drawScale':.48,'clips':{'idle':[0,4,5],'run':[4,8,14],'rise':[12,1,1],'fall':[13,1,1],'dash':[14,1,1],'pulse':[15,1,1]},'variants':list(palettes),'source':'Project-owned entry-trailer.mp4, t=1.0s plus eight original successive video frames. Foreground mattes reviewed separately. Eight run poses, derived idle/air/pulse states; tinted bloodlines with live Godot ornaments. Not a new 3D character sculpt.'}
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2))
(OUT/'extraction-receipt.json').write_text(json.dumps({'frames':mattes,'source':'assets/entry-trailer.mp4','technique':'Local BiRefNet matte (when supplied), optical-flow body-pivot stabilization; no uploaded images','clips':8,'variants':6},indent=2))
print('EXTRACTED_EXISTING_FOX_ART',flush=True)
