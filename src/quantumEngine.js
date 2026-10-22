import * as THREE_NS from 'three';

/** @type {any} */
const THREE = THREE_NS;

// =============================================================================
// 1. Procedural Web Audio API — Sonic Booms & Piece-Unique Audio Signatures
// =============================================================================
class QuantumAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.muted = false;
    this.volume = 0.85;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Create procedural Cathedral stone reverb impulse response
      this.reverbNode = this.createCathedralReverb(this.ctx);
      this.reverbNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.isInitialized = true;
    } catch (err) {
      console.warn('Quantum audio init deferred:', err);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(mute) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (!this.muted && this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  createCathedralReverb(ctx) {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = rate * 2.4; // 2.4s gothic stone decay
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (rate * 0.48));
      const stoneReflection = (Math.random() * 2 - 1) * decay;
      left[i] = stoneReflection;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    convolver.buffer = impulse;
    return convolver;
  }

  // Generate a non-linear transfer curve for supersonic air compression clipping
  makeDistortionCurve(k = 40) {
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Synthesize a genuine Physical Sonic Boom with supersonic N-wave pressure jump
   * and piece-specific acoustic resonance!
   */
  playSonicBoom(pieceType = 'pawn', isFullCollapse = false) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Primary Low-Frequency Supersonic Shockwave (Physical Sub-Bass Boom)
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    const waveShaper = ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(isFullCollapse ? 65 : 45);

    // Exponential sub-bass pressure drop: 140Hz down to 24Hz
    const startFreq = isFullCollapse ? 165 : 125;
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(startFreq, now);
    boomOsc.frequency.exponentialRampToValueAtTime(24, now + (isFullCollapse ? 0.65 : 0.42));

    const boomAmp = isFullCollapse ? 1.0 : 0.78;
    boomGain.gain.setValueAtTime(boomAmp, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + (isFullCollapse ? 0.72 : 0.48));

    boomOsc.connect(waveShaper);
    waveShaper.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomGain.connect(this.reverbNode);

    boomOsc.start(now);
    boomOsc.stop(now + (isFullCollapse ? 0.75 : 0.50));

    // 2. Supersonic N-Wave Transient Crack (The sharp crack of the Mach cone front)
    const nWaveLength = 0.035;
    const bufferSize = ctx.sampleRate * nWaveLength;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Step discontinuity typical of an N-wave shock profile
      const t = i / bufferSize;
      const step = t < 0.35 ? 1.0 - t * 2.8 : -(1.0 - (t - 0.35) * 1.5);
      data[i] = step * (Math.random() * 0.4 + 0.8);
    }
    const nWaveSrc = ctx.createBufferSource();
    nWaveSrc.buffer = noiseBuffer;

    const nWaveFilter = ctx.createBiquadFilter();
    nWaveFilter.type = 'highpass';
    nWaveFilter.frequency.setValueAtTime(800, now);

    const nWaveGain = ctx.createGain();
    nWaveGain.gain.setValueAtTime(isFullCollapse ? 0.95 : 0.7, now);
    nWaveGain.gain.exponentialRampToValueAtTime(0.01, now + nWaveLength);

    nWaveSrc.connect(nWaveFilter);
    nWaveFilter.connect(nWaveGain);
    nWaveGain.connect(this.masterGain);

    nWaveSrc.start(now);

    // 3. Piece-Unique Hit Sound Design
    this.playPieceUniqueSignature(pieceType, now, isFullCollapse);
  }

  /**
   * Synthesize piece-specific signature impact sounds:
   * - Pawn: Kinetic dagger pierce & high-frequency metallic crack
   * - Knight: Cavalry thunder trample (double shockwave + electric crackle)
   * - Bishop: Sacred harmonic resonator beam implosion
   * - Rook: Earthshaker siege ram subterranean tectonic blast
   * - Queen: Singularity vortex whine & supernova cleave
   * - King: Monarch ceremonial gong & dimensional cataclysm
   */
  playPieceUniqueSignature(pieceType, now, isFullCollapse) {
    const ctx = this.ctx;
    if (!ctx) return;

    switch (pieceType) {
      case 'pawn': {
        // High crystalline metallic clatter & sharp needle shock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'knight': {
        // Double-impact galloping thunderclaps with hooved low-frequency resonance
        const t2 = now + 0.085;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(110, t2);
        osc2.frequency.exponentialRampToValueAtTime(32, t2 + 0.35);

        const filter2 = ctx.createBiquadFilter();
        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(450, t2);

        gain2.gain.setValueAtTime(0.65, t2);
        gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.38);

        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.masterGain);
        gain2.connect(this.reverbNode);

        osc2.start(t2);
        osc2.stop(t2 + 0.40);
        break;
      }

      case 'bishop': {
        // Harmonic singing bowl overtone imploding into focused vertical laser sonic lance
        [528, 792, 1056].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.exponentialRampToValueAtTime(f * 0.4, now + 0.38);

          gain.gain.setValueAtTime(0.28 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.005, now + 0.42);

          osc.connect(gain);
          gain.connect(this.reverbNode);
          osc.start(now);
          osc.stop(now + 0.44);
        });
        break;
      }

      case 'rook': {
        // Deep subterranean baritone rumble & masonry displacement (42Hz drop)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.65);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);
        filter.Q.setValueAtTime(8, now);

        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.70);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.reverbNode);

        osc.start(now);
        osc.stop(now + 0.72);
        break;
      }

      case 'queen': {
        // Singularity gravitational vortex: pitch rises violently (380Hz -> 1350Hz) then ruptures into dual shockwaves
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.48);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, now);
        filter.Q.setValueAtTime(4, now);

        gain.gain.setValueAtTime(0.72, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.52);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.reverbNode);

        osc.start(now);
        osc.stop(now + 0.55);
        break;
      }

      case 'king': {
        // Monarch royal temple gong resonance & cosmic dimensional cataclysm
        [110, 220, 330, 660].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 1.2);

          gain.gain.setValueAtTime(0.35 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

          osc.connect(gain);
          gain.connect(this.reverbNode);
          osc.start(now);
          osc.stop(now + 1.45);
        });
        break;
      }
    }
  }

  /**
   * Sound effect when Hodge Cage absorbs energy without shattering the piece
   */
  playHodgeAbsorbSound() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.28);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.30);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Sound effect when Quantum Entanglement communicates spooky action at a distance
   */
  playEntanglementPulseSound() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.35);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.38);

    osc.connect(gain);
    gain.connect(this.reverbNode);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.40);
  }
}

