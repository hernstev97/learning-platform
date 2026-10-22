// node tooling/pixelart-figures.ts
// Draws the figures of the pixelart area into public/media/pixelart/<module>/<name>@2x.png. Each figure shows a
// principle (lines, clusters, ramps, light, silhouettes built from basic shapes), never a finished character or a game
// asset. They are teaching diagrams drawn from code, not templates for or substitutes of the learner's own drawings
// (AI rule, 2026-10-16). The output is deterministic: same code, same bytes. Labels A, B, C … match the captions.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

type RGB = readonly [number, number, number];
type Pt = readonly [number, number];
type Paint = RGB | null | ((x: number, y: number, nx: number, ny: number) => RGB | null);

const OUT = join(import.meta.dirname, '..', 'public', 'media', 'pixelart');
const rgb = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as unknown as RGB;

const C = {
  ink: rgb('#1F1D24'), dark: rgb('#4A4652'), mid: rgb('#8A8590'), light: rgb('#C9C4CC'), white: rgb('#FAF8F5'),
  accent: rgb('#F0602A'), blue: rgb('#2F6FDB'), panel: rgb('#EEEBE5'), page: rgb('#FFFFFF'), ground: rgb('#D3CEC6'),
};
/** Five grey values from dark to light, used wherever a figure is about value only. */
const GREYS: RGB[] = [C.ink, C.dark, C.mid, C.light, C.white];

/** Seeded random numbers (mulberry32), so the figures never change between runs. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Relative luminance as defined by WCAG 2.2, the same formula the lessons use. */
function luminance([r, g, b]: RGB): number {
  const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/** The grey with the same relative luminance. */
function grey(c: RGB): RGB {
  const y = luminance(c);
  const s = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  const v = Math.round(Math.min(1, Math.max(0, s)) * 255);
  return [v, v, v];
}

class Art {
  w: number;
  h: number;
  px: (RGB | null)[];
  constructor(w: number, h: number) { this.w = w; this.h = h; this.px = Array.from({ length: w * h }, () => null); }
  static map(rows: string, legend: Record<string, RGB | null>): Art {
    const lines = rows.split('\n').map((l) => l.trim()).filter(Boolean);
    const art = new Art(lines[0].length, lines.length);
    lines.forEach((line, y) => {
      if (line.length !== art.w) throw new Error(`Zeile ${y + 1} hat ${line.length} statt ${art.w} Zeichen: ${line}`);
      [...line].forEach((ch, x) => {
        if (ch === '.') return;
        if (!(ch in legend)) throw new Error(`Zeichen ${ch} fehlt in der Legende`);
        art.set(x, y, legend[ch]);
      });
    });
    return art;
  }
  inside(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x: number, y: number): RGB | null { return this.inside(x, y) ? this.px[y * this.w + x] : null; }
  set(x: number, y: number, c: RGB | null) { if (this.inside(x, y)) this.px[y * this.w + x] = c; }
  paint(x: number, y: number, p: Paint, nx = 0, ny = 0) {
    const c = typeof p === 'function' ? p(x, y, nx, ny) : p;
    if (c) this.set(x, y, c);
  }
  rect(x: number, y: number, w: number, h: number, p: Paint) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.paint(i, j, p, (i + 0.5 - x) / w * 2 - 1, (j + 0.5 - y) / h * 2 - 1);
    return this;
  }
  /** Filled ellipse; a function paint gets the position relative to the centre, -1 … 1 on each axis. */
  ellipse(cx: number, cy: number, rx: number, ry: number, p: Paint) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) this.paint(x, y, p, nx, ny);
    }
    return this;
  }
  /** Filled polygon, sampled at pixel centres. */
  polygon(points: Pt[], p: Paint) {
    const ys = points.map((q) => q[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const cy = y + 0.5, xs: number[] = [];
      points.forEach(([x0, y0], i) => {
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= cy && y1 > cy) || (y1 <= cy && y0 > cy)) xs.push(x0 + (cy - y0) / (y1 - y0) * (x1 - x0));
      });
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x + 0.5 < xs[k + 1]; x++) this.paint(x, y, p);
    }
    return this;
  }
  /** One-pixel line (Bresenham). */
  line([x0, y0]: Pt, [x1, y1]: Pt, p: Paint) {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1), dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.paint(x, y, p);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }
  /** Thick stroke: discs of radius r along the segment. */
  stroke(a: Pt, b: Pt, r: number, p: Paint) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4));
    const done = new Set<number>();
    for (let s = 0; s <= steps; s++) {
      const px = a[0] + (b[0] - a[0]) * s / steps, py = a[1] + (b[1] - a[1]) * s / steps;
      for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++) for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++) {
        if ((x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 > r * r || done.has(y * 10000 + x)) continue;
        done.add(y * 10000 + x);
        this.paint(x, y, p);
      }
    }
    return this;
  }
  /** Draws another Art on top; its empty pixels stay transparent. */
  draw(other: Art, ox = 0, oy = 0) {
    for (let y = 0; y < other.h; y++) for (let x = 0; x < other.w; x++) { const c = other.get(x, y); if (c) this.set(ox + x, oy + y, c); }
    return this;
  }
  /** Pixels of the shape that touch empty space (4-neighbourhood), from the inside. */
  edge(): Set<number> {
    const out = new Set<number>();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!this.get(x, y)) continue;
      if (!this.get(x - 1, y) || !this.get(x + 1, y) || !this.get(x, y - 1) || !this.get(x, y + 1)) out.add(y * this.w + x);
    }
    return out;
  }
  /** Inside outline; a function gets the pixel and the colour it replaces. */
  outline(p: RGB | ((x: number, y: number, under: RGB) => RGB)) {
    for (const i of this.edge()) {
      const x = i % this.w, y = Math.floor(i / this.w);
      this.px[i] = typeof p === 'function' ? p(x, y, this.px[i]!) : p;
    }
    return this;
  }
  recolor(fn: (c: RGB, x: number, y: number) => RGB | null) {
    const art = new Art(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = this.get(x, y); if (c) art.set(x, y, fn(c, x, y)); }
    return art;
  }
  flipX() {
    const art = new Art(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) art.set(this.w - 1 - x, y, this.get(x, y));
    return art;
  }
  /** Nearest-neighbour enlargement by a whole factor. */
  scale(k: number) {
    const art = new Art(this.w * k, this.h * k);
    for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) art.set(x, y, this.get(Math.floor(x / k), Math.floor(y / k)));
    return art;
  }
  /** Repeats the art as tiles, cols × rows. */
  tile(cols: number, rows: number) {
    const art = new Art(this.w * cols, this.h * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) art.draw(this, i * this.w, j * this.h);
    return art;
  }
}

