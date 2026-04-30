// ─── gif-encoder.mjs — Node-friendly port of gif.js's worker encoder ───
//
// The gif.js npm package (https://github.com/jnordberg/gif.js, MIT) ships
// its core encoder logic inside `gif.worker.js`, which the main-thread
// `dist/gif.js` instantiates via `new Worker(...)`. That entry point is
// browser-only — it relies on `self`, `postMessage`, and a Worker
// runtime that doesn't exist under plain Node. All three of the GIF89a
// encoding pieces (`NeuQuant` color quantizer, `LZWEncoder`, top-level
// `GIFEncoder`) are themselves pure-data classes and run identically in
// Node.
//
// This file is a one-time port of those three classes from
// `node_modules/gif.js/dist/gif.worker.js` into ESM. The original worker
// orchestrates a single-frame encode + worker-message reply; our
// `GIFEncoder` here is a friendlier multi-frame wrapper that bundles
// the LSD / Netscape / per-frame headers + LZW-encoded pixel data into
// a single in-memory byte stream. Output is GIF89a, byte-identical to
// what gif.js produces in the browser.
//
// License chain:
//   gif.js (Johan Nordberg, MIT) → this file (KyberStation, MIT, kept
//   under the same upstream MIT terms). Original copyright notices
//   and the GIF89a spec hold for the encoder mechanics.
//
// Why we don't `require('gif.js')` directly:
//   The npm pkg's `dist/gif.js` does `new Worker(this.options.workerScript)`
//   unconditionally. Patching that out at runtime is ugly; vendoring the
//   pure-data classes is cleaner + smaller.

// ─── ByteArray — paged byte writer (gif.js worker's data structure) ───

class ByteArray {
  constructor() {
    this.page = -1;
    this.pages = [];
    this.cursor = 0;
    this.newPage();
  }
  static get pageSize() { return 4096; }
  newPage() {
    this.pages[++this.page] = new Uint8Array(ByteArray.pageSize);
    this.cursor = 0;
  }
  writeByte(val) {
    if (this.cursor >= ByteArray.pageSize) this.newPage();
    this.pages[this.page][this.cursor++] = val;
  }
  writeUTFBytes(s) {
    for (let i = 0; i < s.length; i++) this.writeByte(s.charCodeAt(i));
  }
  writeBytes(arr, offset, length) {
    const end = length ?? arr.length;
    const start = offset ?? 0;
    for (let i = start; i < end; i++) this.writeByte(arr[i]);
  }
  /** Concatenate all paged data into a single Uint8Array. */
  toUint8Array() {
    let total = 0;
    for (let p = 0; p < this.pages.length; p++) {
      total += p === this.page ? this.cursor : ByteArray.pageSize;
    }
    const out = new Uint8Array(total);
    let off = 0;
    for (let p = 0; p < this.pages.length; p++) {
      const fill = p === this.page ? this.cursor : ByteArray.pageSize;
      out.set(this.pages[p].subarray(0, fill), off);
      off += fill;
    }
    return out;
  }
}

// ─── NeuQuant — color quantizer ───────────────────────────────────────
//
// Anthony Dekker's neural-net quantizer (1994), as ported to JS by gif.js.
// 256-entry palette via competitive learning. `samplefac` ∈ [1..30]
// (1 = best quality / slowest, 30 = fastest / lower quality).

const ncycles = 100;
const netsize = 256;
const maxnetpos = netsize - 1;
const netbiasshift = 4;
const intbiasshift = 16;
const intbias = 1 << intbiasshift;
const gammashift = 10;
const betashift = 10;
const beta = intbias >> betashift;
const betagamma = intbias << (gammashift - betashift);
const initrad = netsize >> 3;
const radiusbiasshift = 6;
const radiusbias = 1 << radiusbiasshift;
const initradius = initrad * radiusbias;
const radiusdec = 30;
const alphabiasshift = 10;
const initalpha = 1 << alphabiasshift;
const radbiasshift = 8;
const radbias = 1 << radbiasshift;
const alpharadbshift = alphabiasshift + radbiasshift;
const alpharadbias = 1 << alpharadbshift;
const prime1 = 499;
const prime2 = 491;
const prime3 = 487;
const prime4 = 503;
const minpicturebytes = 3 * prime4;

