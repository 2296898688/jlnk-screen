const fs = require("fs");
const path = require("path");

const W = 1200;
const H = 860;
const lngMin = 121.38;
const lngMax = 131.3;
const latMin = 40.85;
const latMax = 46.3;
const gx = (lng) => ((lng - lngMin) / (lngMax - lngMin)) * W;
const gy = (lat) => ((latMax - lat) / (latMax - latMin)) * H;

const clusters = [
  { lng: 122.84, lat: 45.62, cols: 28, rows: 22, spanX: 200, spanY: 155 },
  { lng: 123.2, lat: 45.85, cols: 24, rows: 18, spanX: 175, spanY: 130 },
  { lng: 124.35, lat: 43.17, cols: 22, rows: 17, spanX: 160, spanY: 120 },
  { lng: 125.14, lat: 42.9, cols: 20, rows: 15, spanX: 145, spanY: 108 },
  { lng: 125.94, lat: 41.73, cols: 18, rows: 14, spanX: 130, spanY: 98 }
];

const lines = [];
function jitter(seed, amp) {
  return (Math.sin(seed * 12.9898) - 0.5) * amp;
}

clusters.forEach((c, ci) => {
  const ox = gx(c.lng) - c.spanX / 2;
  const oy = gy(c.lat) - c.spanY / 2;
  const xs = [];
  const ys = [];
  for (let r = 0; r <= c.rows; r++) {
    const edge = r === 0 || r === c.rows;
    ys.push(oy + (r / c.rows) * c.spanY + jitter(ci * 10 + r, edge ? 1 : 6));
  }
  for (let col = 0; col <= c.cols; col++) {
    const edge = col === 0 || col === c.cols;
    xs.push(ox + (col / c.cols) * c.spanX + jitter(ci * 7 + col, edge ? 1 : 5));
  }
  for (let r = 0; r < c.rows; r++) {
    for (let col = 0; col < c.cols; col++) {
      const x0 = xs[col];
      const x1 = xs[col + 1];
      const y0 = ys[r];
      const y1 = ys[r + 1];
      const d = `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} L${x0.toFixed(1)},${y1.toFixed(1)} Z`;
      lines.push(
        `<path d="${d}" fill="none" stroke="#00FF88" stroke-width="0.65" stroke-opacity="0.88"/>`
      );
      if ((ci * 100 + r * c.cols + col) % 41 === 0) {
        lines.push(
          `<path d="${d}" fill="rgba(66,165,245,0.35)" stroke="#42A5F5" stroke-width="0.6" stroke-opacity="0.85"/>`
        );
      }
    }
  }
});

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="transparent"/>
  ${lines.join("\n  ")}
</svg>`;

const dir = path.join(__dirname, "..", "assets", "map");
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, "jilin-land-cadastral.svg");
fs.writeFileSync(out, svg);
console.log("OK:", out, lines.length, "cells");
