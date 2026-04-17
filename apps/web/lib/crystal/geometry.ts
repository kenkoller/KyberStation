// ─── Kyber Crystal — Procedural Geometry ───
//
// Builds THREE.BufferGeometry for each of the 5 Forms, deterministic
// per config via hash-seeded PRNG. Flat-shaded facets (no smoothing) —
// faceted gem read, not plastic.
//
// Per `docs/KYBER_CRYSTAL_3D.md` §5.

import * as THREE from 'three';
import type { CrystalGeometryParams, CrystalFormId } from './types';
import { seedRng, rangeRng } from './hash';

// ─── Hex / polygonal prism builder ───
//
// Shared by Forms 1 (Natural), 2 (Bled), 3 (Cracked body halves), and
// 5 (each half of the pair).

interface PrismResult {
  geometry: THREE.BufferGeometry;
  topY: number;
  bottomY: number;
  radius: number;
}

function buildPrism(params: {
  height: number;
  radius: number;
  tipTaper: number;
  baseTaper: number;
  facetJitter: number;
  segments: number;
  twistDeg: number;
  seed: number;
  /** If set, y range is restricted to [startY, endY] instead of centred on 0. */
  yRange?: [number, number];
}): PrismResult {
  const rng = seedRng(params.seed);
  const segs = Math.max(3, params.segments | 0);

  const yTop = params.yRange ? params.yRange[1] : params.height / 2;
  const yBot = params.yRange ? params.yRange[0] : -params.height / 2;
  const midY = (yTop + yBot) / 2;

  const topR = params.radius * params.tipTaper;
  const midR = params.radius;
  const botR = params.radius * params.baseTaper;

  const twist = (params.twistDeg * Math.PI) / 180;

  // Ring layers: bottom, mid-lower, mid-upper, top. Inserting midlayers
  // gives more faces for irregular jitter and vein routing.
  const layers: Array<{ y: number; radius: number; twist: number }> = [
    { y: yBot, radius: botR, twist: 0 },
    { y: midY - params.height * 0.18, radius: midR * 1.02, twist: twist * 0.3 },
    { y: midY + params.height * 0.12, radius: midR * 0.98, twist: twist * 0.7 },
    { y: yTop, radius: topR, twist },
  ];

  const vertices: number[] = [];
  const ringStart: number[] = [];

  // Build rings
  for (const layer of layers) {
    ringStart.push(vertices.length / 3);
    for (let i = 0; i < segs; i++) {
      const angle = (i / segs) * Math.PI * 2 + layer.twist;
      // Radial jitter — tiny offsets so facets aren't perfectly regular
      const jitterR = 1 + rangeRng(rng, -params.facetJitter, params.facetJitter);
      const r = layer.radius * jitterR;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      // Tiny axial jitter on mid layers only
      const jY = layer.radius === topR || layer.radius === botR
        ? 0
        : rangeRng(rng, -params.facetJitter * 0.5, params.facetJitter * 0.5);
      vertices.push(x, layer.y + jY, z);
    }
  }

  // Cap centres (top apex for tapered crystals, flat cap otherwise)
  const topCenterIdx = vertices.length / 3;
  vertices.push(0, yTop, 0);
  const botCenterIdx = vertices.length / 3;
  vertices.push(0, yBot, 0);

  // Build faces — flat-shaded, so each face gets its own vertex copies
  // to avoid shared normals. We'll expand below.
  const faces: number[][] = [];

  // Side bands between successive rings
  for (let ri = 0; ri < layers.length - 1; ri++) {
    const bot = ringStart[ri];
    const top = ringStart[ri + 1];
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      // Two triangles per quad face
      faces.push([bot + i, top + i, top + j]);
      faces.push([bot + i, top + j, bot + j]);
    }
  }

  // Top cap
  const topRing = ringStart[layers.length - 1];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    faces.push([topRing + i, topCenterIdx, topRing + j]);
  }
  // Bottom cap
  const botRing = ringStart[0];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    faces.push([botRing + i, botRing + j, botCenterIdx]);
  }

  // Flatten into a non-indexed BufferGeometry. We author HYBRID normals:
  //   - Side quads (ri spans two adjacent rings) share normals
  //     ACROSS the top-to-bottom seam so vertical curvature reads as
  //     one continuous highlight band, not stepped facets.
  //   - Horizontal neighbour seams (between segment i and i+1 of the
  //     same ring) stay hard-faceted so each prism face still reads
  //     as a distinct crystal cut.
  //   - Top and bottom caps stay flat-shaded (fan triangles).
  //
  // Implementation: for side faces, compute a per-vertex normal by
  // averaging the in-plane radial direction (smooths vertically) while
  // keeping the azimuthal (angular) direction as-is (faceted
  // horizontally).
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  const getVtx = (idx: number): [number, number, number] => [
    vertices[idx * 3],
    vertices[idx * 3 + 1],
    vertices[idx * 3 + 2],
  ];

  // Helper: flat-face normal from three positions.
  const faceNormal = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
  ): [number, number, number] => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };

  // Side band faces: faces[0 .. sideCount-1]. Two triangles per quad,
  // so segment i owns faces[2*i] and faces[2*i+1] within each ring band.
  const sideCount = (layers.length - 1) * segs * 2;

  for (let fi = 0; fi < faces.length; fi++) {
    const face = faces[fi];
    const isSide = fi < sideCount;
    const [a, b, c] = [getVtx(face[0]), getVtx(face[1]), getVtx(face[2])];

    if (isSide) {
      // One shared azimuthal normal per face: faceted HORIZONTALLY
      // (each segment is a distinct crystal cut) but smooth
      // VERTICALLY across rings because both rings' vertices within
      // the same segment get the SAME normal. This produces the
      // continuous top-to-bottom highlight band we want while keeping
      // segment-to-segment seams crisp.
      const sideFaceIndex = fi % (segs * 2); // [0, 2*segs)
      const segIndex = Math.floor(sideFaceIndex / 2); // 0..segs-1
      const faceCentreAngle = ((segIndex + 0.5) / segs) * Math.PI * 2;
      const nx = Math.cos(faceCentreAngle);
      const nz = Math.sin(faceCentreAngle);
      for (const [x, y, z] of [a, b, c]) {
        positions.push(x, y, z);
        normals.push(nx, 0, nz);
        const u = 0.5 + Math.atan2(z, x) / (Math.PI * 2);
        const v = (y - yBot) / (yTop - yBot);
        uvs.push(u, v);
      }
    } else {
      // Flat-shaded cap face
      const n = faceNormal(a, b, c);
      for (const [x, y, z] of [a, b, c]) {
        positions.push(x, y, z);
        normals.push(n[0], n[1], n[2]);
        const u = 0.5 + Math.atan2(z, x) / (Math.PI * 2);
        const v = (y - yBot) / (yTop - yBot);
        uvs.push(u, v);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  return { geometry, topY: yTop, bottomY: yBot, radius: params.radius };
}

// ─── Bipyramid builder (Form 4 Darksaber) ───

function buildBipyramid(params: {
  height: number;
  radius: number;
  segments: number; // 4 = square pyramids
  seed: number;
}): PrismResult {
  const segs = Math.max(3, params.segments | 0);
  const yTop = params.height / 2;
  const yBot = -params.height / 2;
  const yMid = 0;

  const positions: number[] = [];
  const uvs: number[] = [];

  // Mid-ring vertex positions
  const ringVerts: Array<[number, number, number]> = [];
  for (let i = 0; i < segs; i++) {
    const angle = (i / segs) * Math.PI * 2 + Math.PI / segs;
    ringVerts.push([Math.cos(angle) * params.radius, yMid, Math.sin(angle) * params.radius]);
  }

  // Upper pyramid: apex at top, base at mid-ring
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    const [ax, ay, az] = ringVerts[i];
    const [bx, by, bz] = ringVerts[j];
    positions.push(0, yTop, 0, ax, ay, az, bx, by, bz);
    uvs.push(0.5, 1.0, i / segs, 0.5, j / segs, 0.5);
  }
  // Lower pyramid: apex at bottom, base at mid-ring
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs;
    const [ax, ay, az] = ringVerts[i];
    const [bx, by, bz] = ringVerts[j];
    positions.push(bx, by, bz, ax, ay, az, 0, yBot, 0);
    uvs.push(j / segs, 0.5, i / segs, 0.5, 0.5, 0.0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return { geometry, topY: yTop, bottomY: yBot, radius: params.radius };
}

// ─── Vein strips (Form 2 Bled) ───
//
// Thin ribbon meshes following paths on the crystal surface.

export interface VeinGeometry {
  geometry: THREE.BufferGeometry;
  count: number;
}

function buildVeins(params: {
  crackCount: number;
  height: number;
  radius: number;
  seed: number;
}): VeinGeometry {
  const rng = seedRng(params.seed ^ 0x9e3779b9);

  // Path-swept tubes read as sub-surface channels rather than the flat
  // ribbons the older code produced (which twisted visually under
  // off-axis viewing).
  //
  // We build each vein as a CatmullRomCurve3 sampled at tight control
  // points along the crystal surface, then sweep a TubeGeometry along
  // it. Multiple vein tubes are merged into a single BufferGeometry
  // so the renderer stays at one draw call.
  const tubes: THREE.BufferGeometry[] = [];
  const radialSegments = 6;
  const tubeRadius = 0.006;
  const tubularSegments = 24;

  for (let c = 0; c < params.crackCount; c++) {
    const startAngle = rng() * Math.PI * 2;
    const controlCount = 8;
    const pts: THREE.Vector3[] = [];

    // Pre-sample angle drift so the path is deterministic regardless of
    // the merge order.
    let angle = startAngle;
    for (let s = 0; s < controlCount; s++) {
      const t = s / (controlCount - 1);
      angle += (rng() - 0.5) * 0.4 * t;
      const y = params.height / 2 - t * params.height * 0.95;
      // Sit the path just above the surface — negative offset pulls
      // it slightly INSIDE so the tube reads as a sub-surface channel
      // through the transmissive body rather than pasted on top.
      const r = params.radius * (0.985 - 0.015 * Math.sin(t * Math.PI));
      pts.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }

    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const tube = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      tubeRadius,
      radialSegments,
      false,
    );
    tubes.push(tube);
  }

  // Simple concatenation — all tubes share the same material, so a
  // single BufferGeometry with the combined buffers is enough. We
  // avoid pulling BufferGeometryUtils just for this.
  if (tubes.length === 0) {
    return { geometry: new THREE.BufferGeometry(), count: 0 };
  }

  const positions: number[] = [];
  const normalsOut: number[] = [];
  const uvs: number[] = [];
  for (const t of tubes) {
    const p = t.getAttribute('position');
    const n = t.getAttribute('normal');
    const u = t.getAttribute('uv');
    const idx = t.getIndex();

    const pushVtx = (i: number) => {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normalsOut.push(n.getX(i), n.getY(i), n.getZ(i));
      uvs.push(u.getX(i), u.getY(i));
    };

    if (idx) {
      for (let i = 0; i < idx.count; i++) pushVtx(idx.getX(i));
    } else {
      for (let i = 0; i < p.count; i++) pushVtx(i);
    }
    t.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalsOut, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return { geometry, count: params.crackCount };
}

// ─── Energy seam (Form 3 Cracked gap) ───
//
// A horizontal belt of additive geometry bridging the gap between the
// two halves of a cracked crystal.

function buildSeam(params: {
  gapHeight: number;
  radius: number;
}): THREE.BufferGeometry {
  const segments = 16;
  const positions: number[] = [];
  const uvs: number[] = [];

  const yTop = params.gapHeight / 2;
  const yBot = -params.gapHeight / 2;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const r = params.radius * 1.05; // slightly outside body so it reads bright
    const x0 = Math.cos(a0) * r;
    const z0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const z1 = Math.sin(a1) * r;
    // Quad
    positions.push(x0, yBot, z0, x1, yBot, z1, x1, yTop, z1);
    uvs.push(i / segments, 0, (i + 1) / segments, 0, (i + 1) / segments, 1);
    positions.push(x0, yBot, z0, x1, yTop, z1, x0, yTop, z0);
    uvs.push(i / segments, 0, (i + 1) / segments, 1, i / segments, 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

// ─── Fleck billboard instanced geometry ───
//
// Shared quad that all flecks instance from.

export function createFleckInstanceGeometry(): THREE.BufferGeometry {
  const size = 0.018;
  const g = new THREE.PlaneGeometry(size, size);
  return g;
}

/** Deterministic fleck placement on the crystal surface. */
export function computeFleckTransforms(params: {
  count: number;
  height: number;
  radius: number;
  form: CrystalFormId;
  seed: number;
}): THREE.Matrix4[] {
  const rng = seedRng(params.seed ^ 0xdeadbeef);
  const transforms: THREE.Matrix4[] = [];

  for (let i = 0; i < params.count; i++) {
    const t = rng();
    const y = -params.height / 2 + t * params.height;
    const angle = rng() * Math.PI * 2;
    const r = params.radius * (0.98 + rng() * 0.04);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    // Billboard faces outward — build a matrix that orients +Z away from the axis
    const m = new THREE.Matrix4();
    const yaw = angle;
    const rot = new THREE.Matrix4().makeRotationY(yaw);
    m.makeTranslation(x, y, z).multiply(rot);
    transforms.push(m);
  }

  return transforms;
}

/**
 * Deterministic per-fleck phase values in [0, 1). The fleck twinkle
 * shader consumes these as `aPhase`, scaled internally to 2π.
 *
 * Returned values are stable for a given seed + count so two crystals
 * with matching configs share the same twinkle pattern — important for
 * snapshot determinism.
 */
export function computeFleckPhases(params: { count: number; seed: number }): Float32Array {
  const rng = seedRng((params.seed ^ 0x1f83d9ab) >>> 0);
  const out = new Float32Array(params.count);
  for (let i = 0; i < params.count; i++) out[i] = rng();
  return out;
}

// ─── Composite geometry result ───

export interface CrystalGeometryResult {
  /** Body mesh. For Form 3 Cracked this is the upper half only. */
  body: THREE.BufferGeometry;
  /** Lower half for Form 3; otherwise null. */
  bodyLower: THREE.BufferGeometry | null;
  /** Inner glow mesh geometry (body scaled down, same topology). */
  inner: THREE.BufferGeometry;
  /** Vein / seam mesh geometry, or null if none. */
  veins: THREE.BufferGeometry | null;
  /** Cracked seam ribbon, or null. */
  seam: THREE.BufferGeometry | null;
  /** Fleck instanced quad. */
  fleck: THREE.BufferGeometry;
  /** Deterministic fleck transforms. */
  fleckTransforms: THREE.Matrix4[];
  /** Paired right-side body for Form 5, or null. */
  pairedRight: THREE.BufferGeometry | null;
  pairedSaddle: THREE.BufferGeometry | null;
  /** Metadata the renderer uses to position the QR decal. */
  meta: {
    topY: number;
    bottomY: number;
    radius: number;
    form: CrystalFormId;
  };
}

/** Build the full geometry set for a given form + params. */
export function buildCrystalGeometry(params: CrystalGeometryParams): CrystalGeometryResult {
  const { form } = params;

  if (form === 'obsidian-bipyramid') {
    const main = buildBipyramid({
      height: params.height,
      radius: params.radius,
      segments: params.segments,
      seed: params.seed,
    });
    const inner = buildBipyramid({
      height: params.height * 0.75,
      radius: params.radius * 0.75,
      segments: params.segments,
      seed: params.seed + 1,
    });
    const fleck = createFleckInstanceGeometry();
    return {
      body: main.geometry,
      bodyLower: null,
      inner: inner.geometry,
      veins: null,
      seam: null,
      fleck,
      fleckTransforms: computeFleckTransforms({
        count: 12, // very few flecks on darksaber — it's meant to be dark
        height: main.topY - main.bottomY,
        radius: main.radius,
        form,
        seed: params.seed,
      }),
      pairedRight: null,
      pairedSaddle: null,
      meta: { topY: main.topY, bottomY: main.bottomY, radius: main.radius, form },
    };
  }

  if (form === 'paired') {
    const main = buildPrism({
      height: params.height,
      radius: params.radius,
      tipTaper: params.tipTaper,
      baseTaper: params.baseTaper,
      facetJitter: params.facetJitter,
      segments: params.segments,
      twistDeg: params.twistDeg,
      seed: params.seed,
    });
    const right = buildPrism({
      height: params.height * 0.94,
      radius: params.radius,
      tipTaper: params.tipTaper,
      baseTaper: params.baseTaper,
      facetJitter: params.facetJitter,
      segments: params.segments,
      twistDeg: params.twistDeg,
      seed: params.seed ^ 0x55555555, // different seed → independent micro-variation
    });
    const inner = buildPrism({
      height: params.height * 0.8,
      radius: params.radius * 0.7,
      tipTaper: params.tipTaper,
      baseTaper: params.baseTaper,
      facetJitter: params.facetJitter * 0.5,
      segments: params.segments,
      twistDeg: params.twistDeg,
      seed: params.seed + 1,
    });
    // Saddle — a small low-profile ring connecting the base
    const saddle = new THREE.BufferGeometry();
    const saddlePositions: number[] = [];
    const saddleUvs: number[] = [];
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const r = params.radius * 1.4;
      const y = -params.height / 2;
      const yTop = y + 0.1;
      const x0 = Math.cos(a0) * r;
      const z0 = Math.sin(a0) * r;
      const x1 = Math.cos(a1) * r;
      const z1 = Math.sin(a1) * r;
      saddlePositions.push(x0, y, z0, x1, y, z1, x1, yTop, z1);
      saddleUvs.push(i / segs, 0, (i + 1) / segs, 0, (i + 1) / segs, 1);
      saddlePositions.push(x0, y, z0, x1, yTop, z1, x0, yTop, z0);
      saddleUvs.push(i / segs, 0, (i + 1) / segs, 1, i / segs, 1);
    }
    saddle.setAttribute('position', new THREE.Float32BufferAttribute(saddlePositions, 3));
    saddle.setAttribute('uv', new THREE.Float32BufferAttribute(saddleUvs, 2));
    saddle.computeVertexNormals();

    return {
      body: main.geometry,
      bodyLower: null,
      inner: inner.geometry,
      veins: null,
      seam: null,
      fleck: createFleckInstanceGeometry(),
      fleckTransforms: computeFleckTransforms({
        count: 40,
        height: main.topY - main.bottomY,
        radius: main.radius,
        form,
        seed: params.seed,
      }),
      pairedRight: right.geometry,
      pairedSaddle: saddle,
      meta: { topY: main.topY, bottomY: main.bottomY, radius: main.radius, form },
    };
  }

  if (form === 'cracked') {
    const gap = 0.08;
    const halfHeight = params.height / 2 - gap / 2;
    // Upper half: y in [gap/2, height/2]; Lower: [-height/2, -gap/2]
    const upper = buildPrism({
      height: halfHeight * 2,
      radius: params.radius,
      tipTaper: params.tipTaper,
      baseTaper: 0.96, // slightly wider at the fracture
      facetJitter: params.facetJitter,
      segments: params.segments,
      twistDeg: params.twistDeg,
      seed: params.seed,
      yRange: [gap / 2, params.height / 2],
    });
    const lower = buildPrism({
      height: halfHeight * 2,
      radius: params.radius,
      tipTaper: 0.96,
      baseTaper: params.baseTaper,
      facetJitter: params.facetJitter,
      segments: params.segments,
      twistDeg: params.twistDeg,
      seed: params.seed + 2,
      yRange: [-params.height / 2, -gap / 2],
    });
    const inner = buildPrism({
      height: params.height * 0.7,
      radius: params.radius * 0.7,
      tipTaper: params.tipTaper,
      baseTaper: params.baseTaper,
      facetJitter: params.facetJitter * 0.5,
      segments: params.segments,
      twistDeg: params.twistDeg,
      seed: params.seed + 1,
    });
    const seam = buildSeam({ gapHeight: gap, radius: params.radius });

    return {
      body: upper.geometry,
      bodyLower: lower.geometry,
      inner: inner.geometry,
      veins: null,
      seam,
      fleck: createFleckInstanceGeometry(),
      fleckTransforms: computeFleckTransforms({
        count: 28,
        height: params.height,
        radius: params.radius,
        form,
        seed: params.seed,
      }),
      pairedRight: null,
      pairedSaddle: null,
      meta: { topY: params.height / 2, bottomY: -params.height / 2, radius: params.radius, form },
    };
  }

  // Forms: natural, bled
  const main = buildPrism({
    height: params.height,
    radius: params.radius,
    tipTaper: params.tipTaper,
    baseTaper: params.baseTaper,
    facetJitter: params.facetJitter,
    segments: params.segments,
    twistDeg: params.twistDeg,
    seed: params.seed,
  });
  const inner = buildPrism({
    height: params.height * 0.8,
    radius: params.radius * 0.7,
    tipTaper: params.tipTaper,
    baseTaper: params.baseTaper,
    facetJitter: params.facetJitter * 0.5,
    segments: params.segments,
    twistDeg: params.twistDeg,
    seed: params.seed + 1,
  });
  const veins = params.crackCount > 0
    ? buildVeins({
        crackCount: params.crackCount,
        height: params.height,
        radius: params.radius,
        seed: params.seed,
      }).geometry
    : null;

  return {
    body: main.geometry,
    bodyLower: null,
    inner: inner.geometry,
    veins,
    seam: null,
    fleck: createFleckInstanceGeometry(),
    fleckTransforms: computeFleckTransforms({
      count: 40,
      height: params.height,
      radius: params.radius,
      form,
      seed: params.seed,
    }),
    pairedRight: null,
    pairedSaddle: null,
    meta: { topY: main.topY, bottomY: main.bottomY, radius: main.radius, form },
  };
}

export function disposeCrystalGeometry(result: CrystalGeometryResult): void {
  result.body.dispose();
  result.bodyLower?.dispose();
  result.inner.dispose();
  result.veins?.dispose();
  result.seam?.dispose();
  result.fleck.dispose();
  result.pairedRight?.dispose();
  result.pairedSaddle?.dispose();
}