class NeuQuant {
  constructor(pixels, samplefac) {
    this.pixels = pixels;
    this.samplefac = samplefac;
  }
  init() {
    this.network = [];
    this.netindex = new Int32Array(256);
    this.bias = new Int32Array(netsize);
    this.freq = new Int32Array(netsize);
    this.radpower = new Int32Array(netsize >> 3);
    for (let i = 0; i < netsize; i++) {
      const v = (i << (netbiasshift + 8)) / netsize;
      this.network[i] = new Float64Array([v, v, v, 0]);
      this.freq[i] = (intbias / netsize) | 0;
      this.bias[i] = 0;
    }
  }
  unbiasnet() {
    for (let i = 0; i < netsize; i++) {
      this.network[i][0] >>= netbiasshift;
      this.network[i][1] >>= netbiasshift;
      this.network[i][2] >>= netbiasshift;
      this.network[i][3] = i;
    }
  }
  altersingle(alpha, i, b, g, r) {
    this.network[i][0] -= (alpha * (this.network[i][0] - b)) / initalpha;
    this.network[i][1] -= (alpha * (this.network[i][1] - g)) / initalpha;
    this.network[i][2] -= (alpha * (this.network[i][2] - r)) / initalpha;
  }
  alterneigh(radius, i, b, g, r) {
    const lo = Math.abs(i - radius);
    const hi = Math.min(i + radius, netsize);
    let j = i + 1;
    let k = i - 1;
    let m = 1;
    while (j < hi || k > lo) {
      const a = this.radpower[m++];
      if (j < hi) {
        const p = this.network[j++];
        p[0] -= (a * (p[0] - b)) / alpharadbias;
        p[1] -= (a * (p[1] - g)) / alpharadbias;
        p[2] -= (a * (p[2] - r)) / alpharadbias;
      }
      if (k > lo) {
        const p = this.network[k--];
        p[0] -= (a * (p[0] - b)) / alpharadbias;
        p[1] -= (a * (p[1] - g)) / alpharadbias;
        p[2] -= (a * (p[2] - r)) / alpharadbias;
      }
    }
  }
  contest(b, g, r) {
    let bestd = ~(1 << 31);
    let bestbiasd = bestd;
    let bestpos = -1;
    let bestbiaspos = bestpos;
    for (let i = 0; i < netsize; i++) {
      const n = this.network[i];
      const dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
      if (dist < bestd) { bestd = dist; bestpos = i; }
      const biasdist = dist - (this.bias[i] >> (intbiasshift - netbiasshift));
      if (biasdist < bestbiasd) { bestbiasd = biasdist; bestbiaspos = i; }
      const betafreq = this.freq[i] >> betashift;
      this.freq[i] -= betafreq;
      this.bias[i] += betafreq << gammashift;
    }
    this.freq[bestpos] += beta;
    this.bias[bestpos] -= betagamma;
    return bestbiaspos;
  }
  inxbuild() {
    let previouscol = 0;
    let startpos = 0;
    for (let i = 0; i < netsize; i++) {
      const p = this.network[i];
      let smallpos = i;
      let smallval = p[1];
      for (let j = i + 1; j < netsize; j++) {
        const q = this.network[j];
        if (q[1] < smallval) { smallpos = j; smallval = q[1]; }
      }
      const q = this.network[smallpos];
      if (i !== smallpos) {
        let tmp = q[0]; q[0] = p[0]; p[0] = tmp;
        tmp = q[1]; q[1] = p[1]; p[1] = tmp;
        tmp = q[2]; q[2] = p[2]; p[2] = tmp;
        tmp = q[3]; q[3] = p[3]; p[3] = tmp;
      }
      if (smallval !== previouscol) {
        this.netindex[previouscol] = (startpos + i) >> 1;
        for (let j = previouscol + 1; j < smallval; j++) this.netindex[j] = i;
        previouscol = smallval;
        startpos = i;
      }
    }
    this.netindex[previouscol] = (startpos + maxnetpos) >> 1;
    for (let j = previouscol + 1; j < 256; j++) this.netindex[j] = maxnetpos;
  }
  inxsearch(b, g, r) {
    let bestd = 1000;
    let best = -1;
    let i = this.netindex[g];
    let j = i - 1;
    while (i < netsize || j >= 0) {
      if (i < netsize) {
        const p = this.network[i];
        let dist = p[1] - g;
        if (dist >= bestd) i = netsize;
        else {
          i++;
          if (dist < 0) dist = -dist;
          let a = p[0] - b; if (a < 0) a = -a; dist += a;
          if (dist < bestd) {
            a = p[2] - r; if (a < 0) a = -a; dist += a;
            if (dist < bestd) { bestd = dist; best = p[3]; }
          }
        }
      }
      if (j >= 0) {
        const p = this.network[j];
        let dist = g - p[1];
        if (dist >= bestd) j = -1;
        else {
          j--;
          if (dist < 0) dist = -dist;
          let a = p[0] - b; if (a < 0) a = -a; dist += a;
          if (dist < bestd) {
            a = p[2] - r; if (a < 0) a = -a; dist += a;
            if (dist < bestd) { bestd = dist; best = p[3]; }
          }
        }
      }
    }
    return best;
  }
  learn() {
    const lengthcount = this.pixels.length;
    let alphadec = 30 + (this.samplefac - 1) / 3;
    const samplepixels = lengthcount / (3 * this.samplefac);
    let delta = ~~(samplepixels / ncycles);
    let alpha = initalpha;
    let radius = initradius;
    let rad = radius >> radiusbiasshift;
    if (rad <= 1) rad = 0;
    for (let i = 0; i < rad; i++) this.radpower[i] = (alpha * ((rad * rad - i * i) * radbias / (rad * rad))) | 0;
    let step;
    if (lengthcount < minpicturebytes) {
      this.samplefac = 1;
      step = 3;
    } else if (lengthcount % prime1 !== 0) step = 3 * prime1;
    else if (lengthcount % prime2 !== 0) step = 3 * prime2;
    else if (lengthcount % prime3 !== 0) step = 3 * prime3;
    else step = 3 * prime4;
    let pix = 0;
    let i = 0;
    while (i < samplepixels) {
      const b = (this.pixels[pix] & 255) << netbiasshift;
      const g = (this.pixels[pix + 1] & 255) << netbiasshift;
      const r = (this.pixels[pix + 2] & 255) << netbiasshift;
      const j = this.contest(b, g, r);
      this.altersingle(alpha, j, b, g, r);
      if (rad !== 0) this.alterneigh(rad, j, b, g, r);
      pix += step;
      if (pix >= lengthcount) pix -= lengthcount;
      i++;
      if (delta === 0) delta = 1;
      if (i % delta === 0) {
        alpha -= alpha / alphadec;
        radius -= radius / radiusdec;
        rad = radius >> radiusbiasshift;
        if (rad <= 1) rad = 0;
        for (let j2 = 0; j2 < rad; j2++) this.radpower[j2] = (alpha * ((rad * rad - j2 * j2) * radbias / (rad * rad))) | 0;
      }
    }
  }
  buildColormap() {
    this.init();
    this.learn();
    this.unbiasnet();
    this.inxbuild();
  }
  getColormap() {
    const map = new Array(netsize * 3);
    const index = new Array(netsize);
    for (let i = 0; i < netsize; i++) index[this.network[i][3]] = i;
    let k = 0;
    for (let l = 0; l < netsize; l++) {
      const j = index[l];
      map[k++] = this.network[j][0];
      map[k++] = this.network[j][1];
      map[k++] = this.network[j][2];
    }
    return map;
  }
  lookupRGB(b, g, r) { return this.inxsearch(b, g, r); }
}

