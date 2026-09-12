"""Install only the missing web templates for the already installed Godot 4.7.2.
Official upstream release asset; validate published SHA256 before extraction.
Never touches an existing template; retains the downloaded archive and receipt.
"""
from pathlib import Path
import urllib.request, hashlib, zipfile, json, shutil
version='4.7.2.stable'
root=Path.home()/'Projects'/'ember-forge-20260912'
root.mkdir(parents=True,exist_ok=True)
url='https://github.com/godotengine/godot-builds/releases/download/4.7.2-stable/Godot_v4.7.2-stable_export_templates.tpz'
expected='f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011'
archive=root/'Godot_v4.7.2-stable_export_templates.tpz'
if not archive.exists():
    temporary=archive.with_suffix('.download')
    with urllib.request.urlopen(url,timeout=60) as src, temporary.open('wb') as dst:
        shutil.copyfileobj(src,dst,1024*1024)
    temporary.rename(archive)
h=hashlib.sha256()
with archive.open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
if h.hexdigest()!=expected:raise RuntimeError('Official archive digest mismatch; not installing')
output=Path.home()/'Library'/'Application Support'/'Godot'/'export_templates'/version
output.mkdir(parents=True,exist_ok=True)
installed=[]
with zipfile.ZipFile(archive) as z:
    names=[n for n in z.namelist() if Path(n).name.startswith('web_') or Path(n).name=='version.txt']
    if not names:raise RuntimeError('Web export files missing from release')
    for name in names:
        target=output/Path(name).name
        data=z.read(name)
        if target.exists():
            if target.read_bytes()!=data:raise RuntimeError('Refusing to replace different installed file: '+str(target))
        else:target.write_bytes(data)
        installed.append({'name':target.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
receipt={'officialSource':url,'archiveSha256':h.hexdigest(),'installedDirectory':str(output),'files':installed}
(root/'godot-install-receipt.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt,indent=2),flush=True)
