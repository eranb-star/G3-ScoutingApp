"""Reproduce the tag textures from FIRST's pinned 2026 PDF. Requires Poppler and Pillow.
Usage: python generate-frc2026-tags.py /path/to/2026-apriltag-images-user-guide.pdf
The PDF SHA is recorded in public/twin/2026/tags/provenance.json.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1] / 'public/twin/2026/tags'
manifest = json.loads((root / 'provenance.json').read_text())
pdf = Path(sys.argv[1]).resolve()
assert hashlib.sha256(pdf.read_bytes()).hexdigest() == manifest['artworkSha256'], 'Unexpected PDF revision'
with tempfile.TemporaryDirectory() as folder:
    prefix = str(Path(folder) / 'tag')
    subprocess.run(['pdftoppm', '-f', '4', '-l', '35', '-r', '72', '-png', str(pdf), prefix], check=True)
    for tag_id in range(1, 33):
        source = Image.open(f'{prefix}-{tag_id+3:02}.png').convert('L')
        target = Image.new('RGB', (10, 10), 'white')
        for y in range(8):
            for x in range(8):
                value = source.getpixel((round(72 + (x+.5)*58.5), round(162 + (y+.5)*58.5)))
                assert value < 20 or value > 235, (tag_id, x, y, value)
                if x in (0, 7) or y in (0, 7):
                    assert value < 20, 'Black frame must be intact'
                target.putpixel((x+1, y+1), (0, 0, 0) if value < 128 else (255, 255, 255))
        target.save(root / f'{tag_id}.png')
        assert hashlib.sha256((root / f'{tag_id}.png').read_bytes()).hexdigest() == manifest['images'][str(tag_id)]
print('Verified all 32 FIRST patterns against the recorded texture hashes')