// ─── LZWEncoder — gif.js worker's LZW writer (port of Lempel-Ziv-Welch) ───

const EOF = -1;
const BITS = 12;
const HSIZE = 5003;
const masks = [
  0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F, 0x00FF,
  0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF,
];

function LZWEncode(width, height, pixels, colorDepth, outs) {
  const initCodeSize = Math.max(2, colorDepth);
  const accum = new Uint8Array(256);
  const htab = new Int32Array(HSIZE);
  const codetab = new Int32Array(HSIZE);
  let cur_accum = 0;
  let cur_bits = 0;
  let a_count = 0;
  let free_ent = 0;
  let maxcode = 0;
  let clear_flg = false;
  let g_init_bits = 0;
  let ClearCode = 0;
  let EOFCode = 0;
  let n_bits = 0;
  let remaining = width * height;
  let curPixel = 0;

  function MAXCODE(nb) { return (1 << nb) - 1; }

  function nextPixel() {
    if (remaining === 0) return EOF;
    --remaining;
    return pixels[curPixel++] & 255;
  }

  function flush_char() {
    if (a_count > 0) {
      outs.writeByte(a_count);
      outs.writeBytes(accum, 0, a_count);
      a_count = 0;
    }
  }

  function char_out(c) {
    accum[a_count++] = c;
    if (a_count >= 254) flush_char();
  }

  function cl_hash(hsize) {
    for (let i = 0; i < hsize; ++i) htab[i] = -1;
  }

  function cl_block() {
    cl_hash(HSIZE);
    free_ent = ClearCode + 2;
    clear_flg = true;
    output(ClearCode);
  }

  function output(code) {
    cur_accum &= masks[cur_bits];
    if (cur_bits > 0) cur_accum |= code << cur_bits;
    else cur_accum = code;
    cur_bits += n_bits;
    while (cur_bits >= 8) {
      char_out(cur_accum & 255);
      cur_accum >>>= 8;
      cur_bits -= 8;
    }
    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        n_bits = g_init_bits;
        maxcode = MAXCODE(n_bits);
        clear_flg = false;
      } else {
        ++n_bits;
        if (n_bits === BITS) maxcode = 1 << BITS;
        else maxcode = MAXCODE(n_bits);
      }
    }
    if (code === EOFCode) {
      while (cur_bits > 0) {
        char_out(cur_accum & 255);
        cur_accum >>>= 8;
        cur_bits -= 8;
      }
      flush_char();
    }
  }

  function compress(init_bits) {
    let fcode, c, i, ent, disp, hsize_reg, hshift;
    g_init_bits = init_bits;
    clear_flg = false;
    n_bits = g_init_bits;
    maxcode = MAXCODE(n_bits);
    ClearCode = 1 << (init_bits - 1);
    EOFCode = ClearCode + 1;
    free_ent = ClearCode + 2;
    a_count = 0;
    ent = nextPixel();
    hshift = 0;
    for (fcode = HSIZE; fcode < 65536; fcode *= 2) ++hshift;
    hshift = 8 - hshift;
    hsize_reg = HSIZE;
    cl_hash(hsize_reg);
    output(ClearCode);
    outer: while ((c = nextPixel()) !== EOF) {
      fcode = (c << BITS) + ent;
      i = (c << hshift) ^ ent;
      if (htab[i] === fcode) { ent = codetab[i]; continue; }
      else if (htab[i] >= 0) {
        disp = hsize_reg - i;
        if (i === 0) disp = 1;
        do {
          if ((i -= disp) < 0) i += hsize_reg;
          if (htab[i] === fcode) { ent = codetab[i]; continue outer; }
        } while (htab[i] >= 0);
      }
      output(ent);
      ent = c;
      if (free_ent < (1 << BITS)) {
        codetab[i] = free_ent++;
        htab[i] = fcode;
      } else cl_block();
    }
    output(ent);
    output(EOFCode);
  }

  outs.writeByte(initCodeSize);
  remaining = width * height;
  curPixel = 0;
  compress(initCodeSize + 1);
  outs.writeByte(0);
}