/** Light from the top left and slightly in front, as in most of the figures. */
const LIGHT: readonly [number, number, number] = (() => { const v = [-0.55, -0.65, 0.52]; const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n] as const; })();
/** Lambert term for a point on an ellipsoid, given its position -1 … 1 relative to the centre. */
const lambert = (nx: number, ny: number) => { const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); return nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]; };
/** Picks tones[i] for the first threshold the value exceeds; tones go from light to dark. */
const band = (v: number, thresholds: number[], tones: RGB[]) => { const i = thresholds.findIndex((t) => v > t); return tones[i === -1 ? tones.length - 1 : i]; };

// ---------------------------------------------------------------------------------------------------------------
// Rendering: panels in rows, each art pixel `scale` CSS pixels wide, files at twice the CSS size (@2x).

interface Panel { art: Art; label?: string; grid?: boolean; filePx?: number }
interface Layout { rows: Panel[][]; scale: number; grid?: boolean; gap?: number }

const GLYPHS: Record<string, string> = {
  A: '.k.|k.k|kkk|k.k|k.k', B: 'kk.|k.k|kk.|k.k|kk.', C: '.kk|k..|k..|k..|.kk', D: 'kk.|k.k|k.k|k.k|kk.', E: 'kkk|k..|kk.|k..|kkk', F: 'kkk|k..|kk.|k..|k..',
  1: '.k.|kk.|.k.|.k.|kkk', 2: 'kk.|..k|.k.|k..|kkk', 3: 'kk.|..k|.k.|..k|kk.', 4: 'k.k|k.k|kkk|..k|..k', 5: 'kkk|k..|kk.|..k|kk.',
  6: '.kk|k..|kk.|k.k|.k.', 7: 'kkk|..k|.k.|.k.|.k.', 8: '.k.|k.k|.k.|k.k|.k.', 9: '.k.|k.k|.kk|..k|kk.',
};
const GLYPH = 4; // file pixels per glyph pixel: 3 × 5 glyph → 6 × 10 CSS pixels

