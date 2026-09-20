import json,re,pathlib,hashlib
from html.parser import HTMLParser
class Text(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.parts=[]
 def handle_data(self,data):self.parts.append(data)
root=pathlib.Path(__file__).parent/'expanded-study';chunks=[];summary=[]
for file in sorted(root.glob('complete-*.json')):
 d=json.loads(file.read_text(encoding='utf8'));total=0;count=0;links=set()
 for post in d['posts']:
  p=Text();p.feed(post['cooked']);body=re.sub(r'\s+',' ',' '.join(p.parts)).strip();total+=len(body.encode())
  links.update(re.findall(r'href="(https?://[^"]+)"',post['cooked']))
  for offset in range(0,len(body),2000):
   text=body[offset:offset+2000];count+=1
   chunks.append(dict(team=d['team'],year=d['year'],band=d['band'],rank=d['rank'],url=d['url']+'/'+str(post['post_number']),post_id=post['id'],posted_at=post.get('created_at'),author=post.get('username'),offset=offset,text=text,hash=hashlib.sha256(text.encode()).hexdigest(),status='unreviewed'))
 summary.append(dict(team=d['team'],year=d['year'],band=d['band'],rank=d['rank'],posts=len(d['posts']),expected=d['expected'],complete=len(d['posts'])==d['expected'],textBytes=total,passages=count,linkedUrls=len(links),links=sorted(links)))
(root/'passages.json').write_text(json.dumps(chunks,ensure_ascii=False),encoding='utf8')
(root/'extraction.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
print(json.dumps([{k:v for k,v in d.items() if k!='links'} for d in summary]))
