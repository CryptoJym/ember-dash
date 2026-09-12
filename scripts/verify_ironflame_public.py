"""Verify public GitHub Pages bytes against the tested export; no mutations."""
from pathlib import Path
from urllib.request import urlopen
import hashlib,json,subprocess,datetime
root=Path(__file__).resolve().parents[1]
base='https://cryptojym.github.io/ember-dash/'
manifest=json.loads((root/'docs/ironflame/evidence/tested-build.json').read_text())
checks=[]
for name,expected in sorted(manifest.items()):
    url=base+'forge/'+name
    with urlopen(url,timeout=45) as response:
        data=response.read()
        actual=hashlib.sha256(data).hexdigest()
        assert response.status==200 and actual==expected['sha256'],name
        checks.append({'file':name,'status':response.status,'bytes':len(data),'sha256':actual,'pass':True})
        print('PUBLIC_MATCH',name,len(data),flush=True)
for name in ['index.html','lineage.html']:
    expected=subprocess.check_output(['git','show','4e145ca1fbb32a62f850245060744d9db628203f:'+name],cwd=root)
    with urlopen(base+('' if name=='index.html' else name),timeout=30) as response:data=response.read()
    assert data==expected,'Earlier game changed: '+name
    checks.append({'file':'previous '+name,'pass':True,'sha256':hashlib.sha256(data).hexdigest()})
    print('CLASSIC_UNCHANGED',name,flush=True)
receipt={'url':base+'forge/','sourceCommit':'708f73226fc905ec2b238fd4ab633f8e3ee08204','mergeCommit':'92b72b2eb1a7f0cd2963c4be73ec20792fa84401','observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'passed':len(checks)}
(root/'docs/ironflame/evidence/public-release.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt,indent=2))