function encodePng(w: number, h: number, px: RGB[]): Buffer {
  const colors = new Map<string, number>();
  for (const c of px) { const k = c.join(); if (!colors.has(k)) colors.set(k, colors.size); if (colors.size > 256) break; }
  const indexed = colors.size <= 256;
  const stride = indexed ? w : w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = px[y * w + x], o = y * (stride + 1) + 1;
    if (indexed) raw[o + x] = colors.get(c.join())!;
    else { raw[o + x * 3] = c[0]; raw[o + x * 3 + 1] = c[1]; raw[o + x * 3 + 2] = c[2]; }
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
    const tail = Buffer.alloc(4); tail.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, tail]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = indexed ? 3 : 2;
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr)];
  if (indexed) parts.push(chunk('PLTE', Buffer.from([...colors.keys()].flatMap((k) => k.split(',').map(Number)))));
  parts.push(chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

const written: string[] = [];
function render(name: string, layout: Layout) {
  const gap = (layout.gap ?? 8) * 2, margin = 12, labelH = layout.rows.flat().some((p) => p.label) ? 5 * GLYPH + 12 : 0;
  const size = (p: Panel) => { const k = p.filePx ?? layout.scale * 2; return [p.art.w * k, p.art.h * k] as const; };
  const rowW = layout.rows.map((row) => row.reduce((sum, p, i) => sum + size(p)[0] + (i ? gap : 0), 0));
  const rowH = layout.rows.map((row) => Math.max(...row.map((p) => size(p)[1])) + labelH);
  const W = Math.max(...rowW) + margin * 2, H = rowH.reduce((a, b) => a + b, 0) + gap * (layout.rows.length - 1) + margin * 2;
  const out: RGB[] = Array.from({ length: W * H }, () => C.page);
  let top = margin;
  layout.rows.forEach((row, r) => {
    let left = margin + Math.floor((Math.max(...rowW) - rowW[r]) / 2);
    for (const p of row) {
      const k = p.filePx ?? layout.scale * 2, [pw, ph] = size(p), y0 = top + rowH[r] - labelH - ph;
      const grid = (p.grid ?? layout.grid) && k >= 6;
      for (let fy = 0; fy < ph; fy++) for (let fx = 0; fx < pw; fx++) {
        let c = p.art.get(Math.floor(fx / k), Math.floor(fy / k)) ?? C.panel;
        if (grid && (fx % k === 0 || fy % k === 0)) c = mix(c, C.ink, 0.14);
        out[(y0 + fy) * W + left + fx] = c;
      }
      if (p.label) {
        const glyphs = [...p.label].map((ch) => GLYPHS[ch].split('|'));
        const lw = glyphs.length * 4 * GLYPH - GLYPH;
        glyphs.forEach((g, gi) => g.forEach((line, gy) => [...line].forEach((ch, gx) => {
          if (ch !== 'k') return;
          for (let j = 0; j < GLYPH; j++) for (let i = 0; i < GLYPH; i++) {
            out[(top + rowH[r] - labelH + 10 + gy * GLYPH + j) * W + left + Math.floor((pw - lw) / 2) + (gi * 4 + gx) * GLYPH + i] = C.ink;
          }
        })));
      }
      left += pw + gap;
    }
    top += rowH[r] + gap;
  });
  const file = join(OUT, `${name}@2x.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(W, H, out));
  written.push(`${name}@2x.png  ${W / 2}×${H / 2} CSS-px`);
}
const labelled = (arts: Art[], labels = 'ABCDEF') => arts.map((art, i) => ({ art, label: labels[i] }));

// ---------------------------------------------------------------------------------------------------------------
// Mannequin: a jointed wooden doll built from ellipses, a torso polygon and strokes. Used for proportions, poses,
// silhouettes and views. It is deliberately neutral: no face, costume or species.

interface Doll {
  head: [number, number, number, number]; // cx, cy, rx, ry
  torso: Pt[];
  limbs: [Pt, Pt, number][]; // from, to, radius
}
type Part = 'head' | 'torso' | 'limbs';
function doll(w: number, h: number, d: Doll, paint: Partial<Record<Part, Paint>> & { all?: Paint }) {
  const art = new Art(w, h);
  for (const [a, b, r] of d.limbs) art.stroke(a, b, r, paint.limbs ?? paint.all ?? C.mid);
  art.polygon(d.torso, paint.torso ?? paint.all ?? C.mid);
  const [cx, cy, rx, ry] = d.head;
  art.ellipse(cx, cy, rx, ry, paint.head ?? paint.all ?? C.mid);
  return art;
}
/** Standing doll, `heads` head heights tall, centred at cx, feet on the bottom row. */
function standing(cx: number, height: number, heads: number, width = 1): Doll {
  const u = height / heads, chibi = heads < 3.5;
  const headRx = u * (chibi ? 0.58 : 0.4) * width, shoulderY = u * (chibi ? 1.0 : 1.2), hipY = chibi ? height * 0.7 : height * 0.5;
  const sw = (chibi ? u * 0.85 : u * 1.7) * width, hw = sw * 0.78, lr = Math.max(0.9, u * (chibi ? 0.16 : 0.19)) * width ** 0.5;
  const bottom = height - 0.6;
  return {
    head: [cx, u / 2, headRx, u / 2],
    torso: [[cx - sw / 2, shoulderY], [cx + sw / 2, shoulderY], [cx + hw / 2, hipY], [cx - hw / 2, hipY]],
    limbs: [
      [[cx - hw / 4, hipY], [cx - hw / 3.2, bottom - lr * 0.6], lr], [[cx + hw / 4, hipY], [cx + hw / 3.2, bottom - lr * 0.6], lr],
      [[cx - sw / 2, shoulderY + lr], [cx - sw / 2 - lr * 0.6, hipY + (chibi ? 0 : u * 0.35)], lr * 0.8],
      [[cx + sw / 2, shoulderY + lr], [cx + sw / 2 + lr * 0.6, hipY + (chibi ? 0 : u * 0.35)], lr * 0.8],
    ],
  };
}
/** Edge shading for a flat-coloured shape: lit where the pixel above-left is empty, shaded where below-right is. */
function edgeShade(art: Art, ramp: (base: RGB) => [RGB, RGB, RGB]) {
  return art.recolor((c, x, y) => {
    const [lit, base, shade] = ramp(c);
    const same = (i: number, j: number) => art.get(i, j) === c;
    if (!same(x + 1, y) || !same(x, y + 1)) return shade;
    if (!same(x - 1, y) || !same(x, y - 1)) return lit;
    return base;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Figures, by module.

function beobachten() {
  const k = C.ink, o = C.accent;
  const chair = `
    .k..........
    .k..........
    .k..........
    .k..........
    .k..........
    .k..........
    .kkkkkkkkkk.
    .k........k.
    .k........k.
    .k........k.
    .kkkkkkkkkk.
    .k........k.
    .k........k.
    .k........k.`;
  const gaps = chair.replace(/(?<=k)\.+(?=k)/g, (m) => 'o'.repeat(m.length));
  const onlyGaps = gaps.replace(/k/g, '.');
  render('beobachten/negativraum', { scale: 6, rows: [labelled([Art.map(chair, { k }), Art.map(gaps, { k, o }), Art.map(onlyGaps, { o })])] });
}

function grundkoerperRaum() {
  // 14 pixels tall including a one-pixel outline: `top` rows of top face and `front` rows of front face inside.
  const box = (top: number, front: number) => {
    const art = new Art(16, 16).rect(1, 1, 14, top + front + 2, C.mid);
    art.rect(1, 1, 14, front ? top + 1 : top + 2, C.light);
    return art.outline(C.ink);
  };
  render('grundkoerper-raum/draufsicht-projektionen', { scale: 6, rows: [labelled([box(12, 0), box(7, 5), box(0, 12)])] });

  const onShadow = (object: Art, cx: number, cy: number, rx: number) => new Art(20, 22).ellipse(cx, cy, rx, rx * 0.35, C.ground).draw(object.outline(C.ink));
  const cube = onShadow(new Art(20, 22).rect(3, 3, 14, 6, C.light).rect(3, 9, 14, 9, C.mid), 11, 18.5, 9);
  const body = (_x: number, _y: number, nx: number) => band(lambert(nx, 0), [0.75, 0.3], [C.light, C.mid, C.dark]);
  const cylinder = onShadow(new Art(20, 22).ellipse(10, 17, 7, 3, body).rect(3, 5, 14, 12, body).ellipse(10, 5, 7, 3, C.white), 11, 18.5, 9);
  const sphere = onShadow(new Art(20, 22).ellipse(10, 11, 7.5, 7.5, (_x, _y, nx, ny) => band(lambert(nx, ny), [0.93, 0.6, 0.25], [C.white, C.light, C.mid, C.dark])), 11, 18.5, 8);
  render('grundkoerper-raum/grundkoerper', { scale: 5, rows: [labelled([cube, cylinder, sphere])] });
}

function figurProportion() {
  // All three stand on the same base line; guides mark every head height from the crown down to the feet.
  const fig = (height: number, heads: number) => {
    const out = new Art(26, 61), top = 61 - height, unit = height / heads;
    for (let y = top; y < 61; y += unit) out.line([0, Math.round(y)], [25, Math.round(y)], C.ground);
    out.line([0, 60], [25, 60], C.ground);
    return out.draw(doll(26, height, standing(13, height, heads), { all: C.mid }).outline(C.ink), 0, top);
  };
  render('figur-proportion/kopfeinheiten', { scale: 2, gap: 10, rows: [labelled([fig(60, 7.5), fig(48, 4), fig(30, 2.5)])] });

  const stiff: Doll = {
    head: [15, 5, 3.5, 4.5], torso: [[10, 10], [20, 10], [18.5, 24], [11.5, 24]],
    limbs: [[[13, 24], [13, 42], 1.6], [[17, 24], [17, 42], 1.6], [[10, 11], [9, 27], 1.2], [[20, 11], [21, 27], 1.2]],
  };
  const lean: Doll = {
    head: [22, 6, 3.5, 4.5], torso: [[17, 11], [25.5, 13], [19, 25], [12.5, 24]],
    limbs: [[[15, 25], [14.5, 32], 1.6], [[14.5, 32], [7, 42.5], 1.6], [[18, 25], [23, 33], 1.6], [[23, 33], [22, 42.5], 1.6], [[25, 14], [29, 22], 1.2], [[17.5, 12], [21, 21], 1.2]],
  };
  const a = doll(30, 44, stiff, { all: C.light }).outline(C.mid).line([15, 1], [15, 43], C.accent);
  const b = doll(30, 44, lean, { all: C.light }).outline(C.mid);
  let prev: Pt = [23, 2];
  for (let i = 1; i <= 24; i++) { // quadratic Bézier: (23,2) → (22,25) → (7,43), a C bowing towards the push
    const t = i / 24, p: Pt = [(1 - t) ** 2 * 23 + 2 * (1 - t) * t * 22 + t * t * 7, (1 - t) ** 2 * 2 + 2 * (1 - t) * t * 25 + t * t * 43];
    b.line(prev, p, C.accent); prev = p;
  }
  render('figur-proportion/handlungslinie', { scale: 4, rows: [labelled([a, b])] });
}

function lichtWerte() {
  const sphere = (two: boolean) => {
    const art = new Art(38, 34).ellipse(24.5, 28.5, 12.5, 4, C.dark).ellipse(19, 27.3, 5, 1.5, C.ink);
    return art.ellipse(17, 15, 12, 12, (_x, _y, nx, ny) => {
      const d = lambert(nx, ny);
      if (two) return d > 0.12 ? C.light : rgb('#5A5562');
      return band(d, [0.93, 0.55, 0.12, -0.25], [C.white, C.light, C.mid, rgb('#3E3A45'), rgb('#6E6976')]);
    });
  };
  render('licht-werte/licht-auf-kugel', { scale: 4, rows: [labelled([sphere(false), sphere(true)])] });

  const scale = [C.white, mix(C.white, C.light, 0.5), C.light, mix(C.light, C.mid, 0.5), C.mid, mix(C.mid, C.dark, 0.5), C.dark, mix(C.dark, C.ink, 0.5), C.ink];
  render('licht-werte/werteskala', { scale: 4, gap: 0, rows: [scale.map((c, i) => ({ art: new Art(8, 8).rect(0, 0, 8, 8, c), label: String(i + 1) }))] });

  // Scene as tone indices 0 (dark) … 4 (light): a ball on a box in front of a wall, light from the top left.
  // B keeps three groups: lit planes light, planes turned away mid, shadows dark. A scatters the same scene.
  const tones = (rnd: (() => number) | null) => {
    const t: number[][] = Array.from({ length: 26 }, (_, y) => Array.from({ length: 36 }, () => (y < 18 ? 2 : 4)));
    const put = (x: number, y: number, v: number) => { if (t[y]?.[x] !== undefined) t[y][x] = v; };
    for (let y = 15; y < 25; y++) for (let x = 6; x < 20; x++) put(x, y, y < 19 ? 4 : 2);
    for (let y = 19; y < 25; y++) for (let x = 20; x < 27; x++) if (x - 20 <= (y - 19) + 1) put(x, y, 0);
    for (let y = 0; y < 26; y++) for (let x = 0; x < 36; x++) {
      if (((x + 0.5 - 16.5) / 3.5) ** 2 + ((y + 0.5 - 16.2) / 1.1) ** 2 <= 1) put(x, y, 0);
      const nx = (x + 0.5 - 12) / 5.5, ny = (y + 0.5 - 9.6) / 5.5;
      if (nx * nx + ny * ny <= 1) put(x, y, lambert(nx, ny) > 0.2 ? 4 : 0);
    }
    if (rnd) for (const row of t) row.forEach((v, x) => { if (rnd() < 0.55) row[x] = Math.max(0, Math.min(4, v + (rnd() < 0.5 ? -1 : 1))); });
    const art = new Art(36, 26);
    t.forEach((row, y) => row.forEach((v, x) => art.set(x, y, GREYS[v])));
    return art;
  };
  render('licht-werte/wertegruppen', { scale: 4, rows: [labelled([tones(random(7)), tones(null)])] });
}

function editorEinrichten() {
  // Test pattern instead of a figure: checkerboard, a 2:1 line, a filled circle and a framed square.
  const pattern = new Art(16, 16).rect(0, 0, 16, 16, C.light);
  for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) pattern.set(x, y, (x + y) % 2 ? C.ink : C.white);
  for (let i = 0; i < 8; i++) pattern.set(6 + i, 5 - Math.floor(i / 2), C.blue);
  pattern.ellipse(11, 11, 3.6, 3.6, C.accent).rect(1, 9, 5, 6, C.white).rect(1, 9, 5, 6, (x, y) => (x === 1 || y === 9 || x === 5 || y === 14 ? C.ink : null));
  pattern.rect(0, 0, 16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? C.ink : null));
  const k8 = 12; // file pixels per art pixel: 6 CSS pixels
  const nearest = pattern.scale(k8);
  const smooth = new Art(nearest.w, nearest.h);
  for (let y = 0; y < smooth.h; y++) for (let x = 0; x < smooth.w; x++) { // bilinear, as an image viewer would scale
    const sx = Math.min(pattern.w - 1, Math.max(0, (x + 0.5) / k8 - 0.5)), sy = Math.min(pattern.h - 1, Math.max(0, (y + 0.5) / k8 - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(pattern.w - 1, x0 + 1), y1 = Math.min(pattern.h - 1, y0 + 1), fx = sx - x0, fy = sy - y0;
    const top = mix(pattern.get(x0, y0)!, pattern.get(x1, y0)!, fx), bottom = mix(pattern.get(x0, y1)!, pattern.get(x1, y1)!, fx);
    smooth.set(x, y, mix(top, bottom, fy));
  }
  render('editor-einrichten/skalieren', { scale: 6, rows: [[{ art: nearest, label: 'A', filePx: 1 }, { art: smooth, label: 'B', filePx: 1 }]] });
}

function linienCluster() {
  const k = C.ink, o = C.accent;
  const runsLine = (runs: number[], w: number, h: number, vertical = false) => {
    const art = new Art(w, h);
    let x = 0, y = h - 1;
    for (const r of runs) {
      for (let i = 0; i < r; i++) { art.set(x, y, k); if (vertical) y--; else x++; }
      if (vertical) x++; else y--;
    }
    return art;
  };
  render('linien-cluster/steigungen', { scale: 6, grid: true, rows: [labelled([
    runsLine(Array(12).fill(1), 12, 12), runsLine(Array(6).fill(2), 12, 12), runsLine(Array(4).fill(3), 12, 12), runsLine([3, 1, 2, 1, 3, 2], 12, 12),
  ])] });

  const arc = `
    kkkk........
    ....kk......
    ......k.....
    .......k....
    ........k...
    .........k..
    ..........k.
    ..........k.
    ...........k
    ...........k
    ...........k
    ...........k`;
  const doubles = `
    kkkk........
    ...okk......
    .....ok.....
    .......k....
    ........k...
    ........ok..
    .........ok.
    ..........k.
    ..........ok
    ...........k
    ...........k
    ...........k`;
  render('linien-cluster/doppelte-pixel', { scale: 6, grid: true, rows: [labelled([Art.map(doubles, { k, o }), Art.map(arc, { k })])] });

  render('linien-cluster/kurven-laufstrecken', { scale: 6, grid: true, rows: [labelled([runsLine([1, 1, 1, 2, 3, 4], 12, 7), runsLine([1, 2, 1, 3, 1, 4], 12, 7)])] });

  const ball = (noise: boolean) => {
    const rnd = random(3), tones = [C.white, C.light, C.mid, C.dark];
    const art = new Art(18, 18).ellipse(9, 9, 8, 8, (_x, _y, nx, ny) => {
      const c = band(lambert(nx, ny), [0.9, 0.55, 0.15], tones);
      if (!noise || rnd() > 0.22) return c;
      return tones[Math.min(3, Math.max(0, tones.indexOf(c) + (rnd() < 0.5 ? -1 : 1)))];
    });
    return art.outline(C.ink);
  };
  render('linien-cluster/cluster', { scale: 6, grid: true, rows: [labelled([ball(true), ball(false)])] });

  const m = C.mid, l = C.light;
  const banding = Art.map(`
    kk..........
    mmkk........
    llmmkk......
    llllmmkk....
    llllllmmkk..
    llllllllmmkk
    llllllllllmm`, { k, m, l });
  const fixed = Art.map(`
    kk..........
    llkk........
    llllkk......
    mlllllkk....
    mmllllllkk..
    mmmlllllllkk
    mmmmllllllll`, { k, m, l });
  render('linien-cluster/banding', { scale: 6, grid: true, rows: [labelled([banding, fixed])] });

  const hill = `
    ............
    ........kkkk
    .....kkkkkkk
    ...kkkkkkkkk
    ..kkkkkkkkkk
    .kkkkkkkkkkk
    kkkkkkkkkkkk
    kkkkkkkkkkkk`;
  // Same shape as the hill; only the long runs (3 and 2 pixels) get in-between tones above their ends.
  const aa = `
    ............
    ......lmkkkk
    ....mkkkkkkk
    ...kkkkkkkkk
    ..kkkkkkkkkk
    .kkkkkkkkkkk
    kkkkkkkkkkkk
    kkkkkkkkkkkk`;
  render('linien-cluster/kantenglaettung', { scale: 6, grid: true, rows: [labelled([Art.map(hill, { k }), Art.map(aa, { k, m, l })])] });
}

function farbePaletten() {
  const flat = ['#1F3A2E', '#2E5A44', '#3F7C5C', '#569E76', '#7DBE95', '#B3DDBF'].map(rgb);
  // Hue steps of about 18° from blue-green to yellow-green, saturation highest in the dark tones (Slynyrd, Pixelblog 1).
  const shifted = ['#1D494C', '#2C6356', '#3F7C5C', '#549E60', '#7BC76F', '#BDEB9B'].map(rgb);
  const panel = (ramp: RGB[]) => {
    const art = new Art(36, 28);
    ramp.forEach((c, i) => art.rect(i * 6, 0, 6, 6, c));
    art.ellipse(18, 18.5, 9, 9, (_x, _y, nx, ny) => band(lambert(nx, ny), [0.93, 0.7, 0.4, 0.1], [ramp[5], ramp[4], ramp[3], ramp[2], ramp[1]]));
    for (const i of new Art(36, 28).ellipse(18, 18.5, 9, 9, C.ink).edge()) art.px[i] = ramp[0];
    return art;
  };
  render('farbe-paletten/rampen', { scale: 4, rows: [labelled([panel(flat), panel(shifted)])] });

  const palette = ['#2B2445', '#C8463C', '#3E8C45', '#3B6FD8', '#E8B04A', '#7FC4D8', '#8A5A3C', '#F2EFA8'].map(rgb);
  render('farbe-paletten/graustufen', { scale: 4, gap: 2, rows: [palette.map((c, i) => ({ art: new Art(8, 18).rect(0, 0, 8, 8, c).rect(0, 10, 8, 8, grey(c)), label: String(i + 1) }))] });
  return palette;
}

function schattierenTextur() {
  const blob = (pillow: boolean) => new Art(22, 18).ellipse(11, 9, 10, 8, (_x, _y, nx, ny) => {
    if (pillow) return band(1 - Math.hypot(nx, ny), [0.62, 0.35, 0.12], [C.white, C.light, C.mid, C.dark]);
    return band(lambert(nx, ny), [0.9, 0.55, 0.15], [C.white, C.light, C.mid, C.dark]);
  }).outline(C.ink);
  render('schattieren-textur/kissen-und-form', { scale: 6, rows: [labelled([blob(true), blob(false)])] });

  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const strip = (kind: 'stufe' | 'raster' | 'rauschen') => {
    const rnd = random(11), art = new Art(48, 8);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 48; x++) {
      const t = x / 47; // 0 dark … 1 light
      const v = kind === 'stufe' ? (t < 0.5 ? 0 : 1) : kind === 'raster' ? (t * 16 > BAYER[y % 4][x % 4] + 0.5 ? 1 : 0) : (rnd() < t ? 1 : 0);
      art.set(x, y, v ? C.light : C.dark);
    }
    return art;
  };
  render('schattieren-textur/dithering', { scale: 6, gap: 6, rows: [[{ art: strip('stufe'), label: 'A' }], [{ art: strip('raster'), label: 'B' }], [{ art: strip('rauschen'), label: 'C' }]] });

  const stones = voronoiTile(16, 7, 5, true);
  const noise = (() => { const rnd = random(5), art = new Art(16, 16); for (let i = 0; i < 256; i++) art.px[i] = GREYS[1 + Math.floor(rnd() * 4)]; return art; })();
  render('schattieren-textur/detailgrad', { scale: 3, rows: [labelled([noise.tile(2, 2), stones.tile(2, 2), new Art(32, 32).rect(0, 0, 32, 32, C.mid)])] });

  const ramp = ['#3A2A3E', '#7A4A4E', '#B8735A', '#E3A878', '#F6D9A8'].map(rgb);
  const pot = (style: 'schwarz' | 'farbig' | 'selektiv') => {
    const art = new Art(20, 20).rect(0, 0, 20, 20, rgb('#7E8E72'));
    const shape = new Art(20, 20).ellipse(10, 11.5, 7.5, 7, (_x, _y, nx, ny) => band(lambert(nx, ny), [0.85, 0.5, 0.1], [ramp[4], ramp[3], ramp[2], ramp[1]])).rect(6, 2, 8, 4, (_x, _y, nx) => band(lambert(nx, -0.4), [0.6, 0.2], [ramp[3], ramp[2], ramp[1]]));
    shape.outline((x, y) => style === 'schwarz' ? C.ink : style === 'farbig' ? ramp[0] : (x + y < 20 ? ramp[2] : ramp[0]));
    return art.draw(shape);
  };
  render('schattieren-textur/umrisse', { scale: 5, rows: [labelled([pot('schwarz'), pot('farbig'), pot('selektiv')])] });
}

/** Stone tile from Voronoi cells. `wrap` measures distances across the tile edges, so the tile repeats without seams. */
function voronoiTile(size: number, cells: number, seed: number, wrap: boolean, tones = GREYS) {
  const rnd = random(seed), pts = Array.from({ length: cells }, () => [rnd() * size, rnd() * size] as const);
  const nearest = (x: number, y: number) => {
    const d = pts.map(([px, py]) => {
      let dx = Math.abs(x - px), dy = Math.abs(y - py);
      if (wrap) { dx = Math.min(dx, size - dx); dy = Math.min(dy, size - dy); }
      return Math.hypot(dx, dy);
    });
    return d.indexOf(Math.min(...d));
  };
  const id = (x: number, y: number) => wrap ? nearest((x + size) % size + 0.5, (y + size) % size + 0.5) : (x < 0 || y < 0 || x >= size || y >= size ? -1 : nearest(x + 0.5, y + 0.5));
  const art = new Art(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = id(x, y);
    if (id(x + 1, y) !== c || id(x, y + 1) !== c) art.set(x, y, tones[1]);
    else if (id(x - 1, y) !== c || id(x, y - 1) !== c) art.set(x, y, tones[4]);
    else art.set(x, y, tones[3]);
  }
  return art;
}

function silhouetteFormsprache() {
  const k = C.ink;
  const round = new Art(26, 26).ellipse(13, 15.5, 10, 9.5, k).ellipse(13, 5.5, 4.5, 4.5, k).ellipse(8, 24.5, 3, 1.5, k).ellipse(18, 24.5, 3, 1.5, k);
  const square = new Art(26, 26).rect(5, 8, 16, 13, k).rect(9, 2, 8, 6, k).rect(6, 21, 5, 5, k).rect(15, 21, 5, 5, k);
  const spiky = new Art(26, 26).polygon([[2, 6], [24, 6], [13, 20]], k).polygon([[10, 6], [13, 0], [16, 6]], k).polygon([[3, 6], [1, 1], [7, 6]], k).polygon([[19, 6], [25, 1], [23, 6]], k)
    .stroke([11, 19], [9, 25.4], 1.2, k).stroke([15, 19], [17, 25.4], 1.2, k);
  render('silhouette-formsprache/grundformen', { scale: 4, gap: 3, rows: [labelled([round, square, spiky])] });

  const base = standing(16, 44, 4);
  const neck: [Pt, Pt, number] = [[16, 10], [16, 13.5], 1.3];
  const closed: Doll = { ...base, limbs: [neck, base.limbs[0], base.limbs[1], [[11, 13], [13, 27], 1.4], [[21, 13], [19, 27], 1.4]] };
  const open: Doll = { ...base, limbs: [neck, [[13, 22], [8, 43], 1.9], [[19, 22], [24, 43], 1.9], [[10.5, 12.5], [3, 22], 1.4], [[21.5, 12.5], [29, 4], 1.4]] };
  render('silhouette-formsprache/negativraum-silhouette', { scale: 3, rows: [labelled([doll(32, 45, closed, { all: k }), doll(32, 45, open, { all: k })])] });
}

function poseAusdruck() {
  const skin = rgb('#E9C9A8'), lip = rgb('#B98A68');
  const face = (marks: [number, number, RGB][]) => {
    const art = new Art(10, 10).ellipse(5, 5, 5, 5, skin).outline(C.ink);
    for (const [x, y, c] of marks) art.set(x, y, c);
    return art;
  };
  const k = C.ink;
  const faces = [
    face([[3, 5, k], [6, 5, k]]),
    face([[3, 5, k], [6, 5, k], [2, 3, k], [3, 4, k], [7, 3, k], [6, 4, k], [4, 7, lip], [5, 7, lip]]),
    face([[3, 4, k], [3, 5, k], [6, 4, k], [6, 5, k], [4, 7, lip], [5, 7, lip], [4, 8, lip], [5, 8, lip]]),
    face([[2, 5, k], [3, 5, k], [6, 5, k], [7, 5, k], [4, 7, lip], [5, 7, lip]]),
  ];
  render('pose-ausdruck/gesichter', { scale: 6, rows: [labelled(faces)] });

  const proud: Doll = { head: [16, 5, 4, 5], torso: [[10, 11], [22, 11], [20, 26], [12, 26]], limbs: [[[13, 26], [9, 45], 1.9], [[19, 26], [23, 45], 1.9], [[10, 12], [7, 20], 1.4], [[7, 20], [12, 25], 1.3], [[22, 12], [25, 20], 1.4], [[25, 20], [20, 25], 1.3]] };
  const shy: Doll = { head: [19, 13, 4, 5], torso: [[10, 15], [20, 18], [18, 31], [11, 30]], limbs: [[[13, 30], [16, 38], 1.7], [[16, 38], [12, 45], 1.6], [[17, 30], [16, 38], 1.7], [[16, 38], [20, 45], 1.6], [[11, 17], [16, 25], 1.3], [[19, 19], [14, 24], 1.3]] };
  const ready: Doll = { head: [19, 9, 4, 5], torso: [[13, 14], [24, 15], [19, 29], [11, 28]], limbs: [[[13, 28], [6, 37], 1.9], [[6, 37], [5, 45], 1.8], [[18, 29], [23, 37], 1.9], [[23, 37], [26, 45], 1.8], [[24, 15], [28, 22], 1.4], [[28, 22], [27, 14], 1.3], [[13, 15], [10, 23], 1.4], [[10, 23], [15, 20], 1.3]] };
  render('pose-ausdruck/haltung', { scale: 3, rows: [labelled([proud, shy, ready].map((p) => doll(32, 46, p, { all: C.ink })))] });
}

/** Coloured doll used in the sprite and view figures: skin, hair, shirt, trousers, each with a four-tone ramp. */
const PARTS = { head: rgb('#E3B58C'), torso: rgb('#4F7FBF'), limbs: rgb('#7A5B48'), hair: rgb('#3C2F2A') };
const RAMPS = new Map<string, [RGB, RGB, RGB, RGB]>([
  [PARTS.head.join(), [rgb('#F6D9B8'), rgb('#E3B58C'), rgb('#B9845F'), rgb('#6B4434')]],
  [PARTS.torso.join(), [rgb('#8DB5E8'), rgb('#4F7FBF'), rgb('#33558F'), rgb('#1F2E52')]],
  [PARTS.limbs.join(), [rgb('#A88468'), rgb('#7A5B48'), rgb('#55402F'), rgb('#2E221A')]],
  [PARTS.hair.join(), [rgb('#5E4A40'), rgb('#3C2F2A'), rgb('#2A201C'), rgb('#161012')]],
]);
const VALUE = new Map<string, RGB>([[PARTS.head.join(), GREYS[3]], [PARTS.torso.join(), GREYS[2]], [PARTS.limbs.join(), GREYS[1]], [PARTS.hair.join(), GREYS[0]]]);
const valueOf = (c: RGB) => VALUE.get(c.join()) ?? c;

function spriteDoll(view: 'front' | 'back' | 'side', height = 24) {
  const cx = 8, d = standing(cx, height, 3.2, view === 'side' ? 0.62 : 1);
  if (view === 'side') {
    const hipY = d.torso[2][1], shoulderY = d.torso[0][1], r = d.limbs[0][2];
    d.limbs = [[[cx, hipY], [cx - 1, height - 0.6 - r * 0.6], r], [[cx, hipY], [cx + 1, height - 0.6 - r * 0.6], r], [[cx + 0.5, shoulderY + r], [cx + 1, hipY + 1], r * 0.8]];
  }
  const hipY = d.torso[2][1];
  const art = doll(16, height, d, { ...PARTS, limbs: (_x, y) => (y < hipY - 0.5 ? PARTS.head : PARTS.limbs) });
  const [hx, hy] = d.head;
  for (let y = 0; y < height; y++) for (let x = 0; x < 16; x++) {
    if (art.get(x, y) !== PARTS.head) continue;
    const hair = view === 'back' ? y < hy + 2 : view === 'side' ? y < hy - 1 || (x < hx - 0.5 && y < hy + 2) : y < hy - 1;
    if (hair) art.set(x, y, PARTS.hair);
  }
  if (view === 'front') { art.set(Math.round(hx) - 2, Math.round(hy), C.ink); art.set(Math.round(hx) + 1, Math.round(hy), C.ink); }
  if (view === 'side') art.set(Math.round(hx) + 1, Math.round(hy), C.ink);
  return art;
}
function finish(art: Art) {
  const shaded = edgeShade(art, (c) => { const r = RAMPS.get(c.join()); return r ? [r[0], r[1], r[2]] : [c, c, c]; });
  return shaded.outline((x, y) => { const under = art.get(x, y)!; return RAMPS.get(under.join())?.[3] ?? C.ink; });
}

function spriteEntwerfen() {
  const base = spriteDoll('front');
  const silhouette = base.recolor(() => C.ink);
  const values = edgeShade(base.recolor(valueOf), (c) => { const i = GREYS.indexOf(c); return i < 0 ? [c, c, c] : [GREYS[Math.min(4, i + 1)], c, GREYS[Math.max(0, i - 1)]]; });
  const colour = edgeShade(base, (c) => { const r = RAMPS.get(c.join()); return r ? [r[0], r[1], r[2]] : [c, c, c]; });
  render('sprite-entwerfen/arbeitsschritte', { scale: 4, rows: [labelled([silhouette, values, colour, finish(base)])] });

  const sized = (h: number) => {
    const d = standing(h / 3, h, 3.2);
    return finish(doll(Math.round(h / 1.5), h, d, PARTS));
  };
  render('sprite-entwerfen/groessen', { scale: 3, rows: [labelled([sized(16), sized(24), sized(32)])] });
}

function ansichtenMassstab() {
  render('ansichten-massstab/vier-richtungen', { scale: 4, rows: [labelled([finish(spriteDoll('front')), finish(spriteDoll('side')), finish(spriteDoll('back')), finish(spriteDoll('side')).flipX()])] });

  // Large creature from ellipses and triangles: body, head, legs, horn. Shaded like the doll, no species implied.
  const creature = (w: number, h: number) => {
    const s = w / 64, art = new Art(w, h);
    const ramp = ['#2A2433', '#4D4160', '#73648A', '#A595B8'].map(rgb);
    const shade = (_x: number, _y: number, nx: number, ny: number) => band(lambert(nx, ny), [0.75, 0.35, 0], [ramp[3], ramp[2], ramp[1], ramp[0]]);
    for (const lx of [14, 24, 40, 50]) art.rect(Math.round(lx * s), Math.round(34 * s), Math.max(2, Math.round(6 * s)), h - Math.round(34 * s), shade);
    art.ellipse(32 * s, 28 * s, 26 * s, 15 * s, shade).ellipse(52 * s, 16 * s, 10 * s, 9 * s, shade).polygon([[48 * s, 9 * s], [54 * s, 0], [56 * s, 10 * s]], (_x, _y) => ramp[3]);
    art.set(Math.round(56 * s), Math.round(15 * s), C.accent);
    return art.outline(ramp[0]);
  };
  const scene = (lowRes: boolean) => {
    const art = new Art(106, 56);
    for (let x = 0; x < 106; x += 16) art.line([x, 0], [x, 55], C.ground);
    for (let y = 55; y >= 0; y -= 16) art.line([0, y], [105, y], C.ground);
    art.draw(finish(spriteDoll('side')), 2, 32);
    art.rect(22, 40, 16, 16, rgb('#A0785A')).rect(22, 40, 16, 16, (x, y) => (x === 22 || y === 40 || x === 37 || y === 55 ? rgb('#5A3E2C') : null));
    art.draw(lowRes ? creature(32, 28).scale(2) : creature(64, 56), 41, 0);
    return art;
  };
  render('ansichten-massstab/pixeldichte', { scale: 3, rows: [[{ art: scene(true), label: 'A' }], [{ art: scene(false), label: 'B' }]] });
}

function umgebungTiles() {
  const warm = [rgb('#3B3530'), rgb('#6B5F55'), rgb('#8F8275'), rgb('#B3A595'), rgb('#D8CCBC')];
  render('umgebung-tiles/kachelnaht', { scale: 2, rows: [labelled([voronoiTile(16, 6, 9, false, warm).tile(3, 3), voronoiTile(16, 6, 9, true, warm).tile(3, 3)])] });

  const greens = ['#355E3B', '#4B7A45', '#6A9A52', '#E9D96A'].map(rgb);
  const grass = (seed: number, flower: Pt | null) => {
    const rnd = random(seed), art = new Art(16, 16).rect(0, 0, 16, 16, greens[1]);
    for (let i = 0; i < 9; i++) { const x = Math.floor(rnd() * 16), y = Math.floor(rnd() * 16); art.set(x, y, greens[2]); art.set((x + 1) % 16, y, greens[2]); art.set(x, (y + 1) % 16, greens[0]); }
    if (flower) { const [fx, fy] = flower; art.set(fx, fy - 1, greens[3]); art.set(fx - 1, fy, greens[3]); art.set(fx + 1, fy, greens[3]); art.set(fx, fy + 1, greens[3]); art.set(fx, fy, rgb('#C8463C')); }
    return art;
  };
  const same = grass(1, [10, 5]).tile(4, 3);
  const variants = [grass(1, [10, 5]), grass(2, null), grass(3, null), grass(4, [4, 11])];
  const mixed = new Art(64, 48);
  const order = [0, 1, 2, 1, 3, 2, 1, 0, 1, 2, 0, 3];
  order.forEach((v, i) => mixed.draw(variants[v], (i % 4) * 16, Math.floor(i / 4) * 16));
  render('umgebung-tiles/wiederholung', { scale: 2, rows: [labelled([same, mixed])] });

  render('umgebung-tiles/kontrast-ebenen', { scale: 3, rows: [[{ art: contrastScene(false), label: 'A' }], [{ art: contrastScene(true), label: 'B' }]] });
}

/** Small top-down scene: ground, a few stones, the doll in the middle. `calm` keeps the ground in a narrow value range. */
function contrastScene(calm: boolean) {
  const busy = [rgb('#2E3A2A'), rgb('#5E7A44'), rgb('#9DBE6A'), rgb('#E1EDB0')];
  const quiet = [rgb('#7D8F6A'), rgb('#8A9C75'), rgb('#98A982'), rgb('#A5B68E')];
  const g = calm ? quiet : busy, rnd = random(21), art = new Art(64, 44);
  for (let y = 0; y < 44; y++) for (let x = 0; x < 64; x++) art.set(x, y, g[rnd() < 0.5 ? 1 : rnd() < 0.5 ? 2 : rnd() < 0.5 ? 0 : 3]);
  for (const [x, y] of [[9, 8], [50, 12], [14, 33], [44, 34]] as const) {
    const stone = new Art(10, 8).ellipse(5, 4, 4.5, 3.5, (_x, _y, nx, ny) => band(lambert(nx, ny), [0.6, 0.1], calm ? [rgb('#B9B0A3'), rgb('#9A9184'), rgb('#7C7468')] : [rgb('#F2EEE6'), rgb('#8E8678'), rgb('#2B2723')]));
    art.draw(stone.outline(calm ? rgb('#5D574F') : rgb('#1A1714')), x, y);
  }
  art.ellipse(32, 33.5, 5, 1.6, calm ? rgb('#5F6E50') : g[0]);
  const figure = finish(spriteDoll('front'));
  art.draw(calm ? figure : figure.recolor((c) => mix(c, g[2], 0.35)), 24, 10);
  return art;
}

function lesbarkeitPruefen() {
  const scene = contrastScene(true);
  const silhouettes = scene.recolor((c, x, y) => {
    const ground = new Set(['#7D8F6A', '#8A9C75', '#98A982', '#A5B68E', '#5F6E50'].map((h) => rgb(h).join()));
    return ground.has(c.join()) ? C.white : (x >= 24 && x < 40 && y >= 10 && y < 34 ? C.ink : C.mid);
  });
  render('lesbarkeit-pruefen/drei-proben', { scale: 2, rows: [[{ art: scene, label: 'A', filePx: 2 }], [{ art: scene.recolor(grey), label: 'B' }, { art: silhouettes, label: 'C' }]] });
}

beobachten();
grundkoerperRaum();
figurProportion();
lichtWerte();
editorEinrichten();
linienCluster();
const palette = farbePaletten();
schattierenTextur();
silhouetteFormsprache();
poseAusdruck();
spriteEntwerfen();
ansichtenMassstab();
umgebungTiles();
lesbarkeitPruefen();
console.log(written.join('\n'));
console.log('Leuchtdichte der Palette in farbe-paletten/graustufen:', palette.map((c, i) => `${i + 1}: ${luminance(c).toFixed(3)}`).join(', '));
