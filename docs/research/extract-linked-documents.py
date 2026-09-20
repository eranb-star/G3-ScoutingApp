import json,pathlib,re,hashlib
from pypdf import PdfReader
root=pathlib.Path(__file__).parent/'linked-documents'
manifest=json.loads((root/'manifest.json').read_text());results=[];passages=[];quarantine=[];seen=set()
for m in manifest:
 if not m.get('file') or m['sha256'] in seen:continue
 seen.add(m['sha256'])
 try:
  reader=PdfReader(root/m['file']);empty=[];text_bytes=0;count=0;quarantined=[]
  for i,page in enumerate(reader.pages):
   raw=page.extract_text() or ''
   if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]',raw):
    quarantined.append(i+1);quarantine.append(dict(url=m['url'],page=i+1,reason='Unsupported control characters in extracted text; possible mathematical glyph corruption',rawText=raw));continue
   text=re.sub(r'\s+',' ',raw).strip();text_bytes+=len(text.encode())
   if not text:empty.append(i+1)
   for offset in range(0,len(text),2000):
    body=text[offset:offset+2000];count+=1
    passages.append(dict(sourceUrl=m['url'],versionHash=m['sha256'],page=i+1,offset=offset,text=body,hash=hashlib.sha256(body.encode()).hexdigest(),status='unreviewed'))
  results.append(dict(url=m['url'],file=m['file'],pdfMetadataTitle=str((reader.metadata or {}).get('/Title','')),pages=len(reader.pages),emptyPages=empty,quarantinedPages=quarantined,textBytes=text_bytes,passages=count,firstPagePreview=(reader.pages[0].extract_text() or '')[:1500]))
 except Exception as e:results.append(dict(url=m['url'],error=str(e)))
(root/'extraction.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
(root/'passages.json').write_text(json.dumps(passages,ensure_ascii=False),encoding='utf8')
(root/'quarantine.json').write_text(json.dumps(quarantine,ensure_ascii=False),encoding='utf8')
print(json.dumps([{k:v for k,v in r.items() if k!='firstPagePreview'} for r in results]))
