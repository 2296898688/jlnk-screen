/**
 * 黑底抠透明 + 白线加粗（保留参考图勾勒）
 * node scripts/make-baseline-transparent.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const src = path.join(root, "assets", "map", "jilin-land-baseline-source.png");
const fallback = path.join(root, "assets", "map", "jilin-land-baseline.png");
const out = path.join(root, "assets", "map", "jilin-land-baseline-transparent.png");

const input = fs.existsSync(src) ? src : fallback;
if (!fs.existsSync(input)) {
  console.error("缺少源图:", input);
  process.exit(1);
}

function dilateAlpha(data, width, height, radius) {
  const px = 4;
  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxA = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          maxA = Math.max(maxA, data[(ny * width + nx) * px + 3]);
        }
      }
      if (maxA > 0) {
        const i = (y * width + x) * px;
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
        out[i + 3] = 255;
      }
    }
  }
  return out;
}

async function main() {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = channels;

  for (let i = 0; i < data.length; i += px) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = r + g + b;

    if (lum < 55) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }

    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  const dilated = dilateAlpha(data, width, height, 2);
  const tmp = out + ".tmp";

  await sharp(dilated, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toFile(tmp);

  if (fs.existsSync(out)) fs.unlinkSync(out);
  fs.renameSync(tmp, out);
  console.log("OK:", out, `${width}x${height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
