// =============================================================================
//  HYPERMATH — Fold geometry, 4D rotations, tesseract topology & lensing scalars
// =============================================================================
// Pure, dependency-free mathematics for the Quantum Wizard Chess "Hyperfold"
// layer. Nothing here touches the DOM or WebGL, so every function is directly
// unit-testable in node while the renderer consumes the exact same numbers.
//
// The central idea:
//   The Sanctum board is ONE wave function. Its six "observers" are the six
//   faces of a cube folded out of identical board plates (a classic cube net).
//   Folding the net from 0 -> 1 raises the six boards into the inward-facing
//   shell of a box. The box centre is the Apex Singularity: every face's
//   unseen cone converges there. A 4D hypercube (tesseract) is projected
//   through the same centre, and higher levels let the boards slide from the
//   inside of that projection to its outside.
// =============================================================================

export const TAU = Math.PI * 2;

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const clamp01 = (x) => clamp(x, 0, 1);

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-9));
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(x) {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential smoothing factor. */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-Math.max(1e-6, lambda) * Math.max(0, dt)));
}

// -----------------------------------------------------------------------------
//  Vector helpers (plain arrays so this module stays renderer-agnostic)
// -----------------------------------------------------------------------------
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ],
  length: (a) => Math.hypot(a[0], a[1], a[2]),
  normalize: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }
};