export const quantumAudio = new QuantumAudioSynthesizer();

// =============================================================================
// 2. Hodge Cage Force Field — Electron Lattice & Quantum Wave Shells
// =============================================================================

// Geodesic lattice silhouettes tailored to piece shapes
function buildPieceLatticeGeometry(pieceType) {
  switch (pieceType) {
    case 'pawn':
      // Rounded spherical cap + tapering body + pedestal rim
      return new THREE.CylinderGeometry(0.13, 0.20, 0.44, 10, 5, false);
    case 'knight':
      // Elongated arched steed neck & head cage
      return new THREE.CylinderGeometry(0.14, 0.22, 0.56, 10, 6, false);
    case 'bishop':
      // Pointed mitre arch + oval mantle
      return new THREE.ConeGeometry(0.20, 0.58, 10, 6, false);
    case 'rook':
      // Cylindrical crenellated bastion tower
      return new THREE.CylinderGeometry(0.19, 0.22, 0.52, 12, 5, false);
    case 'queen':
      // Flared royal coronet + slender waist + grand robes
      return new THREE.CylinderGeometry(0.21, 0.24, 0.62, 12, 6, false);
    case 'king':
      // Regal imperial crown + cross finial silhouette + heavy robes
      return new THREE.CylinderGeometry(0.22, 0.25, 0.66, 12, 6, false);
    default:
      return new THREE.CylinderGeometry(0.16, 0.20, 0.48, 10, 4, false);
  }
}

/**
 * Creates the glowing "Hodge Cage" force field around a piece.
 * Represents interconnected electrons forming a topological quantum cage.
 */
