const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICONS_DIR = path.join(__dirname, 'icons');
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function createPng(width, height, drawFn) {
  const stride = width * 4 + 1;
  const rawData = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x / width, y / height, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = calcCrc(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

function calcCrc(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

// Draw the Racun Cuan.id Icon (White/Silver Circular Badge with Teal/Navy Typography)
function drawRacunCuanIcon(u, v, width, height) {
  const dx = u - 0.5;
  const dy = v - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Circle mask radius
  const radius = 0.47;
  if (dist > radius) {
    if (dist > radius + 0.02) {
      return [0, 0, 0, 0]; // Transparent outside
    }
    // Anti-aliased outer edge
    const alpha = Math.max(0, Math.min(255, Math.floor((1 - (dist - radius) / 0.02) * 255)));
    return [241, 245, 249, alpha];
  }

  // Border ring: Slate/Teal edge
  if (dist >= 0.44 && dist <= 0.47) {
    return [13, 148, 136, 255]; // #0D9488 Teal border
  }

  // Crisp White/Light Slate Gradient Background
  const lightGrad = Math.floor(255 - v * 12);
  let r = lightGrad, g = lightGrad, b = Math.min(255, lightGrad + 4), a = 255;

  // Render "R" on top row (y: 0.28 to 0.46, x: 0.26 to 0.44) and "C" (x: 0.54 to 0.72)
  const px = u * 100;
  const py = v * 100;

  // Draw bold "R" (left side)
  const inR = (
    // vertical stem
    (px >= 24 && px <= 32 && py >= 28 && py <= 72) ||
    // top horizontal bar
    (px >= 24 && px <= 46 && py >= 28 && py <= 35) ||
    // middle horizontal bar
    (px >= 24 && px <= 46 && py >= 45 && py <= 52) ||
    // right loop curve
    (px >= 40 && px <= 48 && py >= 32 && py <= 48) ||
    // diagonal leg
    (px >= 32 && px <= 48 && py >= 50 && py <= 72 && Math.abs((px - 32) - (py - 50) * 0.72) <= 5)
  );

  // Draw bold "C" (right side)
  const inC = (
    // left vertical curve
    (px >= 54 && px <= 62 && py >= 34 && py <= 66) ||
    // top curve
    (px >= 58 && px <= 78 && py >= 28 && py <= 35) ||
    // bottom curve
    (px >= 58 && px <= 78 && py >= 65 && py <= 72) ||
    // top right serif tip
    (px >= 72 && px <= 78 && py >= 34 && py <= 42) ||
    // bottom right serif tip
    (px >= 72 && px <= 78 && py >= 58 && py <= 66)
  );

  // Draw ".id" badge (small green dot at bottom right: px: 80 to 86, py: 66 to 72)
  const inDot = (px >= 79 && px <= 85 && py >= 65 && py <= 71);

  if (inR || inC) {
    // Deep Navy / Obsidian Text Color (#0F172A)
    return [15, 23, 42, 255];
  }

  if (inDot) {
    // Vibrant Emerald / Teal (#0D9488)
    return [13, 148, 136, 255];
  }

  return [r, g, b, a];
}

// Generate sizes
[16, 32, 48, 128].forEach(size => {
  const pngBuf = createPng(size, size, drawRacunCuanIcon);
  fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}.png`), pngBuf);
  console.log(`Generated icon-${size}.png (${size}x${size})`);
});
