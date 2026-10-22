import * as THREE_NS from 'three';
import {
  CUBE_FACE_IDS,
  FACE_META,
  HYPER_LEVELS,
  clamp01,
  damp,
  faceFrames,
  getLevel,
  levelCameraPose,
  levelTargets,
  localToCell,
  projectTesseract,
  tesseractRotationAt
} from './hyperMath.js';

/** @type {any} */
const THREE = THREE_NS;

const PIECE_GLYPHS = {
  pawn: '♟',
  rook: '♜',
  knight: '♞',
  bishop: '♝',
  queen: '♛',
  king: '♚'
};

const PIECE_NAMES = {
  pawn: 'PAWN',
  rook: 'ROOK',
  knight: 'KNIGHT',
  bishop: 'BISHOP',
  queen: 'QUEEN',
  king: 'KING'
};

const FACE_TEXTURE_SIZE = 768;

// =============================================================================
//  Shared GLSL
// =============================================================================
const HASH_GLSL = `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm2(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * vnoise2(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return v;
  }
`;

// =============================================================================
//  HyperfoldEngine
// =============================================================================
export class HyperfoldEngine {
  /**
   * @param {object} opts
   * @param {any} opts.scene
   * @param {any} opts.camera
   * @param {number} [opts.side]  cube edge length in world metres
   * @param {any} [opts.center]   world-space Apex Singularity position
   * @param {() => any} [opts.getBoardState]
   * @param {() => any} [opts.getSelection]
   * @param {(level: any, pose: any) => void} [opts.onLevelChange]
   */
  constructor(opts = {}) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.side = opts.side || 2.2;
    this.center = opts.center ? opts.center.clone() : new THREE.Vector3(0, 3.05, 0);
    this.getBoardState = opts.getBoardState || (() => null);
    this.getSelection = opts.getSelection || (() => ({}));
    this.onLevelChange = opts.onLevelChange || null;

    this.levelIndex = 1;
    this.levelKey = 'fold';
    this.time = 0;
    this.fold = 1;
    this.foldTarget = 1;
    this.visible = true;
    this.conesRevealed = false;
    this.lensingBoost = 1;
    this.massBoost = 1;
    this.exoOverride = null;
    this.pulseEnergy = 0;

    // Smoothed level scalars (start at level 1 so nothing pops).
    const t0 = levelTargets(1);
    this.boardOpacity = t0.boardOpacity;
    this.mass = t0.mass;
    this.lensing = t0.lensing;
    this.tessOpacity = t0.tesseract;
    this.coneOpacity = t0.cones;
    this.exoOpacity = t0.exo;
    this.veilOpacity = t0.veil;
    this.particleOpacity = t0.particles;
    this.spin = t0.spin;

    this._targets = t0;
    this._repaintTimer = 0;
    this._lastSignature = '';
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpM = new THREE.Matrix4();
    this._pickers = [];
    this._gravityWaves = [];
    this._faceMeshes = [];