/** Rotate a 3-vector about the X axis by `a` radians. */
export function rotX(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

/** Rotate a 3-vector about the Y axis by `a` radians. */
export function rotY(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

/** Rotate a 3-vector about the Z axis by `a` radians. */
export function rotZ(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

// -----------------------------------------------------------------------------
//  The Six Observers
// -----------------------------------------------------------------------------
// Each face knows how its 8x8 board texture is oriented so that, once the net
// is folded into the box, every glyph reads upright from the inside.
// `quarterTurns` rotates the painted board in the plane (0..3, CCW).
export const CUBE_FACE_IDS = ['base', 'south', 'east', 'north', 'west', 'lid'];

export const FACE_META = {
  base:  { id: 'base',  index: 0, label: 'BASE',  roman: 'I',   observer: 1, quarterTurns: 0, accent: '#f5d76e', axis: 'FLOOR' },
  south: { id: 'south', index: 1, label: 'SOUTH', roman: 'II',  observer: 2, quarterTurns: 2, accent: '#59f6ff', axis: 'Z+' },
  east:  { id: 'east',  index: 2, label: 'EAST',  roman: 'III', observer: 3, quarterTurns: 0, accent: '#8affc1', axis: 'X+' },
  north: { id: 'north', index: 3, label: 'NORTH', roman: 'IV',  observer: 4, quarterTurns: 0, accent: '#c77dff', axis: 'Z-' },
  west:  { id: 'west',  index: 4, label: 'WEST',  roman: 'V',   observer: 5, quarterTurns: 2, accent: '#ffb4f0', axis: 'X-' },
  lid:   { id: 'lid',   index: 5, label: 'LID',   roman: 'VI',  observer: 6, quarterTurns: 0, accent: '#ffe9a8', axis: 'CEILING' }
};

/**
 * Fold the classic six-board cube net by `fold` (0 = flat net, 1 = closed box).
 * Returns face frames in box-centre-local coordinates (origin = Apex Singularity).
 *
 * Every frame is a right-handed basis { u, v, n } where local +Z (`n`) is the
 * INWARD-facing normal of that shell plate, `u` is the texture's right and `v`
 * its up. Plane geometry laid in local XY therefore faces the cube interior.
 */
export function faceFrames(fold, side) {
  const t = clamp01(fold);
  const a = t * Math.PI * 0.5;
  const s = Math.max(1e-6, side);
  const h = s * 0.5;
  const sa = Math.sin(a);
  const ca = Math.cos(a);
  const s2 = Math.sin(2 * a);
  const c2 = Math.cos(2 * a);

  const frames = {};

  // --- Floor ---------------------------------------------------------------
  frames.base = {
    id: 'base',
    position: [0, -h, 0],
    u: [1, 0, 0],
    v: [0, 0, -1],
    n: [0, 1, 0],
    pivot: null,
    angle: 0
  };

  // --- South wall (hinge on +Z floor edge) ---------------------------------
  {
    const pivot = [0, -h, h];
    const rel = rotX([0, 0, h], -a);
    frames.south = {
      id: 'south',
      position: v3.add(pivot, rel),
      u: [1, 0, 0],
      v: rotX([0, 0, -1], -a),
      n: rotX([0, 1, 0], -a),
      pivot,
      angle: -a
    };
  }

  // --- North wall (hinge on -Z floor edge) ---------------------------------
  {
    const pivot = [0, -h, -h];
    const rel = rotX([0, 0, -h], a);
    frames.north = {
      id: 'north',
      position: v3.add(pivot, rel),
      u: [1, 0, 0],
      v: rotX([0, 0, -1], a),
      n: rotX([0, 1, 0], a),
      pivot,
      angle: a
    };
  }

  // --- East wall (hinge on +X floor edge) ----------------------------------
  {
    const pivot = [h, -h, 0];
    const rel = rotZ([h, 0, 0], a);
    frames.east = {
      id: 'east',
      position: v3.add(pivot, rel),
      u: [0, 0, 1],
      v: rotZ([1, 0, 0], a),
      n: rotZ([0, 1, 0], a),
      pivot,
      angle: a
    };
  }

  // --- West wall (hinge on -X floor edge) ----------------------------------
  {
    const pivot = [-h, -h, 0];
    const rel = rotZ([-h, 0, 0], -a);
    frames.west = {
      id: 'west',
      position: v3.add(pivot, rel),
      u: [0, 0, 1],
      v: rotZ([1, 0, 0], -a),
      n: rotZ([0, 1, 0], -a),
      pivot,
      angle: -a
    };
  }

  // --- Lid (double hinge riding on the north wall's outer edge) ------------
  {
    const hinge = [0, -h + s * sa, -h - s * ca];
    const ext = rotX([0, 0, -1], 2 * a);
    const center = v3.add(hinge, v3.scale(ext, h));
    // The lid is mirrored through its own hinge so the board lands on the
    // INSIDE of the closed box (v is negated => n flips to -Y at fold = 1).
    const v = v3.scale(rotX([0, 0, 1], 2 * a), -1);
    const u = [1, 0, 0];
    frames.lid = {
      id: 'lid',
      position: center,
      u,
      v,
      n: v3.cross(u, v),
      pivot: hinge,
      angle: 2 * a
    };
  }

  return frames;
}

/**
 * Centre of square (r, c) in a face's local plane coordinates.
 * Mirrors exactly how the canvas texture is painted (row 0 at local +v).
 */
export function cellLocal(faceId, r, c, side, boardN = 8) {
  const s = side;
  const q = (FACE_META[faceId]?.quarterTurns || 0) % 4;
  const sq = s / boardN;
  let x = (c + 0.5) * sq - s * 0.5;
  let y = s * 0.5 - (r + 0.5) * sq;
  for (let i = 0; i < q; i++) {
    const nx = -y;
    const ny = x;
    x = nx;
    y = ny;
  }
  return [x, y];
}

/** Inverse of cellLocal: local plane point -> nearest board square. */
export function localToCell(faceId, x, y, side, boardN = 8) {
  const s = side;
  const q = (FACE_META[faceId]?.quarterTurns || 0) % 4;
  // Undo quarter turns (rotate -q * 90deg).
  for (let i = 0; i < q; i++) {
    const nx = y;
    const ny = -x;
    x = nx;
    y = ny;
  }
  const sq = s / boardN;
  const c = Math.floor((x + s * 0.5) / sq);
  const r = Math.floor((s * 0.5 - y) / sq);
  if (r < 0 || r >= boardN || c < 0 || c >= boardN) return null;
  return { r, c };
}

// -----------------------------------------------------------------------------
//  4D rotations — the machinery behind the tesseract
// -----------------------------------------------------------------------------
export const ROTATION_PLANES = ['xy', 'xz', 'xw', 'yz', 'yw', 'zw'];

/**
 * Rotate a 4-vector in one of the six principal planes.
 * v = [x, y, z, w]
 */
export function rotate4D(v, plane, angle) {
  const [x, y, z, w] = v;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  switch (plane) {
    case 'xy': return [x * c - y * s, x * s + y * c, z, w];
    case 'xz': return [x * c - z * s, y, x * s + z * c, w];
    case 'xw': return [x * c - w * s, y, z, x * s + w * c];
    case 'yz': return [x, y * c - z * s, y * s + z * c, w];
    case 'yw': return [x, y * c - w * s, z, y * s + w * c];
    case 'zw': return [x, y, z * c - w * s, z * s + w * c];
    default: return [x, y, z, w];
  }
}

/** Apply a list of { plane, angle } rotations in order. */
export function rotate4DMulti(v, rotations = []) {
  let out = v.slice();
  for (const rot of rotations) out = rotate4D(out, rot.plane, rot.angle);
  return out;
}

/** Perspective projection from 4D into 3D. `viewerW` is the 4-camera distance. */
export function project4D(v, viewerW = 3.2) {
  const w = Array.isArray(v) ? v[3] : 0;
  const k = viewerW / Math.max(0.15, viewerW - w);
  return [v[0] * k, v[1] * k, v[2] * k];
}

/** The 16 vertices of a unit hypercube (coordinates are ±1). */
export function tesseractVertices() {
  const out = [];
  for (let i = 0; i < 16; i++) {
    out.push([
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
      i & 8 ? 1 : -1
    ]);
  }
  return out;
}

/** The 32 edges of a hypercube: vertex pairs differing in exactly one bit. */
export function tesseractEdges() {
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let bit = 0; bit < 4; bit++) {
      const j = i ^ (1 << bit);
      if (j > i) edges.push([i, j]);
    }
  }
  return edges;
}

/**
 * Project the rotated hypercube to 3D.
 * Returns { vertices: number[16][3], edges: number[32][2], wValues, scale }
 */
export function projectTesseract({ scale = 1, rotation = [], viewerW = 3.2 } = {}) {
  const base = tesseractVertices();
  const rotated = base.map((v) => rotate4DMulti(v, rotation));
  const vertices = rotated.map((v) => project4D(v, viewerW).map((n) => n * scale));
  return {
    vertices,
    edges: tesseractEdges(),
    wValues: rotated.map((v) => v[3]),
    scale
  };
}

// -----------------------------------------------------------------------------
//  Gravitational lensing scalars
// -----------------------------------------------------------------------------
/**
 * Einstein deflection for an impact parameter b (in "radius" units).
 * α = 2 Rs / b, softened at the horizon. Monotonically decreasing in |b|.
 */
export function lensingDeflection(b, mass = 1) {
  const ab = Math.max(0.02, Math.abs(b));
  return (2 * Math.max(0, mass)) / ab;
}

/** Angular radius of the photon sphere / shadow for a given mass. */
export function photonSphereRadius(mass = 1) {
  return 1.5 * Math.max(0, mass);
}

/** Doppler beaming factor for accretion material at orbital angle theta. */
export function dopplerBeam(theta, beta = 0.42) {
  const v = clamp(beta, 0, 0.95);
  return 1 / Math.pow(Math.max(0.05, 1 - v * Math.cos(theta)), 3);
}

/** Schwarzschild-ish orbital angular velocity at radius r for mass m. */
export function keplerianOmega(r, mass = 1) {
  const rr = Math.max(0.05, r);
  return Math.sqrt(Math.max(0.0001, mass) / (rr * rr * rr));
}

// -----------------------------------------------------------------------------
//  Level ladder — from the Dormant Sanctum out past the tesseract
// -----------------------------------------------------------------------------
export const HYPER_LEVELS = [
  {
    id: 0,
    key: 'dormant',
    name: 'Dormant Sanctum',
    sigil: '○',
    tagline: 'Six boards sleep in the altar. The singularity is silent.',
    fold: 1,
    boardOpacity: 0,
    mass: 0,
    lensing: 0,
    tesseract: 0,
    cones: 0,
    exo: 0,
    veil: 0,
    particles: 0,
    spin: 0.08,
    cameraOffset: [0, 0.35, 4.7]
  },
  {
    id: 1,
    key: 'fold',
    name: 'Fold of Six Boards',
    sigil: '⟁',
    tagline: 'One board becomes six. The net closes into a box around a newborn hole.',
    fold: 1,
    boardOpacity: 0.56,
    mass: 0.55,
    lensing: 0.24,
    tesseract: 0.14,
    cones: 0,
    exo: 0,
    veil: 0,
    particles: 0.32,
    spin: 0.34,
    cameraOffset: [0, 0.35, 4.7]
  },
  {
    id: 2,
    key: 'interior',
    name: 'Inside the Tesseract',
    sigil: '◈',
    tagline: 'Step through the shell. Light bends along four dimensions.',
    fold: 1,
    boardOpacity: 0.82,
    mass: 0.82,
    lensing: 0.52,
    tesseract: 0.6,
    cones: 0.22,
    exo: 0,
    veil: 0.52,
    particles: 0.78,
    spin: 0.85,
    cameraOffset: [0.2, -0.06, 0.99]
  },
  {
    id: 3,
    key: 'apex',
    name: 'Apex Singularity',
    sigil: '◉',
    tagline: 'The hidden cones reveal their apex. Every face feeds the hole.',
    fold: 1,
    boardOpacity: 0.92,
    mass: 1.02,
    lensing: 0.86,
    tesseract: 0.86,
    cones: 1,
    exo: 0,
    veil: 0.86,
    particles: 1.05,
    spin: 1.2,
    cameraOffset: [0.52, -0.34, 0.86]
  },
  {
    id: 4,
    key: 'exterior',
    name: 'Outside the Tesseract',
    sigil: '⟐',
    tagline: 'The boards migrate to the outer shell. You are now the observer.',
    fold: 1,
    boardOpacity: 0.78,
    mass: 1.02,
    lensing: 1.1,
    tesseract: 1.12,
    cones: 0.34,
    exo: 1,
    veil: 1.0,
    particles: 1.2,
    spin: 1.7,
    cameraOffset: [0, 1.9, 7.7]
  },
  {
    id: 5,
    key: 'hyperwild',
    name: 'Hyperwild',
    sigil: '✶',
    tagline: 'Both shells are board. The tesseract spins through every plane at once.',
    fold: 1,
    boardOpacity: 1,
    mass: 1.32,
    lensing: 1.48,
    tesseract: 1.5,
    cones: 0.86,
    exo: 1,
    veil: 1.5,
    particles: 1.85,
    spin: 2.8,
    cameraOffset: [2.7, 2.35, 6.4]
  }
];

export function getLevel(index) {
  const i = Math.round(clamp(index, 0, HYPER_LEVELS.length - 1));
  return HYPER_LEVELS[i];
}

/** Camera pose (world) for a level, given the sanctum's world centre. */
export function levelCameraPose(levelIndex, center, mode = 'level') {
  const level = getLevel(levelIndex);
  const c = center || [0, 0, 0];
  if (mode === 'core') {
    return {
      position: [c[0] + 0.34, c[1] - 0.16, c[2] + 0.92],
      target: [c[0], c[1], c[2]]
    };
  }
  if (mode === 'hyper') {
    return {
      position: [c[0] + 2.4, c[1] + 1.5, c[2] + 4.5],
      target: [c[0], c[1], c[2]]
    };
  }
  if (mode === 'exterior') {
    return {
      position: [c[0] + 3.4, c[1] + 2.6, c[2] + 8.3],
      target: [c[0], c[1], c[2]]
    };
  }
  const off = level.cameraOffset || [0, 0.35, 4.7];
  return {
    position: [c[0] + off[0], c[1] + off[1], c[2] + off[2]],
    target: [c[0], c[1], c[2]]
  };
}

/** Interpolate every level scalar for smooth dimensional transitions. */
export function levelTargets(levelIndex) {
  const l = getLevel(levelIndex);
  return {
    fold: l.fold,
    boardOpacity: l.boardOpacity,
    mass: l.mass,
    lensing: l.lensing,
    tesseract: l.tesseract,
    cones: l.cones,
    exo: l.exo,
    veil: l.veil,
    particles: l.particles,
    spin: l.spin
  };
}

/** The live 4D pose of the hypercube at time t (six-plane rotation). */
export function tesseractRotationAt(t, spin = 1, levelKey = 'fold') {
  const s = spin;
  const rotations = [
    { plane: 'xw', angle: t * 0.18 * s },
    { plane: 'yw', angle: t * 0.13 * s + 0.4 },
    { plane: 'zw', angle: t * 0.09 * s + 0.9 }
  ];
  if (levelKey === 'interior' || levelKey === 'apex' || levelKey === 'hyperwild') {
    rotations.push({ plane: 'xy', angle: t * 0.07 * s });
  }
  if (levelKey === 'hyperwild') {
    rotations.push({ plane: 'xz', angle: t * 0.21 * s + 1.3 });
    rotations.push({ plane: 'yz', angle: t * 0.16 * s + 0.2 });
  }
  return rotations;
}

/**
 * Apparent (lensed) direction of a background ray seen through the hole.
 * Used by the starfield shell shader (JS mirror for HUD telemetry).
 */
export function lensedDirection(dx, dy, dz, mass = 1) {
  const r = Math.hypot(dx, dy, dz) || 1;
  const ds = Math.max(0.06, r);
  const defl = lensingDeflection(ds, mass) * 0.02;
  return [
    dx + (dx / r) * defl,
    dy + (dy / r) * defl,
    dz + (dz / r) * defl
  ];
}
