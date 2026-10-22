import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';

interface EntangledPairInfo {
  id: string;
  pieceA: string;
  pieceB: string;
  coherenceA: number;
  coherenceB: number;
}

interface HyperTelemetry {
  active: boolean;
  level: number;
  levelKey: string;
  levelName: string;
  tagline: string;
  sigil: string;
  fold: number;
  foldDegrees: number;
  boards: number;
  playableFaces: number;
  observables: string[];
  mass: number;
  lensing: number;
  coneOpacity: number;
  conesRevealed: boolean;
  exoOpacity: number;
  tesseractOpacity: number;
  photons: number;
  spin: number;
  levelCount: number;
}

const HYPER_LEVEL_INFO = [
  { id: 0, sigil: '○', name: 'Dormant', sub: 'The altar sleeps' },
  { id: 1, sigil: '⟁', name: 'Fold', sub: 'Six boards, one box' },
  { id: 2, sigil: '◈', name: 'Interior', sub: 'Inside the tesseract' },
  { id: 3, sigil: '◉', name: 'Apex', sub: 'The hidden cones' },
  { id: 4, sigil: '⟐', name: 'Exterior', sub: 'Outside the tesseract' },
  { id: 5, sigil: '✶', name: 'Hyperwild', sub: 'Every plane at once' }
];

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [quantumLabOpen, setQuantumLabOpen] = useState(false);
  const [hodgeCageActive, setHodgeCageActive] = useState(true);
  const [multiHitActive, setMultiHitActive] = useState(true);
  const [soundActive, setSoundActive] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'booms' | 'hodge' | 'decoherence' | 'entangle' | 'hyperfold'
  >('booms');
  const [entangledPairs, setEntangledPairs] = useState<EntangledPairInfo[]>([]);
  const [lastSonicPlayed, setLastSonicPlayed] = useState<string | null>(null);
  const [hyperTelemetry, setHyperTelemetry] = useState<HyperTelemetry | null>(null);
  const [hyperLevel, setHyperLevelState] = useState(1);
  const [hyperFoldPct, setHyperFoldPct] = useState(100);
  const [hyperCones, setHyperCones] = useState(false);
  const [hyperExo, setHyperExo] = useState(false);
  const [hyperMass, setHyperMass] = useState(1);
  const [hyperLensing, setHyperLensing] = useState(1);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
        setQuantumLabOpen(false);
      } else if (e.key === 'q' || e.key === 'Q') {
        setQuantumLabOpen((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        setQuantumLabOpen(true);
        setActiveTab('hyperfold');
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Poll quantum telemetry for live HUD indicators
  useEffect(() => {
    const timer = setInterval(() => {
      const win = window as unknown as {
        wizardChess?: {
          getQuantumTelemetry?: () => {
            pairsList?: EntangledPairInfo[];
            multiHit?: boolean;
            activeCages?: number;
          };
          getHyperTelemetry?: () => HyperTelemetry;
        };
      };
      if (win.wizardChess?.getQuantumTelemetry) {
        const telem = win.wizardChess.getQuantumTelemetry();
        if (telem?.pairsList) {
          setEntangledPairs(telem.pairsList);
        }
      }
      if (win.wizardChess?.getHyperTelemetry) {
        const hyperTelem = win.wizardChess.getHyperTelemetry();
        if (hyperTelem) {
          setHyperTelemetry(hyperTelem);
          setHyperCones(Boolean(hyperTelem.conesRevealed));
        }
      }
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  const handleToggleHodge = () => {
    const win = window as unknown as { wizardChess?: { toggleHodgeCages?: () => boolean } };
    if (win.wizardChess?.toggleHodgeCages) {
      const next = win.wizardChess.toggleHodgeCages();
      setHodgeCageActive(next);
    }
  };

  const handleToggleDecoherence = () => {
    const win = window as unknown as { wizardChess?: { toggleDecoherenceMode?: () => boolean } };
    if (win.wizardChess?.toggleDecoherenceMode) {
      const next = win.wizardChess.toggleDecoherenceMode();
      setMultiHitActive(next);
    }
  };

  const handleToggleSound = () => {
    const win = window as unknown as { wizardChess?: { toggleQuantumSound?: () => boolean } };
    if (win.wizardChess?.toggleQuantumSound) {
      const next = win.wizardChess.toggleQuantumSound();
      setSoundActive(next);
    }
  };

  const handlePlaySonicBoom = (pieceType: string) => {
    const win = window as unknown as { wizardChess?: { triggerPieceSonicBoom?: (t: string) => void } };
    if (win.wizardChess?.triggerPieceSonicBoom) {
      win.wizardChess.triggerPieceSonicBoom(pieceType);
      setLastSonicPlayed(pieceType);
      setTimeout(() => setLastSonicPlayed(null), 1200);
    }
  };

  const handleEntangleRandom = () => {
    const win = window as unknown as { wizardChess?: { entangleRandomPair?: () => unknown; getQuantumTelemetry?: () => { pairsList?: EntangledPairInfo[] } } };
    if (win.wizardChess?.entangleRandomPair) {
      win.wizardChess.entangleRandomPair();
      if (win.wizardChess.getQuantumTelemetry) {
        const telem = win.wizardChess.getQuantumTelemetry();
        if (telem?.pairsList) setEntangledPairs(telem.pairsList);
      }
    }
  };

  const handleClearEntanglements = () => {
    const win = window as unknown as { wizardChess?: { clearEntanglements?: () => void } };
    if (win.wizardChess?.clearEntanglements) {
      win.wizardChess.clearEntanglements();
      setEntangledPairs([]);
    }
  };

  // ---------------------------------------------------------------------------
  //  Hyperfold / tesseract controls
  // ---------------------------------------------------------------------------
  const hyperApi = () =>
    (window as unknown as {
      wizardChess?: {
        hyper?: unknown;
        setHyperLevel?: (i: number, moveCamera?: boolean) => HyperTelemetry;
        setHyperFold?: (v: number) => number;
        setHyperActive?: (v: boolean) => boolean;
        toggleApexisCones?: (force?: boolean) => boolean;
        toggleHyperExo?: (force?: boolean) => boolean;
        setHyperLensing?: (v: number) => number;
        setHyperMass?: (v: number) => number;
        hyperPulse?: () => boolean;
        hyperCamera?: (mode?: string) => unknown;
        getHyperTelemetry?: () => HyperTelemetry;
        setCameraPreset?: (preset: string) => void;
      };
    }).wizardChess;

  const handleHyperLevel = (index: number) => {
    setHyperLevelState(index);
    setHyperFoldPct(index === 0 ? 0 : 100);
    const api = hyperApi();
    const telem = api?.setHyperLevel?.(index, true);
    if (telem) setHyperTelemetry(telem);
  };

  const handleHyperFold = (value: number) => {
    setHyperFoldPct(value);
    hyperApi()?.setHyperFold?.(value / 100);
  };

  const handleHyperCamera = (mode: string) => {
    const api = hyperApi();
    if (api?.hyperCamera) {
      api.hyperCamera(mode);
      return;
    }
    api?.setCameraPreset?.(mode);
  };

  const handleHyperCones = () => {
    const next = hyperApi()?.toggleApexisCones?.();
    if (typeof next === 'boolean') setHyperCones(next);
  };

  const handleHyperExo = () => {
    const next = hyperApi()?.toggleHyperExo?.();
    if (typeof next === 'boolean') setHyperExo(next);
  };

  const handleHyperPulse = () => {
    hyperApi()?.hyperPulse?.();
  };

  const handleHyperMass = (value: number) => {
    setHyperMass(value);
    hyperApi()?.setHyperMass?.(value);
  };

  const handleHyperLensing = (value: number) => {
    setHyperLensing(value);
    hyperApi()?.setHyperLensing?.(value);
  };

  const hyper = hyperTelemetry;
  const hyperLevelInfo = HYPER_LEVEL_INFO[Math.max(0, Math.min(5, hyper?.level ?? hyperLevel))];

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Quantum Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture • Folding the Six-Board Hyperfold • Igniting the Apex Singularity...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Show HUD Controls"
      >
        Show UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Quantum Wizard Chess</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">White to Move</span>
            <span className="mode-badge" id="mode-badge">Playing as White</span>
          </div>
          <button
            type="button"
            className={`hud-btn quantum-indicator-pill ${quantumLabOpen ? 'active' : ''}`}
            id="btn-quantum-pill"
            onClick={() => setQuantumLabOpen((prev) => !prev)}
            title="Open Quantum Laboratory [Shortcut: Q]"
          >
            <span className="quantum-atom-icon">⚛</span>
            <span>Quantum Lab</span>
            <span className="quantum-tag-badge">
              {entangledPairs.length > 0 ? `${entangledPairs.length} Entangled` : 'Active'}
            </span>
          </button>

          <button
            type="button"
            className={`hud-btn hyper-pill ${quantumLabOpen && activeTab === 'hyperfold' ? 'active' : ''}`}
            id="btn-hyper-pill"
            onClick={() => {
              setQuantumLabOpen(true);
              setActiveTab('hyperfold');
            }}
            title="Open the Hyperfold Tesseract [Shortcut: T]"
          >
            <span className="hyper-sigil">⟁</span>
            <span>Hyperfold</span>
            <span className="hyper-tag-badge">
              L{hyperTelemetry?.level ?? hyperLevel} · {hyperTelemetry?.foldDegrees ?? 90}°
            </span>
          </button>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls &amp; Quantum Physics</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Quantum Mechanics</div>

          <button
            type="button"
            className={`hud-btn ${hodgeCageActive ? 'active' : ''}`}
            id="btn-toggle-hodge"
            title="Toggle Hodge Cage electron lattice force fields"
            onClick={handleToggleHodge}
          >
            ⚛ Hodge Cage: {hodgeCageActive ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            className={`hud-btn ${multiHitActive ? 'active' : ''}`}
            id="btn-toggle-decoherence"
            title="Toggle Energy Decoherence Scalars (Multiple hits to defeat pieces)"
            onClick={handleToggleDecoherence}
          >
            ⚡ Combat: {multiHitActive ? 'Multi-Hit' : 'Classic 1-Hit'}
          </button>

          <button
            type="button"
            className={`hud-btn ${soundActive ? 'active' : ''}`}
            id="btn-toggle-sound"
            title="Toggle procedural supersonic sonic boom audio"
            onClick={handleToggleSound}
          >
            🔊 Booms: {soundActive ? 'ON' : 'MUTED'}
          </button>

          <button
            type="button"
            className="hud-btn primary"
            id="btn-open-quantum-lab"
            title="Open Quantum Physics Laboratory"
            onClick={() => {
              setQuantumLabOpen(true);
              setMobileSheetOpen(false);
            }}
          >
            ✦ Open Quantum Lab
          </button>

          <button
            type="button"
            className="hud-btn"
            id="btn-open-hyperfold"
            title="Open the Hyperfold six-board tesseract laboratory"
            onClick={() => {
              setQuantumLabOpen(true);
              setActiveTab('hyperfold');
              setMobileSheetOpen(false);
            }}
          >
            ⟁ Hyperfold Tesseract
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display &amp; Gestures</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Attack &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp; Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; WASD: Fly &nbsp;•&nbsp; Q: Quantum Lab &nbsp;•&nbsp; T: Hyperfold &nbsp;•&nbsp; H: Hide UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      {/* Quantum Laboratory Collapsible Drawer */}
      <div className={`quantum-dock ${quantumLabOpen ? 'open' : ''}`} id="quantum-dock">
        <div className="quantum-dock-header">
          <div className="quantum-dock-title-group">
            <span className="quantum-dock-icon">⚛</span>
            <div>
              <div className="quantum-dock-title">Quantum Physics Laboratory</div>
              <div className="quantum-dock-subtitle">
                Hodge Cage Electron Fields • Sonic Booms • Decoherence Scalars • Entanglement • Six-Board Hyperfold Tesseract
              </div>
            </div>
          </div>
          <div className="quantum-dock-header-actions">
            <button
              type="button"
              className="quantum-close-btn"
              onClick={() => setQuantumLabOpen(false)}
              aria-label="Close Quantum Lab"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="quantum-tabs">
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'booms' ? 'active' : ''}`}
            onClick={() => setActiveTab('booms')}
          >
            🔊 Sonic Booms ({lastSonicPlayed ? `Fired ${lastSonicPlayed.toUpperCase()}` : '6 Pieces'})
          </button>
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'hodge' ? 'active' : ''}`}
            onClick={() => setActiveTab('hodge')}
          >
            ⚛ Hodge Cage ({hodgeCageActive ? 'Active' : 'Off'})
          </button>
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'decoherence' ? 'active' : ''}`}
            onClick={() => setActiveTab('decoherence')}
          >
            ⚡ Energy Decoherence Scalars ({multiHitActive ? 'Multi-Hit' : '1-Hit'})
          </button>
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'entangle' ? 'active' : ''}`}
            onClick={() => setActiveTab('entangle')}
          >
            🔗 Quantum Entanglement ({entangledPairs.length})
          </button>
          <button
            type="button"
            className={`quantum-tab-btn hyper-tab-btn ${activeTab === 'hyperfold' ? 'active' : ''}`}
            id="quantum-tab-hyperfold"
            onClick={() => setActiveTab('hyperfold')}
          >
            ⟁ Hyperfold ({hyperTelemetry?.level ?? hyperLevel})
          </button>
        </div>

        {/* Tab 1: Piece-Unique Sonic Booms */}
        {activeTab === 'booms' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">Supersonic N-Wave Acoustic Shockwaves</div>
              <p>
                Each sculpted piece features an entirely unique procedural acoustic and visual signature synthesized via the Web Audio API. Hits trigger supersonic Mach shockwave rings, vapor condensation cones, and physical sub-bass pressure drops!
              </p>
            </div>

            <div className="quantum-piece-grid">
              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♙</span>
                  <span className="piece-name">Pawn — Kinetic Dagger</span>
                </div>
                <div className="piece-desc">
                  Sharp needle crack (520Hz down to 90Hz sweep) with high-frequency crystalline electron spark flutter. Localized azure conical shockwave.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('pawn')}
                >
                  ⚡ Fire Pawn Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♘</span>
                  <span className="piece-name">Knight — Cavalry Trample</span>
                </div>
                <div className="piece-desc">
                  Double-strike thunderclap (0ms &amp; 85ms) with hooved 110Hz-32Hz low-frequency resonance and ground crackling electrical discharge.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('knight')}
                >
                  ⚡ Fire Knight Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♗</span>
                  <span className="piece-name">Bishop — Sacred Resonator</span>
                </div>
                <div className="piece-desc">
                  Harmonic singing bowl overtone choir (528Hz, 792Hz, 1056Hz) imploding into a concentrated vertical laser sonic blast with prismatic halos.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('bishop')}
                >
                  ⚡ Fire Bishop Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♖</span>
                  <span className="piece-name">Rook — Earthshaker Ram</span>
                </div>
                <div className="piece-desc">
                  Catastrophic subterranean 42Hz baritone drop, subterranean masonry displacement, and square-shaped seismic shockwaves across the cathedral floor.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('rook')}
                >
                  ⚡ Fire Rook Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♕</span>
                  <span className="piece-name">Queen — Singularity Supernova</span>
                </div>
                <div className="piece-desc">
                  Gravitational vortex whine (260Hz up to 1400Hz) snapping into dual supersonic shockwaves with swirling chorus and ultraviolet electron spiral.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('queen')}
                >
                  ⚡ Fire Queen Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♔</span>
                  <span className="piece-name">King — Monarch Cataclysm</span>
                </div>
                <div className="piece-desc">
                  Royal bronze temple gong resonance (110Hz, 220Hz, 330Hz, 660Hz) with 1.4s cathedral stone echo and a majestic coronal shockwave ring.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('king')}
                >
                  ⚡ Fire King Sonic Boom
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hodge Cage Force Fields */}
        {activeTab === 'hodge' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">The Hodge Cage: Interconnected Electron Force Field</div>
              <p>
                The Hodge Cage is a form-fitting quantum force field tailored to the silhouette of each stone statue. It represents a closed manifold of interconnected electrons orbiting in probability orbitals. The cage absorbs supersonic impacts, deflecting kinetic energy through electron wave dissipation.
              </p>
            </div>

            <div className="quantum-options-row">
              <div className="quantum-option-box">
                <div className="option-label">Hodge Cage Force Field Visibility</div>
                <div className="option-sub">Show / hide the 3D geodesic electron lattice around all pieces</div>
                <button
                  type="button"
                  className={`quantum-action-btn ${hodgeCageActive ? 'active' : ''}`}
                  onClick={handleToggleHodge}
                >
                  {hodgeCageActive ? 'Disable Hodge Cages' : 'Enable Hodge Cages'}
                </button>
              </div>

              <div className="quantum-option-box">
                <div className="option-label">Electron Probability Lattice</div>
                <div className="option-sub">White pieces display Electric Cyan (#00f5d4), Black pieces display Quantum Violet (#c77dff). Nodes orbit along geodesic paths.</div>
                <div className="lattice-status-badge">12 Orbiting Electron Nodes per Piece • Shimmering Fresnel Shell</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Energy Decoherence Scalars */}
        {activeTab === 'decoherence' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">Energy Decoherence Levels &amp; Multiple Interactions</div>
              <p>
                In quantum mode, one melee interaction cannot completely end another piece. Instead, pieces possess an Energy Decoherence Level (Coherence Ψ starting at 100%). Each attack depletes a portion of the defender's Hodge Cage according to combat scalars. Only when coherence drops to 0% does total wave-function collapse occur, shattering the stone statue!
              </p>
            </div>

            <div className="quantum-options-row">
              <div className="quantum-option-box">
                <div className="option-label">Combat Resolution Mode</div>
                <div className="option-sub">Choose between Multi-Hit Quantum Attrition or Classic 1-Hit Capture</div>
                <button
                  type="button"
                  className={`quantum-action-btn ${multiHitActive ? 'active' : ''}`}
                  onClick={handleToggleDecoherence}
                >
                  {multiHitActive ? 'Switch to Classic 1-Hit' : 'Switch to Multi-Hit Scalars'}
                </button>
              </div>

              <div className="quantum-option-box">
                <div className="option-label">Decoherence Scalar Matrix</div>
                <table className="quantum-table">
                  <thead>
                    <tr>
                      <th>Piece</th>
                      <th>Strikes to Collapse</th>
                      <th>Attack Scalar</th>
                      <th>Resistance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Pawn ♙</td>
                      <td>2 Hits</td>
                      <td>0.50</td>
                      <td>Standard</td>
                    </tr>
                    <tr>
                      <td>Knight ♘ / Bishop ♗</td>
                      <td>3 Hits</td>
                      <td>0.42</td>
                      <td>Reinforced</td>
                    </tr>
                    <tr>
                      <td>Rook ♖</td>
                      <td>4 Hits</td>
                      <td>0.58</td>
                      <td>Heavy Mass</td>
                    </tr>
                    <tr>
                      <td>Queen ♕</td>
                      <td>4 Hits</td>
                      <td>0.75</td>
                      <td>High Energy</td>
                    </tr>
                    <tr>
                      <td>King ♔</td>
                      <td>5 Hits</td>
                      <td>0.60</td>
                      <td>Royal Core</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Quantum Entanglement */}
        {activeTab === 'entangle' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">Bell-State Quantum Entanglement &amp; Spooky Action</div>
              <p>
                When pieces meet and clash from opposite sides, an EPR Quantum Entanglement Pair is established between them! A luminous 3D undulating quantum wormhole connects them across the board. Whenever one piece is attacked, 38% of the decoherence energy instantly transmits through the entanglement bridge to affect your piece or the opponent's!
              </p>
            </div>

            <div className="quantum-options-row">
              <div className="quantum-option-box">
                <div className="option-label">Active Entangled Pairs: {entangledPairs.length}</div>
                <div className="entangled-list">
                  {entangledPairs.length === 0 ? (
                    <div className="empty-entangle-msg">
                      No pieces currently entangled. Make a move to engage in combat, or click below to entangle random opposing pieces!
                    </div>
                  ) : (
                    entangledPairs.map((pair) => (
                      <div key={pair.id} className="entangled-pair-pill">
                        <span className="pair-link-icon">⟷</span>
                        <span className="pair-label">{pair.pieceA}</span>
                        <span className="pair-bracket">Ψ: {Math.round(pair.coherenceA * 100)}%</span>
                        <span className="pair-sep">•</span>
                        <span className="pair-label">{pair.pieceB}</span>
                        <span className="pair-bracket">Ψ: {Math.round(pair.coherenceB * 100)}%</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="entangle-btn-row">
                  <button
                    type="button"
                    className="quantum-action-btn active"
                    onClick={handleEntangleRandom}
                  >
                    🔗 Entangle Random Opposing Pieces
                  </button>
                  {entangledPairs.length > 0 && (
                    <button
                      type="button"
                      className="quantum-action-btn secondary"
                      onClick={handleClearEntanglements}
                    >
                      Sever All Entanglements
                    </button>
                  )}
                </div>
              </div>

              <div className="quantum-option-box">
                <div className="option-label">Spooky Action Mechanics</div>
                <div className="option-sub">
                  • Kinetic / Sonic shock transmission: 38% decoherence transferred across the wormhole<br />
                  • Sympathetic Hodge Cage electron flare on receiving twin<br />
                  • Catastrophic entanglement rupture if twin collapses
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Hyperfold — six folded boards, apex cones & the tesseract */}
        {activeTab === 'hyperfold' && (
          <div className="quantum-tab-content hyper-tab-content">
            <div className="quantum-info-card hyper-info-card">
              <div className="quantum-info-heading">⟁ HYPERFOLD · Six Observers, One Wave Function</div>
              <p>
                The altar board is unfolded into a six-board cube net and folded back up into a
                box. Every face carries the <strong>live</strong> board: strike on any face and
                the single wave function collapses identically on all six. At the centre sits the{' '}
                <strong>Apex Singularity</strong> — a black hole fed by six unseen apex cones.
                Climb the ladder to step <em>inside</em> the projected tesseract, then out past it.
              </p>
              <div className="hyper-readout-inline">
                <span className="hyper-readout-tag">LEVEL {hyper?.level ?? hyperLevel}</span>
                <span className="hyper-readout-name">{hyper?.levelName ?? hyperLevelInfo.name}</span>
                <span className="hyper-readout-quote">
                  “{hyper?.tagline ?? hyperLevelInfo.sub}”
                </span>
              </div>
            </div>

            <div className="hyper-level-ladder" id="hyper-level-chips">
              {HYPER_LEVEL_INFO.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  id={`btn-hyper-level-${lvl.id}`}
                  className={`hyper-level-chip ${(hyper?.level ?? hyperLevel) === lvl.id ? 'active' : ''}`}
                  onClick={() => handleHyperLevel(lvl.id)}
                >
                  <span className="hyper-level-sigil">{lvl.sigil}</span>
                  <span className="hyper-level-name">{lvl.name}</span>
                  <span className="hyper-level-sub">{lvl.sub}</span>
                </button>
              ))}
            </div>

            <div className="hyper-grid">
              <div className="quantum-option-box hyper-box">
                <div className="option-label">Fold Kinematics</div>
                <div className="option-sub">
                  0% is the flat cube net — the same board repeated left, right and beyond.
                  100% closes the six faces into the inward-facing box.
                </div>
                <div className="hyper-slider-row">
                  <input
                    id="hyper-fold-range"
                    className="hyper-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={hyperFoldPct}
                    onChange={(e) => handleHyperFold(Number(e.target.value))}
                    aria-label="Fold the six-board net"
                  />
                  <span className="hyper-slider-value">
                    {hyperFoldPct}% · {Math.round(hyperFoldPct * 0.9)}°
                  </span>
                </div>
                <div className="hyper-btn-row">
                  <button
                    type="button"
                    className="quantum-action-btn active"
                    id="btn-hyper-enter"
                    onClick={() => handleHyperLevel(2)}
                  >
                    ⟁ Enter the Box
                  </button>
                  <button
                    type="button"
                    className="quantum-action-btn"
                    id="btn-hyper-core"
                    onClick={() => handleHyperCamera('core')}
                  >
                    ◉ Dive to the Core
                  </button>
                  <button
                    type="button"
                    className="quantum-action-btn"
                    id="btn-hyper-outside"
                    onClick={() => handleHyperLevel(4)}
                  >
                    ⟐ Step Outside
                  </button>
                  <button
                    type="button"
                    className="quantum-action-btn secondary"
                    id="btn-hyper-unfold"
                    onClick={() => handleHyperFold(hyperFoldPct > 50 ? 0 : 100)}
                  >
                    {hyperFoldPct > 50 ? 'Unfold the Net' : 'Fold the Box'}
                  </button>
                </div>
                <div className="hyper-btn-row">
                  <button
                    type="button"
                    className={`quantum-action-btn ${hyperCones ? 'active' : ''}`}
                    id="btn-hyper-cones"
                    onClick={handleHyperCones}
                  >
                    {hyperCones ? 'Hide Apexis Cones' : 'Reveal Apexis Cones'}
                  </button>
                  <button
                    type="button"
                    className={`quantum-action-btn ${hyperExo ? 'active' : ''}`}
                    id="btn-hyper-exo"
                    onClick={handleHyperExo}
                  >
                    {hyperExo ? 'Mirror Inside Only' : 'Mirror to Outer Shell'}
                  </button>
                  <button
                    type="button"
                    className="quantum-action-btn active"
                    id="btn-hyper-pulse"
                    onClick={handleHyperPulse}
                  >
                    ✦ Gravity Pulse
                  </button>
                </div>
              </div>

              <div className="quantum-option-box hyper-box">
                <div className="option-label">Apex Singularity Scalars</div>
                <div className="option-sub">
                  Mass stretches the photon sphere; lensing bends the light of the fourth
                  dimension around the horizon.
                </div>
                <div className="hyper-slider-row">
                  <label className="hyper-slider-label" htmlFor="hyper-mass-range">
                    Mass
                  </label>
                  <input
                    id="hyper-mass-range"
                    className="hyper-slider"
                    type="range"
                    min={20}
                    max={250}
                    step={1}
                    value={Math.round(hyperMass * 100)}
                    onChange={(e) => handleHyperMass(Number(e.target.value) / 100)}
                  />
                  <span className="hyper-slider-value">{hyperMass.toFixed(2)} M☉</span>
                </div>
                <div className="hyper-slider-row">
                  <label className="hyper-slider-label" htmlFor="hyper-lens-range">
                    Lens
                  </label>
                  <input
                    id="hyper-lens-range"
                    className="hyper-slider"
                    type="range"
                    min={0}
                    max={300}
                    step={1}
                    value={Math.round(hyperLensing * 100)}
                    onChange={(e) => handleHyperLensing(Number(e.target.value) / 100)}
                  />
                  <span className="hyper-slider-value">{hyperLensing.toFixed(2)}×</span>
                </div>
                <div className="hyper-telemetry" id="hyper-telemetry">
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">Observers</span>
                    <span className="hyper-stat-val">{hyper?.boards ?? 6} faces · all playable</span>
                  </div>
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">Fold</span>
                    <span className="hyper-stat-val">
                      {hyper ? `${hyper.foldDegrees}°` : '90°'}
                    </span>
                  </div>
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">Ψ Mass</span>
                    <span className="hyper-stat-val">
                      {hyper ? hyper.mass.toFixed(2) : '0.55'} · shadow r≈{(0.052 * 2.2 * (0.78 + (hyper?.mass ?? 0.55) * 0.26)).toFixed(2)}m
                    </span>
                  </div>
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">Lensing</span>
                    <span className="hyper-stat-val">{hyper ? hyper.lensing.toFixed(2) : '0.24'}×</span>
                  </div>
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">Tesseract</span>
                    <span className="hyper-stat-val">
                      {hyper ? Math.round(hyper.tesseractOpacity * 100) : 14}% cell opacity
                    </span>
                  </div>
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">Photon stream</span>
                    <span className="hyper-stat-val">{hyper?.photons ?? 780} geodesics</span>
                  </div>
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">Apexis cones</span>
                    <span className="hyper-stat-val">
                      {hyperCones || (hyper?.coneOpacity ?? 0) > 0.05 ? 'partially visible' : 'hidden (by design)'}
                    </span>
                  </div>
                  <div className="hyper-stat">
                    <span className="hyper-stat-key">4D spin</span>
                    <span className="hyper-stat-val">{hyper ? hyper.spin.toFixed(2) : '0.34'} rad/s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hyper-observers">
              {(hyper?.observables ?? ['BASE', 'SOUTH', 'EAST', 'NORTH', 'WEST', 'LID']).map(
                (name, idx) => (
                  <div className="hyper-observer-card" key={name}>
                    <span className="hyper-observer-index">{['I', 'II', 'III', 'IV', 'V', 'VI'][idx]}</span>
                    <span className="hyper-observer-name">{name}</span>
                    <span className="hyper-observer-state">
                      {activeTab === 'hyperfold' && (hyper?.level ?? hyperLevel) >= 4 && idx > 0
                        ? 'exterior shell'
                        : 'inside shell'}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="quantum-info-card hyper-info-card">
              <div className="quantum-info-heading">Playable from every face</div>
              <p>
                Ray-cast any folded plate to select and move pieces — the six observers resolve to
                the same canonical square. Cameras: <strong>Enter the Box</strong> (inside),
                <strong> Dive to the Core</strong> (next to the horizon), <strong>Step Outside</strong>{' '}
                (past the outer tesseract). Shortcut <strong>T</strong> reopens this laboratory.
              </p>
            </div>
          </div>
        )}
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