    this._build();
    this._paintAll(true);
  }

  // ---------------------------------------------------------------------------
  //  Scene graph construction
  // ---------------------------------------------------------------------------
  _build() {
    const side = this.side;
    const h = side * 0.5;

    this.root = new THREE.Group();
    this.root.name = 'hyperfold-sanctum';
    this.root.position.copy(this.center);
    this.scene.add(this.root);

    this.shellGroup = new THREE.Group();
    this.exoGroup = new THREE.Group();
    this.coneGroup = new THREE.Group();
    this.veilGroup = new THREE.Group();
    this.bhGroup = new THREE.Group();
    this.tesseractGroup = new THREE.Group();
    this.root.add(this.shellGroup, this.exoGroup, this.coneGroup, this.veilGroup, this.bhGroup, this.tesseractGroup);

    // Picking rig lives outside the scene graph; matrices are synced manually.
    this.pickRoot = new THREE.Group();
    this.pickRoot.matrixAutoUpdate = false;

    this.planeGeo = new THREE.PlaneGeometry(side, side);
    this.pickGeo = new THREE.PlaneGeometry(side, side);

    // ---------------------------------------------------------------------
    //  Six live board plates + outside plates + apex cones
    // ---------------------------------------------------------------------
    this.faces = {};
    for (const id of CUBE_FACE_IDS) {
      const meta = FACE_META[id];
      const canvas = document.createElement('canvas');
      canvas.width = FACE_TEXTURE_SIZE;
      canvas.height = FACE_TEXTURE_SIZE;
      const ctx = canvas.getContext('2d');
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;

      const group = new THREE.Group();
      group.matrixAutoUpdate = false;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const mesh = new THREE.Mesh(this.planeGeo, material);
      mesh.renderOrder = 3;
      group.add(mesh);

      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(meta.accent),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(this.planeGeo), edgeMat);
      edges.renderOrder = 4;
      group.add(edges);

      this.shellGroup.add(group);

      // Outside (exo) shell plate, revealed on the higher levels
      const exoMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const exoMesh = new THREE.Mesh(this.planeGeo, exoMat);
      exoMesh.renderOrder = 5;
      const exoPlane = new THREE.Group();
      exoPlane.matrixAutoUpdate = false;
      exoPlane.add(exoMesh);
      this.exoGroup.add(exoPlane);

      // Hidden apex cone: base on the face plate, tip kissing the singularity
      const coneRadius = h * 0.94;
      const coneGeo = new THREE.ConeGeometry(coneRadius, h, 36, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(meta.accent),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const coneWireMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(meta.accent),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        wireframe: true,
        toneMapped: false
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      const coneWire = new THREE.Mesh(coneGeo, coneWireMat);
      cone.renderOrder = 2;
      coneWire.renderOrder = 2;
      const conePivot = new THREE.Group();
      conePivot.add(cone, coneWire);
      const mouthRing = new THREE.Mesh(
        new THREE.RingGeometry(coneRadius * 0.92, coneRadius * 0.99, 64),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(meta.accent),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false
        })
      );
      mouthRing.renderOrder = 3;
      const ringPivot = new THREE.Group();
      ringPivot.add(mouthRing);
      this.coneGroup.add(conePivot, ringPivot);

      // Ray picking plane (same footprint as the plate)
      const pick = new THREE.Mesh(
        this.pickGeo,
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, depthWrite: false, transparent: true, opacity: 0 })
      );
      pick.matrixAutoUpdate = false;
      pick.userData.face = id;
      this.pickRoot.add(pick);
      this._pickers.push(pick);

      this.faces[id] = {
        id,
        meta,
        canvas,
        ctx,
        texture,
        group,
        mesh,
        material,
        edges,
        edgeMat,
        exoPlane,
        exoMat,
        conePivot,
        cone,
        coneWire,
        coneMat,
        coneWireMat,
        ringPivot,
        mouthRing,
        mouthMat: mouthRing.material,
        pick
      };
      this._faceMeshes.push(mesh);
    }

    this._buildSingularity();
    this._buildTesseract();
    this._buildVeils();

    // Quantum beacon: the singularity's cold light bleeding into the cathedral
    this.singularityLight = new THREE.PointLight(0x7df9ff, 0, side * 3.6, 1.7);
    this.bhGroup.add(this.singularityLight);

    this._applyFrames(1);
    this._syncPickMatrices();
  }

  // ---------------------------------------------------------------------------
  //  The black hole / Apex Singularity
  // ---------------------------------------------------------------------------
  _buildSingularity() {
    const side = this.side;
    const h = side * 0.5;
    const rh = side * 0.052;

    const bh = this.bhGroup;

    // Event horizon
    const horizonMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMass: { value: 1 },
        uOpacity: { value: 1 }
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uMass;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float fres = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
          float rim = pow(fres, 3.2);
          float whip = pow(max(0.0, 0.5 + 0.5 * sin(uTime * 2.3 + vNormal.y * 5.0)), 8.0);
          vec3 edge = mix(vec3(0.15, 0.72, 1.0), vec3(1.0, 0.62, 0.22), whip);
          vec3 col = mix(vec3(0.0, 0.0, 0.0), edge, rim * 0.9);
          gl_FragColor = vec4(col, (0.18 + rim * 0.82) * uOpacity);
        }
      `
    });
    this.horizon = new THREE.Mesh(new THREE.SphereGeometry(rh, 40, 28), horizonMat);
    this.horizon.renderOrder = 8;
    bh.add(this.horizon);

    // Accretion disk (lies in the XZ plane)
    const diskMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMass: { value: 1 },
        uOpacity: { value: 0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uMass;
        uniform float uOpacity;
        varying vec2 vUv;
        ${HASH_GLSL}
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float inner = 0.17;
          float outer = 0.995;
          if (r < inner || r > outer) discard;
          float ang = atan(p.y, p.x);
          float rn = (r - inner) / (outer - inner);
          float spin = ang - uTime * (0.55 + 0.35 * uMass) / (0.28 + r * 2.2);
          float arms = 0.5 + 0.5 * sin(spin * 5.0 + rn * 22.0 + uTime * 1.1);
          float turb = fbm2(vec2(cos(ang), sin(ang)) * 2.2 + vec2(r * 8.0, uTime * 0.55));
          float dens = smoothstep(0.0, 0.3, rn) * (1.0 - smoothstep(0.66, 1.0, rn));
          dens *= 0.42 + 0.72 * arms + 0.46 * turb;
          float dopp = 0.5 + 1.05 * pow(0.5 + 0.5 * cos(ang), 2.2);
          vec3 hot = vec3(1.0, 0.97, 0.94);
          vec3 mid = vec3(1.0, 0.58, 0.20);
          vec3 cool = vec3(0.42, 0.10, 0.40);
          vec3 col = mix(hot, mid, smoothstep(0.02, 0.52, rn));
          col = mix(col, cool, smoothstep(0.58, 1.0, rn));
          col *= dopp;
          float alpha = clamp(dens * 0.92, 0.0, 1.0) * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    this.disk = new THREE.Mesh(new THREE.PlaneGeometry(side * 0.62, side * 0.62), diskMat);
    this.disk.rotation.x = -Math.PI * 0.5;
    this.disk.renderOrder = 9;
    bh.add(this.disk);

    // Photon ring + Einstein halo (both camera-facing billboards)
    const ringMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMass: { value: 1 },
        uOpacity: { value: 0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uMass;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          float dRing = (r - 0.44) / 0.030;
          float dThin = (r - 0.505) / 0.011;
          float ring = exp(-dRing * dRing);
          float thin = exp(-dThin * dThin) * 0.75;
          float halo = exp(-(r / 0.62) * (r / 0.62)) * 0.26;
          float shimmer = 0.82 + 0.18 * sin(a * 7.0 + uTime * 1.9) * cos(a * 3.0 - uTime * 1.1);
          vec3 col = mix(vec3(1.0, 0.72, 0.34), vec3(0.62, 0.93, 1.0), smoothstep(0.15, 0.62, r));
          float alpha = (ring + thin + halo) * shimmer * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    this.photonRing = new THREE.Mesh(new THREE.PlaneGeometry(side * 0.95, side * 0.95), ringMat);
    this.photonRing.renderOrder = 10;
    bh.add(this.photonRing);

    // Lensed starfield shell: light from the fourth dimension bent around the horizon
    const lensMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMass: { value: 1 },
        uLens: { value: 1 },
        uOpacity: { value: 0 }
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uMass;
        uniform float uLens;
        uniform float uOpacity;
        varying vec3 vDir;
        float hash13(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }
        void main() {
          vec3 d = normalize(vDir);
          float R = length(d.xy);
          float a = atan(d.y, d.x);
          float lens = uLens * uMass;
          float rr = R / max(0.18, 1.0 - lens * 0.28 * R);
          vec2 q = vec2(cos(a), sin(a)) * rr * 4.2;
          float n = 0.0;
          float amp = 0.55;
          vec2 pp = q;
          for (int i = 0; i < 4; i++) {
            n += amp * (0.5 + 0.5 * sin(pp.x * 2.6 + uTime * 0.11) * cos(pp.y * 2.2 - uTime * 0.08));
            pp *= 2.01;
            amp *= 0.5;
          }
          float stars = pow(hash13(vec3(floor(q * 20.0), floor(uTime * 0.35))), 44.0) * 3.4;
          float dRing = (R - 0.38 * uMass) / 0.045;
          float ring = exp(-dRing * dRing);
          vec3 col = mix(vec3(0.24, 0.44, 1.0), vec3(1.0, 0.66, 0.32), n);
          float alpha = (0.045 + 0.2 * n) * uOpacity;
          alpha += ring * uOpacity * 0.45;
          alpha += stars * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    this.lensShell = new THREE.Mesh(new THREE.SphereGeometry(side * 0.45, 48, 32), lensMat);
    this.lensShell.renderOrder = 7;
    bh.add(this.lensShell);

    // Relativistic polar jets (Hyperwild only)
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x9fe9ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    this.jetTop = new THREE.Mesh(new THREE.ConeGeometry(side * 0.055, side * 0.62, 24, 1, true), jetMat);
    this.jetTop.position.y = side * 0.34;
    this.jetTop.renderOrder = 8;
    this.jetBottom = this.jetTop.clone();
    this.jetBottom.position.y = -side * 0.34;
    this.jetBottom.rotation.z = Math.PI;
    bh.add(this.jetTop, this.jetBottom);
    this.jetMat = jetMat;

    // Gravity-wave rings
    for (let i = 0; i < 3; i++) {
      const ringMatW = new THREE.MeshBasicMaterial({
        color: 0x66e8ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.0, 96), ringMatW);
      ring.rotation.x = -Math.PI * 0.5;
      ring.renderOrder = 6;
      bh.add(ring);
      this._gravityWaves.push({ mesh: ring, offset: i / 3, mat: ringMatW });
    }

    // Inspiralling photon stream
    const COUNT = 780;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const radius = new Float32Array(COUNT);
    const angle = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    const incline = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      radius[i] = (0.16 + Math.pow(Math.random(), 0.7) * 0.8) * side;
      angle[i] = Math.random() * Math.PI * 2;
      speed[i] = (0.25 + Math.random() * 0.85) * (1.6 / (radius[i] + 0.15));
      incline[i] = (Math.random() - 0.5) * 1.15;
      size[i] = 0.6 + Math.random() * 2.2;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radius, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aIncline', new THREE.BufferAttribute(incline, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    const particleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uScale: { value: side }
      },
      vertexShader: /* glsl */ `
        attribute float aRadius;
        attribute float aAngle;
        attribute float aSpeed;
        attribute float aIncline;
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uPixelRatio;
        uniform float uScale;
        varying float vMix;
        varying float vFade;
        void main() {
          float ang = aAngle + uTime * aSpeed;
          float r = aRadius * (1.0 - 0.035 * sin(uTime * 0.7 + aSeed * 6.28));
          vec3 axis = normalize(vec3(cos(aSeed * 6.283), aIncline, sin(aSeed * 6.283 + 1.31)));
          vec3 e1 = normalize(cross(axis, vec3(0.0, 1.0, 0.0)) + vec3(0.001, 0.0, 0.0));
          vec3 e2 = cross(axis, e1);
          vec3 p = (e1 * cos(ang) + e2 * sin(ang)) * r;
          p.y += sin(uTime * 0.6 + aSeed * 12.0) * 0.012 * uScale;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (46.0 / max(0.4, -mv.z));
          float inner = smoothstep(0.15, 0.9, r / uScale);
          vMix = 1.0 - inner;
          vFade = uOpacity;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vMix;
        varying float vFade;
        void main() {
          vec2 c = gl_PointCoord * 2.0 - 1.0;
          float d = length(c);
          if (d > 1.0) discard;
          float glow = pow(1.0 - d, 2.2);
          vec3 hot = vec3(1.0, 0.93, 0.78);
          vec3 cool = vec3(0.34, 0.84, 1.0);
          vec3 col = mix(cool, hot, vMix);
          gl_FragColor = vec4(col, glow * vFade);
        }
      `
    });
    this.particles = new THREE.Points(geo, particleMat);
    this.particles.frustumCulled = false;
    this.particles.renderOrder = 11;
    bh.add(this.particles);
    this.particleMat = particleMat;
    this.photonCount = COUNT;
  }

  // ---------------------------------------------------------------------------
  //  Tesseract wireframe
  // ---------------------------------------------------------------------------
  _buildTesseract() {
    const edgeCount = 32;
    this.tessPositions = new Float32Array(edgeCount * 2 * 3);
    this.tessColors = new Float32Array(edgeCount * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.tessPositions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.tessColors, 3).setUsage(THREE.DynamicDrawUsage));
    this.tessGeo = geo;
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    this.tessMat = mat;
    this.tessLines = new THREE.LineSegments(geo, mat);
    this.tessLines.frustumCulled = false;
    this.tessLines.renderOrder = 6;
    this.tesseractGroup.add(this.tessLines);

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.tessPointGeo = pointGeo;
    this.tessPointMat = new THREE.PointsMaterial({
      color: 0xd9f7ff,
      size: this.side * 0.03,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false
    });
    this.tessPoints = new THREE.Points(pointGeo, this.tessPointMat);
    this.tessPoints.frustumCulled = false;
    this.tessPoints.renderOrder = 6;
    this.tesseractGroup.add(this.tessPoints);
  }

  // ---------------------------------------------------------------------------
  //  Volumetric light veils (the "inside of the tesseract" light)
  // ---------------------------------------------------------------------------
  _buildVeils() {
    const veilMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uTint: { value: new THREE.Color(0x63e6ff) }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uTint;
        varying vec2 vUv;
        ${HASH_GLSL}
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          vec2 q = p * 2.4;
          float n1 = fbm2(q + vec2(0.0, uTime * 0.12));
          float n2 = fbm2(q * 1.7 - vec2(uTime * 0.09, 0.0));
          float filament = pow(abs(n1 - n2), 1.4) * 3.2;
          float falloff = pow(1.0 - r, 1.7);
          float alpha = filament * falloff * 0.42 * uOpacity;
          vec3 col = mix(uTint, vec3(1.0, 0.78, 0.45), n1 * 0.7);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    this.veilMat = veilMat;
    const veilGeo = new THREE.PlaneGeometry(this.side * 2.0, this.side * 2.0);
    this._veils = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(veilGeo, veilMat);
      m.rotation.set(
        Math.PI * 0.5 + (Math.random() - 0.5) * 0.8,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      m.renderOrder = 2;
      this.veilGroup.add(m);
      this._veils.push(m);
    }
  }

  // ---------------------------------------------------------------------------
  //  Fold kinematics
  // ---------------------------------------------------------------------------
  _applyFrames(fold) {
    const frames = faceFrames(fold, this.side);
    const h = this.side * 0.5;
    this._frames = frames;

    for (const id of CUBE_FACE_IDS) {
      const f = frames[id];
      const face = this.faces[id];
      const u = new THREE.Vector3(f.u[0], f.u[1], f.u[2]);
      const v = new THREE.Vector3(f.v[0], f.v[1], f.v[2]);
      const n = new THREE.Vector3(f.n[0], f.n[1], f.n[2]);
      const p = new THREE.Vector3(f.position[0], f.position[1], f.position[2]);

      this._tmpM.makeBasis(u, v, n).setPosition(p);
      face.group.matrix.copy(this._tmpM);

      // Exo plate: reflected through the shell face, offset just outside
      const eu = u.clone().multiplyScalar(-1);
      const ev = v.clone();
      const en = n.clone().multiplyScalar(-1);
      const ep = p.clone().addScaledVector(n, -0.006);
      this._tmpM.makeBasis(eu, ev, en).setPosition(ep);
      face.exoPlane.matrix.copy(this._tmpM);

      // Cone: base at the plate, tip at the Apex
      const tipDir = n.clone().normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);
      face.conePivot.position.copy(p).multiplyScalar(0.5);
      face.conePivot.quaternion.copy(q);
      face.ringPivot.position.copy(p);
      face.ringPivot.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tipDir));

      face.pick.matrix.copy(this._tmpM.makeBasis(u, v, n).setPosition(p));
    }

    // Cache for telemetry / tests
    this.faceCenters = CUBE_FACE_IDS.map((id) => frames[id].position.slice());
    this.apex = [0, 0, 0];
    this.innerRadius = h;
  }

  _syncPickMatrices() {
    this.root.updateMatrixWorld(true);
    this.pickRoot.matrix.copy(this.root.matrixWorld);
    this.pickRoot.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------------------
  //  Board plates — one live wave function painted on six faces
  // ---------------------------------------------------------------------------
  _stateSignature() {
    const board = this.getBoardState();
    const sel = this.getSelection() || {};
    let sig = '';
    if (Array.isArray(board)) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r]?.[c];
          if (!p) {
            sig += '.';
          } else {
            sig += `${p.color}${p.type[0]}${Math.round((p.coherence ?? 1) * 4)}`;
          }
        }
      }
    }
    sig += `|${sel.selected ? `${sel.selected.r},${sel.selected.c}` : '-'}`;
    sig += `|${sel.turn || '-'}`;
    sig += `|${(sel.validMoves || []).map((m) => `${m.r},${m.c}`).join(';')}`;
    const lm = sel.lastMove;
    sig += `|${lm ? `${lm.fromR}${lm.fromC}${lm.toR}${lm.toC}` : '-'}`;
    return sig;
  }

  _paintAll(force = false) {
    const sig = this._stateSignature();
    if (!force && sig === this._lastSignature) return false;
    this._lastSignature = sig;
    for (const id of CUBE_FACE_IDS) this._paintFace(id);
    return true;
  }

  _paintFace(faceId) {
    const face = this.faces[faceId];
    if (!face) return;
    const { ctx, canvas, meta } = face;
    const S = canvas.width;
    const sq = S / 8;
    const board = this.getBoardState();
    const sel = this.getSelection() || {};
    const turn = sel.turn || 'w';
    const accent = meta.accent;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.save();

    // Orient the whole painting so glyphs read upright from inside the box.
    const turns = meta.quarterTurns % 4;
    if (turns) {
      ctx.translate(S / 2, S / 2);
      ctx.rotate((turns * Math.PI) / 2);
      ctx.translate(-S / 2, -S / 2);
    }

    // --- Quantum glass substrate -------------------------------------------
    const bg = ctx.createRadialGradient(S * 0.5, S * 0.5, S * 0.06, S * 0.5, S * 0.5, S * 0.72);
    bg.addColorStop(0, 'rgba(8, 18, 30, 0.20)');
    bg.addColorStop(0.55, 'rgba(6, 12, 22, 0.12)');
    bg.addColorStop(1, 'rgba(2, 4, 10, 0.02)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // --- Board squares ------------------------------------------------------
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = c * sq;
        const y = r * sq;
        const light = (r + c) % 2 === 0;
        ctx.fillStyle = light ? 'rgba(226, 240, 248, 0.085)' : 'rgba(4, 10, 20, 0.05)';
        ctx.fillRect(x + 1, y + 1, sq - 2, sq - 2);
        // faint interference hatch on dark squares
        if (!light) {
          ctx.strokeStyle = 'rgba(120, 220, 255, 0.045)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 6, y + sq - 6);
          ctx.lineTo(x + sq - 6, y + 6);
          ctx.stroke();
        }
      }
    }

    // Grid + border
    ctx.strokeStyle = 'rgba(150, 232, 255, 0.13)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * sq, 0);
      ctx.lineTo(i * sq, S);
      ctx.moveTo(0, i * sq);
      ctx.lineTo(S, i * sq);
      ctx.stroke();
    }
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, S - 6, S - 6);
    ctx.globalAlpha = 1;

    // Corner brackets
    const bl = S * 0.055;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.66;
    ctx.lineWidth = 5;
    const corners = [
      [0, 0, 1, 1],
      [S, 0, -1, 1],
      [0, S, 1, -1],
      [S, S, -1, -1]
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * bl, cy + 2);
      ctx.lineTo(cx + dx * 2, cy + dy * 2);
      ctx.lineTo(cx + 2, cy + dy * bl);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Concentric Apex projection at the plate centre
    ctx.strokeStyle = 'rgba(255, 226, 150, 0.24)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S * (0.055 + i * 0.028), 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Highlights ---------------------------------------------------------
    const lm = sel.lastMove;
    if (lm) {
      for (const [r, c] of [
        [lm.fromR, lm.fromC],
        [lm.toR, lm.toC]
      ]) {
        if (r === undefined || c === undefined) continue;
        ctx.strokeStyle = 'rgba(120, 245, 255, 0.55)';
        ctx.lineWidth = 3;
        ctx.strokeRect(c * sq + 4, r * sq + 4, sq - 8, sq - 8);
      }
    }
    if (sel.selected) {
      const { r, c } = sel.selected;
      ctx.save();
      ctx.shadowColor = '#f5d76e';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = 'rgba(255, 226, 140, 0.95)';
      ctx.lineWidth = 4;
      ctx.strokeRect(c * sq + 3, r * sq + 3, sq - 6, sq - 6);
      ctx.restore();
    }
    for (const m of sel.validMoves || []) {
      const cx = m.c * sq + sq / 2;
      const cy = m.r * sq + sq / 2;
      ctx.fillStyle = 'rgba(140, 250, 225, 0.32)';
      ctx.beginPath();
      ctx.arc(cx, cy, sq * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 255, 240, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // --- Pieces -------------------------------------------------------------
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontPx = Math.floor(sq * 0.76);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board?.[r]?.[c];
        if (!p) continue;
        const cx = c * sq + sq / 2;
        const cy = r * sq + sq / 2;
        const isWhite = p.color === 'w';
        const glyph = PIECE_GLYPHS[p.type] || '●';
        const coh = typeof p.coherence === 'number' ? clamp01(p.coherence) : 1;

        ctx.save();
        ctx.globalAlpha = 0.35 + coh * 0.65;
        ctx.font = `${fontPx}px "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", serif`;
        ctx.shadowColor = isWhite ? 'rgba(120, 250, 255, 0.95)' : 'rgba(199, 125, 255, 0.95)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = isWhite ? '#eafcff' : '#d9b6ff';
        ctx.fillText(glyph, cx, cy - sq * 0.02);
        ctx.restore();

        // Coherence arc (Ψ)
        ctx.save();
        ctx.lineWidth = Math.max(2, sq * 0.035);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.arc(cx, cy, sq * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = isWhite ? 'rgba(89, 246, 255, 0.85)' : 'rgba(199, 125, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, sq * 0.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * coh);
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- Labels -------------------------------------------------------------
    const pad = S * 0.018;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = accent;
    ctx.font = `600 ${Math.floor(S * 0.024)}px "Inter", "Segoe UI", sans-serif`;
    ctx.fillText(`OBSERVER ${meta.roman} · ${meta.label}`, pad, pad);
    ctx.textAlign = 'right';
    ctx.fillStyle = turn === 'w' ? '#9ff6ff' : '#d7b0ff';
    ctx.fillText(turn === 'w' ? 'WHITE Ψ' : 'BLACK Ψ', S - pad, pad);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(200, 230, 255, 0.45)';
    ctx.font = `500 ${Math.floor(S * 0.017)}px "Inter", "Segoe UI", sans-serif`;
    ctx.fillText(`SAME WAVE FUNCTION · 8×8 · ${PIECE_NAMES[sel.lastMove?.pieceType] || 'APEX FEED'}`, pad, S - pad);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 226, 150, 0.55)';
    ctx.fillText('QUANTUM WIZARD CHESS', S - pad, S - pad);
    ctx.restore();

    ctx.restore();
    face.texture.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  //  Level control
  // ---------------------------------------------------------------------------
  setLevel(index, options = {}) {
    const i = Math.max(0, Math.min(HYPER_LEVELS.length - 1, Math.round(index)));
    const prev = this.levelIndex;
    this.levelIndex = i;
    this.levelKey = getLevel(i).key;
    this._targets = levelTargets(i);
    this.foldTarget = this._targets.fold;
    if (options.immediate) {
      this.boardOpacity = this._targets.boardOpacity;
      this.mass = this._targets.mass;
      this.lensing = this._targets.lensing;
      this.tessOpacity = this._targets.tesseract;
      this.coneOpacity = this._targets.cones;
      this.exoOpacity = this._targets.exo;
      this.veilOpacity = this._targets.veil;
      this.particleOpacity = this._targets.particles;
      this.spin = this._targets.spin;
      this.fold = this._targets.fold;
    }
    this.pulseEnergy = prev === i ? this.pulseEnergy : 1;
    if (this.onLevelChange) this.onLevelChange(i, this.getCameraPose('level'));
    return this.getTelemetry();
  }

  setFold(value) {
    this.foldTarget = clamp01(value);
  }

  setCones(force) {
    this.conesRevealed = typeof force === 'boolean' ? force : !this.conesRevealed;
    return this.conesRevealed;
  }

  setExo(force) {
    this.exoOverride = typeof force === 'boolean' ? force : !this.exoOverride;
    return this.exoOverride;
  }

  setLensingBoost(value) {
    this.lensingBoost = Math.max(0, Math.min(3, value));
    return this.lensingBoost;
  }

  setMass(value) {
    this.massBoost = Math.max(0.2, Math.min(2.5, value));
    return this.massBoost;
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
  }

  pulse() {
    this.pulseEnergy = 1;
    return true;
  }

  refreshFaces() {
    return this._paintAll(true);
  }

  getCameraPose(mode = 'level') {
    return levelCameraPose(this.levelIndex, this.center.toArray(), mode);
  }

  // ---------------------------------------------------------------------------
  //  Picking — every face is a playable view of the one board
  // ---------------------------------------------------------------------------
  raycast(raycaster) {
    if (!this.root.visible || this.boardOpacity < 0.06) return null;
    this._syncPickMatrices();
    const hits = raycaster.intersectObjects(this._pickers, false);
    if (!hits.length) return null;
    for (const hit of hits) {
      const local = hit.object.worldToLocal(hit.point.clone());
      const cell = localToCell(hit.object.userData.face, local.x, local.y, this.side, 8);
      if (cell) {
        return { r: cell.r, c: cell.c, face: hit.object.userData.face, distance: hit.distance };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  //  Per-frame
  // ---------------------------------------------------------------------------
  update(dt) {
    const d = Math.min(0.12, Math.max(0, dt));
    this.time += d;
    const t = this._targets;

    const lam = 2.9;
    this.fold = damp(this.fold, this.foldTarget, 3.6, d);
    this.boardOpacity = damp(this.boardOpacity, t.boardOpacity, lam, d);
    this.mass = damp(this.mass, t.mass, lam, d);
    this.lensing = damp(this.lensing, t.lensing, lam, d);
    this.tessOpacity = damp(this.tessOpacity, t.tesseract, lam, d);
    this.coneOpacity = damp(this.coneOpacity, this.conesRevealed ? Math.max(t.cones, 0.72) : t.cones, lam, d);
    this.exoOpacity = damp(this.exoOpacity, this.exoOverride === null ? t.exo : this.exoOverride ? 1 : 0, lam, d);
    this.veilOpacity = damp(this.veilOpacity, t.veil, lam, d);
    this.particleOpacity = damp(this.particleOpacity, t.particles, lam, d);
    this.spin = damp(this.spin, t.spin, 1.7, d);
    this.pulseEnergy = Math.max(0, this.pulseEnergy - d * 0.62);

    const active = this.visible && (this.levelIndex > 0 || this.boardOpacity > 0.004);
    this.root.visible = active;
    if (!active) return;

    // --- Fold the net -------------------------------------------------------
    this._applyFrames(this.fold);

    const shellPulse = 0.92 + 0.08 * Math.sin(this.time * 1.7);
    for (const id of CUBE_FACE_IDS) {
      const face = this.faces[id];
      const op = this.boardOpacity * shellPulse;
      face.material.opacity = op;
      face.edgeMat.opacity = Math.min(1, op * 1.15 + 0.05);
      face.exoMat.opacity = this.exoOpacity * this.boardOpacity * 0.92;
      face.coneMat.opacity = this.coneOpacity * 0.045;
      face.coneWireMat.opacity = this.coneOpacity * 0.16;
      face.mouthMat.opacity = this.coneOpacity * 0.15;
    }

    // --- Live board plates --------------------------------------------------
    this._repaintTimer -= d;
    if (this._repaintTimer <= 0) {
      this._repaintTimer = 0.2;
      this._paintAll(false);
    }

    // --- Apex Singularity ---------------------------------------------------
    const mass = this.mass * this.massBoost;
    const lens = this.lensing * this.lensingBoost;
    const bhScale = 0.78 + mass * 0.26 + this.pulseEnergy * 0.06;
    this.bhGroup.scale.setScalar(bhScale);
    this.bhGroup.rotation.y += d * 0.06 * (1 + this.spin);

    this.horizon.material.uniforms.uTime.value = this.time;
    this.horizon.material.uniforms.uMass.value = mass;
    this.horizon.material.uniforms.uOpacity.value = clamp01(mass / 0.35);

    this.disk.material.uniforms.uTime.value = this.time;
    this.disk.material.uniforms.uMass.value = mass;
    this.disk.material.uniforms.uOpacity.value = clamp01(mass / 0.3) * (0.72 + this.pulseEnergy * 0.4);

    this.photonRing.material.uniforms.uTime.value = this.time;
    this.photonRing.material.uniforms.uMass.value = mass;
    this.photonRing.material.uniforms.uOpacity.value = clamp01(mass / 0.25) * (0.8 + this.pulseEnergy * 0.5);
    this.photonRing.quaternion.copy(this.camera.quaternion);

    this.lensShell.material.uniforms.uTime.value = this.time;
    this.lensShell.material.uniforms.uMass.value = mass;
    this.lensShell.material.uniforms.uLens.value = 0.5 + lens * 1.4;
    this.lensShell.material.uniforms.uOpacity.value = clamp01(lens * 0.42);
    this.lensShell.rotation.y -= d * 0.11;
    this.lensShell.rotation.x += d * 0.04;

    this.particleMat.uniforms.uTime.value = this.time;
    this.particleMat.uniforms.uOpacity.value = this.particleOpacity * 0.9;

    this.jetMat.opacity = this.levelIndex >= 4 ? (0.03 + this.pulseEnergy * 0.16) : 0;

    this.singularityLight.intensity =
      mass * 1.1 * (0.86 + 0.14 * Math.sin(this.time * 3.1)) + this.pulseEnergy * 1.8;

    for (const gw of this._gravityWaves) {
      const phase = (this.time * 0.22 + gw.offset) % 1;
      const scale = 0.28 + phase * 1.85;
      gw.mesh.scale.setScalar(scale);
      gw.mat.opacity = Math.pow(1 - phase, 2.2) * 0.3 * lens * (0.6 + this.pulseEnergy);
    }

    // --- Tesseract ----------------------------------------------------------
    const h = this.side * 0.5;
    const proj = projectTesseract({
      scale: h * 1.62 * (1 + this.tessOpacity * 0.14),
      rotation: tesseractRotationAt(this.time, this.spin + 0.2, this.levelKey),
      viewerW: 3.2
    });
    const pos = this.tessPositions;
    const col = this.tessColors;
    const cyan = [0.35, 0.95, 1.0];
    const gold = [1.0, 0.84, 0.42];
    for (let e = 0; e < proj.edges.length; e++) {
      const [a, b] = proj.edges[e];
      const va = proj.vertices[a];
      const vb = proj.vertices[b];
      const o = e * 6;
      pos[o] = va[0];
      pos[o + 1] = va[1];
      pos[o + 2] = va[2];
      pos[o + 3] = vb[0];
      pos[o + 4] = vb[1];
      pos[o + 5] = vb[2];
      const outer = (proj.wValues[a] + proj.wValues[b]) * 0.5 > 0;
      const c1 = outer ? gold : cyan;
      const c2 = c1;
      col[o] = c1[0];
      col[o + 1] = c1[1];
      col[o + 2] = c1[2];
      col[o + 3] = c2[0];
      col[o + 4] = c2[1];
      col[o + 5] = c2[2];
    }
    this.tessGeo.attributes.position.needsUpdate = true;
    this.tessGeo.attributes.color.needsUpdate = true;
    this.tessGeo.computeBoundingSphere();

    const vpos = this.tessPointGeo.attributes.position.array;
    for (let i = 0; i < 16; i++) {
      vpos[i * 3] = proj.vertices[i][0];
      vpos[i * 3 + 1] = proj.vertices[i][1];
      vpos[i * 3 + 2] = proj.vertices[i][2];
    }
    this.tessPointGeo.attributes.position.needsUpdate = true;
    this.tessPointGeo.computeBoundingSphere();

    this.tessMat.opacity = this.tessOpacity * 0.55;
    this.tessPointMat.opacity = this.tessOpacity * 0.9;
    this.tesseractGroup.rotation.y += d * 0.07 * (0.4 + this.spin * 0.3);
    this.tesseractGroup.rotation.x = Math.sin(this.time * 0.11) * 0.14;

    // --- Light veils --------------------------------------------------------
    this.veilMat.uniforms.uTime.value = this.time;
    this.veilMat.uniforms.uOpacity.value = this.veilOpacity * 0.7;
    for (let i = 0; i < this._veils.length; i++) {
      const veil = this._veils[i];
      veil.rotation.z += d * (0.04 + i * 0.017) * (1 + this.spin * 0.3);
      veil.rotation.y += d * 0.02 * (i % 2 === 0 ? 1 : -1);
    }

    // --- Picking rig --------------------------------------------------------
    this._syncPickMatrices();

    // Keep the cached fold data honest for the HUD
    this.currentFoldAngle = this.fold * 90;
  }

  // ---------------------------------------------------------------------------
  //  Telemetry
  // ---------------------------------------------------------------------------
  getTelemetry() {
    const level = getLevel(this.levelIndex);
    return {
      active: this.root?.visible ?? false,
      level: this.levelIndex,
      levelKey: level.key,
      levelName: level.name,
      tagline: level.tagline,
      sigil: level.sigil,
      fold: Number(this.fold.toFixed(3)),
      foldDegrees: Number((this.fold * 90).toFixed(1)),
      boards: CUBE_FACE_IDS.length,
      playableFaces: CUBE_FACE_IDS.length,
      observables: CUBE_FACE_IDS.map((id) => FACE_META[id].label),
      mass: Number((this.mass * this.massBoost).toFixed(2)),
      lensing: Number((this.lensing * this.lensingBoost).toFixed(2)),
      coneOpacity: Number(this.coneOpacity.toFixed(2)),
      conesRevealed: this.conesRevealed,
      exoOpacity: Number(this.exoOpacity.toFixed(2)),
      tesseractOpacity: Number(this.tessOpacity.toFixed(2)),
      photons: this.photonCount,
      spin: Number(this.spin.toFixed(2)),
      center: this.center.toArray().map((v) => Number(v.toFixed(3))),
      faceCenters: (this.faceCenters || []).map((p) => p.map((v) => Number(v.toFixed(3)))),
      levelCount: HYPER_LEVELS.length
    };
  }
}

export default HyperfoldEngine;
