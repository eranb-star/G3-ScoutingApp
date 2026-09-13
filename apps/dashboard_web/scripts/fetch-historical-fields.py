# Run from repository root. Downloads licensed source models into ignored staging only.
import urllib.request,zipfile,io,pathlib,concurrent.futures,json,hashlib
names=['Field3d_2021FieldV2','Field3d_2022FRCFieldV4','Field3d_2023FRCFieldV5','Field3d_2024FRCFieldV4','Field3d_2025FRCFieldWeldedV3']
root=pathlib.Path('docs/staging/historical-assets.local');root.mkdir(exist_ok=True)
def get(name):
 url='https://github.com/Mechanical-Advantage/AdvantageScopeAssets/releases/download/archive-v1/'+name+'.zip'
 data=urllib.request.urlopen(url,timeout=90).read();z=zipfile.ZipFile(io.BytesIO(data));out=root/name;out.mkdir(exist_ok=True)
 for f in z.namelist():
  if pathlib.PurePosixPath(f).name in ['config.json','model.glb']: (out/pathlib.PurePosixPath(f).name).write_bytes(z.read(f))
 return {'name':name,'source':url,'sha256':hashlib.sha256(data).hexdigest(),'files':z.namelist(),'config':json.loads((out/'config.json').read_text(encoding='utf8'))}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as p: rows=list(p.map(get,names))
(root/'manifest.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
