import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();

test('Simplified Single-Player HUD in src/App.tsx excludes speed sliders, notation script bar, and multiplayer lobby', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  // Must include simplified game & camera controls
  for (const requiredId of [
    'btn-side-toggle',
    'btn-ai-move',
    'btn-reset',
    'btn-cam-player',
    'btn-cam-top',
    'btn-cam-side',
    'btn-cam-wide',
    'btn-hide-ui',
    'controls-hint',
    'captured-tray'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing required HUD control #${requiredId}`);
  }

  // Must NOT include camera speed sliders, script mode bar, or multiplayer lobby
  for (const forbiddenId of [
    'cam-speed-wrap',
    'input-cam-speed',
    'rot-speed-wrap',
    'input-rot-speed',
    'script-bar',
    'btn-script-modal',
    'btn-script-prev',
    'btn-script-next',
    'btn-lobby',
    'lobby-modal',
    'room-pill',
    'btn-checkmate-stepback'
  ]) {
    assert.ok(!appTsx.includes(forbiddenId), `Forbidden UI element #${forbiddenId} found in App.tsx`);
  }
});

test('All 7 compressed 3D assets (.glb.gz.b64) decode and gunzip to valid glTF 2.0 binary models', () => {
  const expectedModels = [
    'option8_cathedral',
    'pawn_white',
    'rook_white',
    'knight_white',
    'bishop_white',
    'queen_white',
    'king_white'
  ];

  for (const name of expectedModels) {
    const b64Path = path.join(ROOT, 'public/assets/glb', `${name}.glb.gz.b64`);
    assert.ok(fs.existsSync(b64Path), `Missing 3D asset ${b64Path}`);
    const b64Text = fs.readFileSync(b64Path, 'utf-8').trim();
    assert.ok(b64Text.length > 1000, `Asset ${name}.glb.gz.b64 is unexpectedly small`);

    const gzBuf = Buffer.from(b64Text, 'base64');
    const glbBuf = zlib.gunzipSync(gzBuf);

    const magic = glbBuf.toString('ascii', 0, 4);
    const version = glbBuf.readUInt32LE(4);
    const totalLen = glbBuf.readUInt32LE(8);
    assert.equal(magic, 'glTF', `Invalid glTF magic header for ${name}`);
    assert.equal(version, 2, `Invalid glTF version for ${name}`);
    assert.equal(totalLen, glbBuf.length, `Mismatched glTF byte length for ${name}`);
  }
});

// =============================================================================
//  HYPERFOLD — fold kinematics, 4D tesseract topology & singularity scalars
// =============================================================================
import {
  CUBE_FACE_IDS,
  FACE_META,
  HYPER_LEVELS,
  cellLocal,
  faceFrames,
  lensingDeflection,
  localToCell,
  project4D,
  projectTesseract,
  rotate4D,
  tesseractEdges,
  tesseractVertices,
  levelTargets
} from '../src/hyperMath.js';

const SIDE = 2.2;

test('Cube net folds from six coplanar boards into an inward-facing box', () => {
  const flat = faceFrames(0, SIDE);
  const folded = faceFrames(1, SIDE);
  const h = SIDE / 2;

  assert.equal(Object.keys(flat).length, 6);
  assert.deepEqual(Object.keys(flat).sort(), [...CUBE_FACE_IDS].sort());

  // Flat net: every plate lies in the board plane (normal +Y).
  for (const id of CUBE_FACE_IDS) {
    const n = flat[id].n;
    assert.ok(Math.abs(n[0]) < 1e-9 && Math.abs(n[2]) < 1e-9, `${id} flat normal should be +Y`);
    assert.ok(n[1] > 0.999, `${id} flat normal should point up`);
  }

  // The net is a true cross: south/east/north/west plates sit one plate out.
  assert.ok(Math.abs(flat.south.position[2] - 2 * h) < 1e-9);
  assert.ok(Math.abs(flat.north.position[2] + 2 * h) < 1e-9);
  assert.ok(Math.abs(flat.east.position[0] - 2 * h) < 1e-9);
  assert.ok(Math.abs(flat.west.position[0] + 2 * h) < 1e-9);
  assert.ok(Math.abs(flat.lid.position[2] + 4 * h) < 1e-9, 'lid flap is the far end of the net');

  // Folded: each plate centre is ON the cube surface (max coord = half side)
  // and each inward normal points back at the Apex Singularity.
  for (const id of CUBE_FACE_IDS) {
    const f = folded[id];
    const maxCoord = Math.max(...f.position.map(Math.abs));
    assert.ok(Math.abs(maxCoord - h) < 1e-9, `${id} should rest on the cube shell`);
    const dot = f.n[0] * -f.position[0] + f.n[1] * -f.position[1] + f.n[2] * -f.position[2];
    assert.ok(dot > 0, `${id} inward normal must face the apex`);

    // Right-handed orthonormal basis.
    const [u, v, n] = [f.u, f.v, f.n];
    const cross = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];
    assert.ok(Math.hypot(u[0], u[1], u[2]) - 1 < 1e-9);
    assert.ok(Math.hypot(v[0], v[1], v[2]) - 1 < 1e-9);
    assert.ok(Math.hypot(...cross.map((c, i) => c - n[i])) < 1e-9, `${id} basis must be right-handed`);
  }
});

