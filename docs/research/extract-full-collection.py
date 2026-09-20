"""Offline extraction of completed public threads; no robot facts are inferred."""
import hashlib
import json
import pathlib
import re
from html.parser import HTMLParser


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


root = pathlib.Path(__file__).parent / 'full-collection'
jobs = json.loads((root / 'jobs.json').read_text(encoding='utf8'))
sources, passages, quarantined = [], [], []
for job in jobs:
    if job['status'] != 'collected':
        continue
    raw = (root / f"topic-{job['topic']}.json").read_bytes()
    data = json.loads(raw)
    years = sorted(set(a['year'] for a in job['associations']))
    source = dict(url=job['url'], title=job['title'], versionHash=hashlib.sha256(raw).hexdigest(),
                  kind='forum-thread', status='unreviewed', candidateAssociations=job['associations'],
                  sourceContextSeason=years[0] if len(years) == 1 else None,
                  contextBasis='Topic title; robot attribution is not verified', publisherTeam=None,
                  documentSeason=None, posts=len(data['posts']))
    sources.append(source)
    for post in sorted(data['posts'], key=lambda p: p['post_number']):
        parser = Text()
        parser.feed(post.get('cooked') or '')
        body = re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()
        if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]', body):
            quarantined.append(dict(topic=job['topic'], post=post['id'], reason='Invalid extracted character'))
            continue
        for offset in range(0, len(body), 2000):
            passages.append(dict(sourceUrl=job['url'], text=body[offset:offset + 2000],
                                 locator=dict(postUrl=job['url'] + '/' + str(post['post_number']),
                                              postId=post['id'], postedAt=post.get('created_at'),
                                              author=post.get('username'), offset=offset)))
for name, value in [('extracted-sources.json', sources), ('passages.json', passages),
                    ('quarantined.json', quarantined)]:
    target = root / name
    temporary = root / (name + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False), encoding='utf8')
    temporary.replace(target)
print(json.dumps(dict(sources=len(sources), passages=len(passages), quarantinedPosts=len(quarantined))))
