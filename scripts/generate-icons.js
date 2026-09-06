import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPNG(width, height, pixelShader) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw pixel data: each scanline has 1 filter byte (0) + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelShader(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Shader for studio icon: dark sleek dial, cyan/violet glowing waveform & mic
function renderStudioIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const normDist = dist / (w / 2);
  const angle = Math.atan2(dy, dx);

  // Background dark metallic gradient
  let r = 11, g = 15, b = 25, a = 255;
  const bgGrad = y / h;
  r = Math.floor(15 - bgGrad * 8);
  g = Math.floor(23 - bgGrad * 10);
  b = Math.floor(38 - bgGrad * 14);

  // Outer ring
  const ringRadius = isMaskable ? 0.70 : 0.82;
  const ringWidth = 0.06;
  if (Math.abs(normDist - ringRadius) < ringWidth) {
    const ringT = (angle + Math.PI) / (2 * Math.PI);
    // Cyan to purple gradient
    const ringR = Math.floor(6 + ringT * (139 - 6));
    const ringG = Math.floor(182 - ringT * (182 - 92));
    const ringB = Math.floor(212 + ringT * (246 - 212));
    const alpha = 1.0 - Math.abs(normDist - ringRadius) / ringWidth;
    r = Math.floor(r * (1 - alpha) + ringR * alpha);
    g = Math.floor(g * (1 - alpha) + ringG * alpha);
    b = Math.floor(b * (1 - alpha) + ringB * alpha);
  }

  // Inner dial plate
  const dialRadius = isMaskable ? 0.55 : 0.65;
  if (normDist < dialRadius) {
    const plateGrad = 1 - normDist / dialRadius;
    r = Math.floor(15 + plateGrad * 15);
    g = Math.floor(23 + plateGrad * 20);
    b = Math.floor(42 + plateGrad * 35);

    // Waveform line in the center
    const waveY = cy - Math.sin((x / w) * Math.PI * 4) * (h * 0.08);
    const distToWave = Math.abs(y - waveY);
    if (distToWave < h * 0.02) {
      const glow = 1 - distToWave / (h * 0.02);
      r = Math.floor(r * (1 - glow) + 6 * glow);
      g = Math.floor(g * (1 - glow) + 182 * glow);
      b = Math.floor(b * (1 - glow) + 212 * glow);
    }

    // Center pitch dot
    if (dist < w * 0.08) {
      const dotT = 1 - dist / (w * 0.08);
      r = Math.floor(r * (1 - dotT) + 16 * dotT);
      g = Math.floor(g * (1 - dotT) + 185 * dotT);
      b = Math.floor(b * (1 - dotT) + 129 * dotT);
    }
  }

  return [r, g, b, 255];
}

fs.writeFileSync(path.join(process.cwd(), 'public/apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => renderStudioIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(process.cwd(), 'public/pwa-192x192.png'), createPNG(192, 192, (x, y, w, h) => renderStudioIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(process.cwd(), 'public/pwa-512x512.png'), createPNG(512, 512, (x, y, w, h) => renderStudioIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(process.cwd(), 'public/pwa-maskable-512x512.png'), createPNG(512, 512, (x, y, w, h) => renderStudioIcon(x, y, w, h, true)));
console.log('Successfully generated all PWA PNG icons!');