test('Board cell projections round-trip on every folded face', () => {
  for (const id of CUBE_FACE_IDS) {
    const turns = FACE_META[id].quarterTurns;
    assert.ok(turns === 0 || turns === 2, `${id} uses upright 0/180 texture orientation`);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const [x, y] = cellLocal(id, r, c, SIDE, 8);
        assert.ok(Math.abs(x) < SIDE / 2 + 1e-9 && Math.abs(y) < SIDE / 2 + 1e-9);
        const back = localToCell(id, x, y, SIDE, 8);
        assert.deepEqual(back, { r, c }, `${id} ${r},${c} should round-trip`);
      }
    }
  }
  assert.equal(localToCell('base', SIDE, SIDE, SIDE, 8), null);
});

test('Tesseract has hypercube topology and rotations preserve 4-norms', () => {
  const verts = tesseractVertices();
  const edges = tesseractEdges();
  assert.equal(verts.length, 16);
  assert.equal(edges.length, 32);

  for (const [a, b] of edges) {
    let diff = 0;
    for (let i = 0; i < 4; i++) if (verts[a][i] !== verts[b][i]) diff++;
    assert.equal(diff, 1, 'every tesseract edge must flip exactly one coordinate');
  }

  for (const plane of ['xy', 'xz', 'xw', 'yz', 'yw', 'zw']) {
    const v = [0.4, -0.7, 1.1, 0.25];
    const rot = rotate4D(v, plane, 0.63);
    const norm = (a) => Math.hypot(a[0], a[1], a[2], a[3]);
    assert.ok(Math.abs(norm(rot) - norm(v)) < 1e-9, `${plane} rotation must be an isometry`);
  }

  const proj = project4D([1, 2, 3, 1], 3.2);
  assert.equal(proj.length, 3);
  assert.ok(proj.every((n) => Number.isFinite(n)));

  const tess = projectTesseract({ scale: 1.1, rotation: [{ plane: 'xw', angle: 0.7 }] });
  assert.equal(tess.vertices.length, 16);
  assert.equal(tess.edges.length, 32);
  assert.equal(tess.wValues.length, 16);
  // Two interlocked cells, one per w-sign, each a cube of 8 vertices.
  assert.equal(tess.wValues.filter((w) => w < 0).length, 8);
  assert.equal(tess.wValues.filter((w) => w > 0).length, 8);
});

test('Gravitational lensing grows as the impact parameter shrinks', () => {
  const near = lensingDeflection(0.2, 1);
  const mid = lensingDeflection(1, 1);
  const far = lensingDeflection(4, 1);
  assert.ok(near > mid && mid > far);
  assert.ok(near > 0);
  assert.ok(lensingDeflection(1, 0) === 0);
  assert.ok(lensingDeflection(1, 2) > lensingDeflection(1, 1));
});

test('Hyperfold level ladder runs from the dormant sanctum out past the tesseract', () => {
  assert.equal(HYPER_LEVELS.length, 6);
  assert.deepEqual(HYPER_LEVELS.map((l) => l.id), [0, 1, 2, 3, 4, 5]);
  assert.equal(new Set(HYPER_LEVELS.map((l) => l.key)).size, 6);
  for (const level of HYPER_LEVELS) {
    assert.ok(typeof level.name === 'string' && level.name.length > 3);
    assert.ok(typeof level.tagline === 'string' && level.tagline.length > 10);
    assert.ok(Array.isArray(level.cameraOffset) && level.cameraOffset.length === 3);
    assert.ok(level.boardOpacity >= 0 && level.boardOpacity <= 1);
  }
  assert.equal(HYPER_LEVELS[0].boardOpacity, 0, 'the dormant level hides the shell');
  assert.equal(HYPER_LEVELS[3].cones, 1, 'the apex level reveals the hidden cones');
  assert.equal(HYPER_LEVELS[4].exo, 1, 'the exterior level mirrors the boards outward');
  assert.equal(levelTargets(4).exo, 1);
});

test('Hyperfold HUD, engine wiring and six playable observers are present', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  for (const requiredId of [
    'btn-hyper-pill',
    'btn-open-hyperfold',
    'quantum-tab-hyperfold',
    'hyper-level-chips',
    'hyper-fold-range',
    'btn-hyper-enter',
    'btn-hyper-core',
    'btn-hyper-outside',
    'btn-hyper-cones',
    'btn-hyper-exo',
    'btn-hyper-pulse',
    'hyper-telemetry',
    'hyper-mass-range',
    'hyper-lens-range'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing Hyperfold control #${requiredId}`);
  }

  assert.ok(appTsx.includes('btn-hyper-level-${lvl.id}'), 'Level chips must be generated for every rung');
  assert.ok((appTsx.match(/hyper-level-chip/g) || []).length >= 2, 'Level chips must be styled');

  const engineSrc = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  assert.ok(engineSrc.includes("from './hyperfoldEngine.js'"));
  assert.ok(engineSrc.includes('new HyperfoldEngine('));
  assert.ok(engineSrc.includes('hyperEngine.update(dt)'));
  assert.ok(engineSrc.includes('hyperEngine.raycast(raycaster)'));
  assert.ok(engineSrc.includes('setHyperLevel'));
  assert.ok(engineSrc.includes('getHyperTelemetry'));

  const hyperSrc = fs.readFileSync(path.join(ROOT, 'src/hyperfoldEngine.js'), 'utf-8');
  assert.ok(hyperSrc.includes('Apex Singularity'));
  assert.ok(hyperSrc.includes('projectTesseract'));
  assert.ok(hyperSrc.includes('raycast(raycaster)'));
  assert.ok(hyperSrc.includes('getTelemetry()'));
});
