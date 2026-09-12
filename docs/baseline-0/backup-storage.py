"""Encrypted local Supabase object snapshot. Credentials and plaintext stay in memory.
Run interactively; --self-test exercises encryption and corruption detection only.
"""
import argparse, datetime, getpass, hashlib, io, json, os, pathlib, secrets, sys, urllib.request, urllib.parse, zipfile
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

PROJECT = 'hnqwhuuxlqfyawqymaaz'
BASE = f'https://{PROJECT}.supabase.co/storage/v1'
MAGIC = b'G3BACKUP1'

def key(password, salt):
    return Scrypt(salt=salt, length=32, n=2**17, r=8, p=1).derive(password.encode())

def encrypt(raw, password):
    salt, nonce = secrets.token_bytes(16), secrets.token_bytes(12)
    header = MAGIC + salt + nonce
    return header + AESGCM(key(password, salt)).encrypt(nonce, raw, header)

def decrypt(blob, password):
    if blob[:9] != MAGIC:
        raise ValueError('Unrecognized backup format')
    return AESGCM(key(password, blob[9:25])).decrypt(blob[25:37], blob[37:], blob[:37])

def verify(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        manifest = json.loads(z.read('manifest.json'))
        for obj in manifest['objects']:
            content = z.read(obj['entry'])
            if len(content) != obj['bytes'] or hashlib.sha256(content).hexdigest() != obj['sha256']:
                raise ValueError('Object integrity mismatch')
        return len(manifest['objects'])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--verify', type=pathlib.Path)
    args = parser.parse_args()
    if args.self_test:
        blob = encrypt(b'test object bytes', 'synthetic-test-password')
        assert decrypt(blob, 'synthetic-test-password') == b'test object bytes'
        for bad, password in [(blob, 'wrong'), (blob[:-1]+bytes([blob[-1]^1]), 'synthetic-test-password')]:
            try:
                decrypt(bad, password)
            except Exception:
                continue
            raise AssertionError('Invalid ciphertext/password accepted')
        print('PASS encryption round trip, wrong password and tamper rejection')
        return
    if args.verify:
        print('Verified objects:', verify(decrypt(args.verify.read_bytes(), getpass.getpass('Backup password: '))))
        return
    print('G3 uploaded-file backup. Reads production storage only. Does not modify Supabase.')
    token = getpass.getpass('Supabase service_role or secret API key (hidden; not saved): ').strip()
    password = getpass.getpass('Choose backup password (at least 16 characters): ')
    if len(password) < 16 or password != getpass.getpass('Repeat backup password: '):
        raise ValueError('Password too short or confirmation mismatch')

    def request(path, body=None):
        headers = {'apikey': token, 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json'}
        req = urllib.request.Request(BASE+path, data=None if body is None else json.dumps(body).encode(), headers=headers)
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.read()

    buckets = json.loads(request('/bucket'))
    def inventory():
        found = []
        for bucket in buckets:
            pending = ['']
            while pending:
                prefix = pending.pop()
                offset = 0
                while True:
                    page = json.loads(request('/object/list/'+urllib.parse.quote(bucket['id'], safe=''),
                        {'prefix': prefix, 'limit': 100, 'offset': offset, 'sortBy': {'column':'name','order':'asc'}}))
                    for item in page:
                        name = prefix+item['name']
                        if item.get('id') is None:
                            pending.append(name+'/')
                        else:
                            found.append({'bucket': bucket['id'], 'name': name, 'id': item['id'],
                                          'updated_at': item.get('updated_at'), 'metadata': item.get('metadata')})
                    if len(page) < 100:
                        break
                    offset += len(page)
        return sorted(found, key=lambda x:(x['bucket'], x['name']))

    before = inventory()
    # Bounded in-memory snapshot avoids leaving plaintext files on disk.
    limit = 512*1024*1024
    archive = io.BytesIO()
    manifest = {'project': PROJECT, 'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'buckets': buckets, 'objects': []}
    total = 0
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for i, obj in enumerate(before):
            data = request('/object/'+urllib.parse.quote(obj['bucket'], safe='')+'/'+urllib.parse.quote(obj['name'], safe='/'))
            total += len(data)
            if total > limit:
                raise ValueError('Snapshot exceeds 512 MiB memory limit; no incomplete backup saved')
            entry = f'objects/{i:08d}'
            z.writestr(entry, data)
            manifest['objects'].append({**obj, 'entry': entry, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        if inventory() != before:
            raise ValueError('Storage changed during capture; retry for a consistent snapshot')
        z.writestr('manifest.json', json.dumps(manifest))
    raw = archive.getvalue()
    encrypted = encrypt(raw, password)
    assert verify(decrypt(encrypted, password)) == len(before)
    destination = pathlib.Path.home()/'Documents'/'G3-Backups'
    destination.mkdir(parents=True, exist_ok=True)
    target = destination/('g3-storage-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+secrets.token_hex(3)+'.g3backup')
    with target.open('xb') as out:
        out.write(encrypted)
    assert verify(decrypt(target.read_bytes(), password)) == len(before)
    print(f'Encrypted backup verified: {len(before)} files, {total} source bytes.\nSaved: {target}')
    print('Keep the password in your password manager. Losing it makes this backup unrecoverable.')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Do not print API responses, request headers or credential-bearing URLs.
        print('Backup did not complete:', type(exc).__name__, file=sys.stderr)
        sys.exit(1)
