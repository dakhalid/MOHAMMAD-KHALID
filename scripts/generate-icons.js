import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? -306674912 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.44);
  const innerRadius = width * 0.32;

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength;
    rawData[rowStart] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Deep Slate #0f172a
      let r = 15, g = 23, b = 42, a = 255;

      if (!isMaskable && dist > radius) {
        // Rounded corners for non-maskable
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy)) - (width * 0.36);
        if (cornerDist > 0 && dist > width * 0.48) {
          a = 0;
        }
      }

      // Wallet / shield emblem in center
      if (dist <= innerRadius) {
        // Outer glow
        const t = (innerRadius - dist) / innerRadius;
        // Emerald gradient: #10b981 to #059669
        r = Math.round(16 + 10 * t);
        g = Math.round(185 - 35 * (1 - t));
        b = Math.round(129 - 24 * (1 - t));

        // Center shield lock emblem
        if (Math.abs(dx) < innerRadius * 0.4 && Math.abs(dy) < innerRadius * 0.4) {
          // Lock clasp or highlight
          if (dy < -innerRadius * 0.1 && Math.abs(dx) < innerRadius * 0.25) {
            r = 255; g = 255; b = 255; // white clasp
          } else if (dy >= -innerRadius * 0.1 && dy < innerRadius * 0.25 && Math.abs(dx) < innerRadius * 0.35) {
            r = 5; g = 150; b = 105; // lock body
          }
        }
      }

      rawData[idx] = r;
      rawData[idx + 1] = g;
      rawData[idx + 2] = b;
      rawData[idx + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(64, 64, false));

console.log('Successfully generated PWA and Apple Touch PNG icons!');
