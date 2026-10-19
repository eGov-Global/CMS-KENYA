"""Generate the load-test inputs: valid PNGs (100KB/1MB/5MB), a 5MB stored zip, and EICAR.
Filestore checks content type, so these must be real files, not random bytes."""
import os, struct, zlib, zipfile

def png(path, target):
    w = 512; row = 1 + w * 3; h = max(1, target // row)
    raw = b''.join(b'\x00' + os.urandom(w * 3) for _ in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(raw, 0)) + chunk(b'IEND', b''))

png('img-100k.png', 100_000); png('img-1m.png', 1_000_000); png('img-5m.png', 5_000_000)
with zipfile.ZipFile('docs-5m.zip', 'w', zipfile.ZIP_STORED) as z:
    for i in range(10): z.writestr(f'doc{i}.bin', os.urandom(500_000))
open('eicar.txt', 'w').write(r'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