// ─── GIFEncoder — multi-frame wrapper ─────────────────────────────────
//
// Friendly wrapper: instantiate, set delay / repeat / quality, addFrame
// (RGBA Uint8Array), addFrame, addFrame, finish, bytes(). Emits a
// GIF89a byte stream in memory.
//
// API mirrors Sprint 2's gifenc-shaped helper closely so callers can
// move between the two without ceremony.

export class GIFEncoder {
  constructor(width, height) {
    this.width = ~~width;
    this.height = ~~height;
    this.transparent = null;
    this.transIndex = 0;
    this.repeat = -1;
    this.delay = 0;
    this.image = null;
    this.pixels = null;
    this.indexedPixels = null;
    this.colorDepth = null;
    this.colorTab = null;
    this.neuQuant = null;
    this.usedEntry = new Array(256);
    this.palSize = 7;
    this.dispose = -1;
    this.firstFrame = true;
    this.sample = 10;
    this.dither = false;
    this.globalPalette = false;
    this.out = new ByteArray();
    this.started = false;
  }

  setDelay(ms) { this.delay = Math.round(ms / 10); }
  setFrameRate(fps) { this.delay = Math.round(100 / fps); }
  setDispose(code) { if (code >= 0) this.dispose = code; }
  setRepeat(repeat) { this.repeat = repeat; }
  setTransparent(color) { this.transparent = color; }
  setQuality(q) { if (q < 1) q = 1; this.sample = q; }
  setDither(d) { this.dither = d; }
  setGlobalPalette(p) { this.globalPalette = p; }

  /** Begin output stream — writes the GIF89a magic bytes. */
  start() {
    this.out.writeUTFBytes('GIF89a');
    this.started = true;
  }

  /**
   * Append one frame. `imageData` must be raw RGBA — 4 bytes per
   * pixel — laid out as ImageData-style top-down rows.
   */
  addFrame(imageData) {
    if (!this.started) this.start();
    this.image = imageData;
    this.colorTab = (this.globalPalette && this.globalPalette.slice) ? this.globalPalette : null;
    this._getImagePixels();
    this._analyzePixels();
    if (this.globalPalette === true) this.globalPalette = this.colorTab;
    if (this.firstFrame) {
      this._writeLSD();
      this._writePalette();
      if (this.repeat >= 0) this._writeNetscapeExt();
    }
    this._writeGraphicCtrlExt();
    this._writeImageDesc();
    if (!this.firstFrame && !this.globalPalette) this._writePalette();
    this._writePixels();
    this.firstFrame = false;
  }

