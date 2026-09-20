import json, pathlib, hashlib, re
from html.parser import HTMLParser
from pypdf import PdfReader
class TextParser(HTMLParser):
    def __init__(self,main_only=False): super().__init__(); self.parts=[]; self.skip=0; self.main_only=main_only; self.depth=0
    def handle_starttag(self,tag,attrs):
        if self.depth and tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'): self.depth+=1
        elif not self.depth and dict(attrs).get('role')=='main': self.depth=1
        if tag in ('script','style'): self.skip+=1
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
        if self.depth: self.depth-=1
    def handle_data(self,data):
        if not self.skip and (not self.main_only or self.depth): self.parts.append(data)
root=pathlib.Path(__file__).parent/'evidence-pilot'
manifest=json.loads((root/'manifest.json').read_text())
chunks=[]; results=[]
for m in manifest:
    if not m.get('file'): continue
    p=root/m['file']; sections=[]
    try:
        if p.suffix=='.html' and 'permission to download this file' in p.read_text(encoding='utf-8',errors='replace'):
            results.append(dict(source=m['id'],excluded=True,reason='Download restricted by publisher; HTTP 200 is an error page, not the source document'))
            continue
        if p.suffix=='.pdf':
            reader=PdfReader(p)
            sections=[(f'PDF page {i+1}',page.extract_text() or '') for i,page in enumerate(reader.pages)]
        else:
            html=p.read_text(encoding='utf-8',errors='replace'); main_only='docs.wpilib.org' in m['url'] and 'role="main"' in html
            parser=TextParser(main_only); parser.feed(html)
            sections=[('HTML main article' if main_only else 'HTML text including navigation; exact element locator not yet assigned',' '.join(parser.parts))]
        docchunks=[]
        for locator,text in sections:
            text=re.sub(r'\s+',' ',text).strip()
            # Storage experiment only: character windows are not verified claims.
            for start in range(0,len(text),2000):
                passage=text[start:start+2000]
                if not passage: continue
                docchunks.append(dict(source=m['id'],url=m['url'],season=m.get('season'),team=m.get('team'),locator=locator,offset=start,text=passage,status='unreviewed',hash=hashlib.sha256(passage.encode()).hexdigest()))
        chunks.extend(docchunks)
        results.append(dict(source=m['id'],sections=len(sections),emptySections=sum(not t.strip() for _,t in sections),chunks=len(docchunks),textBytes=sum(len(c['text'].encode()) for c in docchunks)))
    except Exception as e: results.append(dict(source=m['id'],error=str(e)))
(root/'chunks.json').write_text(json.dumps(chunks,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'extraction.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results))
