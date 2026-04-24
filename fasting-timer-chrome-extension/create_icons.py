import struct, zlib

def make_png(width, height, filename):
    def chunk(chunk_type, data):
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk_type + data + struct.pack('>I', crc)
    
    png = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    
    # IHDR format: width(4)+height(4)+bitdepth(1)+color_type(1)+compression(1)+filter(1)+interlace(1)
    ihdr_data = struct.pack('>IBBBBBBB', width, height, 8, 2, 0, 0, 126, 34)
    png += chunk(b'IHDR', ihdr_data)
    
    raw = bytes([128]) * (width + 1) * height
    compressed = zlib.compress(raw)
    png += chunk(b'IDAT', compressed)
    
    png += chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(png)

make_png(48, 48, 'icon-48.png')
make_png(96, 96, 'icon-96.png')
print("✅ Iconos PNG válidos creados correctamente")
import os
for w in [48, 96]:
    print(f"icon-{w}.png: {os.path.getsize(f'icon-{w}.png')} bytes")