  finish() { this.out.writeByte(0x3B); }

  bytes() {
    return this.out.toUint8Array();
  }

  // ── Internals ──

  _analyzePixels() {
    if (!this.colorTab) {
      this.neuQuant = new NeuQuant(this.pixels, this.sample);
      this.neuQuant.buildColormap();
      this.colorTab = this.neuQuant.getColormap();
    }
    this._indexPixels();
    this.pixels = null;
    this.colorDepth = 8;
    this.palSize = 7;
    if (this.transparent !== null) {
      this.transIndex = this._findClosest(this.transparent, true);
    }
  }

  _indexPixels() {
    const nPix = this.pixels.length / 3;
    this.indexedPixels = new Uint8Array(nPix);
    let k = 0;
    for (let j = 0; j < nPix; j++) {
      const idx = this._findClosestRGB(
        this.pixels[k++] & 255,
        this.pixels[k++] & 255,
        this.pixels[k++] & 255,
      );
      this.usedEntry[idx] = true;
      this.indexedPixels[j] = idx;
    }
  }

  _findClosest(c, used) {
    return this._findClosestRGB(
      (c & 0xFF0000) >> 16,
      (c & 0x00FF00) >> 8,
      c & 0xFF,
      used,
    );
  }

  _findClosestRGB(r, g, b, used) {
    if (this.colorTab === null) return -1;
    if (this.neuQuant && !used) return this.neuQuant.lookupRGB(b, g, r);
    let minpos = 0;
    let dmin = 256 * 256 * 256;
    const len = this.colorTab.length;
    let index = 0;
    for (let i = 0; i < len; index++) {
      const dr = r - (this.colorTab[i++] & 255);
      const dg = g - (this.colorTab[i++] & 255);
      const db = b - (this.colorTab[i++] & 255);
      const d = dr * dr + dg * dg + db * db;
      if ((!used || this.usedEntry[index]) && d < dmin) {
        dmin = d;
        minpos = index;
      }
    }
    return minpos;
  }

  _getImagePixels() {
    const w = this.width;
    const h = this.height;
    this.pixels = new Uint8Array(w * h * 3);
    const data = this.image;
    let srcPos = 0;
    let count = 0;
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        this.pixels[count++] = data[srcPos++];
        this.pixels[count++] = data[srcPos++];
        this.pixels[count++] = data[srcPos++];
        srcPos++; // skip alpha
      }
    }
  }

  _writeGraphicCtrlExt() {
    this.out.writeByte(0x21); // extension introducer
    this.out.writeByte(0xF9); // GCE label
    this.out.writeByte(4);    // block size
    let transp, disp;
    if (this.transparent === null) {
      transp = 0; disp = 0;
    } else {
      transp = 1; disp = 2;
    }
    if (this.dispose >= 0) disp = this.dispose & 7;
    disp <<= 2;
    this.out.writeByte(0 | disp | 0 | transp);
    this._writeShort(this.delay);
    this.out.writeByte(this.transIndex);
    this.out.writeByte(0);
  }

  _writeImageDesc() {
    this.out.writeByte(0x2C); // image separator
    this._writeShort(0); this._writeShort(0); // top-left
    this._writeShort(this.width); this._writeShort(this.height);
    if (this.firstFrame || this.globalPalette) this.out.writeByte(0);
    else this.out.writeByte(0x80 | 0 | 0 | 0 | this.palSize);
  }

  _writeLSD() {
    this._writeShort(this.width);
    this._writeShort(this.height);
    this.out.writeByte(0x80 | 0x70 | 0x00 | this.palSize);
    this.out.writeByte(0);
    this.out.writeByte(0);
  }

  _writeNetscapeExt() {
    this.out.writeByte(0x21);
    this.out.writeByte(0xFF);
    this.out.writeByte(11);
    this.out.writeUTFBytes('NETSCAPE2.0');
    this.out.writeByte(3);
    this.out.writeByte(1);
    this._writeShort(this.repeat);
    this.out.writeByte(0);
  }

  _writePalette() {
    this.out.writeBytes(this.colorTab);
    const n = (3 * 256) - this.colorTab.length;
    for (let i = 0; i < n; i++) this.out.writeByte(0);
  }

  _writeShort(v) {
    this.out.writeByte(v & 0xFF);
    this.out.writeByte((v >> 8) & 0xFF);
  }

  _writePixels() {
    LZWEncode(this.width, this.height, this.indexedPixels, this.colorDepth, this.out);
  }
}
