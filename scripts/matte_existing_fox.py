"""Local-only foreground separation for eight owned trailer frames.
Uses the upstream rembg BiRefNet-lite model. Network is used only for the first
model-weight download; source images are never sent to any service.
"""
import os,sys,json,time
from pathlib import Path
os.environ.setdefault('OMP_NUM_THREADS','2')
os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
from rembg import remove,new_session
from PIL import Image
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
start=time.monotonic();session=new_session('birefnet-general-lite',providers=['CPUExecutionProvider'])
results=[]
for i in range(1,9):
    source=root/f'run-{i:02d}.png';image=Image.open(source).convert('RGB')
    foreground=remove(image,session=session)
    path=out/f'{i:02d}.png';foreground.save(path)
    checker=Image.new('RGBA',foreground.size,(28,48,56,255));checker.alpha_composite(foreground);checker.convert('RGB').save(out/f'preview-{i:02d}.jpg',quality=92)
    results.append({'frame':i,'bytes':path.stat().st_size});print('MATTED',i,flush=True)
(out/'receipt.json').write_text(json.dumps({'tool':'rembg','model':'birefnet-general-lite','input':'Project-owned entry-trailer.mp4 eight frames at 1.0s','imagesUploaded':False,'frames':results,'seconds':time.monotonic()-start},indent=2))
