"""Read-only repository inventory; optional local-only verification run.
Run from repo root using Python. Does not read credential files or call production.
Literal-source scanning is an inventory aid, not a resolved dependency/schema parser.
"""
from pathlib import Path
import subprocess, hashlib, json, re, os, sys, time, concurrent.futures

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
APP = ROOT / 'apps/dashboard_web'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8').strip()
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
paths = git('ls-files').splitlines()
files = [ROOT/p for p in paths if (ROOT/p).is_file()]
sql_files = [p for p in files if p.suffix=='.sql' and 'backend/supabase' in p.as_posix()]
sql_declarations = []
for p in sql_files:
    text=p.read_text(encoding='utf-8-sig')
    declarations={kind:sorted(set(re.findall(pattern,text,re.I))) for kind,pattern in {
      'tables':r'create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)',
      'routines':r'create\s+(?:or\s+replace\s+)?function\s+([\w.]+)',
      'policies':r'create\s+policy\s+("[^"]+"|[\w]+)',
      'triggers':r'create\s+(?:or\s+replace\s+)?trigger\s+([\w]+)'
    }.items()}
    sql_declarations.append({'file':p.relative_to(ROOT).as_posix(),'sha256':digest(p),**declarations})
source=[]
for p in files:
    if p.suffix not in ('.ts','.tsx') or '/src/' not in p.as_posix(): continue
    text=p.read_text(encoding='utf-8-sig')
    source.append({'file':p.relative_to(ROOT).as_posix(),
      'imports':sorted(set(re.findall(r'(?:from\s*|import\s*\()\s*[\'\"]([^\'\"]+)',text))),
      'tables':sorted(set(re.findall(r'\.from\(\s*[\'\"]([^\'\"]+)',text))),
      'rpcs':sorted(set(re.findall(r'\.rpc\(\s*[\'\"]([^\'\"]+)',text))),
      'edge_functions':sorted(set(re.findall(r'functions\.invoke\(\s*[\'\"]([^\'\"]+)',text))),
      'permissions':sorted(set(re.findall(r'\.can\(\s*[\'\"]([^\'\"]+)',text))),
      'routes':re.findall(r'<Route\s+path=[\'\"]([^\'\"]+)',text)})
functions=[{'file':p.relative_to(ROOT).as_posix(),'name':p.parent.name,'sha256':digest(p)} for p in files if p.name=='index.ts' and '/functions/' in p.as_posix()]
tests=[]
for p in sorted((APP/'scripts').glob('*.mjs')):
    if p.name.startswith('preview-'): kind='LOCAL_UI_FIXTURE'; execute=False
    elif p.name=='verify-live-schema.mjs': kind='PRODUCTION_READ_ONLY';execute=False
    elif p.name=='verify-firebase-spark.mjs':kind='LOCAL_GENERATED_ANDROID_ARTIFACT_CHECK';execute=True
    elif p.name.startswith('test-'):kind='LOCAL_PGLITE_OR_PURE_TEST';execute=True
    else:kind='STATIC_SOURCE_ASSERTIONS';execute=True
    tests.append({'script':p.name,'classification':kind,'run_in_local_batch':execute})
apk=APP/'android/app/build/outputs/apk/release/app-release.apk'
inventory={'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),
 'tracked_files':paths,'sql_declarations':sql_declarations,'source_dependencies':source,'edge_sources':functions,
 'tests':tests,'apk':{'sha256':digest(apk),'bytes':apk.stat().st_size} if apk.exists() else None,
 'limitations':['Literal scans can omit dynamic names/imports and do not resolve migration ordering.','Repository declarations do not establish what is deployed.','No credential values or application rows collected.']}
(OUT/'local-inventory.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
print(json.dumps({'tracked_files':len(paths),'sql_files':len(sql_files),'source_files':len(source),'edge_source_files':len(functions),'scripts':len(tests)}))
if '--test' in sys.argv:
    env=os.environ.copy()
    if not env.get('PGLITE_MODULE'): raise SystemExit('Set PGLITE_MODULE to the existing test dependency; no install performed.')
    def run(t):
        start=time.monotonic()
        try:
            r=subprocess.run(['node','scripts/'+t['script']],cwd=APP,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180)
            return {**t,'exit_code':r.returncode,'seconds':round(time.monotonic()-start,2),'output':r.stdout+r.stderr}
        except Exception as e:return {**t,'exit_code':None,'error':str(e)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,[t for t in tests if t['run_in_local_batch']]))
    (OUT/'local-test-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    for r in results:
        print(('PASS' if r['exit_code']==0 else 'FAIL')+' '+r['script'])
        if r['exit_code']!=0: print(r.get('output',r.get('error',''))[-2000:])