export function createHodgeCage(piece, scene) {
  const cageGroup = new THREE.Group();
  cageGroup.name = `HodgeCage_${piece.type}_${piece.color}`;

  const baseColorHex = piece.color === 'w' ? 0x00f5d4 : 0xc77dff; // Electric Cyan vs Quantum Violet
  const accentColorHex = piece.color === 'w' ? 0x48cae4 : 0xff007f;
  const isWhite = piece.color === 'w';

  // 1. Quantum Electron Lattice Wireframe
  const latticeGeo = buildPieceLatticeGeometry(piece.type);
  const wireGeo = new THREE.WireframeGeometry(latticeGeo);
  const latticeMat = new THREE.LineBasicMaterial({
    color: baseColorHex,
    transparent: true,
    opacity: 0.68,
    linewidth: 2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const latticeMesh = new THREE.LineSegments(wireGeo, latticeMat);
  latticeMesh.position.y = (PIECE_CAGE_HEIGHTS[piece.type] || 0.45) * 0.5;
  cageGroup.add(latticeMesh);

  // 2. Translucent Quantum Probability Shell (Fresnel field)
  const shellMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(baseColorHex) },
      uAccentColor: { value: new THREE.Color(accentColorHex) },
      uCoherence: { value: 1.0 },
      uFlare: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uFlare;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;
        // Breathing electron wave ripples along surface
        float ripple = sin(pos.y * 14.0 + uTime * 5.0) * 0.012;
        pos += normal * (ripple + uFlare * 0.035);
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;
        vPosition = pos;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uAccentColor;
      uniform float uCoherence;
      uniform float uFlare;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vPosition;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        // Fresnel rim glow
        float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.2);

        // Electron probability grid interference pattern
        float grid = abs(sin(vPosition.y * 36.0 + uTime * 3.0)) * 0.4
                   + abs(cos(atan(vPosition.z, vPosition.x) * 8.0 - uTime * 2.0)) * 0.4;

        vec3 col = mix(uBaseColor, uAccentColor, grid * 0.5 + uFlare * 0.5);
        float alpha = clamp((fresnel * 0.55 + grid * 0.20 + uFlare * 0.45) * uCoherence, 0.0, 0.95);

        gl_FragColor = vec4(col * (1.2 + uFlare * 1.5), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const shellMesh = new THREE.Mesh(latticeGeo, shellMat);
  shellMesh.position.y = (PIECE_CAGE_HEIGHTS[piece.type] || 0.45) * 0.5;
  cageGroup.add(shellMesh);

  // 3. Interconnected Electron Node Points (orbiting vertices)
  const nodeCount = 12;
  const nodeGeo = new THREE.SphereGeometry(0.018, 8, 8);
  const nodeMat = new THREE.MeshBasicMaterial({
    color: isWhite ? 0xffffff : 0xff99ff,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9
  });

  const electronNodes = [];
  const h = PIECE_CAGE_HEIGHTS[piece.type] || 0.45;
  for (let i = 0; i < nodeCount; i++) {
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    const angle = (i / nodeCount) * Math.PI * 2;
    const yNorm = (i / (nodeCount - 1));
    node.userData = {
      baseAngle: angle,
      speed: 1.2 + (i % 3) * 0.6,
      radius: 0.16 + Math.sin(yNorm * Math.PI) * 0.06,
      yPos: yNorm * h
    };
    node.position.set(
      Math.cos(angle) * node.userData.radius,
      node.userData.yPos,
      Math.sin(angle) * node.userData.radius
    );
    cageGroup.add(node);
    electronNodes.push(node);
  }

  // 4. Ground Coherence Indicator Ring around the piece pedestal
  const ringGeo = new THREE.RingGeometry(0.14, 0.175, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: baseColorHex,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.005;
  cageGroup.add(ringMesh);

  // Attach state to cageGroup
  cageGroup.userData = {
    piece,
    latticeMesh,
    shellMesh,
    shellMat,
    ringMesh,
    ringMat,
    electronNodes,
    flareTimer: 0,
    visibleInScene: true
  };

  // Position at piece's world coords
  cageGroup.position.copy(piece.mesh.position);
  scene.add(cageGroup);

  return cageGroup;
}

const PIECE_CAGE_HEIGHTS = {
  pawn: 0.38,
  rook: 0.48,
  knight: 0.52,
  bishop: 0.54,
  queen: 0.58,
  king: 0.62
};

// =============================================================================
// 3. Sonic Boom Shockwave VFX — 3D Mach Cone & Condensation Vapor
// =============================================================================
export class SonicBoomVFXManager {
  constructor(scene) {
    this.scene = scene;
    this.activeShockwaves = [];
    this.sharedRingGeo = new THREE.RingGeometry(0.04, 0.14, 36);
    this.sharedRingGeo.rotateX(-Math.PI / 2);
  }

  /**
   * Spawn a supersonic Mach shockwave disc, vapor condensation ring, and electron flare
   */
  spawnSonicBoom(position, pieceType = 'queen', isFullCollapse = false) {
    const shockGroup = new THREE.Group();
    shockGroup.position.copy(position);

    const colorConfig = PIECE_SONIC_COLORS[pieceType] || PIECE_SONIC_COLORS.pawn;

    // 1. Primary Mach Shockwave Ring (expands from 0.05m to 1.85m in 0.42s)
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorConfig.primary,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(this.sharedRingGeo.clone(), ringMat);
    ringMesh.position.y = 0.015;
    shockGroup.add(ringMesh);

    // 2. Supersonic Vapor Condensation Cone (expands upward)
    const coneGeo = new THREE.ConeGeometry(0.12, 0.45, 24, 1, true);
    coneGeo.rotateX(Math.PI);
    const coneMat = new THREE.MeshBasicMaterial({
      color: colorConfig.secondary,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.y = 0.22;
    shockGroup.add(coneMesh);

    // 3. Spherical Overpressure Bubble
    const bubbleGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const bubbleMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
    bubbleMesh.position.y = 0.20;
    shockGroup.add(bubbleMesh);

    // 4. Electron Ionization Particles
    const pCount = isFullCollapse ? 28 : 16;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    const pVelocities = [];

    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 0.08;
      pPositions[i * 3 + 1] = Math.random() * 0.12;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.08;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 3.2;
      pVelocities.push({
        x: Math.cos(angle) * speed,
        y: 0.8 + Math.random() * 2.2,
        z: Math.sin(angle) * speed
      });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: colorConfig.particles,
      size: 0.038,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const pPoints = new THREE.Points(pGeo, pMat);
    shockGroup.add(pPoints);

    this.scene.add(shockGroup);

    this.activeShockwaves.push({
      group: shockGroup,
      ringMesh,
      ringMat,
      coneMesh,
      coneMat,
      bubbleMesh,
      bubbleMat,
      pPoints,
      pGeo,
      pPositions,
      pVelocities,
      elapsed: 0,
      duration: isFullCollapse ? 0.65 : 0.48,
      maxRadius: isFullCollapse ? 2.2 : 1.6
    });

    // Also trigger audio boom
    quantumAudio.playSonicBoom(pieceType, isFullCollapse);
  }

  update(dt) {
    for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
      const sw = this.activeShockwaves[i];
      sw.elapsed += dt;
      const progress = sw.elapsed / sw.duration;

      if (progress >= 1.0) {
        this.scene.remove(sw.group);
        sw.pGeo.dispose();
        this.activeShockwaves.splice(i, 1);
        continue;
      }

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const curRadius = 0.1 + easeOut * sw.maxRadius;
      const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));

      // Expand ring horizontally
      sw.ringMesh.scale.set(curRadius, curRadius, curRadius);
      sw.ringMat.opacity = alpha * 0.92;

      // Expand vapor cone upward and outward
      sw.coneMesh.scale.set(curRadius * 0.75, 1.0 + easeOut * 1.5, curRadius * 0.75);
      sw.coneMat.opacity = alpha * 0.65;

      // Expand overpressure bubble
      sw.bubbleMesh.scale.setScalar(curRadius * 0.65);
      sw.bubbleMat.opacity = alpha * 0.45;

      // Update particle blast
      const posArr = sw.pGeo.attributes.position.array;
      for (let p = 0; p < sw.pVelocities.length; p++) {
        const vel = sw.pVelocities[p];
        posArr[p * 3] += vel.x * dt;
        posArr[p * 3 + 1] += vel.y * dt;
        posArr[p * 3 + 2] += vel.z * dt;
        vel.y -= 7.5 * dt; // gravity
      }
      sw.pGeo.attributes.position.needsUpdate = true;
    }
  }

  clear() {
    for (const sw of this.activeShockwaves) {
      this.scene.remove(sw.group);
      sw.pGeo.dispose();
    }
    this.activeShockwaves.length = 0;
  }
}

const PIECE_SONIC_COLORS = {
  pawn:   { primary: 0x00f5d4, secondary: 0x70e000, particles: 0xccff33 },
  knight: { primary: 0xffb703, secondary: 0xfb8500, particles: 0xffd166 },
  bishop: { primary: 0x7209b7, secondary: 0x4361ee, particles: 0xb5179e },
  rook:   { primary: 0xe63946, secondary: 0xd90429, particles: 0xff5400 },
  queen:  { primary: 0xf72585, secondary: 0x7209b7, particles: 0x4cc9f0 },
  king:   { primary: 0xffd700, secondary: 0xffaa00, particles: 0xfff3b0 }
};

// =============================================================================
// 4. Quantum Decoherence & Scalar Management
// =============================================================================

export const PIECE_QUANTUM_PROFILES = {
  pawn:   { maxCoherence: 1.0, attackScalar: 0.50, resistanceScalar: 0.50, defaultHits: 2, name: 'Pawn' },
  knight: { maxCoherence: 1.0, attackScalar: 0.42, resistanceScalar: 0.34, defaultHits: 3, name: 'Knight' },
  bishop: { maxCoherence: 1.0, attackScalar: 0.42, resistanceScalar: 0.34, defaultHits: 3, name: 'Bishop' },
  rook:   { maxCoherence: 1.0, attackScalar: 0.58, resistanceScalar: 0.25, defaultHits: 4, name: 'Rook' },
  queen:  { maxCoherence: 1.0, attackScalar: 0.75, resistanceScalar: 0.25, defaultHits: 4, name: 'Queen' },
  king:   { maxCoherence: 1.0, attackScalar: 0.60, resistanceScalar: 0.20, defaultHits: 5, name: 'King' }
};

export class QuantumPhysicsEngine {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.hodgeCageVisible = true;
    this.multiHitDecoherence = true; // Multiple interactions required to completely decohere pieces
    this.decoherenceRate = 1.0;     // Multiplier scalar
    this.entanglements = [];        // Active Bell-state entangled pairs
    this.hodgeCages = new Map();    // Piece -> HodgeCage Group
    this.sonicVFX = new SonicBoomVFXManager(scene);
    this.time = 0;
  }

  registerPiece(piece) {
    if (!piece) return;
    const prof = PIECE_QUANTUM_PROFILES[piece.type] || PIECE_QUANTUM_PROFILES.pawn;
    piece.coherence = 1.0;
    piece.maxCoherence = 1.0;
    piece.attackScalar = prof.attackScalar;
    piece.resistanceScalar = prof.resistanceScalar;
    piece.entangledWith = null;

    if (this.hodgeCages.has(piece)) {
      const oldCage = this.hodgeCages.get(piece);
      this.scene.remove(oldCage);
      this.hodgeCages.delete(piece);
    }

    const cage = createHodgeCage(piece, this.scene);
    cage.visible = this.hodgeCageVisible;
    this.hodgeCages.set(piece, cage);
  }

  unregisterPiece(piece) {
    if (!piece) return;
    const cage = this.hodgeCages.get(piece);
    if (cage) {
      this.scene.remove(cage);
      this.hodgeCages.delete(piece);
    }
    // Remove any entanglement associated with this piece
    this.breakEntanglementForPiece(piece);
  }

  setHodgeCageVisibility(visible) {
    this.hodgeCageVisible = visible;
    for (const cage of this.hodgeCages.values()) {
      cage.visible = visible;
    }
  }

  setMultiHitDecoherence(enabled) {
    this.multiHitDecoherence = enabled;
  }

  setDecoherenceRate(rate) {
    this.decoherenceRate = Math.max(0.2, Math.min(3.0, rate));
  }

  /**
   * Resolve an energetic combat interaction between attacker and defender.
   * If Multi-Hit Decoherence is enabled:
   *  - Defender suffers decoherence damage scaled by attacker power & defender resistance.
   *  - If defender remains coherent (> 0.05), it deflects the blow with Hodge Cage flare!
   *  - If entangled, decoherence transmits to the entangled twin!
   */
  resolveCombatInteraction(attacker, defender, strikeWorldPos) {
    const isClassicInstant = !this.multiHitDecoherence;
    const atkScalar = attacker.attackScalar || 0.50;

    // Trigger Piece-Specific Sonic Boom Shockwave
    this.sonicVFX.spawnSonicBoom(strikeWorldPos, attacker.type, isClassicInstant || defender.coherence <= 0.35);

    // Flare Defender's Hodge Cage
    const defCage = this.hodgeCages.get(defender);
    if (defCage) {
      defCage.userData.flareTimer = 0.55;
    }

    if (isClassicInstant) {
      // Classic 1-hit capture
      defender.coherence = 0.0;
      this.handleEntanglementBacklash(defender, 0.45);
      return {
        shattered: true,
        remainingCoherence: 0.0,
        damageDealt: 1.0,
        entangledTransfer: 0
      };
    }

    // Quantum Decoherence Multi-Hit Calculation
    const damage = atkScalar * this.decoherenceRate;
    const oldCoherence = defender.coherence;
    defender.coherence = Math.max(0.0, defender.coherence - damage);
    const shattered = defender.coherence <= 0.05;

    // Transmit decoherence through Quantum Entanglement if active
    let transferAmount = 0;
    if (defender.entangledWith) {
      transferAmount = damage * 0.38; // Spooky action: 38% energy transfer
      this.transmitEntanglementShock(defender, transferAmount);
    }

    // Automatically entangle two opposing pieces when they engage in combat!
    if (!shattered && !defender.entangledWith && !attacker.entangledWith) {
      this.createEntanglement(attacker, defender);
    }

    if (!shattered) {
      quantumAudio.playHodgeAbsorbSound();
    } else {
      this.handleEntanglementBacklash(defender, 0.55);
    }

    return {
      shattered,
      remainingCoherence: Number(defender.coherence.toFixed(2)),
      damageDealt: Number(damage.toFixed(2)),
      entangledTransfer: Number(transferAmount.toFixed(2))
    };
  }

  // ===========================================================================
  // 5. Quantum Entanglement & Spooky Action at a Distance
  // ===========================================================================

  /**
   * Establish an EPR Bell-State entanglement link between two pieces
   */
  createEntanglement(pieceA, pieceB) {
    if (!pieceA || !pieceB || pieceA === pieceB) return null;
    if (pieceA.color === pieceB.color) return null; // Must bridge opposite sides!

    // Clear existing links if already entangled
    this.breakEntanglementForPiece(pieceA);
    this.breakEntanglementForPiece(pieceB);

    pieceA.entangledWith = pieceB;
    pieceB.entangledWith = pieceA;

    // 3D Visual Quantum Laser Ribbon / Particle Bridge
    const curve = new THREE.LineCurve3(pieceA.mesh.position, pieceB.mesh.position);
    const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.014, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      wireframe: true,
      depthWrite: false
    });
    const ribbonMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.scene.add(ribbonMesh);

    const pair = {
      id: `BellPair_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      pieceA,
      pieceB,
      ribbonMesh,
      tubeMat,
      phase: 0,
      strength: 1.0
    };

    this.entanglements.push(pair);
    quantumAudio.playEntanglementPulseSound();

    return pair;
  }

  breakEntanglementForPiece(piece) {
    for (let i = this.entanglements.length - 1; i >= 0; i--) {
      const pair = this.entanglements[i];
      if (pair.pieceA === piece || pair.pieceB === piece) {
        if (pair.ribbonMesh) this.scene.remove(pair.ribbonMesh);
        if (pair.pieceA) pair.pieceA.entangledWith = null;
        if (pair.pieceB) pair.pieceB.entangledWith = null;
        this.entanglements.splice(i, 1);
      }
    }
  }

  clearAllEntanglements() {
    for (const pair of this.entanglements) {
      if (pair.ribbonMesh) this.scene.remove(pair.ribbonMesh);
      if (pair.pieceA) pair.pieceA.entangledWith = null;
      if (pair.pieceB) pair.pieceB.entangledWith = null;
    }
    this.entanglements.length = 0;
  }

  /**
   * Spooky action: When Piece A is struck, decoherence transfers to its twin Piece B!
   */
  transmitEntanglementShock(sourcePiece, transferAmount) {
    const twin = sourcePiece.entangledWith;
    if (!twin) return;

    twin.coherence = Math.max(0.05, twin.coherence - transferAmount);

    // Flare the twin's Hodge cage and spawn sympathetic quantum ripples
    const twinCage = this.hodgeCages.get(twin);
    if (twinCage) {
      twinCage.userData.flareTimer = 0.65;
    }

    // Audio cue
    quantumAudio.playEntanglementPulseSound();
  }

  /**
   * Catastrophic Entanglement Rupture when a piece completely collapses
   */
  handleEntanglementBacklash(collapsedPiece, backlashAmount) {
    const twin = collapsedPiece.entangledWith;
    if (!twin) return;

    twin.coherence = Math.max(0.05, twin.coherence - backlashAmount);
    const twinCage = this.hodgeCages.get(twin);
    if (twinCage) {
      twinCage.userData.flareTimer = 0.85;
    }
    this.breakEntanglementForPiece(collapsedPiece);
  }

  // ===========================================================================
  // 6. Per-Frame Animation Update
  // ===========================================================================

  update(dt) {
    this.time += dt;

    // 1. Update Sonic Boom Shockwaves
    this.sonicVFX.update(dt);

    // 2. Update Hodge Cages
    for (const [piece, cage] of this.hodgeCages.entries()) {
      if (!piece.mesh) continue;

      // Sync position to piece mesh
      cage.position.copy(piece.mesh.position);
      cage.rotation.y = piece.mesh.rotation.y;

      // Update shader uniforms
      const ud = cage.userData;
      if (ud.shellMat) {
        ud.shellMat.uniforms.uTime.value = this.time;
        ud.shellMat.uniforms.uCoherence.value = piece.coherence || 1.0;
        ud.shellMat.uniforms.uFlare.value = ud.flareTimer > 0 ? ud.flareTimer : 0.0;
      }

      // Decay flare timer
      if (ud.flareTimer > 0) {
        ud.flareTimer = Math.max(0, ud.flareTimer - dt * 2.2);
      }

      // Rotate and pulse electron nodes along quantum orbitals
      for (let i = 0; i < ud.electronNodes.length; i++) {
        const node = ud.electronNodes[i];
        const data = node.userData;
        const curAngle = data.baseAngle + this.time * data.speed;
        node.position.set(
          Math.cos(curAngle) * data.radius,
          data.yPos + Math.sin(this.time * 4.0 + i) * 0.015,
          Math.sin(curAngle) * data.radius
        );
      }

      // Update ground coherence ring color & scale
      if (ud.ringMat) {
        const coh = piece.coherence || 1.0;
        ud.ringMat.opacity = Math.max(0.18, coh * 0.85);
        if (coh < 0.35) {
          ud.ringMat.color.setHex(0xe63946); // Critical red
        } else if (coh < 0.65) {
          ud.ringMat.color.setHex(0xf5d76e); // Warning amber
        } else {
          ud.ringMat.color.setHex(piece.color === 'w' ? 0x00f5d4 : 0xc77dff);
        }
      }
    }

    // 3. Update Quantum Entanglement Ribbons
    for (let i = this.entanglements.length - 1; i >= 0; i--) {
      const pair = this.entanglements[i];
      if (!pair.pieceA || !pair.pieceB || !pair.pieceA.mesh || !pair.pieceB.mesh) {
        this.scene.remove(pair.ribbonMesh);
        this.entanglements.splice(i, 1);
        continue;
      }

      // Animate ribbon phase and position
      pair.phase += dt * 3.5;
      const posA = pair.pieceA.mesh.position.clone().add(new THREE.Vector3(0, 0.25, 0));
      const posB = pair.pieceB.mesh.position.clone().add(new THREE.Vector3(0, 0.25, 0));

      // Rebuild dynamic undulating spline curve
      const mid = new THREE.Vector3().lerpVectors(posA, posB, 0.5);
      mid.y += 0.15 + Math.sin(pair.phase) * 0.06;

      const curve = new THREE.QuadraticBezierCurve3(posA, mid, posB);
      pair.ribbonMesh.geometry.dispose();
      pair.ribbonMesh.geometry = new THREE.TubeGeometry(curve, 20, 0.016, 6, false);

      // Shimmer color
      const shimmerColor = Math.sin(pair.phase) > 0 ? 0x00f5d4 : 0xf72585;
      pair.tubeMat.color.setHex(shimmerColor);
      pair.tubeMat.opacity = 0.55 + Math.sin(pair.phase * 2.0) * 0.25;
    }
  }

  getTelemetry() {
    return {
      activeCages: this.hodgeCages.size,
      entangledPairs: this.entanglements.length,
      multiHit: this.multiHitDecoherence,
      decoherenceRate: this.decoherenceRate,
      pairsList: this.entanglements.map((p) => ({
        id: p.id,
        pieceA: `${p.pieceA.color === 'w' ? 'White' : 'Black'} ${p.pieceA.type}`,
        pieceB: `${p.pieceB.color === 'w' ? 'White' : 'Black'} ${p.pieceB.type}`,
        coherenceA: Number((p.pieceA.coherence || 1.0).toFixed(2)),
        coherenceB: Number((p.pieceB.coherence || 1.0).toFixed(2))
      }))
    };
  }
}
